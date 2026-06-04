import { z } from 'zod';

export const createSkillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required').max(120, 'Skill name is too long'),
});

export const updateSkillSchema = z
  .object({
    name: z.string().trim().min(1, 'Skill name is required').max(120, 'Skill name is too long'),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type CreateSkillPayload = z.infer<typeof createSkillSchema>;
export type UpdateSkillPayload = z.infer<typeof updateSkillSchema>;