import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const eventTemplateRequirementSchema = z.object({
  requiredSkillId: z.uuid('Required skill ID must be a valid UUID'),
  headcountNeeded: z.number().int().min(1, 'Headcount must be at least 1'),
  isOptional: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional(),
});

const baseEventTemplateSchema = z.object({
  title: z.string().min(1, 'Template title is required'),
  description: z.string().max(2000).optional(),
  scope: z.enum(['LOCATION', 'MINISTRY']),
  locationId: z.uuid('Location ID must be a valid UUID').optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTimeLocal: z.string().regex(timePattern, 'Start time must be HH:mm'),
  endTimeLocal: z.string().regex(timePattern, 'End time must be HH:mm'),
  requirements: z
    .array(eventTemplateRequirementSchema)
    .min(1, 'At least one requirement is required'),
});

export const createEventTemplateSchema = baseEventTemplateSchema
  .refine(
    (payload) => {
      if (payload.scope === 'LOCATION') {
        return Boolean(payload.locationId);
      }

      return !payload.locationId;
    },
    {
      message: 'LOCATION templates require locationId. MINISTRY templates must not include locationId.',
      path: ['locationId'],
    },
  )
  .refine((payload) => payload.startTimeLocal !== payload.endTimeLocal, {
    message: 'Start and end times cannot be the same',
    path: ['endTimeLocal'],
  });

export const updateEventTemplateSchema = baseEventTemplateSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (payload) => {
      if (!payload.scope) {
        return true;
      }

      if (payload.scope === 'LOCATION') {
        return payload.locationId !== undefined;
      }

      return payload.locationId === undefined;
    },
    {
      message:
        'When scope is changed, LOCATION requires locationId and MINISTRY cannot include locationId.',
      path: ['locationId'],
    },
  );

export const eventTemplateIdParamSchema = z.object({
  id: z.uuid(),
});

export const listEventTemplatesQuerySchema = z.object({
  scope: z.enum(['LOCATION', 'MINISTRY']).optional(),
  locationId: z.uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export type CreateEventTemplatePayload = z.infer<typeof createEventTemplateSchema>;
export type UpdateEventTemplatePayload = z.infer<typeof updateEventTemplateSchema>;
export type ListEventTemplatesQuery = z.infer<typeof listEventTemplatesQuerySchema>;
