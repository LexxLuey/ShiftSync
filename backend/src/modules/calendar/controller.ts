import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { validateSchema } from '../../lib/validation/index.js';
import { listCalendarShifts } from './service.js';
import { calendarQuerySchema } from './validation.js';

export const getCalendar = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) {
      throw new ForbiddenError('Not authenticated');
    }

    const query = validateSchema(calendarQuerySchema, request.query);
    const result = await listCalendarShifts(
      {
        id: request.user.id,
        role: request.user.role,
      },
      query,
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

