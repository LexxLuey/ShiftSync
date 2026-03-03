import prismaClient from '../../lib/db/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors/customErrors.js'
import { isUserAvailableAtTime } from '../availability/service.js'
import type { CreateSwapRequestPayload, ApproveSwapRequestPayload } from './validation.js'

export interface Violation {
    type: string
    severity: 'warning' | 'error'
    message: string
    details?: Record<string, unknown>
}

export interface ValidateSwapResult {
    valid: boolean
    violations: Violation[]
}

/**
 * Validate if user can create a swap/drop request for a shift
 */
export const validateSwapRequest = async (
    shiftId: string,
    requestingUserId: string,
    type: string,
    targetUserId?: string,
): Promise<ValidateSwapResult> => {
    const violations: Violation[] = []

    // 1. Check shift exists
    const shift = await prismaClient.shift.findUnique({
        where: { id: shiftId },
        include: {
            location: true,
            requiredSkill: true,
        },
    })

    if (!shift) {
        throw new NotFoundError(`Shift ${shiftId} not found`)
    }

    // 2. Check user is assigned to this shift
    const assignment = await prismaClient.shiftAssignment.findUnique({
        where: { shiftId_userId: { shiftId, userId: requestingUserId } },
    })

    if (!assignment) {
        violations.push({
            type: 'not_assigned',
            severity: 'error',
            message: 'You are not assigned to this shift',
        })
        return { valid: false, violations }
    }

    // 3. Check shift is published (within 48 hours is OK for requesting, but approval will check)
    if (shift.status !== 'PUBLISHED') {
        violations.push({
            type: 'unpublished_shift',
            severity: 'error',
            message: 'Shift must be published to request a swap',
        })
    }

    // 4. Check user already has 3+ pending swaps (as requester OR target)
    const pendingSwaps = await countPendingSwaps(requestingUserId)

    if (pendingSwaps >= 3) {
        violations.push({
            type: 'too_many_pending_swaps',
            severity: 'error',
            message: `You have ${pendingSwaps} pending swap requests. Maximum is 3. Please resolve existing requests first.`,
        })
    }

    // 5. For SWAP type: validate target user
    if (type === 'SWAP') {
        if (!targetUserId) {
            violations.push({
                type: 'missing_target_user',
                severity: 'error',
                message: 'SWAP type requires a target user ID',
            })
            return { valid: false, violations }
        }

        // Check target user exists
        const targetUser = await prismaClient.user.findUnique({
            where: { id: targetUserId },
        })

        if (!targetUser) {
            violations.push({
                type: 'target_user_not_found',
                severity: 'error',
                message: `Target user ${targetUserId} not found`,
            })
            return { valid: false, violations }
        }

        // 5a. Check target is certified for location
        const targetCertified = await prismaClient.certification.findUnique({
            where: { userId_locationId: { userId: targetUserId, locationId: shift.locationId } },
        })

        if (!targetCertified || targetCertified.revokedAt) {
            violations.push({
                type: 'target_not_certified',
                severity: 'error',
                message: `${targetUser.firstName} is not certified for ${shift.location.name}`,
            })
        }

        // 5b. Check target has required skill
        const targetSkill = await prismaClient.userSkill.findUnique({
            where: {
                userId_skillId: { userId: targetUserId, skillId: shift.requiredSkillId },
            },
        })

        if (!targetSkill) {
            violations.push({
                type: 'target_missing_skill',
                severity: 'error',
                message: `${targetUser.firstName} does not have the required skill for this shift`,
            })
        }

        // 5c. Check target is available at shift time
        const targetAvailability = await isUserAvailableAtTime(
            targetUserId,
            shift.startTime,
            (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60),
            shift.locationId,
        )

        if (!targetAvailability.available) {
            violations.push({
                type: 'target_unavailable',
                severity: 'error',
                message: `${targetUser.firstName} is not available during this shift time: ${targetAvailability.reason || 'Check their availability'}`,
            })
        }
    }

    // If any hard errors, return early (don't validate further)
    if (violations.some((v) => v.severity === 'error')) {
        return { valid: false, violations }
    }

    return { valid: true, violations: [] }
}

/**
 * Count pending swap requests involving user (as requester or target)
 */
export const countPendingSwaps = async (userId: string): Promise<number> => {
    const count = await prismaClient.swapRequest.count({
        where: {
            status: 'PENDING',
            OR: [{ requestingUserId: userId }, { targetUserId: userId }],
        },
    })
    return count
}

/**
 * Create swap request
 */
export const createSwapRequest = async (
    shiftId: string,
    requestingUserId: string,
    payload: CreateSwapRequestPayload,
) => {
    const shift = await prismaClient.shift.findUnique({
        where: { id: shiftId },
    })

    if (!shift) {
        throw new NotFoundError(`Shift ${shiftId} not found`)
    }

    // Calculate expiry
    let expiresAt: Date

    if (payload.type === 'SWAP') {
        // Expires in 7 days or at shift start, whichever is sooner
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
        expiresAt = shift.startTime < sevenDaysFromNow ? shift.startTime : sevenDaysFromNow
    } else {
        // DROP: expires 24 hours before shift start
        expiresAt = new Date(shift.startTime.getTime() - 24 * 60 * 60 * 1000)
    }

    const swapRequest = await prismaClient.swapRequest.create({
        data: {
            shiftId,
            requestingUserId,
            targetUserId: payload.targetUserId || null,
            type: payload.type,
            status: 'PENDING',
            expiresAt,
        },
        include: {
            shift: { include: { location: true, requiredSkill: true } },
            requestingUser: true,
            targetUser: true,
        },
    })

    // Phase 5: Emit socket event swap:created
    // Phase 5: Send notification to targetUser if SWAP type

    return swapRequest
}

/**
 * Accept swap request (target user accepts)
 */
export const acceptSwapRequest = async (
    swapRequestId: string,
    targetUserId: string,
) => {
    const swapRequest = await prismaClient.swapRequest.findUnique({
        where: { id: swapRequestId },
        include: { shift: true, requestingUser: true, targetUser: true },
    })

    if (!swapRequest) {
        throw new NotFoundError(`Swap request ${swapRequestId} not found`)
    }

    // Verify this is the target user accepting
    if (swapRequest.targetUserId !== targetUserId) {
        throw new ForbiddenError('You are not the target of this swap request')
    }

    if (swapRequest.status !== 'PENDING') {
        throw new ValidationError(`Swap request is already ${swapRequest.status}`)
    }

    // Re-check target still eligible to accept
    const availability = await isUserAvailableAtTime(
        targetUserId,
        swapRequest.shift.startTime,
        (swapRequest.shift.endTime.getTime() - swapRequest.shift.startTime.getTime()) / (1000 * 60),
    )

    if (!availability.available) {
        throw new ValidationError(
            `You are no longer available for this shift: ${availability.reason || 'Time conflict'}`,
        )
    }

    // Update to PENDING (awaiting manager approval)
    const updated = await prismaClient.swapRequest.update({
        where: { id: swapRequestId },
        data: { status: 'PENDING' }, // Already PENDING, but conceptually "accepted by target"
        include: {
            shift: { include: { location: true } },
            requestingUser: true,
            targetUser: true,
        },
    })

    // Phase 5: Emit socket event
    // Phase 5: Notify managers

    return updated
}

/**
 * Reject swap request (by target or requester)
 */
export const rejectSwapRequest = async (swapRequestId: string, userId: string) => {
    const swapRequest = await prismaClient.swapRequest.findUnique({
        where: { id: swapRequestId },
        include: { requestingUser: true, targetUser: true },
    })

    if (!swapRequest) {
        throw new NotFoundError(`Swap request ${swapRequestId} not found`)
    }

    // Verify user is either requester or target
    if (swapRequest.requestingUserId !== userId && swapRequest.targetUserId !== userId) {
        throw new ForbiddenError('You cannot reject this swap request')
    }

    if (swapRequest.status !== 'PENDING') {
        throw new ValidationError(`Swap request is already ${swapRequest.status}`)
    }

    const updated = await prismaClient.swapRequest.update({
        where: { id: swapRequestId },
        data: { status: 'REJECTED' },
        include: {
            shift: true,
            requestingUser: true,
            targetUser: true,
        },
    })

    // Phase 5: Emit socket event
    // Phase 5: Notify involved parties

    return updated
}

/**
 * Approve swap request (manager only)
 */
export const approveSwapRequest = async (
    swapRequestId: string,
    managerId: string,
    _payload?: ApproveSwapRequestPayload,
) => {
    const swapRequest = await prismaClient.swapRequest.findUnique({
        where: { id: swapRequestId },
        include: {
            shift: { include: { location: true } },
            requestingUser: true,
            targetUser: true,
        },
    })

    if (!swapRequest) {
        throw new NotFoundError(`Swap request ${swapRequestId} not found`)
    }

    // Verify manager has access to location (not implemented - Phase 5)
    // For now, just check they are MANAGER role (done in controller middleware)

    // Check shift not within 48 hours of start
    const hoursUntilShift =
        (swapRequest.shift.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60)

    if (hoursUntilShift < 48) {
        throw new ValidationError(
            `Cannot approve swaps for shifts within 48 hours of start time. Hours remaining: ${Math.round(hoursUntilShift)}`,
        )
    }

    if (swapRequest.status !== 'PENDING') {
        throw new ValidationError(`Swap request is already ${swapRequest.status}`)
    }

    // Perform swap or drop
    if (swapRequest.type === 'SWAP') {
        // Delete requester's assignment, create target's assignment
        await prismaClient.$transaction([
            // Remove requester
            prismaClient.shiftAssignment.delete({
                where: {
                    shiftId_userId: {
                        shiftId: swapRequest.shiftId,
                        userId: swapRequest.requestingUserId,
                    },
                },
            }),

            // Add target (should be safe per validation)
            prismaClient.shiftAssignment.create({
                data: {
                    shiftId: swapRequest.shiftId,
                    userId: swapRequest.targetUserId!,
                    status: 'ASSIGNED',
                },
            }),

            // Update swap status
            prismaClient.swapRequest.update({
                where: { id: swapRequestId },
                data: { status: 'APPROVED' },
            }),
        ])
    } else {
        // DROP: just remove requester's assignment
        await prismaClient.$transaction([
            prismaClient.shiftAssignment.delete({
                where: {
                    shiftId_userId: {
                        shiftId: swapRequest.shiftId,
                        userId: swapRequest.requestingUserId,
                    },
                },
            }),

            prismaClient.swapRequest.update({
                where: { id: swapRequestId },
                data: { status: 'APPROVED' },
            }),
        ])
    }

    const updated = await prismaClient.swapRequest.findUnique({
        where: { id: swapRequestId },
        include: {
            shift: { include: { location: true } },
            requestingUser: true,
            targetUser: true,
        },
    })

    // Phase 5: Emit socket event
    // Phase 5: Create audit log

    return updated
}

/**
 * Cancel swap request (requester only)
 */
export const cancelSwapRequest = async (swapRequestId: string, requesterId: string) => {
    const swapRequest = await prismaClient.swapRequest.findUnique({
        where: { id: swapRequestId },
        include: { requestingUser: true },
    })

    if (!swapRequest) {
        throw new NotFoundError(`Swap request ${swapRequestId} not found`)
    }

    // Verify this is the requester
    if (swapRequest.requestingUserId !== requesterId) {
        throw new ForbiddenError('Only the requester can cancel this swap')
    }

    if (swapRequest.status !== 'PENDING') {
        throw new ValidationError(`Can only cancel PENDING swap requests`)
    }

    const updated = await prismaClient.swapRequest.update({
        where: { id: swapRequestId },
        data: { status: 'CANCELLED' },
        include: {
            shift: true,
            requestingUser: true,
            targetUser: true,
        },
    })

    // Phase 5: Emit socket event
    // Phase 5: Notify parties

    return updated
}

/**
 * Expire old swap requests (cron job)
 */
export const expireOldSwaps = async (): Promise<number> => {
    const now = new Date()

    const result = await prismaClient.swapRequest.updateMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
    })

    // Phase 5: Emit socket events for each expired
    // Phase 5: Send notifications

    return result.count
}
