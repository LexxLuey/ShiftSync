import type { Request, Response, NextFunction } from 'express';
import { validateSchema } from '../../lib/validation/index.js';
import {
  createShift,
  getShiftsByLocation,
  getShiftById,
  updateShift,
  deleteShift,
  publishShift,
  getActiveShifts,
} from './service.js';
import { createShiftSchema, updateShiftSchema } from './validation.js';

export const postShift = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { locationId } = request.params as { locationId: string };
    const payload = validateSchema(createShiftSchema, request.body);
    const shift = await createShift(locationId, payload, request.user?.id);

    response.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

export const getShifts = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { locationId } = request.params as { locationId: string };
    const { startDate, endDate } = request.query;

    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      response.status(400).json({
        error: 'Missing required query parameters: startDate, endDate',
      });
      return;
    }

    const shifts = await getShiftsByLocation(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );

    response.status(200).json({ data: shifts, count: shifts.length });
  } catch (error) {
    next(error);
  }
};

export const getShift = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const shift = await getShiftById(shiftId);

    response.status(200).json(shift);
  } catch (error) {
    next(error);
  }
};

export const putShift = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const payload = validateSchema(updateShiftSchema, request.body);
    const shift = await updateShift(shiftId, payload, request.user?.id);

    response.status(200).json(shift);
  } catch (error) {
    next(error);
  }
};

export const deleteShiftHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const result = await deleteShift(shiftId, request.user?.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const postPublishShift = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const shift = await publishShift(shiftId, request.user?.id);

    response.status(200).json(shift);
  } catch (error) {
    next(error);
  }
};

export const getActiveShiftsHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locationId } = request.params as { locationId: string };
    const shifts = await getActiveShifts(locationId);

    response.status(200).json({ data: shifts, count: shifts.length });
  } catch (error) {
    next(error);
  }
};
