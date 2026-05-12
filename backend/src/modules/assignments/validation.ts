import { z } from 'zod';

export const createAssignmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const overrideAssignmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().min(1, 'Override reason is required'),
});

export const bulkAssignmentSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID is required'),
});

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const eligibleStaffQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    fairnessStartDate: z.string().regex(dateOnlyPattern).optional(),
    fairnessEndDate: z.string().regex(dateOnlyPattern).optional(),
  })
  .refine(
    (value) =>
      (value.fairnessStartDate && value.fairnessEndDate) ||
      (!value.fairnessStartDate && !value.fairnessEndDate),
    {
      message: 'fairnessStartDate and fairnessEndDate must be provided together',
      path: ['fairnessStartDate'],
    },
  )
  .refine(
    (value) =>
      !value.fairnessStartDate ||
      !value.fairnessEndDate ||
      value.fairnessStartDate <= value.fairnessEndDate,
    {
      message: 'fairnessStartDate must be before or equal to fairnessEndDate',
      path: ['fairnessEndDate'],
    },
  );

export type CreateAssignmentPayload = z.infer<typeof createAssignmentSchema>;
export type OverrideAssignmentPayload = z.infer<typeof overrideAssignmentSchema>;
export type BulkAssignmentPayload = z.infer<typeof bulkAssignmentSchema>;
export type EligibleStaffQueryPayload = z.infer<typeof eligibleStaffQuerySchema>;
