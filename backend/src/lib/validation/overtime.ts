import prismaClient from '../db/prisma.js';

/**
 * Calculate total hours worked by a user in a given date range
 * @param userId - User ID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Total hours worked
 */
export const calculateHoursInRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const assignments = await prismaClient.shiftAssignment.findMany({
    where: {
      userId,
      shift: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: 'PUBLISHED',
      },
    },
    include: {
      shift: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  let totalMinutes = 0;

  for (const assignment of assignments) {
    const durationMs = assignment.shift.endTime.getTime() - assignment.shift.startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    totalMinutes += durationMinutes;
  }

  return Math.round((totalMinutes / 60) * 100) / 100; // Return hours rounded to 2 decimals
};

/**
 * Calculate weekly hours for a user
 * @param userId - User ID
 * @param weekStartDate - Monday of the week (UTC)
 * @returns Total hours worked in the week
 */
export const calculateWeeklyHours = async (userId: string, weekStartDate: Date): Promise<number> => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  return calculateHoursInRange(userId, weekStartDate, weekEndDate);
};

/**
 * Calculate daily hours for a user
 * @param userId - User ID
 * @param date - Date to check
 * @returns Total hours worked on that day
 */
export const calculateDailyHours = async (userId: string, date: Date): Promise<number> => {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  return calculateHoursInRange(userId, dayStart, dayEnd);
};

/**
 * Get consecutive days worked ending on or before the given date
 * @param userId - User ID
 * @param date - Reference date
 * @returns Number of consecutive days worked
 */
export const getConsecutiveDaysWorked = async (userId: string, date: Date): Promise<number> => {
  let consecutiveDays = 0;
  let checkDate = new Date(date);

  // Count backwards from the given date
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(checkDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(checkDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const shiftsOnDay = await prismaClient.shiftAssignment.count({
      where: {
        userId,
        shift: {
          startTime: { gte: dayStart },
          endTime: { lte: dayEnd },
          status: 'PUBLISHED',
        },
      },
    });

    if (shiftsOnDay > 0) {
      consecutiveDays++;
    } else {
      break; // Stop counting on first day with no shifts
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  return consecutiveDays;
};
