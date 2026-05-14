import { Router } from 'express'
import { authenticate, restrictTo } from '../auth/middleware.js'
import { verifyShiftVisibility } from '../auth/guards.js'
import {
    getSwapRequestsHandler,
    postSwapRequest,
    postValidateSwapRequest,
    getEligibleSwapTargetsHandler,
    postAcceptSwap,
    postRejectSwap,
    postApproveSwap,
    postCancelSwap,
    getCronExpireSwaps,
} from './controller.js'

const shiftSwapsRouter = Router({ mergeParams: true })
shiftSwapsRouter.use(authenticate)

shiftSwapsRouter.post('/:shiftId/swap-requests', verifyShiftVisibility('shiftId'), postSwapRequest)
shiftSwapsRouter.post('/:shiftId/swap-requests/validate', verifyShiftVisibility('shiftId'), postValidateSwapRequest)
shiftSwapsRouter.get('/:shiftId/eligible-swap-targets', verifyShiftVisibility('shiftId'), getEligibleSwapTargetsHandler)

const swapRequestsRouter = Router({ mergeParams: true })
swapRequestsRouter.use(authenticate)

swapRequestsRouter.get('/', getSwapRequestsHandler)
swapRequestsRouter.post('/:id/accept', postAcceptSwap)
swapRequestsRouter.post('/:id/reject', postRejectSwap)
swapRequestsRouter.post('/:id/approve', restrictTo('ADMIN', 'MANAGER'), postApproveSwap)
swapRequestsRouter.post('/:id/cancel', postCancelSwap)
swapRequestsRouter.get('/cron/expire-swaps', restrictTo('ADMIN'), getCronExpireSwaps)

export {
    shiftSwapsRouter,
    swapRequestsRouter,
}

