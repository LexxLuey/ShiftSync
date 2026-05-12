import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { validateSchema } from '../../lib/validation/index.js';
import {
  createEventTemplateSchema,
  eventTemplateIdParamSchema,
  listEventTemplatesQuerySchema,
  updateEventTemplateSchema,
} from './validation.js';
import {
  archiveEventTemplate,
  createEventTemplate,
  getEventTemplateById,
  listEventTemplates,
  updateEventTemplate,
} from './service.js';

const getRequestActor = (request: Request): { id: string; role: Role } => {
  if (!request.user) {
    throw new ForbiddenError('Not authenticated');
  }

  return request.user as { id: string; role: Role };
};

export const postEventTemplate = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const payload = validateSchema(createEventTemplateSchema, request.body);
    const template = await createEventTemplate(actor, payload);

    response.status(201).json({ data: template });
  } catch (error) {
    next(error);
  }
};

export const getEventTemplates = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const query = validateSchema(listEventTemplatesQuerySchema, request.query);
    const templates = await listEventTemplates(actor, query);

    response.status(200).json({ data: templates, count: templates.length });
  } catch (error) {
    next(error);
  }
};

export const getEventTemplate = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const params = validateSchema(eventTemplateIdParamSchema, request.params);
    const template = await getEventTemplateById(actor, params.id);

    response.status(200).json({ data: template });
  } catch (error) {
    next(error);
  }
};

export const putEventTemplate = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const params = validateSchema(eventTemplateIdParamSchema, request.params);
    const payload = validateSchema(updateEventTemplateSchema, request.body);
    const template = await updateEventTemplate(actor, params.id, payload);

    response.status(200).json({ data: template });
  } catch (error) {
    next(error);
  }
};

export const deleteEventTemplate = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const params = validateSchema(eventTemplateIdParamSchema, request.params);
    const template = await archiveEventTemplate(actor, params.id);

    response.status(200).json({ data: template });
  } catch (error) {
    next(error);
  }
};
