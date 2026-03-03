import type { Request, Response, NextFunction } from 'express';
import { validateSchema } from '../../lib/validation/index.js';
import { createAvailability, createException, getAvailability, isUserAvailableAtTime } from './service.js';
import { createAvailabilitySchema, createExceptionSchema } from './validation.js';

export const postAvailability = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = request.params as { userId: string };
    const payload = validateSchema(createAvailabilitySchema, request.body);
    const availability = await createAvailability(userId, payload);

    response.status(201).json(availability);
  } catch (error) {
    next(error);
  }
};

export const postException = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = request.params as { userId: string };
    const payload = validateSchema(createExceptionSchema, request.body);
    const exception = await createException(userId, payload);

    response.status(201).json(exception);
  } catch (error) {
    next(error);
  }
};

export const getAvailabilityHandler = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = request.params as { userId: string };
    const availability = await getAvailability(userId);

    response.status(200).json(availability);
  } catch (error) {
    next(error);
  }
};

export const checkAvailability = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = request.params as { userId: string };
    const { date, startTime, endTime, locationId } = request.query;

    if (!date || !startTime || !endTime || typeof date !== 'string' || typeof startTime !== 'string' || typeof endTime !== 'string') {
      response.status(400).json({
        error: 'Missing required query parameters: date, startTime, endTime',
      });
      return;
    }

    // Parse query params
    const datetime = new Date(date);
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    
    if (startParts.length < 2 || endParts.length < 2) {
      response.status(400).json({
        error: 'Invalid time format. Expected HH:MM',
      });
      return;
    }

    const startHour = parseInt(startParts[0] as string, 10);
    const startMin = parseInt(startParts[1] as string, 10);
    const endHour = parseInt(endParts[0] as string, 10);
    const endMin = parseInt(endParts[1] as string, 10);
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      response.status(400).json({
        error: 'Invalid time format. Expected HH:MM',
      });
      return;
    }

    datetime.setHours(startHour, startMin);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    const result = await isUserAvailableAtTime(userId, datetime, durationMinutes, typeof locationId === 'string' ? locationId : undefined);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
