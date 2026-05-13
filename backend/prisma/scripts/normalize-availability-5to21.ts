import prismaClient from '../../src/lib/db/prisma.js';

type Summary = {
    usersWithCertifications: number;
    certificationScopes: number;
    created: number;
    updated: number;
    deletedDuplicates: number;
    deletedGlobal: number;
    failedScopes: number;
};

const APPLY_FLAG = '--apply';
const HELP_FLAG = '--help';
const TARGET_START = '05:00';
const TARGET_END = '21:00';
const RECURRING_DAYS = [0, 1, 2, 3, 4, 5, 6];

const printUsage = (): void => {
    console.log('Usage: npm run fix:availability:normalize [-- --apply]');
    console.log('Default mode is dry-run (no writes).');
    console.log(`Use ${APPLY_FLAG} to apply changes.`);
};

const main = async (): Promise<void> => {
    if (process.argv.includes(HELP_FLAG)) {
        printUsage();
        return;
    }

    const applyChanges = process.argv.includes(APPLY_FLAG);
    const modeLabel = applyChanges ? 'APPLY' : 'DRY-RUN';
    console.log(`\nNormalize availability script (${modeLabel})`);

    const summary: Summary = {
        usersWithCertifications: 0,
        certificationScopes: 0,
        created: 0,
        updated: 0,
        deletedDuplicates: 0,
        deletedGlobal: 0,
        failedScopes: 0,
    };

    const targetUsers = await prismaClient.user.findMany({
        where: {
            role: { in: ['MANAGER', 'STAFF'] },
        },
        select: { id: true },
    });

    const activeCertifications = await prismaClient.certification.findMany({
        where: {
            revokedAt: null,
            userId: { in: targetUsers.map((user) => user.id) },
        },
        select: {
            userId: true,
            locationId: true,
        },
    });

    const scopesByUser = new Map<string, Set<string>>();
    activeCertifications.forEach((certification) => {
        const existing = scopesByUser.get(certification.userId) ?? new Set<string>();
        existing.add(certification.locationId);
        scopesByUser.set(certification.userId, existing);
    });

    summary.usersWithCertifications = scopesByUser.size;
    summary.certificationScopes = Array.from(scopesByUser.values()).reduce(
        (count, locations) => count + locations.size,
        0,
    );

    console.log(
        `Found ${summary.usersWithCertifications} schedulable users across ${summary.certificationScopes} certified user/location scope(s).`,
    );

    for (const [userId, locationIds] of scopesByUser.entries()) {
        for (const locationId of locationIds) {
            try {
                if (applyChanges) {
                    await prismaClient.$transaction(async (tx) => {
                        for (const dayOfWeek of RECURRING_DAYS) {
                            const recurringRows = await tx.availability.findMany({
                                where: {
                                    userId,
                                    locationId,
                                    dayOfWeek,
                                    isRecurring: true,
                                },
                                orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
                            });

                            if (recurringRows.length === 0) {
                                await tx.availability.create({
                                    data: {
                                        userId,
                                        locationId,
                                        dayOfWeek,
                                        startTime: TARGET_START,
                                        endTime: TARGET_END,
                                        isRecurring: true,
                                        validFrom: new Date(),
                                    },
                                });
                                summary.created += 1;
                                continue;
                            }

                            const [primary, ...duplicates] = recurringRows;

                            if (
                                primary &&
                                (primary.startTime !== TARGET_START ||
                                    primary.endTime !== TARGET_END)
                            ) {
                                await tx.availability.update({
                                    where: { id: primary.id },
                                    data: {
                                        startTime: TARGET_START,
                                        endTime: TARGET_END,
                                    },
                                });
                                summary.updated += 1;
                            }

                            if (duplicates.length > 0) {
                                await tx.availability.deleteMany({
                                    where: {
                                        id: {
                                            in: duplicates.map((item) => item.id),
                                        },
                                    },
                                });
                                summary.deletedDuplicates += duplicates.length;
                            }
                        }

                        const globalRecurringRows = await tx.availability.findMany({
                            where: {
                                userId,
                                locationId: null,
                                isRecurring: true,
                            },
                            select: { id: true },
                        });

                        if (globalRecurringRows.length > 0) {
                            await tx.availability.deleteMany({
                                where: {
                                    id: {
                                        in: globalRecurringRows.map((row) => row.id),
                                    },
                                },
                            });
                            summary.deletedGlobal += globalRecurringRows.length;
                        }
                    });
                } else {
                    for (const dayOfWeek of RECURRING_DAYS) {
                        const recurringRows = await prismaClient.availability.findMany({
                            where: {
                                userId,
                                locationId,
                                dayOfWeek,
                                isRecurring: true,
                            },
                            orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
                        });

                        if (recurringRows.length === 0) {
                            summary.created += 1;
                            continue;
                        }

                        const [primary, ...duplicates] = recurringRows;
                        if (
                            primary &&
                            (primary.startTime !== TARGET_START ||
                                primary.endTime !== TARGET_END)
                        ) {
                            summary.updated += 1;
                        }

                        if (duplicates.length > 0) {
                            summary.deletedDuplicates += duplicates.length;
                        }
                    }

                    const globalRecurringRows = await prismaClient.availability.findMany({
                        where: {
                            userId,
                            locationId: null,
                            isRecurring: true,
                        },
                        select: { id: true },
                    });

                    summary.deletedGlobal += globalRecurringRows.length;
                }
            } catch (error) {
                summary.failedScopes += 1;
                console.error(
                    `Failed availability normalization for user ${userId} at location ${locationId}`,
                    error,
                );
            }
        }
    }

    const createdLabel = applyChanges ? 'Created' : 'Would create';
    const updatedLabel = applyChanges ? 'Updated' : 'Would update';
    const dedupeLabel = applyChanges ? 'Deleted duplicate rows' : 'Would delete duplicate rows';
    const globalDeleteLabel = applyChanges
        ? 'Deleted global recurring rows'
        : 'Would delete global recurring rows';

    console.log('\nSummary');
    console.log(`Users with active certifications: ${summary.usersWithCertifications}`);
    console.log(`Certified user/location scopes: ${summary.certificationScopes}`);
    console.log(`${createdLabel}: ${summary.created}`);
    console.log(`${updatedLabel}: ${summary.updated}`);
    console.log(`${dedupeLabel}: ${summary.deletedDuplicates}`);
    console.log(`${globalDeleteLabel}: ${summary.deletedGlobal}`);
    console.log(`Failed scopes: ${summary.failedScopes}`);

    if (summary.failedScopes > 0) {
        process.exitCode = 1;
    }
};

main()
    .catch((error) => {
        console.error('Script failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prismaClient.$disconnect();
    });
