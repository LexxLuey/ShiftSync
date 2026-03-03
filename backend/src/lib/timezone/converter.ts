import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Convert a UTC date to a specific timezone
 * @param utcDate - Date in UTC
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date object in the specified timezone
 */
export const convertUtcToTimezone = (utcDate: Date, timezone: string): Date => {
  return toZonedTime(utcDate, timezone);
};

/**
 * Convert a date from a specific timezone to UTC
 * @param date - Date in the specified timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date object in UTC
 */
export const convertTimezoneToUtc = (date: Date, timezone: string): Date => {
  return fromZonedTime(date, timezone);
};

/**
 * Get the current time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Current date object in that timezone
 */
export const getCurrentTimeInTimezone = (timezone: string): Date => {
  return toZonedTime(new Date(), timezone);
};

/**
 * Format a UTC date as a readable string in a specific timezone
 * @param utcDate - UTC date
 * @param timezone - IANA timezone string
 * @returns Formatted string like "2026-03-03 14:30:00 EST"
 */
export const formatDateInTimezone = (utcDate: Date, timezone: string): string => {
  const zonedDate = toZonedTime(utcDate, timezone);
  return zonedDate.toLocaleString('en-US', { timeZone: timezone });
};
