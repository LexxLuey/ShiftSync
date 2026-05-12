import { z } from 'zod';

export const createShiftSchema = z.object({
  title: z.string().min(1, 'Shift title is required').optional().default('Untitled Shift'),
  startTime: z.string().datetime('Invalid datetime format'),
  endTime: z.string().datetime('Invalid datetime format'),
  requiredSkillId: z.string().min(1, 'Skill is required'),
  headcountNeeded: z.number().int().min(1, 'Headcount must be at least 1'),
  isOptional: z.boolean().optional().default(false),
  eventInstanceId: z.string().min(1, 'Event instance ID cannot be empty').optional(),
});

export const updateShiftSchema = createShiftSchema.partial();

export type CreateShiftPayload = z.infer<typeof createShiftSchema>;
export type UpdateShiftPayload = z.infer<typeof updateShiftSchema>;
