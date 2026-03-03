import prismaClient from '../../lib/db/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors/customErrors.js';
import { calculateHoursInRange, calculateWeeklyHours, getConsecutiveDaysWorked } from '../../lib/validation/overtime.js';
import { PREMIUM_SHIFT_CONFIG } from '../../lib/constants/premium-shifts.js';

/**
 * Fairness Report - Calculate fairness score for each staff member
 * Fairness score = (premium % / total %) - higher is better distribution
 */
export const getFairnessReport = async (
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<
  Array<{
    userId: string;
    userName: string;
    totalHours: number;
    premiumShiftCount: number;
    totalShiftCount: number;
    premiumPercentage: number;
    hoursPercentage: number;
    fairnessScore: number;
  }>
> => {
  // Fetch all shifts in period with assignments
  const shifts = await prismaClient.shift.findMany({
    where: {
      locationId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      status: 'PUBLISHED',
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  // Group by user and calculate metrics
  const userMetrics = new Map<
    string,
    {
      userId: string;
      userName: string;
      totalHours: number;
      premiumShiftCount: number;
      totalShiftCount: number;
    }
  >();

  for (const shift of shifts) {
    const isPremium = PREMIUM_SHIFT_CONFIG.isPremiumShift(shift);
    const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    for (const assignment of shift.assignments) {
      const key = assignment.userId;
      const existing = userMetrics.get(key) || {
        userId: assignment.userId,
        userName: `${assignment.user.firstName} ${assignment.user.lastName}`,
        totalHours: 0,
        premiumShiftCount: 0,
        totalShiftCount: 0,
      };

      existing.totalHours += durationHours;
      existing.totalShiftCount += 1;
      if (isPremium) {
        existing.premiumShiftCount += 1;
      }

      userMetrics.set(key, existing);
    }
  }

  // Calculate percentages and fairness scores
  const results = Array.from(userMetrics.values()).map((metric) => {
    const totalShifts = userMetrics.size > 0 ? Array.from(userMetrics.values()).reduce((sum, m) => sum + m.totalShiftCount, 0) : 1;
    const totalPremium = userMetrics.size > 0 ? Array.from(userMetrics.values()).reduce((sum, m) => sum + m.premiumShiftCount, 0) : 1;
    const totalHours = userMetrics.size > 0 ? Array.from(userMetrics.values()).reduce((sum, m) => sum + m.totalHours, 0) : 1;

    const hoursPercentage = totalHours > 0 ? (metric.totalHours / totalHours) * 100 : 0;
    const premiumPercentage = totalPremium > 0 ? (metric.premiumShiftCount / totalPremium) * 100 : 0;

    // Fairness score: if equal, score = 1.0; if fewer premium, score < 1.0
    const fairnessScore =
      metric.totalHours > 0
        ? (premiumPercentage / Math.max(hoursPercentage, 0.1)) // Avoid division by near-zero
        : 1.0;

    return {
      userId: metric.userId,
      userName: metric.userName,
      totalHours: Math.round(metric.totalHours * 100) / 100,
      premiumShiftCount: metric.premiumShiftCount,
      totalShiftCount: metric.totalShiftCount,
      premiumPercentage: Math.round(premiumPercentage * 100) / 100,
      hoursPercentage: Math.round(hoursPercentage * 100) / 100,
      fairnessScore: Math.round(fairnessScore * 100) / 100,
    };
  });

  // Sort by fairness score (highest first = most premium)
  return results.sort((a, b) => a.fairnessScore - b.fairnessScore);
};

/**
 * Hours Distribution - Weekly breakdown by user with daily details
 */
export const getHoursDistribution = async (locationId: string, weekStartDate: Date) => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const assignments = await prismaClient.shiftAssignment.findMany({
    where: {
      shift: {
        locationId,
        startTime: { gte: weekStartDate },
        endTime: { lte: weekEndDate },
        status: 'PUBLISHED',
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      shift: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  // Group by user
  const userMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      dailyBreakdown: { [date: string]: number };
      weeklyTotal: number;
      consecutiveDaysWorked: number;
      overtimeStatus: 'under' | 'warning' | 'overtime';
    }
  >();

  for (const assignment of assignments) {
    const key = assignment.userId;
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: assignment.userId,
        userName: `${assignment.user.firstName} ${assignment.user.lastName}`,
        dailyBreakdown: {},
        weeklyTotal: 0,
        consecutiveDaysWorked: 0,
        overtimeStatus: 'under',
      });
    }

    const user = userMap.get(key)!;
    const durationMs = assignment.shift.endTime.getTime() - assignment.shift.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Daily breakdown (by UTC date)
    const dateKey = assignment.shift.startTime.toISOString().split('T')[0]!;
    const daily = user.dailyBreakdown!;
    daily[dateKey] = (daily[dateKey] || 0) + durationHours;
    user.weeklyTotal += durationHours;
  }

  // Calculate additional metrics
  const results = await Promise.all(
    Array.from(userMap.values()).map(async (user) => {
      const consecutiveDays = await getConsecutiveDaysWorked(user.userId, weekStartDate);
      user.consecutiveDaysWorked = consecutiveDays;

      // Set overtime status
      if (user.weeklyTotal > 52) {
        user.overtimeStatus = 'overtime';
      } else if (user.weeklyTotal > 40) {
        user.overtimeStatus = 'warning';
      } else {
        user.overtimeStatus = 'under';
      }

      return {
        ...user,
        weeklyTotal: Math.round(user.weeklyTotal * 100) / 100,
        dailyBreakdown: Object.fromEntries(
          Object.entries(user.dailyBreakdown ?? {}).map(([date, hours]: [string, number]) => [
            date,
            Math.round((hours ?? 0) * 100) / 100,
          ])
        ),
      };
    })
  );

  // Sort by weekly total (descending)
  return results.sort((a, b) => b.weeklyTotal - a.weeklyTotal);
};

/**
 * Shift Projection - Calculate hours if user were assigned
 */
export const getShiftProjection = async (shiftId: string, proposedUserId?: string) => {
  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  if (!proposedUserId) {
    throw new ValidationError('proposedUserId is required', { shiftId }, ['Provide a user ID to project assignment']);
  }

  // Calculate week start date
  const weekStart = new Date(shift.startTime);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Go back to Sunday
  weekStart.setUTCHours(0, 0, 0, 0);

  // Current week hours (existing assignments)
  const currentHours = await calculateWeeklyHours(proposedUserId, weekStart);

  // Proposed shift duration
  const proposedDurationMs = shift.endTime.getTime() - shift.startTime.getTime();
  const proposedHours = proposedDurationMs / (1000 * 60 * 60);

  const projectedHours = currentHours + proposedHours;

  // Determine warnings/blocks
  const warnings: Array<{ type: string; message: string }> = [];
  const blocks: Array<{ type: string; message: string }> = [];

  if (projectedHours > 52) {
    blocks.push({
      type: 'weekly_hours_hard',
      message: `This would exceed 52 hours (hard limit). Current: ${Math.round(currentHours * 100) / 100}h + ${Math.round(proposedHours * 100) / 100}h = ${Math.round(projectedHours * 100) / 100}h`,
    });
  } else if (projectedHours > 40) {
    warnings.push({
      type: 'weekly_hours_warning',
      message: `This would exceed 40 hours. Current: ${Math.round(currentHours * 100) / 100}h + ${Math.round(proposedHours * 100) / 100}h = ${Math.round(projectedHours * 100) / 100}h`,
    });
  }

  return {
    shiftId,
    proposedUserId,
    currentWeeklyHours: Math.round(currentHours * 100) / 100,
    proposedShiftHours: Math.round(proposedHours * 100) / 100,
    projectedWeeklyHours: Math.round(projectedHours * 100) / 100,
    warnings,
    blocks,
    canAssign: blocks.length === 0,
  };
};

/**
 * What-If Calculator - Simulate assignments without DB writes
 */
export const getWhatIfCalculation = async (shiftsArray: Array<{ shiftId: string; userId: string }>) => {
  const results = await Promise.all(shiftsArray.map((item) => getShiftProjection(item.shiftId, item.userId)));

  const summary = {
    totalProposed: shiftsArray.length,
    canAssign: results.filter((r) => r.canAssign).length,
    willBlock: results.filter((r) => r.blocks.length > 0).length,
    willWarn: results.filter((r) => r.warnings.length > 0 && r.blocks.length === 0).length,
    details: results,
  };

  return summary;
};
