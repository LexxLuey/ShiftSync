import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, ValidationError } from '../../lib/errors/customErrors.js';
import {
  getFairnessReport,
  getHoursDistribution,
  getShiftProjection,
  getWhatIfCalculation,
} from './service.js';

const getActor = (request: Request): { id: string; role: 'ADMIN' | 'MANAGER' } => {
  if (!request.user) {
    throw new ForbiddenError('Not authenticated');
  }

  return {
    id: request.user.id,
    role: request.user.role as 'ADMIN' | 'MANAGER',
  };
};

export const getFairnessHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = getActor(request);
    const { locationId, startDate, endDate } = request.query;

    if (!locationId || !startDate || !endDate) {
      throw new ValidationError(
        'Missing required query parameters: locationId, startDate, endDate',
        { locationId, startDate, endDate },
      );
    }

    const report = await getFairnessReport(
      actor,
      locationId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    response.status(200).json({ data: report, count: report.length });
  } catch (error) {
    next(error);
  }
};

export const getHoursDistributionHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = getActor(request);
    const { locationId, weekStartDate } = request.query;

    if (!locationId || !weekStartDate) {
      throw new ValidationError(
        'Missing required query parameters: locationId, weekStartDate',
        { locationId, weekStartDate },
      );
    }

    const distribution = await getHoursDistribution(
      actor,
      locationId as string,
      new Date(weekStartDate as string)
    );

    response.status(200).json({ data: distribution, count: distribution.length });
  } catch (error) {
    next(error);
  }
};

export const getProjectionHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = getActor(request);
    const shiftIdParam = request.params.shiftId;
    const proposedUserIdParam = request.query.proposedUserId;

    if (typeof proposedUserIdParam !== 'string' || !proposedUserIdParam) {
      throw new ValidationError('Missing or invalid query parameter: proposedUserId');
    }

    if (typeof shiftIdParam !== 'string' || !shiftIdParam) {
      throw new ValidationError('Missing path parameter: shiftId');
    }

    const projection = await getShiftProjection(actor, shiftIdParam, proposedUserIdParam);

    response.status(200).json(projection);
  } catch (error) {
    next(error);
  }
};

export const postWhatIfHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = getActor(request);
    const { shifts } = request.body as { shifts: Array<{ shiftId: string; userId: string }> };

    if (!Array.isArray(shifts) || shifts.length === 0) {
      throw new ValidationError(
        'Invalid request body. Expected: { shifts: [{ shiftId, userId }, ...] }',
      );
    }

    const result = await getWhatIfCalculation(actor, shifts);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
