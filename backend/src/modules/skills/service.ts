import prismaClient from '../../lib/db/prisma.js';

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
