import type { Request, Response, NextFunction } from 'express';
import { validateSchema } from '../../lib/validation/index.js';
import { executeWithLock } from '../../lib/redis/lock.js';
import {
  validateShiftAssignment,
  createAssignment,
  createAssignmentWithPolicy,
  deleteAssignment,
  getEligibleStaff,
  createAssignmentWithOverride,
} from './service.js';
import {
  createAssignmentSchema,
  overrideAssignmentSchema,
  bulkAssignmentSchema,
  eligibleStaffQuerySchema,
} from './validation.js';
import prismaClient from '../../lib/db/prisma.js';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import type {
  CreateAssignmentPayload,
  OverrideAssignmentPayload,
  BulkAssignmentPayload,
} from './validation.js';

const ensureManagerCanAccessShift = async (
  actor: { id: string; role: string } | undefined,
  shiftId: string,
): Promise<void> => {
  if (!actor || actor.role !== 'MANAGER') {
    return;
  }

  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
    select: { locationId: true },
  });

  if (!shift) {
    return;
  }

  const managerAccess = await prismaClient.locationManager.findUnique({
    where: {
      locationId_userId: {
        locationId: shift.locationId,
        userId: actor.id,
      },
    },
    select: { id: true },
  });

  if (!managerAccess) {
    throw new ForbiddenError('You do not have access to this location');
  }
};

/**
 * POST /shifts/:shiftId/assignments
 * Create assignment with Redis lock for concurrent safety
 */
export const postAssignment = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const payload = validateSchema(createAssignmentSchema, request.body);

    // Lock both shift and user scope for concurrency safety.
    const assignmentResult = await executeWithLock(`shift:${shiftId}:lock`, async () =>
      executeWithLock(`user:${payload.userId}:lock`, async () =>
        createAssignmentWithPolicy(shiftId, payload)));

    response.status(201).json({
      success: true,
      data: assignmentResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /assignments/:assignmentId
 * Remove assignment from shift
 */
export const deleteAssignmentHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignmentId } = request.params as { assignmentId: string };
    const result = await deleteAssignment(assignmentId);

    response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /shifts/:shiftId/eligible-staff
 * Get list of qualified staff with validation results for each
 */
export const getEligibleStaffHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const query = validateSchema(eligibleStaffQuerySchema, request.query);

    const staff = await getEligibleStaff(shiftId, {
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.fairnessStartDate ? { fairnessStartDate: query.fairnessStartDate } : {}),
      ...(query.fairnessEndDate ? { fairnessEndDate: query.fairnessEndDate } : {}),
      ...(query.replaceExisting !== undefined ? { replaceExisting: query.replaceExisting } : {}),
    });

    response.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /shifts/:shiftId/assignments/bulk
 * Bulk assign multiple users to a shift (sequentially)
 */
export const postBulkAssignment = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shiftId } = request.params as { shiftId: string };
    const payload = validateSchema(bulkAssignmentSchema, request.body);

    const results = {
      successes: [] as Array<{ userId: string; assignmentId: string }>,
      failures: [] as Array<{ userId: string; error: string }>,
    };

    // Assign each user sequentially
    for (const userId of payload.userIds) {
      try {
        const assignment = await executeWithLock(`user:${userId}:lock`, async () => {
          const validation = await validateShiftAssignment(shiftId, userId);

          if (!validation.valid) {
            throw new Error(
              validation.violations.find((v) => v.severity === 'error')?.message ||
                'Validation failed'
            );
          }

          return await createAssignment(shiftId, { userId });
        });

        results.successes.push({
          userId,
          assignmentId: assignment.id,
        });
      } catch (error) {
        results.failures.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    response.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /assignments/override
 * Manager-only: Create assignment bypassing non-critical validations
 */
export const postAssignmentOverride = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = validateSchema(overrideAssignmentSchema, request.body);
    const { shiftId } = request.body as { shiftId: string };
    const userRole = (request as any).user?.role as string;
    const actor = request.user as { id: string; role: string } | undefined;

    if (!shiftId) {
      response.status(400).json({
        success: false,
        error: 'shiftId is required in request body',
      });
      return;
    }

    await ensureManagerCanAccessShift(actor, shiftId);

    const assignment = await executeWithLock(`user:${payload.userId}:lock`, async () => {
      return await createAssignmentWithOverride(shiftId, payload, userRole);
    });

    response.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};
