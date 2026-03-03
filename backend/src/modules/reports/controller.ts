import type { Request, Response, NextFunction } from 'express';
import {
  getFairnessReport,
  getHoursDistribution,
  getShiftProjection,
  getWhatIfCalculation,
} from './service.js';

export const getFairnessHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locationId, startDate, endDate } = request.query;

    if (!locationId || !startDate || !endDate) {
      response.status(400).json({
        error: 'Missing required query parameters: locationId, startDate, endDate',
      });
      return;
    }

    const report = await getFairnessReport(
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
    const { locationId, weekStartDate } = request.query;

    if (!locationId || !weekStartDate) {
      response.status(400).json({
        error: 'Missing required query parameters: locationId, weekStartDate',
      });
      return;
    }

    const distribution = await getHoursDistribution(
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
    const shiftIdParam = request.params.shiftId;
    const proposedUserIdParam = request.query.proposedUserId;

    if (typeof proposedUserIdParam !== 'string' || !proposedUserIdParam) {
      response.status(400).json({
        error: 'Missing or invalid query parameter: proposedUserId',
      });
      return;
    }

    if (typeof shiftIdParam !== 'string' || !shiftIdParam) {
      response.status(400).json({
        error: 'Missing path parameter: shiftId',
      });
      return;
    }

    const projection = await getShiftProjection(shiftIdParam, proposedUserIdParam);

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
    const { shifts } = request.body as { shifts: Array<{ shiftId: string; userId: string }> };

    if (!Array.isArray(shifts) || shifts.length === 0) {
      response.status(400).json({
        error: 'Invalid request body. Expected: { shifts: [{ shiftId, userId }, ...] }',
      });
      return;
    }

    const result = await getWhatIfCalculation(shifts);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
