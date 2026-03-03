import type { NextFunction, Request, Response } from 'express'
import { validateSchema } from '../../lib/validation/index.js'
import { executeWithLock } from '../../lib/redis/lock.js'
import {
    validateSwapRequest,
    createSwapRequest,
    acceptSwapRequest,
    rejectSwapRequest,
    approveSwapRequest,
    cancelSwapRequest,
    expireOldSwaps,
} from './service.js'
import {
    createSwapRequestSchema,
    rejectSwapRequestSchema,
    managerRejectSwapSchema,
} from './validation.js'
import prismaClient from '../../lib/db/prisma.js';

/**
 * Create swap or drop request for a shift
 */
export const postSwapRequest = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { shiftId } = request.params as { shiftId: string }
        const payload = validateSchema(createSwapRequestSchema, request.body)
        const requestingUserId = (request.user as any)?.id

        if (!requestingUserId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        // Acquire lock for this user
        const lockKey = `swap:${shiftId}:${requestingUserId}:lock`

        const swapRequest = await executeWithLock(lockKey, async () => {
            // Re-validate after acquiring lock
            const validation = await validateSwapRequest(
                shiftId,
                requestingUserId,
                payload.type,
                payload.targetUserId,
            )

            if (!validation.valid) {
                response.status(400).json({
                    success: false,
                    error: {
                        code: 'SWAP_VALIDATION_FAILED',
                        message: 'Cannot create swap request due to violations',
                        violations: validation.violations,
                    },
                })
                return null
            }

            return await createSwapRequest(shiftId, requestingUserId, payload)
        })

        if (!swapRequest) return // Response already sent

        response.status(201).json({
            success: true,
            data: swapRequest,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Accept swap request (target user accepts)
 */
export const postAcceptSwap = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = request.params as { id: string }
        const targetUserId = (request.user as any)?.id

        if (!targetUserId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        const lockKey = `swap:accept:${id}:lock`

        const updated = await executeWithLock(lockKey, async () => {
            return await acceptSwapRequest(id, targetUserId)
        })

        response.status(200).json({
            success: true,
            data: updated,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Reject swap request (by target or requester)
 */
export const postRejectSwap = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = request.params as { id: string }
        const userId = (request.user as any)?.id

        if (!userId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        validateSchema(rejectSwapRequestSchema, request.body)

        const lockKey = `swap:reject:${id}:lock`

        const updated = await executeWithLock(lockKey, async () => {
            return await rejectSwapRequest(id, userId)
        })

        response.status(200).json({
            success: true,
            data: updated,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Approve swap request (manager only)
 */
export const postApproveSwap = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = request.params as { id: string }
        const managerId = (request.user as any)?.id
        const userRole = (request.user as any)?.role

        if (!managerId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        // Basic role check (should be in middleware, but added here for clarity)
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
            response.status(403).json({
                success: false,
                error: { message: 'Only managers can approve swaps' },
            })
            return
        }

        const lockKey = `swap:approve:${id}:lock`

        const updated = await executeWithLock(lockKey, async () => {
            return await approveSwapRequest(id, managerId)
        })

        response.status(200).json({
            success: true,
            data: updated,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Manager reject swap request
 */
export const postManagerRejectSwap = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = request.params as { id: string }
        const managerId = (request.user as any)?.id
        const userRole = (request.user as any)?.role

        if (!managerId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
            response.status(403).json({
                success: false,
                error: { message: 'Only managers can reject swaps' },
            })
            return
        }

        const payload = validateSchema(managerRejectSwapSchema, request.body)

        const lockKey = `swap:reject:${id}:lock`

        const updated = await executeWithLock(lockKey, async () => {
            const swapRequest = await prismaClient.swapRequest.findUnique({
                where: { id },
                include: { requestingUser: true },
            })

            if (!swapRequest) {
                throw new Error(`Swap request ${id} not found`)
            }

            // Phase 5: Store rejection reason in audit log
            return await rejectSwapRequest(id, managerId)
        })

        response.status(200).json({
            success: true,
            data: updated,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Cancel swap request (requester only)
 */
export const postCancelSwap = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = request.params as { id: string }
        const requesterId = (request.user as any)?.id

        if (!requesterId) {
            response.status(401).json({ success: false, error: { message: 'Not authenticated' } })
            return
        }

        const lockKey = `swap:cancel:${id}:lock`

        const updated = await executeWithLock(lockKey, async () => {
            return await cancelSwapRequest(id, requesterId)
        })

        response.status(200).json({
            success: true,
            data: updated,
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Expire old swap requests (cron endpoint)
 */
export const getCronExpireSwaps = async (
    _request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const expiredCount = await expireOldSwaps()

        response.status(200).json({
            success: true,
            data: {
                expired: expiredCount,
            },
        })
    } catch (error) {
        next(error)
    }
}
