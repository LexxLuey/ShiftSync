import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { uuidParamSchema, validateSchema } from '../../lib/validation/index.js';
import { createSkillSchema, updateSkillSchema } from './validation.js';
import { createSkill, deleteSkill, listSkills, updateSkill } from './service.js';

const getRequestActor = (request: Request): { id: string } => {
  if (!request.user) {
    throw new ForbiddenError('Not authenticated');
  }

  return request.user as { id: string };
};

export const getSkills = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const skills = await listSkills();
    response.status(200).json({ data: skills, count: skills.length });
  } catch (error) {
    next(error);
  }
};

export const postSkill = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const payload = validateSchema(createSkillSchema, request.body);
    const skill = await createSkill(actor, payload);

    response.status(201).json({ data: skill });
  } catch (error) {
    next(error);
  }
};

export const patchSkill = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const params = validateSchema(uuidParamSchema, request.params);
    const payload = validateSchema(updateSkillSchema, request.body);
    const skill = await updateSkill(actor, params.id, payload);

    response.status(200).json({ data: skill });
  } catch (error) {
    next(error);
  }
};

export const deleteSkillHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getRequestActor(request);
    const params = validateSchema(uuidParamSchema, request.params);
    const skill = await deleteSkill(actor, params.id);

    response.status(200).json({ data: skill });
  } catch (error) {
    next(error);
  }
};
