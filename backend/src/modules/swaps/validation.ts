import { z } from 'zod'

export const createSwapRequestSchema = z.object({
    type: z.enum(['SWAP', 'DROP']),
    targetUserId: z.string().optional(),
})

export type CreateSwapRequestPayload = z.infer<typeof createSwapRequestSchema>

export const acceptSwapRequestSchema = z.object({})

export const rejectSwapRequestSchema = z.object({})

export const approveSwapRequestSchema = z.object({
    reason: z.string().optional(),
})

export type ApproveSwapRequestPayload = z.infer<typeof approveSwapRequestSchema>

export const managerRejectSwapSchema = z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
})

export type ManagerRejectSwapPayload = z.infer<typeof managerRejectSwapSchema>
