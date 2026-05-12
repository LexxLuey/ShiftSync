import prismaClient from '../../lib/db/prisma.js';
import type { AuditLog } from '@prisma/client';

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'PUBLISH'
    | 'ASSIGN'
    | 'REASSIGN'
    | 'UNASSIGN'
    | 'SWAP_REQUEST_CREATE'
    | 'SWAP_REQUEST_ACCEPT'
    | 'SWAP_REQUEST_APPROVE'
    | 'SWAP_REQUEST_REJECT'
    | 'SWAP_REQUEST_CANCEL'
    | 'ROLE_CHANGE'
    | 'CERT_REVOKE';

export type AuditEntity =
    | 'SHIFT'
    | 'EVENT_TEMPLATE'
    | 'ASSIGNMENT'
    | 'SWAP_REQUEST'
    | 'USER'
    | 'LOCATION'
    | 'CERTIFICATION';

/**
 * Log an action to the audit trail
 * Must be called inside a transaction for atomic logging
 */
export const logAction = async (
    userId: string | null | undefined,
    action: AuditAction,
    entityType: AuditEntity,
    entityId: string,
    beforeState: unknown = null,
    afterState: unknown = null
): Promise<void> => {
    if (!userId) {
        return; // Skip logging if no user (prevent null ref errors)
    }

    const data: {
        userId: string;
        action: AuditAction;
        entityType: AuditEntity;
        entityId: string;
        beforeState?: unknown;
        afterState?: unknown;
    } = {
        userId,
        action,
        entityType,
        entityId,
    };

    if (beforeState !== null && beforeState !== undefined) {
        data.beforeState = beforeState;
    }
    if (afterState !== null && afterState !== undefined) {
        data.afterState = afterState;
    }

    await prismaClient.auditLog.create({
        data: data as any,
    });
};

/**
 * Get audit history for a specific entity
 */
export const getEntityHistory = async (
    entityType: AuditEntity,
    entityId: string,
    limit: number = 50
): Promise<(AuditLog & { user: { id: string; firstName: string; lastName: string; role: string } })[]> => {
    return await prismaClient.auditLog.findMany({
        where: {
            entityType,
            entityId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
};

/**
 * Export audit logs for an entity type and date range
 */
export const exportAuditLogs = async (
    entityType: AuditEntity,
    startDate: Date,
    endDate: Date,
    limit: number = 10000
): Promise<(AuditLog & { user: { id: string; firstName: string; lastName: string } })[]> => {
    return await prismaClient.auditLog.findMany({
        where: {
            entityType,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
};

/**
 * Get all audit logs for a user (admin view)
 */
export const getUserAuditLogs = async (
    userId: string,
    limit: number = 50
): Promise<(AuditLog & { affectedEntity?: unknown })[]> => {
    return await prismaClient.auditLog.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
};

export const listAuditLogs = async (params: {
    startDate?: Date;
    endDate?: Date;
    entityType?: string;
    action?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    data: Array<AuditLog & { user: { id: string; firstName: string; lastName: string; email: string } }>;
    count: number;
}> => {
    const limit = Math.max(1, Math.min(200, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);

    const whereClause = {
        ...(params.startDate || params.endDate
            ? {
                createdAt: {
                    ...(params.startDate ? { gte: params.startDate } : {}),
                    ...(params.endDate ? { lte: params.endDate } : {}),
                },
            }
            : {}),
        ...(params.entityType ? { entityType: params.entityType } : {}),
        ...(params.action ? { action: params.action } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
    };

    const [count, data] = await prismaClient.$transaction([
        prismaClient.auditLog.count({
            where: whereClause,
        }),
        prismaClient.auditLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        }),
    ]);

    return { data, count };
};
