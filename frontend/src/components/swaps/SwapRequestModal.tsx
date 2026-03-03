'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from '@/components/ui/toast'
import Dialog from '@/components/ui/Dialog/Dialog'
import { Form, FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import useSwaps from '@/hooks/useSwaps'
import type { CreateSwapRequestPayload, SwapType, EligibleSwapTarget } from '@/@types/swaps'

type ModalPhase = 'type-selection' | 'target-search' | 'confirmation'

interface SwapRequestModalProps {
  isOpen: boolean
  onClose: () => void
  shiftId: string
  onSuccess?: () => void
}

const swapTypeSchema = z.object({
  type: z.enum(['SWAP', 'DROP'] as const),
})

type SwapTypeForm = z.infer<typeof swapTypeSchema>

export default function SwapRequestModal({
  isOpen,
  onClose,
  shiftId,
  onSuccess,
}: SwapRequestModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('type-selection')
  const [selectedType, setSelectedType] = useState<SwapType>('SWAP')
  const [selectedTarget, setSelectedTarget] = useState<EligibleSwapTarget | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  const { register: registerType, handleSubmit: handleTypeSubmit } = useForm<SwapTypeForm>({
    resolver: zodResolver(swapTypeSchema),
    defaultValues: { type: 'SWAP' },
  })

  const {
    getEligibleSwapTargetsQuery,
    createSwapMutation,
  } = useSwaps()

  const eligibleTargetsQuery = getEligibleSwapTargetsQuery(
    phase === 'target-search' && selectedType === 'SWAP'
      ? { shiftId, limit: 50, search: searchQuery }
      : null
  )

  const handleTypeSelected = (type: SwapType) => {
    setSelectedType(type)
    if (type === 'DROP') {
      setPhase('confirmation')
    } else {
      setPhase('target-search')
    }
    setError('')
  }

  const handleSelectTarget = (target: EligibleSwapTarget) => {
    setSelectedTarget(target)
    setPhase('confirmation')
  }

  const handleConfirmSwap = async () => {
    try {
      setError('')

      if (selectedType === 'SWAP' && !selectedTarget) {
        setError('Please select a target staff member')
        return
      }

      const payload: CreateSwapRequestPayload = {
        type: selectedType,
        targetUserId: selectedType === 'SWAP' ? selectedTarget?.userId : undefined,
      }

      await createSwapMutation.mutateAsync({ shiftId, payload })

      toast.push(
        selectedType === 'SWAP'
          ? 'Swap request created. Waiting for approval.'
          : 'Drop shift request created. Waiting for approval.',
        { placement: 'top-end' }
      )

      onSuccess?.()
      handleClose()
    } catch (err: any) {
      const errorMsg = err?.message || `Failed to create ${selectedType.toLowerCase()} request`
      setError(errorMsg)
      toast.push(errorMsg, { placement: 'top-end' })
    }
  }

  const handleClose = () => {
    setPhase('type-selection')
    setSelectedTarget(null)
    setSearchQuery('')
    setError('')
    onClose()
  }

  const handleBackButton = () => {
    if (phase === 'confirmation') {
      if (selectedType === 'DROP') {
        setPhase('type-selection')
      } else {
        setPhase('target-search')
      }
    } else if (phase === 'target-search') {
      setPhase('type-selection')
    }
    setError('')
  }

  return (
    <Dialog isOpen={isOpen} onRequestClose={handleClose} width={600}>
      <div className="space-y-6">
        {/* Type Selection Phase */}
        {phase === 'type-selection' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Request Type</h3>
            <p className="text-sm text-gray-600">
              Choose whether you want to swap with another staff member or drop this shift.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTypeSelected('SWAP')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-semibold text-blue-600">Swap</div>
                <div className="text-sm text-gray-600">Trade with another staff member</div>
              </button>
              <button
                onClick={() => handleTypeSelected('DROP')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition"
              >
                <div className="font-semibold text-red-600">Drop</div>
                <div className="text-sm text-gray-600">Remove yourself from this shift</div>
              </button>
            </div>
          </div>
        )}

        {/* Target Search Phase */}
        {phase === 'target-search' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Swap Target</h3>
            <div className="space-y-3">
              <Input
                placeholder="Search staff by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {eligibleTargetsQuery.isLoading && (
                <div className="text-center py-8 text-gray-500">Loading available staff...</div>
              )}

              {eligibleTargetsQuery.isError && (
                <div className="text-center py-8 text-red-500">
                  {(eligibleTargetsQuery.error as any)?.message || 'Failed to load eligible staff'}
                </div>
              )}

              {eligibleTargetsQuery.data?.length === 0 && !eligibleTargetsQuery.isLoading && (
                <div className="text-center py-8 text-gray-500">No eligible staff found</div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eligibleTargetsQuery.data?.map((target) => (
                  <button
                    key={target.userId}
                    onClick={() => handleSelectTarget(target)}
                    className={`w-full p-3 border rounded-lg text-left transition ${
                      target.available
                        ? 'border-green-200 hover:bg-green-50 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{target.firstName} {target.lastName}</div>
                        <div className="text-sm text-gray-600">{target.email}</div>
                        {!target.available && (
                          <div className="text-xs text-red-600 mt-1">Not available for this shift</div>
                        )}
                      </div>
                      {target.available && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Available
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Phase */}
        {phase === 'confirmation' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Confirm Request</h3>

            {selectedType === 'SWAP' && selectedTarget && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Swapping with</div>
                  <div className="font-medium text-lg">
                    {selectedTarget.firstName} {selectedTarget.lastName}
                  </div>
                </div>
                {selectedTarget.warnings && selectedTarget.warnings.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-sm font-semibold text-gray-700">Warnings</div>
                    {selectedTarget.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          warning.severity === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {warning.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedType === 'DROP' && (
              <div className="space-y-3 bg-red-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">Drop Shift</div>
                <div className="text-sm text-gray-600">
                  You are requesting to be removed from this shift. A manager will review and approve or reject your request.
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {phase !== 'type-selection' && (
            <Button
              variant="plain"
              onClick={handleBackButton}
              disabled={createSwapMutation.isPending}
            >
              Back
            </Button>
          )}
          {phase === 'type-selection' && (
            <Button variant="plain" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {phase === 'confirmation' && (
            <Button
              variant="solid"
              onClick={handleConfirmSwap}
              loading={createSwapMutation.isPending}
              disabled={selectedType === 'SWAP' && !selectedTarget}
            >
              Confirm {selectedType === 'SWAP' ? 'Swap' : 'Drop'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
