import prismaClient from '../../src/lib/db/prisma.js';

type Summary = {
    scanned: number;
    created: number;
    skippedExisting: number;
    skippedNoCertification: number;
    deletedGlobal: number;
    failed: number;
};

const APPLY_FLAG = '--apply';
const HELP_FLAG = '--help';

const printUsage = (): void => {
    console.log('Usage: npm run fix:availability:locations [-- --apply]');
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

    console.log(`\nFix availability location script (${modeLabel})`);

    const summary: Summary = {
        scanned: 0,
        created: 0,
        skippedExisting: 0,
        skippedNoCertification: 0,
        deletedGlobal: 0,
        failed: 0,
    };

    const failedAvailabilityIds: string[] = [];

    const globalRecurringAvailabilities = await prismaClient.availability.findMany({
        where: {
            isRecurring: true,
            locationId: null,
        },
        orderBy: {
            id: 'asc',
        },
    });

    summary.scanned = globalRecurringAvailabilities.length;
    console.log(`Found ${summary.scanned} recurring availability row(s) with null locationId.`);

    for (const availability of globalRecurringAvailabilities) {
        try {
            if (applyChanges) {
                await prismaClient.$transaction(async (tx) => {
                    const activeCertifications = await tx.certification.findMany({
                        where: {
                            userId: availability.userId,
                            revokedAt: null,
                        },
                        select: {
                            locationId: true,
                        },
                    });

                    if (activeCertifications.length === 0) {
                        summary.skippedNoCertification += 1;
                        return;
                    }

                    for (const certification of activeCertifications) {
                        const existing = await tx.availability.findFirst({
                            where: {
                                userId: availability.userId,
                                dayOfWeek: availability.dayOfWeek,
                                startTime: availability.startTime,
                                endTime: availability.endTime,
                                locationId: certification.locationId,
                                isRecurring: availability.isRecurring,
                            },
                            select: { id: true },
                        });

                        if (existing) {
                            summary.skippedExisting += 1;
                            continue;
                        }

                        await tx.availability.create({
                            data: {
                                userId: availability.userId,
                                dayOfWeek: availability.dayOfWeek,
                                startTime: availability.startTime,
                                endTime: availability.endTime,
                                locationId: certification.locationId,
                                isRecurring: availability.isRecurring,
                                validFrom: availability.validFrom,
                                validTo: availability.validTo,
                            },
                        });

                        summary.created += 1;
                    }

                    await tx.availability.delete({
                        where: {
                            id: availability.id,
                        },
                    });
                    summary.deletedGlobal += 1;
                });
            } else {
                const activeCertifications = await prismaClient.certification.findMany({
                    where: {
                        userId: availability.userId,
                        revokedAt: null,
                    },
                    select: {
                        locationId: true,
                    },
                });

                if (activeCertifications.length === 0) {
                    summary.skippedNoCertification += 1;
                    continue;
                }

                for (const certification of activeCertifications) {
                    const existing = await prismaClient.availability.findFirst({
                        where: {
                            userId: availability.userId,
                            dayOfWeek: availability.dayOfWeek,
                            startTime: availability.startTime,
                            endTime: availability.endTime,
                            locationId: certification.locationId,
                            isRecurring: availability.isRecurring,
                        },
                        select: { id: true },
                    });

                    if (existing) {
                        summary.skippedExisting += 1;
                        continue;
                    }

                    summary.created += 1;
                }

                summary.deletedGlobal += 1;
            }
        } catch (error) {
            summary.failed += 1;
            failedAvailabilityIds.push(availability.id);
            console.error(`Failed processing availability ${availability.id}`, error);
        }
    }

    const deleteLabel = applyChanges ? 'Deleted global rows' : 'Would delete global rows';
    const createLabel = applyChanges ? 'Created rows' : 'Would create rows';

    console.log('\nSummary');
    console.log(`Scanned: ${summary.scanned}`);
    console.log(`${createLabel}: ${summary.created}`);
    console.log(`Skipped existing: ${summary.skippedExisting}`);
    console.log(`Skipped no active certification: ${summary.skippedNoCertification}`);
    console.log(`${deleteLabel}: ${summary.deletedGlobal}`);
    console.log(`Failed: ${summary.failed}`);

    if (failedAvailabilityIds.length > 0) {
        console.log(`Failed availability IDs: ${failedAvailabilityIds.join(', ')}`);
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
