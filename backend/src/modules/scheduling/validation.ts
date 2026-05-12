import { z } from 'zod';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const generateScheduleSchema = z
  .object({
    startDate: z.string().regex(dateOnlyPattern, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().regex(dateOnlyPattern, 'endDate must be YYYY-MM-DD'),
    locationIds: z.array(z.uuid()).optional(),
    templateIds: z.array(z.uuid()).optional(),
  })
  .refine((payload) => payload.startDate <= payload.endDate, {
    message: 'startDate must be before or equal to endDate',
    path: ['endDate'],
  });

export type GenerateSchedulePayload = z.infer<typeof generateScheduleSchema>;
