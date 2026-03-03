import prismaClient from '../../lib/db/prisma.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors/customErrors.js';
import { calculateDailyHours, calculateWeeklyHours, getConsecutiveDaysWorked } from '../../lib/validation/overtime.js';
import { isUserAvailableAtTime } from '../availability/service.js';
import type { CreateAssignmentPayload, OverrideAssignmentPayload } from './validation.js';

interface Violation {
  type: string;
  severity: 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

interface ValidateAssignmentResult {
  valid: boolean;
  violations: Violation[];
  suggestions?: Array<{ userId: string; name: string; reason: string }>;
}

/**
 * Find overlapping shifts for a user in a date range
 */
export const findOverlappingShifts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string
): Promise<Array<{ shiftId: string; startTime: Date; endTime: Date; locationName: string }>> => {
  const overlapping = await prismaClient.shiftAssignment.findMany({
    where: {
      userId,
      shift: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        status: 'PUBLISHED',
        ...(excludeShiftId && { NOT: { id: excludeShiftId } }),
      },
    },
    include: {
      shift: {
        include: {
          location: {
            select: { name: true },
          },
        },
      },
    },
  });

  return overlapping.map((a) => ({
    shiftId: a.shift.id,
    startTime: a.shift.startTime,
    endTime: a.shift.endTime,
    locationName: a.shift.location.name,
  }));
};

/**
 * Check if headcount limit exceeded for shift
 */
export const checkHeadcountNotExceeded = async (shiftId: string): Promise<boolean> => {
  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  if (!shift) throw new NotFoundError('Shift not found', { shiftId });

  return shift._count.assignments < shift.headcountNeeded;
};

/**
 * Main validation function: check all constraints
 * Returns violations array if any check fails
 */
export const validateShiftAssignment = async (
  shiftId: string,
  userId: string
): Promise<ValidateAssignmentResult> => {
  const violations: Violation[] = [];

  // 1. Shift and user exist
  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
    include: {
      location: true,
      requiredSkill: true,
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found', { userId });
  }

  // 2. Headcount not exceeded
  const headcountOk = await checkHeadcountNotExceeded(shiftId);
  if (!headcountOk) {
    violations.push({
      type: 'headcount_exceeded',
      severity: 'error',
      message: `Shift is at full capacity (${shift.headcountNeeded} staff needed)`,
      details: { required: shift.headcountNeeded },
    });
    return { valid: false, violations };
  }

  // 3. User not already assigned
  const existing = await prismaClient.shiftAssignment.findFirst({
    where: { shiftId, userId },
  });

  if (existing) {
    violations.push({
      type: 'already_assigned',
      severity: 'error',
      message: `User is already assigned to this shift`,
    });
    return { valid: false, violations };
  }

  // 4. User certified for location
  const certification = await prismaClient.certification.findFirst({
    where: {
      userId,
      locationId: shift.locationId,
      revokedAt: null,
    },
  });

  if (!certification) {
    violations.push({
      type: 'not_certified',
      severity: 'error',
      message: `User is not certified to work at ${shift.location.name}`,
      details: { locationId: shift.locationId },
    });
  }

  // 5. User has required skill
  const userSkill = await prismaClient.userSkill.findFirst({
    where: {
      userId,
      skillId: shift.requiredSkillId,
    },
  });

  if (!userSkill) {
    violations.push({
      type: 'skill_missing',
      severity: 'error',
      message: `User does not have the required skill: ${shift.requiredSkill.name}`,
      details: { requiredSkillId: shift.requiredSkillId, skillName: shift.requiredSkill.name },
    });
  }

  // Stop on hard blocks
  if (violations.some((v) => v.severity === 'error')) {
    return { valid: false, violations };
  }

  // 6. User available at shift time
  const availability = await isUserAvailableAtTime(
    userId,
    shift.startTime,
    (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60),
    shift.locationId
  );

  if (!availability.available) {
    violations.push({
      type: 'availability_conflict',
      severity: 'error',
      message: availability.reason || 'User is not available during shift time',
    });
  }

  // 7. No overlapping shifts
  const overlaps = await findOverlappingShifts(userId, shift.startTime, shift.endTime);
  if (overlaps.length > 0) {
    overlaps.forEach((overlap) => {
      violations.push({
        type: 'overlap',
        severity: 'error',
        message: `User is already scheduled at ${overlap.locationName} from ${overlap.startTime.toISOString()} to ${overlap.endTime.toISOString()}`,
        details: { conflictingShiftId: overlap.shiftId },
      });
    });
  }

  // 8. 10-hour gap from previous shift
  const previousShifts = await prismaClient.shiftAssignment.findMany({
    where: {
      userId,
      shift: {
        endTime: { lt: shift.startTime },
        status: 'PUBLISHED',
      },
    },
    include: {
      shift: {
        select: { endTime: true },
      },
    },
    orderBy: {
      shift: {
        endTime: 'desc',
      },
    },
    take: 1,
  });

  if (previousShifts.length > 0) {
    const lastShift = previousShifts[0]!.shift;
    const gapHours = (shift.startTime.getTime() - lastShift.endTime.getTime()) / (1000 * 60 * 60);

    if (gapHours < 10) {
      violations.push({
        type: 'gap_too_short_before',
        severity: 'error',
        message: `Insufficient gap before shift. User needs 10 hours between shifts, but only ${Math.round(gapHours * 10) / 10} hours available`,
        details: { gapHours },
      });
    }
  }

  // 9. 10-hour gap to next shift
  const nextShifts = await prismaClient.shiftAssignment.findMany({
    where: {
      userId,
      shift: {
        startTime: { gt: shift.endTime },
        status: 'PUBLISHED',
      },
    },
    include: {
      shift: {
        select: { startTime: true },
      },
    },
    orderBy: {
      shift: {
        startTime: 'asc',
      },
    },
    take: 1,
  });

  if (nextShifts.length > 0) {
    const nextShift = nextShifts[0]!.shift;
    const gapHours = (nextShift.startTime.getTime() - shift.endTime.getTime()) / (1000 * 60 * 60);

    if (gapHours < 10) {
      violations.push({
        type: 'gap_too_short_after',
        severity: 'error',
        message: `Insufficient gap after shift. User needs 10 hours between shifts, but only ${Math.round(gapHours * 10) / 10} hours available`,
        details: { gapHours },
      });
    }
  }

  // Stop on more hard blocks
  if (violations.some((v) => v.severity === 'error')) {
    return { valid: false, violations };
  }

  // 10. Daily hours limit (8h warning, 12h block)
  const shiftDurationHours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
  const dailyHours = await calculateDailyHours(userId, shift.startTime);
  const totalDailyHours = dailyHours + shiftDurationHours;

  if (totalDailyHours > 12) {
    violations.push({
      type: 'daily_hours_exceeded',
      severity: 'error',
      message: `This would exceed daily 12-hour limit. User would work ${Math.round(totalDailyHours * 10) / 10} hours`,
      details: { currentDailyHours: dailyHours, totalDailyHours },
    });
  } else if (totalDailyHours > 8) {
    violations.push({
      type: 'daily_hours_warning',
      severity: 'warning',
      message: `Daily hours approaching 8-hour warning threshold. User would work ${Math.round(totalDailyHours * 10) / 10} hours`,
      details: { currentDailyHours: dailyHours, totalDailyHours },
    });
  }

  // Stop on hard daily hour block
  if (violations.some((v) => v.type === 'daily_hours_exceeded')) {
    return { valid: false, violations };
  }

  // 11. Weekly hours limit (40h warning, 60h block)
  const weekStart = new Date(shift.startTime);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Monday
  weekStart.setUTCHours(0, 0, 0, 0);

  const weeklyHours = await calculateWeeklyHours(userId, weekStart);
  const totalWeeklyHours = weeklyHours + shiftDurationHours;

  if (totalWeeklyHours > 60) {
    violations.push({
      type: 'weekly_hours_exceeded',
      severity: 'error',
      message: `This would exceed weekly 60-hour hard limit. User would work ${Math.round(totalWeeklyHours * 10) / 10} hours`,
      details: { currentWeeklyHours: weeklyHours, totalWeeklyHours },
    });
  } else if (totalWeeklyHours > 40) {
    violations.push({
      type: 'weekly_hours_warning',
      severity: 'warning',
      message: `Weekly hours approaching 40-hour standard. User would work ${Math.round(totalWeeklyHours * 10) / 10} hours`,
      details: { currentWeeklyHours: weeklyHours, totalWeeklyHours },
    });
  }

  // Stop on hard weekly hour block
  if (violations.some((v) => v.type === 'weekly_hours_exceeded')) {
    return { valid: false, violations };
  }

  // 12. Consecutive days (6th warning, 7th block)
  const consecutiveDays = await getConsecutiveDaysWorked(userId, shift.startTime);

  if (consecutiveDays >= 7) {
    violations.push({
      type: 'consecutive_days_max',
      severity: 'error',
      message: `User has worked ${consecutiveDays} consecutive days. Maximum is 7 (requires manager override)`,
      details: { consecutiveDays },
    });
  } else if (consecutiveDays === 6) {
    violations.push({
      type: 'consecutive_days_warning',
      severity: 'warning',
      message: `This would be the user's 7th consecutive day. Consider allowing rest`,
      details: { consecutiveDays },
    });
  }

  // Final check: return valid if no errors
  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    valid: !hasErrors,
    violations,
  };
};

/**
 * Create a new shift assignment
 */
export const createAssignment = async (shiftId: string, payload: CreateAssignmentPayload) => {
  const assignment = await prismaClient.shiftAssignment.create({
    data: {
      shiftId,
      userId: payload.userId,
      status: 'ASSIGNED',
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      shift: {
        include: {
          location: true,
          requiredSkill: true,
        },
      },
    },
  });

  return assignment;
};

/**
 * Delete a shift assignment
 */
export const deleteAssignment = async (assignmentId: string) => {
  const assignment = await prismaClient.shiftAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      shift: true,
    },
  });

  if (!assignment) {
    throw new NotFoundError('Assignment not found', { assignmentId });
  }

  // Check 48-hour rule
  if (assignment.shift.status === 'PUBLISHED') {
    const hoursUntilShift = (assignment.shift.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilShift < 48) {
      throw new ConflictError(
        'Cannot remove assignment within 48 hours of shift start time',
        { assignmentId, hoursUntilShift },
        ['Assignments must be removed at least 48 hours before shift start.']
      );
    }
  }

  await prismaClient.shiftAssignment.delete({
    where: { id: assignmentId },
  });

  return { message: 'Assignment removed successfully' };
};

/**
 * Get eligible staff for a shift (with validation results for each)
 */
export const getEligibleStaff = async (
  shiftId: string,
  limit: number = 20,
  search?: string
): Promise<
  Array<{
    userId: string;
    name: string;
    available: boolean;
    warnings: Violation[];
    message: string;
  }>
> => {
  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
    include: {
      location: true,
      requiredSkill: true,
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  // Get all staff with required skill and location certification
  const staff = await prismaClient.user.findMany({
    where: {
      role: 'STAFF',
      skills: {
        some: {
          skillId: shift.requiredSkillId,
        },
      },
      certifications: {
        some: {
          locationId: shift.locationId,
          revokedAt: null,
        },
      },
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    take: limit,
  });

  // Validate each staff member
  const eligibleStaff = await Promise.all(
    staff.map(async (user) => {
      const validation = await validateShiftAssignment(shiftId, user.id);

      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        available: validation.valid,
        warnings: validation.violations,
        message: validation.valid
          ? 'Available and qualified'
          : validation.violations.find((v) => v.severity === 'error')?.message ||
            'Not available',
      };
    })
  );

  return eligibleStaff;
};

/**
 * Create assignment with override (manager only)
 */
export const createAssignmentWithOverride = async (
  shiftId: string,
  payload: OverrideAssignmentPayload,
  managerRole: string
) => {
  // Check role
  if (managerRole !== 'MANAGER' && managerRole !== 'ADMIN') {
    throw new ForbiddenError('Only managers can override constraints', { role: managerRole });
  }

  // Validate but allow non-critical violations
  const validation = await validateShiftAssignment(shiftId, payload.userId);

  // Still enforce hard blocks (7th consecutive day, 12h daily, 60h weekly)
  const hardBlocks = validation.violations.filter(
    (v) =>
      v.severity === 'error' &&
      ['consecutive_days_max', 'daily_hours_exceeded', 'weekly_hours_exceeded'].includes(v.type)
  );

  if (hardBlocks.length > 0) {
    throw new ValidationError(
      'Cannot override hard constraints. Contact system administrator.',
      { violations: hardBlocks },
      ['7th consecutive day, 12-hour daily limit, and 60-hour weekly limit cannot be overridden.']
    );
  }

  // Create assignment
  const assignment = await createAssignment(shiftId, { userId: payload.userId });

  return {
    ...assignment,
    overrideReason: payload.reason,
    overriddenViolations: validation.violations.filter((v) => v.severity === 'warning'),
  };
};
