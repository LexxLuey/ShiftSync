import { Role, ShiftStatus, AssignmentStatus, SwapType, SwapStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import prismaClient from '../src/lib/db/prisma.js';

const SALT_ROUNDS = 10;

// Helper to hash passwords
const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

// Date helpers for shifts
const getMonday = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const addHours = (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await prismaClient.auditLog.deleteMany();
    await prismaClient.swapRequest.deleteMany();
    await prismaClient.shiftAssignment.deleteMany();
    await prismaClient.shift.deleteMany();
    await prismaClient.exception.deleteMany();
    await prismaClient.availability.deleteMany();
    await prismaClient.userSkill.deleteMany();
    await prismaClient.certification.deleteMany();
    await prismaClient.locationManager.deleteMany();
    await prismaClient.location.deleteMany();
    await prismaClient.skill.deleteMany();
    await prismaClient.user.deleteMany();

    // ===== SKILLS =====
    console.log('📋 Creating skills...');
    const skills = await Promise.all([
        prismaClient.skill.create({ data: { name: 'bartender' } }),
        prismaClient.skill.create({ data: { name: 'line_cook' } }),
        prismaClient.skill.create({ data: { name: 'server' } }),
        prismaClient.skill.create({ data: { name: 'host' } }),
        prismaClient.skill.create({ data: { name: 'dishwasher' } }),
        prismaClient.skill.create({ data: { name: 'manager' } }),
    ]);
    console.log(`✅ Created ${skills.length} skills`);

    // ===== USERS =====
    console.log('👥 Creating users...');
    
    // Admin
    const admin = await prismaClient.user.create({
        data: {
            email: 'admin@shiftsync.com',
            password: await hashPassword('AdminPass123'),
            firstName: 'Alex',
            lastName: 'Administrator',
            role: Role.ADMIN,
            phone: faker.phone.number(),
        },
    });

    // Managers (1 per location)
    const managers = await Promise.all([
        prismaClient.user.create({
            data: {
                email: 'manager1@shiftsync.com',
                password: await hashPassword('ManagerPass123'),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                role: Role.MANAGER,
                phone: faker.phone.number(),
            },
        }),
        prismaClient.user.create({
            data: {
                email: 'manager2@shiftsync.com',
                password: await hashPassword('ManagerPass123'),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                role: Role.MANAGER,
                phone: faker.phone.number(),
            },
        }),
        prismaClient.user.create({
            data: {
                email: 'manager3@shiftsync.com',
                password: await hashPassword('ManagerPass123'),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                role: Role.MANAGER,
                phone: faker.phone.number(),
            },
        }),
        prismaClient.user.create({
            data: {
                email: 'manager4@shiftsync.com',
                password: await hashPassword('ManagerPass123'),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                role: Role.MANAGER,
                phone: faker.phone.number(),
            },
        }),
    ]);

    // Staff (20 members with diverse names)
    const staffMembers = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
            return prismaClient.user.create({
                data: {
                    email: `staff${i + 1}@shiftsync.com`,
                    password: await hashPassword('StaffPass123'),
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    role: Role.STAFF,
                    phone: faker.phone.number(),
                },
            });
        })
    );

    console.log(`✅ Created 1 admin, ${managers.length} managers, ${staffMembers.length} staff`);

    // ===== LOCATIONS =====
    console.log('📍 Creating locations...');
    const locations = await Promise.all([
        prismaClient.location.create({
            data: {
                name: 'Downtown',
                address: '123 Main St, Los Angeles, CA 90012',
                timezone: 'America/Los_Angeles',
            },
        }),
        prismaClient.location.create({
            data: {
                name: 'Pier 39',
                address: 'Pier 39, San Francisco, CA 94133',
                timezone: 'America/Los_Angeles',
            },
        }),
        prismaClient.location.create({
            data: {
                name: 'Financial District',
                address: '45 Wall St, New York, NY 10005',
                timezone: 'America/New_York',
            },
        }),
        prismaClient.location.create({
            data: {
                name: 'Brooklyn Heights',
                address: '78 Montague St, Brooklyn, NY 11201',
                timezone: 'America/New_York',
            },
        }),
    ]);
    console.log(`✅ Created ${locations.length} locations`);

    // ===== LOCATION MANAGERS =====
    console.log('🔗 Assigning managers to locations...');
    await Promise.all([
        prismaClient.locationManager.create({ data: { userId: managers[0].id, locationId: locations[0].id } }),
        prismaClient.locationManager.create({ data: { userId: managers[1].id, locationId: locations[1].id } }),
        prismaClient.locationManager.create({ data: { userId: managers[2].id, locationId: locations[2].id } }),
        prismaClient.locationManager.create({ data: { userId: managers[3].id, locationId: locations[3].id } }),
    ]);
    console.log('✅ Managers assigned to locations');

    // ===== CERTIFICATIONS =====
    console.log('🎓 Creating certifications...');
    const certifications = [];
    
    // All staff certified for at least 1 location
    // First 10 staff: certified for location 0
    // Next 5 staff: certified for location 1 and 2 (multi-location)
    // Last 5 staff: certified for location 3
    for (let i = 0; i < 10; i++) {
        certifications.push(
            prismaClient.certification.create({ data: { userId: staffMembers[i].id, locationId: locations[0].id } })
        );
    }
    for (let i = 10; i < 15; i++) {
        certifications.push(
            prismaClient.certification.create({ data: { userId: staffMembers[i].id, locationId: locations[1].id } }),
            prismaClient.certification.create({ data: { userId: staffMembers[i].id, locationId: locations[2].id } })
        );
    }
    for (let i = 15; i < 20; i++) {
        certifications.push(
            prismaClient.certification.create({ data: { userId: staffMembers[i].id, locationId: locations[3].id } })
        );
    }
    
    await Promise.all(certifications);
    console.log(`✅ Created ${certifications.length} certifications`);

    // ===== USER SKILLS =====
    console.log('🛠️ Assigning skills to staff...');
    const userSkills: Promise<any>[] = [];
    
    // Mix of skills (1-2 skills per staff)
    staffMembers.forEach((staff: any, i: number) => {
        const primarySkillIndex = i % 5; // Cycle through bartender, line_cook, server, host, dishwasher
        userSkills.push(
            prismaClient.userSkill.create({
                data: { userId: staff.id, skillId: skills[primarySkillIndex].id },
            })
        );
        
        // Some staff get 2 skills
        if (i % 3 === 0 && i < 15) {
            const secondarySkillIndex = (i + 1) % 5;
            userSkills.push(
                prismaClient.userSkill.create({
                    data: { userId: staff.id, skillId: skills[secondarySkillIndex].id },
                })
            );
        }
    });
    
    await Promise.all(userSkills);
    console.log(`✅ Created ${userSkills.length} user skills`);

    // ===== AVAILABILITY =====
    console.log('📅 Creating availability patterns...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const availabilityRecords = [];
    
    // Full-time staff (first 5): Mon-Fri 9am-5pm
    for (let i = 0; i < 5; i++) {
        for (let day = 1; day <= 5; day++) {
            availabilityRecords.push(
                prismaClient.availability.create({
                    data: {
                        userId: staffMembers[i].id,
                        dayOfWeek: day,
                        startTime: '09:00',
                        endTime: '17:00',
                        isRecurring: true,
                        validFrom: sevenDaysAgo,
                    },
                })
            );
        }
    }
    
    // Part-time evening (next 7): Mon-Fri 5pm-11pm
    for (let i = 5; i < 12; i++) {
        for (let day = 1; day <= 5; day++) {
            availabilityRecords.push(
                prismaClient.availability.create({
                    data: {
                        userId: staffMembers[i].id,
                        dayOfWeek: day,
                        startTime: '17:00',
                        endTime: '23:00',
                        isRecurring: true,
                        validFrom: sevenDaysAgo,
                    },
                })
            );
        }
    }
    
    // Weekend-only (next 4): Sat-Sun 10am-11pm
    for (let i = 12; i < 16; i++) {
        for (let day of [6, 0]) {
            availabilityRecords.push(
                prismaClient.availability.create({
                    data: {
                        userId: staffMembers[i].id,
                        dayOfWeek: day,
                        startTime: '10:00',
                        endTime: '23:00',
                        isRecurring: true,
                        validFrom: sevenDaysAgo,
                    },
                })
            );
        }
    }
    
    // Mixed patterns (last 4): varied
    for (let i = 16; i < 20; i++) {
        availabilityRecords.push(
            prismaClient.availability.create({
                data: {
                    userId: staffMembers[i].id,
                    dayOfWeek: 2, // Tuesday
                    startTime: '10:00',
                    endTime: '18:00',
                    isRecurring: true,
                    validFrom: sevenDaysAgo,
                },
            }),
            prismaClient.availability.create({
                data: {
                    userId: staffMembers[i].id,
                    dayOfWeek: 4, // Thursday
                    startTime: '14:00',
                    endTime: '22:00',
                    isRecurring: true,
                    validFrom: sevenDaysAgo,
                },
            })
        );
    }
    
    await Promise.all(availabilityRecords);
    console.log(`✅ Created ${availabilityRecords.length} availability records`);

    // ===== EXCEPTIONS =====
    console.log('⚠️ Creating exceptions...');
    const nextWeek = addDays(new Date(), 7);
    
    // Staff member on vacation next week
    const vacationExceptions = [];
    for (let i = 0; i < 7; i++) {
        const vacationDate = addDays(nextWeek, i);
        vacationExceptions.push(
            prismaClient.exception.create({
                data: {
                    userId: staffMembers[0].id,
                    date: vacationDate,
                    // No start/end time means full day unavailable
                },
            })
        );
    }
    
    // Doctor appointment Tuesday 2-4pm
    const nextTuesday = addDays(getMonday(new Date()), 8); // Next week Tuesday
    const doctorAppointment = prismaClient.exception.create({
        data: {
            userId: staffMembers[1].id,
            date: nextTuesday,
            startTime: '14:00',
            endTime: '16:00',
        },
    });
    
    await Promise.all([...vacationExceptions, doctorAppointment]);
    console.log(`✅ Created ${vacationExceptions.length + 1} exceptions`);

    // ===== SHIFTS =====
    console.log('⏰ Creating shifts...');
    const currentWeek = getMonday(new Date());
    const nextWeekStart = addDays(currentWeek, 7);
    
    // Helper to create shift at specific day/hour
    const createShift = (locationId: string, skillId: string, baseDate: Date, dayOffset: number, startHour: number, durationHours: number, headcount: number = 1) => {
        const shiftDate = addDays(baseDate, dayOffset);
        const startTime = new Date(shiftDate);
        startTime.setUTCHours(startHour, 0, 0, 0);
        const endTime = addHours(startTime, durationHours);
        
        return prismaClient.shift.create({
            data: {
                locationId,
                requiredSkillId: skillId,
                startTime,
                endTime,
                headcountNeeded: headcount,
                status: ShiftStatus.PUBLISHED,
                publishedAt: new Date(),
            },
        });
    };
    
    const shifts = [];
    
    // CURRENT WEEK - Partial schedule (15-20 shifts)
    // Monday shifts
    shifts.push(createShift(locations[0].id, skills[2].id, currentWeek, 0, 17, 6)); // Server 5pm-11pm
    shifts.push(createShift(locations[0].id, skills[0].id, currentWeek, 0, 18, 5)); // Bartender 6pm-11pm
    
    // Wednesday shifts
    shifts.push(createShift(locations[1].id, skills[1].id, currentWeek, 2, 16, 8, 2)); // Line cook 4pm-12am, headcount=2
    shifts.push(createShift(locations[1].id, skills[2].id, currentWeek, 2, 17, 6)); // Server 5pm-11pm
    
    // Friday shifts (PREMIUM - 6pm+)
    shifts.push(createShift(locations[0].id, skills[0].id, currentWeek, 4, 18, 5)); // Bartender 6pm-11pm (PREMIUM)
    shifts.push(createShift(locations[0].id, skills[2].id, currentWeek, 4, 18, 5)); // Server 6pm-11pm (PREMIUM)
    shifts.push(createShift(locations[2].id, skills[0].id, currentWeek, 4, 19, 6)); // Bartender 7pm-1am (PREMIUM)
    
    // Saturday shifts (PREMIUM)
    shifts.push(createShift(locations[0].id, skills[0].id, currentWeek, 5, 12, 8)); // Bartender 12pm-8pm (PREMIUM)
    shifts.push(createShift(locations[0].id, skills[2].id, currentWeek, 5, 17, 6, 2)); // Server 5pm-11pm (PREMIUM), headcount=2
    shifts.push(createShift(locations[3].id, skills[1].id, currentWeek, 5, 16, 7)); // Line cook 4pm-11pm
    
    // NEXT WEEK - Full schedule (25-30 shifts)
    // Monday through Sunday, multiple shifts per day
    for (let day = 0; day < 7; day++) {
        // Morning shifts
        shifts.push(createShift(locations[0].id, skills[1].id, nextWeekStart, day, 14, 8)); // Line cook 2pm-10pm
        
        // Evening shifts
        shifts.push(createShift(locations[1].id, skills[2].id, nextWeekStart, day, 17, 6)); // Server 5pm-11pm
        
        if (day < 5) { // Weekdays
            shifts.push(createShift(locations[2].id, skills[3].id, nextWeekStart, day, 16, 5)); // Host 4pm-9pm
        }
        
        if (day >= 5) { // Weekends
            shifts.push(createShift(locations[0].id, skills[0].id, nextWeekStart, day, 18, 6, 2)); // Bartender 6pm-12am, headcount=2
            shifts.push(createShift(locations[3].id, skills[2].id, nextWeekStart, day, 12, 8)); // Server 12pm-8pm
        }
    }
    
    // UNDER-STAFFED SHIFT (headcount=2, will assign only 1)
    shifts.push(createShift(locations[0].id, skills[2].id, currentWeek, 3, 17, 6, 2)); // Thursday, headcount=2
    const underStaffedShiftIndex = shifts.length - 1;
    
    const createdShifts = await Promise.all(shifts);
    console.log(`✅ Created ${createdShifts.length} shifts`);

    // ===== SHIFT ASSIGNMENTS =====
    console.log('👷 Creating shift assignments...');
    const assignments = [];
    
    // Assign staff to most shifts (but leave some under-staffed)
    // Staff member for OVERTIME scenario: staffMembers[2] will have 35+ hours
    
    // Assign staffMembers[2] to multiple shifts (35+ hours total)
    // 5 shifts x 7 hours each = 35 hours
    for (let i = 0; i < 5; i++) {
        if (createdShifts[i]) {
            assignments.push(
                prismaClient.shiftAssignment.create({
                    data: {
                        shiftId: createdShifts[i].id,
                        userId: staffMembers[2].id,
                        status: AssignmentStatus.ASSIGNED,
                    },
                })
            );
        }
    }
    
    // One more 8-hour shift for staffMembers[2] = 43 hours total (OVERTIME!)
    if (createdShifts[5]) {
        assignments.push(
            prismaClient.shiftAssignment.create({
                data: {
                    shiftId: createdShifts[5].id,
                    userId: staffMembers[2].id,
                    status: AssignmentStatus.ASSIGNED,
                },
            })
        );
    }
    
    // CONFLICT scenario: staffMembers[3] in overlapping shifts
    // Assign to shift at 5pm-11pm and another at 6pm-11pm (overlap!)
    if (createdShifts[6] && createdShifts[7]) {
        assignments.push(
            prismaClient.shiftAssignment.create({
                data: {
                    shiftId: createdShifts[6].id,
                    userId: staffMembers[3].id,
                    status: AssignmentStatus.ASSIGNED,
                },
            }),
            prismaClient.shiftAssignment.create({
                data: {
                    shiftId: createdShifts[7].id,
                    userId: staffMembers[3].id,
                    status: AssignmentStatus.ASSIGNED,
                },
            })
        );
    }
    
    // UNDER-STAFFED: Assign only 1 person to the headcount=2 shift
    const underStaffedShiftCreated = createdShifts[underStaffedShiftIndex];
    if (underStaffedShiftCreated) {
        assignments.push(
            prismaClient.shiftAssignment.create({
                data: {
                    shiftId: underStaffedShiftCreated.id,
                    userId: staffMembers[4].id,
                    status: AssignmentStatus.ASSIGNED,
                },
            })
        );
    }
    
    // Assign other staff to remaining shifts
    for (let i = 10; i < Math.min(createdShifts.length, 25); i++) {
        const staffIndex = (i - 10) % staffMembers.length;
        if (staffMembers[staffIndex] && createdShifts[i]) {
            assignments.push(
                prismaClient.shiftAssignment.create({
                    data: {
                        shiftId: createdShifts[i].id,
                        userId: staffMembers[staffIndex].id,
                        status: AssignmentStatus.ASSIGNED,
                    },
                })
            );
        }
    }
    
    await Promise.all(assignments);
    console.log(`✅ Created ${assignments.length} assignments`);

    // ===== SWAP REQUESTS =====
    console.log('🔄 Creating swap requests...');
    
    // PENDING swap: Staff5 wants to swap with Staff6 (awaiting target)
    const pendingSwap = await prismaClient.swapRequest.create({
        data: {
            shiftId: createdShifts[10]?.id || createdShifts[0].id,
            requestingUserId: staffMembers[5].id,
            targetUserId: staffMembers[6].id,
            type: SwapType.SWAP,
            status: SwapStatus.PENDING,
            expiresAt: addDays(new Date(), 7),
        },
    });
    
    // PENDING approval: Staff7 dropped, Staff8 accepted, awaiting manager
    const pendingApproval = await prismaClient.swapRequest.create({
        data: {
            shiftId: createdShifts[11]?.id || createdShifts[1].id,
            requestingUserId: staffMembers[7].id,
            targetUserId: staffMembers[8].id,
            type: SwapType.DROP,
            status: SwapStatus.PENDING,
            expiresAt: addHours(new Date(), 6),
        },
    });
    
    // EXPIRED request
    const expiredRequest = await prismaClient.swapRequest.create({
        data: {
            shiftId: createdShifts[12]?.id || createdShifts[2].id,
            requestingUserId: staffMembers[9].id,
            targetUserId: staffMembers[10].id,
            type: SwapType.SWAP,
            status: SwapStatus.EXPIRED,
            expiresAt: addHours(new Date(), -12), // Expired 12 hours ago
            createdAt: addDays(new Date(), -2),
        },
    });
    
    // CANCELLED request
    const cancelledRequest = await prismaClient.swapRequest.create({
        data: {
            shiftId: createdShifts[13]?.id || createdShifts[3].id,
            requestingUserId: staffMembers[11].id,
            type: SwapType.DROP,
            status: SwapStatus.CANCELLED,
            expiresAt: addDays(new Date(), 1),
            createdAt: addDays(new Date(), -1),
        },
    });
    
    console.log('✅ Created 4 swap requests');

    // ===== AUDIT LOGS =====
    console.log('📝 Creating audit logs...');
    
    await Promise.all([
        prismaClient.auditLog.create({
            data: {
                userId: managers[0].id,
                action: 'shift_created',
                entityType: 'Shift',
                entityId: createdShifts[0].id,
                afterState: { shiftId: createdShifts[0].id, status: 'PUBLISHED' },
                createdAt: addHours(new Date(), -12),
            },
        }),
        prismaClient.auditLog.create({
            data: {
                userId: managers[0].id,
                action: 'assignment_created',
                entityType: 'ShiftAssignment',
                entityId: createdShifts[0].id,
                beforeState: { assignedCount: 0 },
                afterState: { assignedCount: 1, userId: staffMembers[0].id },
                createdAt: addHours(new Date(), -6),
            },
        }),
        prismaClient.auditLog.create({
            data: {
                userId: managers[1].id,
                action: 'swap_approved',
                entityType: 'SwapRequest',
                entityId: pendingSwap.id,
                beforeState: { status: 'PENDING' },
                afterState: { status: 'APPROVED' },
                createdAt: addHours(new Date(), -3),
            },
        }),
        prismaClient.auditLog.create({
            data: {
                userId: admin.id,
                action: 'shift_published',
                entityType: 'Shift',
                entityId: createdShifts[5].id,
                beforeState: { status: 'DRAFT' },
                afterState: { status: 'PUBLISHED' },
                createdAt: addHours(new Date(), -24),
            },
        }),
    ]);
    
    console.log('✅ Created 4 audit logs');

    // ===== SUMMARY =====
    console.log('\n🎉 Seed complete!');
    console.log('\n📊 Summary:');
    console.log(`   Users: 1 admin, ${managers.length} managers, ${staffMembers.length} staff`);
    console.log(`   Locations: ${locations.length}`);
    console.log(`   Skills: ${skills.length}`);
    console.log(`   Shifts: ${createdShifts.length}`);
    console.log(`   Assignments: ${assignments.length}`);
    console.log(`   Swap Requests: 4`);
    console.log(`   Audit Logs: 4`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: admin@shiftsync.com / AdminPass123');
    console.log('   Manager: manager1@shiftsync.com / ManagerPass123');
    console.log('   Staff: staff1@shiftsync.com / StaffPass123');
    console.log('\n💡 Scenarios included:');
    console.log('   ✓ Overtime: staffMembers[2] has 43 hours (35+8)');
    console.log('   ✓ Conflict: staffMembers[3] in overlapping shifts');
    console.log('   ✓ Under-staffed: 1 shift with headcount=2, only 1 assigned');
    console.log('   ✓ Premium shifts: Friday/Saturday evenings');
    console.log('   ✓ Swap requests: PENDING, PENDING_APPROVAL, EXPIRED, CANCELLED');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prismaClient.$disconnect();
    });
