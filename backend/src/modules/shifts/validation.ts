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

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const listShiftsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    locationId: z.uuid().optional(),
    startDate: z.string().regex(dateOnlyPattern, 'startDate must be YYYY-MM-DD').optional(),
    endDate: z.string().regex(dateOnlyPattern, 'endDate must be YYYY-MM-DD').optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ALL']).optional(),
    title: z.string().min(1).max(200).optional(),
    assignedUserId: z.uuid().optional(),
  })
  .refine(
    (query) => !query.startDate || !query.endDate || query.startDate <= query.endDate,
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    },
  );

export type CreateShiftPayload = z.infer<typeof createShiftSchema>;
export type UpdateShiftPayload = z.infer<typeof updateShiftSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
