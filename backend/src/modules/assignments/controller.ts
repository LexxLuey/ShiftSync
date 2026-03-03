import type { Request, Response, NextFunction } from 'express';
import { validateSchema } from '../../lib/validation/index.js';
import { executeWithLock } from '../../lib/redis/lock.js';
import {
  validateShiftAssignment,
  createAssignment,
  deleteAssignment,
  getEligibleStaff,
  createAssignmentWithOverride,
} from './service.js';
import {
  createAssignmentSchema,
  overrideAssignmentSchema,
  bulkAssignmentSchema,
} from './validation.js';
import type {
  CreateAssignmentPayload,
  OverrideAssignmentPayload,
  BulkAssignmentPayload,
} from './validation.js';

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

    // Execute with lock to prevent concurrent assignments
    const assignment = await executeWithLock(`user:${payload.userId}:lock`, async () => {
      // Re-validate after acquiring lock (before creating)
      const validation = await validateShiftAssignment(shiftId, payload.userId);

      if (!validation.valid) {
        // Return structured validation error
        response.status(400).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_VIOLATION',
            message: `Cannot assign ${payload.userId} to shift`,
            violations: validation.violations,
          },
        });
        return null;
      }

      // Create assignment
      return await createAssignment(shiftId, payload);
    });

    if (!assignment) return; // Response already sent in lock callback

    response.status(201).json({
      success: true,
      data: assignment,
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
    const { limit = '20', search } = request.query;

    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);

    const staff = await getEligibleStaff(shiftId, limitNum, search as string | undefined);

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

    if (!shiftId) {
      response.status(400).json({
        success: false,
        error: 'shiftId is required in request body',
      });
      return;
    }

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
