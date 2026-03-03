import { getSocket } from '../socket/index.js';
import type { Shift, ShiftAssignment, SwapRequest, Location } from '@prisma/client';

/**
 * Emit shift:created event to location room
 */
export const emitShiftCreated = (shift: Shift & { location?: Location }): void => {
    try {
        const io = getSocket();
        io.to(`location:${shift.locationId}`).emit('shift:created', {
            id: shift.id,
            locationId: shift.locationId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            requiredSkillId: shift.requiredSkillId,
            headcountNeeded: shift.headcountNeeded,
            status: shift.status,
            publishedAt: shift.publishedAt,
        });
    } catch (error) {
        // Socket.io not initialized; silently fail (Phase 5 optional)
    }
};

/**
 * Emit shift:updated event to location and affected users
 */
export const emitShiftUpdated = (
    shift: Shift & { location?: Location },
    affectedUserIds: string[] = []
): void => {
    try {
        const io = getSocket();
        const payload = {
            id: shift.id,
            locationId: shift.locationId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            requiredSkillId: shift.requiredSkillId,
            headcountNeeded: shift.headcountNeeded,
            status: shift.status,
            publishedAt: shift.publishedAt,
        };

        // Emit to location
        io.to(`location:${shift.locationId}`).emit('shift:updated', payload);

        // Emit to affected staff
        affectedUserIds.forEach((userId) => {
            io.to(`user:${userId}`).emit('shift:updated', payload);
        });
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};

/**
 * Emit shift:published event to location room
 */
export const emitShiftPublished = (shift: Shift & { location?: Location }): void => {
    try {
        const io = getSocket();
        io.to(`location:${shift.locationId}`).emit('shift:published', {
            id: shift.id,
            locationId: shift.locationId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: shift.status,
            publishedAt: shift.publishedAt,
        });
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};

/**
 * Emit assignment:changed event
 */
export const emitAssignmentChanged = (
    assignment: ShiftAssignment & { shift?: Shift },
    action: 'ASSIGNED' | 'UNASSIGNED' | 'REASSIGNED'
): void => {
    try {
        const io = getSocket();
        const payload = {
            id: assignment.id,
            shiftId: assignment.shiftId,
            userId: assignment.userId,
            status: assignment.status,
            action,
        };

        // Emit to location
        if (assignment.shift) {
            io.to(`location:${assignment.shift.locationId}`).emit('assignment:changed', payload);
        }

        // Emit to assigned user
        io.to(`user:${assignment.userId}`).emit('assignment:changed', payload);
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};

/**
 * Emit swap:created event to target user and location managers
 */
export const emitSwapCreated = (
    swapRequest: SwapRequest & { shift?: Shift; targetUser?: { id: string } },
    managerIds: string[] = []
): void => {
    try {
        const io = getSocket();
        const payload = {
            id: swapRequest.id,
            shiftId: swapRequest.shiftId,
            requestingUserId: swapRequest.requestingUserId,
            targetUserId: swapRequest.targetUserId,
            type: swapRequest.type,
            status: swapRequest.status,
            expiresAt: swapRequest.expiresAt,
        };

        // Emit to target user (if swap type)
        if (swapRequest.targetUserId) {
            io.to(`user:${swapRequest.targetUserId}`).emit('swap:created', payload);
        }

        // Emit to managers in location
        managerIds.forEach((managerId) => {
            io.to(`user:${managerId}`).emit('swap:created', payload);
        });

        // Broadcast to location
        if (swapRequest.shift) {
            io.to(`location:${swapRequest.shift.locationId}`).emit('swap:created', payload);
        }
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};

/**
 * Emit swap:updated event to all involved parties
 */
export const emitSwapUpdated = (
    swapRequest: SwapRequest & { shift?: Shift },
    managerIds: string[] = []
): void => {
    try {
        const io = getSocket();
        const payload = {
            id: swapRequest.id,
            shiftId: swapRequest.shiftId,
            requestingUserId: swapRequest.requestingUserId,
            targetUserId: swapRequest.targetUserId,
            type: swapRequest.type,
            status: swapRequest.status,
            expiresAt: swapRequest.expiresAt,
        };

        // Emit to requesting user
        io.to(`user:${swapRequest.requestingUserId}`).emit('swap:updated', payload);

        // Emit to target user
        if (swapRequest.targetUserId) {
            io.to(`user:${swapRequest.targetUserId}`).emit('swap:updated', payload);
        }

        // Emit to managers
        managerIds.forEach((managerId) => {
            io.to(`user:${managerId}`).emit('swap:updated', payload);
        });

        // Broadcast to location
        if (swapRequest.shift) {
            io.to(`location:${swapRequest.shift.locationId}`).emit('swap:updated', payload);
        }
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};

/**
 * Emit conflict:detected event to specific user
 */
export const emitConflictDetected = (
    userId: string,
    conflictType: string,
    message: string
): void => {
    try {
        const io = getSocket();
        io.to(`user:${userId}`).emit('conflict:detected', {
            type: conflictType,
            message,
            timestamp: new Date(),
        });
    } catch (error) {
        // Socket.io not initialized; silently fail
    }
};
