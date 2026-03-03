import { z } from 'zod';

export const createShiftSchema = z.object({
  startTime: z.string().datetime('Invalid datetime format'),
  endTime: z.string().datetime('Invalid datetime format'),
  requiredSkillId: z.string().min(1, 'Skill is required'),
  headcountNeeded: z.number().int().min(1, 'Headcount must be at least 1'),
});

export const updateShiftSchema = createShiftSchema.partial();

export type CreateShiftPayload = z.infer<typeof createShiftSchema>;
export type UpdateShiftPayload = z.infer<typeof updateShiftSchema>;
