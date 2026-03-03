/**
 * Premium Shift Configuration
 * Default: Friday 6pm (18:00) to Saturday 11:59pm UTC
 * Used for fairness calculations to identify premium shift opportunities
 */

export const PREMIUM_SHIFT_CONFIG = {
  // Premium shift window definition
  // Day 5 = Friday, Day 6 = Saturday
  startDay: 5, // Friday (0=Sunday, 5=Friday)
  startHourUtc: 18, // 6pm UTC
  endDay: 6, // Saturday
  endHourUtc: 23, // 11pm UTC (inclusive; shifts ending after 23:00 are premium)

  // Helper function: Check if a shift is premium
  isPremiumShift: (shift: { startTime: Date; endTime: Date }): boolean => {
    const start = new Date(shift.startTime);
    const startDay = start.getUTCDay();
    const startHour = start.getUTCHours();

    const end = new Date(shift.endTime);
    const endDay = end.getUTCDay();
    const endHour = end.getUTCHours();

    // Premium if shift starts Friday 6pm or later, or is on Saturday
    if (startDay === PREMIUM_SHIFT_CONFIG.startDay && startHour >= PREMIUM_SHIFT_CONFIG.startHourUtc) {
      return true;
    }
    if (startDay === PREMIUM_SHIFT_CONFIG.endDay) {
      return true;
    }
    // Also premium if it spans into Saturday from Friday
    if (startDay === PREMIUM_SHIFT_CONFIG.startDay && endDay === PREMIUM_SHIFT_CONFIG.endDay) {
      return true;
    }

    return false;
  },
};
