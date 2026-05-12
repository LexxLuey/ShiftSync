import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { validateSchema } from '../../lib/validation/index.js';
import { generateScheduleSchema } from './validation.js';
import { generateScheduleFromTemplates } from './service.js';

const getRequestActor = (request: Request): { id: string; role: Role } => {
  if (!request.user) {
    throw new ForbiddenError('Not authenticated');
  }

  return request.user as { id: string; role: Role };
};

export const postGenerateSchedule = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const payload = validateSchema(generateScheduleSchema, request.body);
    const generationResult = await generateScheduleFromTemplates(actor, payload);

    response.status(200).json({ data: generationResult });
  } catch (error) {
    next(error);
  }
};
