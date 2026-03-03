'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from '@/components/ui/toast'
import Dialog from '@/components/ui/Dialog/Dialog'
import { Form, FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import useSwaps from '@/hooks/useSwaps'
import { useAuth } from '@/context/AuthContext'
import { formatShiftTime } from '@/lib/utils/dateFormatting'
import type { SwapRequest } from '@/@types/swaps'

interface SwapDetailModalProps {
  isOpen: boolean
  onClose: () => void
  swap: SwapRequest | null
  onSuccess?: () => void
}

const rejectReasonSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

type RejectForm = z.infer<typeof rejectReasonSchema>

export default function SwapDetailModal({
  isOpen,
  onClose,
  swap,
  onSuccess,
}: SwapDetailModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState('')

  const { user } = useAuth()
  const {
    rejectSwapMutation,
    approveSwapMutation,
    cancelSwapMutation,
    acceptSwapMutation,
  } = useSwaps()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectForm>({
    resolver: zodResolver(rejectReasonSchema),
  })

  if (!swap) return null

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const isRequester = user?.id === swap.requestingUserId
  const isTarget = user?.id === swap.targetUserId
  const canApprove = isManager && swap.status === 'PENDING'
  const canReject = (isManager || isRequester || isTarget) && swap.status === 'PENDING'
  const canCancel = isRequester && swap.status === 'PENDING'
  const canAccept = isTarget && swap.status === 'PENDING' && swap.type === 'SWAP'

  const handleApprove = async () => {
    try {
      setError('')
      await approveSwapMutation.mutateAsync({
        swapRequestId: swap.id,
        payload: {},
      })
      toast.push('Swap request approved', { placement: 'top-end' })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to approve swap'
      setError(errorMsg)
      toast.push(errorMsg, { placement: 'top-end' })
    }
  }

  const handleReject = async (data: RejectForm) => {
    try {
      setError('')
      await rejectSwapMutation.mutateAsync({
        swapRequestId: swap.id,
        payload: { reason: data.reason },
      })
      toast.push('Swap request rejected', { placement: 'top-end' })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to reject swap'
      setError(errorMsg)
      toast.push(errorMsg, { placement: 'top-end' })
    }
  }

  const handleCancel = async () => {
    try {
      setError('')
      await cancelSwapMutation.mutateAsync(swap.id)
      toast.push('Swap request cancelled', { placement: 'top-end' })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to cancel swap'
      setError(errorMsg)
      toast.push(errorMsg, { placement: 'top-end' })
    }
  }

  const handleAccept = async () => {
    try {
      setError('')
      await acceptSwapMutation.mutateAsync(swap.id)
      toast.push('Swap request accepted. Waiting for manager approval.', {
        placement: 'top-end',
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to accept swap'
      setError(errorMsg)
      toast.push(errorMsg, { placement: 'top-end' })
    }
  }

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  }[swap.status]

  const expiresIn = () => {
    const now = new Date()
    const expires = new Date(swap.expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`
    if (diffMins > 0) return `${diffMins}m`
    return 'Expired'
  }

  return (
    <Dialog isOpen={isOpen} onRequestClose={onClose} width={700}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">
              {swap.type === 'SWAP' ? 'Swap' : 'Drop'} Request
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              Created {new Date(swap.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-medium ${statusColor}`}>
            {swap.status}
          </div>
        </div>

        {/* Shift Details */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="font-semibold mb-3">Shift Details</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Location</div>
              <div className="font-medium">{swap.shift.location.name}</div>
            </div>
            <div>
              <div className="text-gray-600">Skill Required</div>
              <div className="font-medium">{swap.shift.requiredSkill.name}</div>
            </div>
            <div>
              <div className="text-gray-600">Date & Time</div>
              <div className="font-medium">{formatShiftTime(swap.shift.startTime, swap.shift.endTime, swap.shift.location.timezone)}</div>
            </div>
            <div>
              <div className="text-gray-600">Expires In</div>
              <div className={`font-medium ${expiresIn() === 'Expired' ? 'text-red-600' : ''}`}>
                {expiresIn()}
              </div>
            </div>
          </div>
        </div>

        {/* Staff Details */}
        <div className="border rounded-lg p-4">
          <div className="font-semibold mb-3">Staff Information</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Requesting</div>
                <div className="font-medium">
                  {swap.requestingUser.firstName} {swap.requestingUser.lastName}
                </div>
                <div className="text-sm text-gray-600">{swap.requestingUser.email}</div>
              </div>
            </div>
            {swap.type === 'SWAP' && swap.targetUser && (
              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-sm text-gray-600">Target</div>
                  <div className="font-medium">
                    {swap.targetUser.firstName} {swap.targetUser.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{swap.targetUser.email}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
        )}

        {/* Actions - Manager */}
        {isManager && swap.status === 'PENDING' && (
          <div className="space-y-3">
            {!showRejectForm ? (
              <div className="flex gap-3">
                <Button
                  variant="solid"
                  onClick={handleApprove}
                  loading={approveSwapMutation.isPending}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  variant="plain"
                  onClick={() => setShowRejectForm(true)}
                  disabled={approveSwapMutation.isPending}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            ) : (
              <Form onSubmit={handleSubmit(handleReject)} className="space-y-3">
                <FormItem
                  label="Rejection Reason"
                  invalid={Boolean(errors.reason)}
                  errorMessage={errors.reason?.message}
                >
                  <Input
                    placeholder="Explain why you're rejecting this request..."
                    {...register('reason')}
                  />
                </FormItem>
                <div className="flex gap-3">
                  <Button
                    variant="solid"
                    type="submit"
                    loading={rejectSwapMutation.isPending}
                    className="flex-1"
                  >
                    Submit Rejection
                  </Button>
                  <Button
                    variant="plain"
                    onClick={() => {
                      setShowRejectForm(false)
                      reset()
                    }}
                    disabled={rejectSwapMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            )}
          </div>
        )}

        {/* Actions - Staff */}
        {!isManager && swap.status === 'PENDING' && (
          <div className="space-y-3">
            {canAccept && (
              <Button
                variant="solid"
                onClick={handleAccept}
                loading={acceptSwapMutation.isPending}
                className="w-full"
              >
                Accept Swap
              </Button>
            )}
            {(isRequester || isTarget) && !canAccept && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded text-sm">
                {isTarget && swap.type === 'SWAP'
                  ? 'Accept this swap above to proceed with the request.'
                  : 'Waiting for managers to review this request.'}
              </div>
            )}
            {canCancel && (
              <Button
                variant="plain"
                onClick={handleCancel}
                loading={cancelSwapMutation.isPending}
                className="w-full"
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}

        {swap.status !== 'PENDING' && (
          <Button variant="plain" onClick={onClose} className="w-full">
            Close
          </Button>
        )}
      </div>
    </Dialog>
  )
}
