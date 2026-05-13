import { z } from 'zod';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const calendarQuerySchema = z
  .object({
    startDate: z.string().regex(dateOnlyPattern, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().regex(dateOnlyPattern, 'endDate must be YYYY-MM-DD'),
    locationId: z.uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    assignedUserId: z.uuid().optional(),
    mine: z.coerce.boolean().optional().default(false),
    status: z.enum(['PUBLISHED', 'DRAFT', 'ALL']).optional(),
  })
  .refine((query) => query.startDate <= query.endDate, {
    message: 'startDate must be before or equal to endDate',
    path: ['endDate'],
  });

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
