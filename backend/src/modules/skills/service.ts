import prismaClient from '../../lib/db/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors/customErrors.js';
import { logAction } from '../audit/service.js';
import type { CreateSkillPayload, UpdateSkillPayload } from './validation.js';

type RequestActor = {
  id: string;
};

export const listSkills = async (): Promise<Record<string, unknown>[]> => {
  const skills = await prismaClient.skill.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return skills as unknown as Record<string, unknown>[];
};

const getSkillByIdOrThrow = async (skillId: string) => {
  const skill = await prismaClient.skill.findUnique({
    where: {
      id: skillId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!skill) {
    throw new NotFoundError('Skill not found', { skillId });
  }

  return skill;
};

export const createSkill = async (
  actor: RequestActor,
  payload: CreateSkillPayload,
): Promise<Record<string, unknown>> => {
  const normalizedName = payload.name.trim();

  try {
    const skill = await prismaClient.skill.create({
      data: {
        name: normalizedName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    await logAction(actor.id, 'CREATE', 'SKILL', skill.id, null, {
      id: skill.id,
      name: skill.name,
    });

    return skill as unknown as Record<string, unknown>;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictError(
        'Skill name already exists',
        { name: normalizedName },
        ['Use a unique skill name.'],
      );
    }

    throw error;
  }
};

export const updateSkill = async (
  actor: RequestActor,
  skillId: string,
  payload: UpdateSkillPayload,
): Promise<Record<string, unknown>> => {
  const existingSkill = await getSkillByIdOrThrow(skillId);

  try {
    const updatedSkill = await prismaClient.skill.update({
      where: {
        id: skillId,
      },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      },
      select: {
        id: true,
        name: true,
      },
    });

    await logAction(actor.id, 'UPDATE', 'SKILL', skillId, existingSkill, updatedSkill);

    return updatedSkill as unknown as Record<string, unknown>;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictError(
        'Skill name already exists',
        { name: payload.name?.trim() ?? null },
        ['Use a unique skill name.'],
      );
    }

    throw error;
  }
};

export const deleteSkill = async (
  actor: RequestActor,
  skillId: string,
): Promise<Record<string, unknown>> => {
  const existingSkill = await getSkillByIdOrThrow(skillId);

  const [shiftCount, templateRequirementCount] = await prismaClient.$transaction([
    prismaClient.shift.count({
      where: {
        requiredSkillId: skillId,
      },
    }),
    prismaClient.eventTemplateRequirement.count({
      where: {
        requiredSkillId: skillId,
      },
    }),
  ]);

  if (shiftCount > 0 || templateRequirementCount > 0) {
    throw new ConflictError(
      'Skill cannot be deleted because it is used by shifts or templates',
      {
        skillId,
        shiftCount,
        templateRequirementCount,
      },
      [
        'Reassign or remove dependent shifts and template requirements first.',
      ],
    );
  }

  const deletedSkill = await prismaClient.skill.delete({
    where: {
      id: skillId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  await logAction(actor.id, 'DELETE', 'SKILL', skillId, existingSkill, null);

  return deletedSkill as unknown as Record<string, unknown>;
};
