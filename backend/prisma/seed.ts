import { EventTemplateScope, Role, ShiftStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { fromZonedTime } from 'date-fns-tz';
import prismaClient from '../src/lib/db/prisma.js';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'ChurchPass123!';

const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

const toUtcDate = (isoDate: string, localTime: string, timezone: string): Date => {
    return fromZonedTime(`${isoDate}T${localTime}:00`, timezone);
};

const getNextDateForDay = (dayOfWeek: number): string => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const currentDay = start.getDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    const target = new Date(start);
    target.setDate(start.getDate() + diff + 7); // next week for stable seed

    return target.toISOString().slice(0, 10);
};

async function main() {
    console.log('🌱 Starting church seed...');

    console.log('🧹 Clearing existing data...');
    await prismaClient.auditLog.deleteMany();
    await prismaClient.notification.deleteMany();
    await prismaClient.swapRequest.deleteMany();
    await prismaClient.shiftAssignment.deleteMany();
    await prismaClient.shift.deleteMany();
    await prismaClient.eventTemplateRequirement.deleteMany();
    await prismaClient.eventTemplate.deleteMany();
    await prismaClient.exception.deleteMany();
    await prismaClient.availability.deleteMany();
    await prismaClient.userSkill.deleteMany();
    await prismaClient.certification.deleteMany();
    await prismaClient.locationManager.deleteMany();
    await prismaClient.location.deleteMany();
    await prismaClient.skill.deleteMany();
    await prismaClient.user.deleteMany();

    console.log('📋 Creating church skills...');
    const skillNames = ['COORDINATOR', 'TEACHER', 'SUPERVISOR', 'VOLUNTEER'];
    const skills = await Promise.all(
        skillNames.map((name) =>
            prismaClient.skill.create({
                data: { name },
            }),
        ),
    );
    const skillByName = Object.fromEntries(skills.map((skill) => [skill.name, skill]));

    console.log('📍 Creating centers...');
    const centers = await Promise.all([
        prismaClient.location.create({
            data: {
                name: 'Mainland Center',
                address: '12 Acme Road, Ikeja, Lagos',
                timezone: 'Africa/Lagos',
            },
        }),
        prismaClient.location.create({
            data: {
                name: 'Island Center',
                address: '45 Admiralty Way, Lekki, Lagos',
                timezone: 'Africa/Lagos',
            },
        }),
        prismaClient.location.create({
            data: {
                name: 'Surulere Center',
                address: '8 Bode Thomas, Surulere, Lagos',
                timezone: 'Africa/Lagos',
            },
        }),
    ]);

    console.log('👑 Creating super admin users...');
    const superAdmins = await Promise.all([
        prismaClient.user.create({
            data: {
                email: 'director@cfc-kids.org',
                password: await hashPassword(DEFAULT_PASSWORD),
                firstName: 'Grace',
                lastName: 'Director',
                role: Role.ADMIN,
                phone: '+2347000000001',
            },
        }),
        prismaClient.user.create({
            data: {
                email: 'asst.director@cfc-kids.org',
                password: await hashPassword(DEFAULT_PASSWORD),
                firstName: 'Daniel',
                lastName: 'Adebayo',
                role: Role.ADMIN,
                phone: '+2347000000002',
            },
        }),
        prismaClient.user.create({
            data: {
                email: 'kids.admin@cfc-kids.org',
                password: await hashPassword(DEFAULT_PASSWORD),
                firstName: 'Mercy',
                lastName: 'Nwosu',
                role: Role.ADMIN,
                phone: '+2347000000003',
            },
        }),
    ]);

    console.log('🧭 Creating CCO/ACO center managers...');
    const managerProfiles = [
        {
            email: 'mainland.cco@cfc-kids.org',
            firstName: 'Femi',
            lastName: 'Balogun',
            phone: '+2347010000001',
            locationId: centers[0]!.id,
        },
        {
            email: 'mainland.aco@cfc-kids.org',
            firstName: 'Tope',
            lastName: 'Akinola',
            phone: '+2347010000002',
            locationId: centers[0]!.id,
        },
        {
            email: 'island.cco@cfc-kids.org',
            firstName: 'Seyi',
            lastName: 'Olaitan',
            phone: '+2347010000003',
            locationId: centers[1]!.id,
        },
        {
            email: 'island.aco@cfc-kids.org',
            firstName: 'Tolu',
            lastName: 'Eze',
            phone: '+2347010000004',
            locationId: centers[1]!.id,
        },
        {
            email: 'surulere.cco@cfc-kids.org',
            firstName: 'Bola',
            lastName: 'Adeyemi',
            phone: '+2347010000005',
            locationId: centers[2]!.id,
        },
        {
            email: 'surulere.aco@cfc-kids.org',
            firstName: 'Kemi',
            lastName: 'Okonkwo',
            phone: '+2347010000006',
            locationId: centers[2]!.id,
        },
    ];

    const managers = await Promise.all(
        managerProfiles.map(async (profile) =>
            prismaClient.user.create({
                data: {
                    email: profile.email,
                    password: await hashPassword(DEFAULT_PASSWORD),
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    role: Role.MANAGER,
                    phone: profile.phone,
                },
            }),
        ),
    );

    await Promise.all(
        managers.map((manager, index) =>
            prismaClient.locationManager.create({
                data: {
                    userId: manager.id,
                    locationId: managerProfiles[index]!.locationId,
                },
            }),
        ),
    );

    console.log('👥 Creating teachers and volunteers...');
    const staffProfiles = [
        { email: 'teacher.mainland.1@cfc-kids.org', firstName: 'Ada', lastName: 'Ibrahim', locationIndex: 0, skills: ['TEACHER'] },
        { email: 'teacher.mainland.2@cfc-kids.org', firstName: 'Tina', lastName: 'Ojo', locationIndex: 0, skills: ['TEACHER'] },
        { email: 'volunteer.mainland.1@cfc-kids.org', firstName: 'James', lastName: 'Umeh', locationIndex: 0, skills: ['COORDINATOR', 'VOLUNTEER'] },
        { email: 'teacher.island.1@cfc-kids.org', firstName: 'Precious', lastName: 'Ayo', locationIndex: 1, skills: ['TEACHER'] },
        { email: 'teacher.island.2@cfc-kids.org', firstName: 'Nneka', lastName: 'Taiwo', locationIndex: 1, skills: ['TEACHER'] },
        { email: 'volunteer.island.1@cfc-kids.org', firstName: 'Emeka', lastName: 'Onu', locationIndex: 1, skills: ['COORDINATOR', 'VOLUNTEER'] },
        { email: 'teacher.surulere.1@cfc-kids.org', firstName: 'Yetunde', lastName: 'Sanni', locationIndex: 2, skills: ['TEACHER'] },
        { email: 'teacher.surulere.2@cfc-kids.org', firstName: 'Paul', lastName: 'Ige', locationIndex: 2, skills: ['TEACHER'] },
        { email: 'volunteer.surulere.1@cfc-kids.org', firstName: 'Faith', lastName: 'Ekanem', locationIndex: 2, skills: ['COORDINATOR', 'VOLUNTEER'] },
    ];

    const staffMembers = await Promise.all(
        staffProfiles.map(async (profile) =>
            prismaClient.user.create({
                data: {
                    email: profile.email,
                    password: await hashPassword(DEFAULT_PASSWORD),
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    role: Role.STAFF,
                },
            }),
        ),
    );

    console.log('🎓 Creating certifications for managers and staff...');
    const certOps: Promise<unknown>[] = [];

    managerProfiles.forEach((profile, index) => {
        certOps.push(
            prismaClient.certification.create({
                data: {
                    userId: managers[index]!.id,
                    locationId: profile.locationId,
                },
            }),
        );
    });

    staffProfiles.forEach((profile, index) => {
        certOps.push(
            prismaClient.certification.create({
                data: {
                    userId: staffMembers[index]!.id,
                    locationId: centers[profile.locationIndex]!.id,
                },
            }),
        );
    });

    await Promise.all(certOps);

    console.log('🛠️ Assigning user skills...');
    const skillOps: Promise<unknown>[] = [];

    managers.forEach((manager) => {
        skillOps.push(
            prismaClient.userSkill.create({
                data: {
                    userId: manager.id,
                    skillId: skillByName.COORDINATOR!.id,
                },
            }),
        );
        skillOps.push(
            prismaClient.userSkill.create({
                data: {
                    userId: manager.id,
                    skillId: skillByName.SUPERVISOR!.id,
                },
            }),
        );
    });

    staffProfiles.forEach((profile, index) => {
        profile.skills.forEach((skillName) => {
            const skill = skillByName[skillName];
            if (!skill) {
                return;
            }

            skillOps.push(
                prismaClient.userSkill.create({
                    data: {
                        userId: staffMembers[index]!.id,
                        skillId: skill.id,
                    },
                }),
            );
        });
    });

    await Promise.all(skillOps);

    console.log('📅 Creating baseline availability...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const availabilityOps: Promise<unknown>[] = [];
    const serviceUsersWithLocation = [
        ...managers.map((manager, index) => ({
            userId: manager.id,
            locationId: managerProfiles[index]!.locationId,
        })),
        ...staffMembers.map((staff, index) => ({
            userId: staff.id,
            locationId: centers[staffProfiles[index]!.locationIndex]!.id,
        })),
    ];

    const recurringDays = [0, 1, 2, 3, 4, 5, 6];
    serviceUsersWithLocation.forEach((entry) => {
        recurringDays.forEach((dayOfWeek) => {
            availabilityOps.push(
                prismaClient.availability.create({
                    data: {
                        userId: entry.userId,
                        dayOfWeek,
                        startTime: '05:00',
                        endTime: '21:00',
                        locationId: entry.locationId,
                        isRecurring: true,
                        validFrom: sevenDaysAgo,
                    },
                }),
            );
        });
    });

    await Promise.all(availabilityOps);

    console.log('🧩 Creating recurring event templates per center...');
    const createdById = superAdmins[0]!.id;
    const templateOps: Promise<unknown>[] = [];

    const addTemplate = (params: {
        center: (typeof centers)[number];
        title: string;
        dayOfWeek: number;
        startTimeLocal: string;
        endTimeLocal: string;
        requirements: Array<{ skillName: string; headcountNeeded: number; isOptional?: boolean }>;
    }) => {
        templateOps.push(
            prismaClient.eventTemplate.create({
                data: {
                    title: params.title,
                    scope: EventTemplateScope.LOCATION,
                    locationId: params.center.id,
                    dayOfWeek: params.dayOfWeek,
                    startTimeLocal: params.startTimeLocal,
                    endTimeLocal: params.endTimeLocal,
                    timezone: params.center.timezone,
                    createdById,
                    requirements: {
                        create: params.requirements.map((requirement, index) => ({
                            requiredSkillId: skillByName[requirement.skillName]!.id,
                            headcountNeeded: requirement.headcountNeeded,
                            isOptional: requirement.isOptional ?? false,
                            sortOrder: index,
                        })),
                    },
                },
            }),
        );
    };

    centers.forEach((center) => {
        addTemplate({
            center,
            title: 'Prayer Meeting',
            dayOfWeek: 2,
            startTimeLocal: '19:00',
            endTimeLocal: '20:00',
            requirements: [{ skillName: 'COORDINATOR', headcountNeeded: 1 }],
        });

        addTemplate({
            center,
            title: 'Bible Study',
            dayOfWeek: 4,
            startTimeLocal: '19:00',
            endTimeLocal: '20:00',
            requirements: [{ skillName: 'COORDINATOR', headcountNeeded: 1 }],
        });

        addTemplate({
            center,
            title: 'Trailblazers Church Service',
            dayOfWeek: 0,
            startTimeLocal: '07:00',
            endTimeLocal: '12:00',
            requirements: [{ skillName: 'TEACHER', headcountNeeded: 1 }],
        });

        addTemplate({
            center,
            title: 'Champions Church Service',
            dayOfWeek: 0,
            startTimeLocal: '07:00',
            endTimeLocal: '12:00',
            requirements: [{ skillName: 'TEACHER', headcountNeeded: 1 }],
        });

        addTemplate({
            center,
            title: 'Sunday Service Supervisor (Shared)',
            dayOfWeek: 0,
            startTimeLocal: '07:00',
            endTimeLocal: '12:00',
            requirements: [{ skillName: 'SUPERVISOR', headcountNeeded: 1, isOptional: true }],
        });
    });

    await Promise.all(templateOps);

    console.log('⏱️ Creating sample draft shifts from next week templates (Mainland Center)...');
    const mainland = centers[0]!;
    const nextTuesday = getNextDateForDay(2);
    const nextThursday = getNextDateForDay(4);
    const nextSunday = getNextDateForDay(0);

    await prismaClient.shift.createMany({
        data: [
            {
                locationId: mainland.id,
                title: 'Prayer Meeting',
                startTime: toUtcDate(nextTuesday, '19:00', mainland.timezone),
                endTime: toUtcDate(nextTuesday, '20:00', mainland.timezone),
                requiredSkillId: skillByName.COORDINATOR!.id,
                headcountNeeded: 1,
                status: ShiftStatus.DRAFT,
                isOptional: false,
            },
            {
                locationId: mainland.id,
                title: 'Bible Study',
                startTime: toUtcDate(nextThursday, '19:00', mainland.timezone),
                endTime: toUtcDate(nextThursday, '20:00', mainland.timezone),
                requiredSkillId: skillByName.COORDINATOR!.id,
                headcountNeeded: 1,
                status: ShiftStatus.DRAFT,
                isOptional: false,
            },
            {
                locationId: mainland.id,
                title: 'Trailblazers Church Service',
                startTime: toUtcDate(nextSunday, '07:00', mainland.timezone),
                endTime: toUtcDate(nextSunday, '12:00', mainland.timezone),
                requiredSkillId: skillByName.TEACHER!.id,
                headcountNeeded: 1,
                status: ShiftStatus.DRAFT,
                isOptional: false,
                eventInstanceId: `${mainland.id}-${nextSunday}-sunday-service`,
            },
            {
                locationId: mainland.id,
                title: 'Champions Church Service',
                startTime: toUtcDate(nextSunday, '07:00', mainland.timezone),
                endTime: toUtcDate(nextSunday, '12:00', mainland.timezone),
                requiredSkillId: skillByName.TEACHER!.id,
                headcountNeeded: 1,
                status: ShiftStatus.DRAFT,
                isOptional: false,
                eventInstanceId: `${mainland.id}-${nextSunday}-sunday-service`,
            },
            {
                locationId: mainland.id,
                title: 'Sunday Service Supervisor (Shared)',
                startTime: toUtcDate(nextSunday, '07:00', mainland.timezone),
                endTime: toUtcDate(nextSunday, '12:00', mainland.timezone),
                requiredSkillId: skillByName.SUPERVISOR!.id,
                headcountNeeded: 1,
                status: ShiftStatus.DRAFT,
                isOptional: true,
                eventInstanceId: `${mainland.id}-${nextSunday}-sunday-service`,
            },
        ],
    });

    console.log('\n✅ Church seed completed successfully');
    console.log('\n🔐 Login credentials (all users):');
    console.log(`Password: ${DEFAULT_PASSWORD}`);
    console.log('Super admins: director@cfc-kids.org, asst.director@cfc-kids.org, kids.admin@cfc-kids.org');
    console.log('Center managers: mainland.cco@cfc-kids.org, island.cco@cfc-kids.org, surulere.cco@cfc-kids.org');
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prismaClient.$disconnect();
    });
