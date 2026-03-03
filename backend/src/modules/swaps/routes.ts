import { Router } from 'express'
import {
    postSwapRequest,
    postAcceptSwap,
    postRejectSwap,
    postApproveSwap,
    postManagerRejectSwap,
    postCancelSwap,
    getCronExpireSwaps,
} from './controller.js'

const swapsRouter = Router({ mergeParams: true })

/**
 * @openapi
 * /api/v1/shifts/{shiftId}/swap-requests:
 *   post:
 *     tags: [Swaps]
 *     summary: Create a swap or drop request
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SWAP, DROP]
 *               targetUserId:
 *                 type: string
 *             required:
 *               - type
 *     responses:
 *       201:
 *         description: Swap request created successfully
 *       400:
 *         description: Validation failed with violations
 *       404:
 *         description: Shift not found
 *       409:
 *         description: Conflict - already has pending swaps or lock held
 */
swapsRouter.post('/:shiftId/swap-requests', postSwapRequest)

/**
 * @openapi
 * /api/v1/swap-requests/{id}/accept:
 *   post:
 *     tags: [Swaps]
 *     summary: Accept swap request (target user)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Swap request accepted
 *       403:
 *         description: Not the target of this request
 *       404:
 *         description: Swap request not found
 */
swapsRouter.post('/:id/accept', postAcceptSwap)

/**
 * @openapi
 * /api/v1/swap-requests/{id}/reject:
 *   post:
 *     tags: [Swaps]
 *     summary: Reject swap request (target or requester)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [target, manager]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Swap request rejected
 *       403:
 *         description: Cannot reject this request
 *       404:
 *         description: Swap request not found
 */
swapsRouter.post('/:id/reject', postRejectSwap)

/**
 * @openapi
 * /api/v1/swap-requests/{id}/approve:
 *   post:
 *     tags: [Swaps]
 *     summary: Approve swap request (manager only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Swap request approved and assignments updated
 *       400:
 *         description: Cannot approve (within 48 hours of shift start)
 *       403:
 *         description: Only managers can approve
 *       404:
 *         description: Swap request not found
 */
swapsRouter.post('/:id/approve', postApproveSwap)

/**
 * @openapi
 * /api/v1/swap-requests/{id}/cancel:
 *   post:
 *     tags: [Swaps]
 *     summary: Cancel swap request (requester only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Swap request cancelled
 *       403:
 *         description: Only requester can cancel
 *       404:
 *         description: Swap request not found
 */
swapsRouter.post('/:id/cancel', postCancelSwap)

/**
 * @openapi
 * /api/v1/cron/expire-swaps:
 *   get:
 *     tags: [Cron]
 *     summary: Expire old swap requests (cron job)
 *     responses:
 *       200:
 *         description: Swap requests expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     expired:
 *                       type: number
 */
swapsRouter.get('/cron/expire-swaps', getCronExpireSwaps)

export default swapsRouter
