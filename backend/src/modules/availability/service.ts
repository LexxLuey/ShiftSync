import prismaClient from '../../lib/db/prisma.js';
import { ValidationError, NotFoundError } from '../../lib/errors/customErrors.js';
import type { CreateAvailabilityPayload, CreateExceptionPayload } from './validation.js';

export const createAvailability = async (userId: string, payload: CreateAvailabilityPayload) => {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found', { userId });
  }

  // Check for overlapping availability on same day/location
  const overlapping = await prismaClient.availability.findFirst({
    where: {
      userId,
      dayOfWeek: payload.dayOfWeek,
      locationId: payload.locationId || null,
      isRecurring: true,
    },
  });

  if (overlapping) {
    throw new ValidationError(
      'You already have availability set for this day/location',
      { dayOfWeek: payload.dayOfWeek, locationId: payload.locationId },
      ['Update or delete the existing availability block.']
    );
  }

  const availability = await prismaClient.availability.create({
    data: {
      userId,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      locationId: payload.locationId || null,
      isRecurring: true,
      validFrom: new Date(),
    },
  });

  return availability;
};

export const createException = async (userId: string, payload: CreateExceptionPayload) => {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found', { userId });
  }

  const exception = await prismaClient.exception.create({
    data: {
      userId,
      date: new Date(payload.date),
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
    },
  });

  return exception;
};

export const getAvailability = async (userId: string) => {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found', { userId });
  }

  const recurring = await prismaClient.availability.findMany({
    where: {
      userId,
      isRecurring: true,
    },
    orderBy: { dayOfWeek: 'asc' },
  });

  const exceptions = await prismaClient.exception.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  return { recurring, exceptions };
};

export const isUserAvailableAtTime = async (
  userId: string,
  datetime: Date,
  durationMinutes: number,
  locationId?: string
): Promise<{ available: boolean; reason?: string }> => {
  const dayOfWeek = datetime.getUTCDay();
  const timeString = `${String(datetime.getUTCHours()).padStart(2, '0')}:${String(datetime.getUTCMinutes()).padStart(2, '0')}`;
  const endTime = new Date(datetime.getTime() + durationMinutes * 60000);
  const endTimeString = `${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')}`;

  // Check exceptions first (they override recurring availability)
  const exception = await prismaClient.exception.findFirst({
    where: {
      userId,
      date: {
        gte: new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate()),
        lt: new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate() + 1),
      },
    },
  });

  if (exception) {
    // If exception has specific times, check if shift conflicts
    if (exception.startTime && exception.endTime) {
      if (timeString < exception.endTime && endTimeString > exception.startTime) {
        return { available: false, reason: `Unavailable from ${exception.startTime} to ${exception.endTime} on this date` };
      }
    } else {
      // Full day exception
      return { available: false, reason: 'Unavailable all day on this date' };
    }
  }

  // Check recurring availability
  const recurring = await prismaClient.availability.findFirst({
    where: {
      userId,
      dayOfWeek,
      locationId: locationId ?? null,
      isRecurring: true,
    },
  });

  if (!recurring) {
    return { available: false, reason: `No availability set for ${getDayName(dayOfWeek)}` };
  }

  const recurringStartTime: string = recurring.startTime;
  const recurringEndTime: string = recurring.endTime;

  // Check if shift falls within availability window
  if (timeString >= recurringStartTime && endTimeString <= recurringEndTime) {
    return { available: true };
  }

  return { available: false, reason: `Shift does not fall within availability hours (${recurringStartTime}-${recurringEndTime})` };
};

const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek]!;
};
