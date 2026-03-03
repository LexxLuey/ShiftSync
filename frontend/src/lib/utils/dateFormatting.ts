import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function formatShiftTime(
  startTime: string,
  endTime: string,
  timezone: string
): string {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  try {
    const startZoned = toZonedTime(startDate, timezone)
    const endZoned = toZonedTime(endDate, timezone)

    const sameDay = format(startZoned, 'yyyy-MM-dd') === format(endZoned, 'yyyy-MM-dd')

    if (sameDay) {
      return `${format(startZoned, 'MMM dd, HH:mm')} - ${format(endZoned, 'HH:mm')}`
    } else {
      return `${format(startZoned, 'MMM dd, HH:mm')} - ${format(endZoned, 'MMM dd, HH:mm')}`
    }
  } catch {
    // Fallback if timezone is invalid
    return `${format(startDate, 'MMM dd, HH:mm')} - ${format(endDate, 'HH:mm')}`
  }
}

export function formatShiftDate(date: string, timezone: string): string {
  const d = new Date(date)
  try {
    const zoned = toZonedTime(d, timezone)
    return format(zoned, 'MMM dd, yyyy')
  } catch {
    return format(d, 'MMM dd, yyyy')
  }
}
