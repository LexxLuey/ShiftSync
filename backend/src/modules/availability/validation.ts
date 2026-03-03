import { z } from 'zod';

export const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format');

export const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  locationId: z.string().optional(),
});

export const createExceptionSchema = z.object({
  date: z.string().datetime(),
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
});

export type CreateAvailabilityPayload = z.infer<typeof createAvailabilitySchema>;
export type CreateExceptionPayload = z.infer<typeof createExceptionSchema>;
