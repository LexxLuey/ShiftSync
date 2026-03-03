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

export type CreateAssignmentPayload = z.infer<typeof createAssignmentSchema>;
export type OverrideAssignmentPayload = z.infer<typeof overrideAssignmentSchema>;
export type BulkAssignmentPayload = z.infer<typeof bulkAssignmentSchema>;
