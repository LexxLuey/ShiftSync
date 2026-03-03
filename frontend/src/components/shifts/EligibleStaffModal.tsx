'use client'

import { useEffect, useState } from 'react'
import { Dialog, Input, Button } from '@/components/ui'
import toast from '@/components/ui/toast'
import useAssignments from '@/hooks/useAssignments'
import type { EligibleStaffMember, AssignmentViolation } from '@/lib/api/types'

type EligibleStaffModalProps = {
    isOpen: boolean
    onClose: () => void
    shiftId: string
    shiftStartTime?: string
    shiftLocation?: string
    onAssignmentSuccess?: () => void
}

type ModalPhase = 'list' | 'confirmation'

export default function EligibleStaffModal({
    isOpen,
    onClose,
    shiftId,
    shiftStartTime,
    shiftLocation,
    onAssignmentSuccess,
}: EligibleStaffModalProps) {
    const [phase, setPhase] = useState<ModalPhase>('list')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStaff, setSelectedStaff] = useState<EligibleStaffMember | null>(null)
    const [error, setError] = useState('')

    const { getEligibleStaffQuery, createAssignmentMutation } = useAssignments()

    // Fetch eligible staff
    const eligibleStaffQuery = getEligibleStaffQuery(
        isOpen ? { shiftId, limit: 50, search: searchQuery } : null,
    )

    // Filter staff based on search (client-side for instant feedback)
    const filteredStaff =
        eligibleStaffQuery.data?.filter(
            (staff) =>
                staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.role.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || []

    // Sort by availability (green first, then yellow, then red)
    const sortedStaff = [...filteredStaff].sort((a, b) => {
        const availabilityOrder = { green: 0, yellow: 1, red: 2 }
        return (
            availabilityOrder[a.availabilityIndicator] -
            availabilityOrder[b.availabilityIndicator]
        )
    })

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setPhase('list')
            setSearchQuery('')
            setSelectedStaff(null)
            setError('')
        }
    }, [isOpen])

    const handleSelectStaff = (staff: EligibleStaffMember) => {
        setSelectedStaff(staff)
        setPhase('confirmation')
        setError('')
    }

    const handleBackToList = () => {
        setPhase('list')
        setSelectedStaff(null)
        setError('')
    }

    const handleConfirmAssignment = async () => {
        if (!selectedStaff) return

        try {
            setError('')
            await createAssignmentMutation.mutateAsync({
                shiftId,
                userId: selectedStaff.userId,
            })

            toast.push(`${selectedStaff.name} assigned to shift`, {
                placement: 'top-end',
            })

            onAssignmentSuccess?.()
            onClose()
        } catch (err: any) {
            const errorMsg = err?.message || 'Failed to assign staff'
            setError(errorMsg)
            toast.push(errorMsg, { placement: 'top-end' })
        }
    }

    // Check if assignment has hard blocks
    const hasHardBlocks =
        selectedStaff?.warnings.some((v) => v.severity === 'error') || false

    // Get violations for display
    const warnings = selectedStaff?.warnings.filter((v) => v.severity === 'warning') || []
    const errors = selectedStaff?.warnings.filter((v) => v.severity === 'error') || []

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} width={600}>
            <div className="p-6 space-y-4">
                <h2 className="text-lg font-semibold mb-4">
                    {phase === 'list' ? 'Find Available Staff' : 'Confirm Assignment'}
                </h2>
                {/* ===== LIST PHASE ===== */}
                {phase === 'list' && (
                    <>
                        {/* Search Input */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Search by name or skill
                            </label>
                            <Input
                                type="text"
                                placeholder="Search staff, role, or skill..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Loading State */}
                        {eligibleStaffQuery.isLoading && (
                            <div className="py-8 text-center text-gray-500">
                                Loading staff list...
                            </div>
                        )}

                        {/* Error State */}
                        {eligibleStaffQuery.isError && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                                {eligibleStaffQuery.error?.message || 'Failed to load staff'}
                            </div>
                        )}

                        {/* Empty State */}
                        {eligibleStaffQuery.isSuccess && sortedStaff.length === 0 && (
                            <div className="py-8 text-center text-gray-500">
                                No available staff found
                            </div>
                        )}

                        {/* Staff List */}
                        {eligibleStaffQuery.isSuccess && sortedStaff.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sortedStaff.map((staff) => (
                                    <div
                                        key={staff.userId}
                                        className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Availability Indicator */}
                                            <div
                                                className={`w-3 h-3 rounded-full ${
                                                    staff.availabilityIndicator === 'green'
                                                        ? 'bg-green-500'
                                                        : staff.availabilityIndicator ===
                                                            'yellow'
                                                          ? 'bg-yellow-500'
                                                          : 'bg-red-500'
                                                }`}
                                            />

                                            {/* Staff Info */}
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">
                                                    {staff.name}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {staff.role}
                                                </div>
                                            </div>

                                            {/* Warnings Badge */}
                                            {staff.warnings.length > 0 && (
                                                <div className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                                    {staff.warnings.length} warning
                                                    {staff.warnings.length > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>

                                        {/* Select Button */}
                                        <Button
                                            size="sm"
                                            variant="solid"
                                            onClick={() => handleSelectStaff(staff)}
                                            className="ml-2"
                                        >
                                            Select
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Close Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button variant="plain" onClick={onClose}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}

                {/* ===== CONFIRMATION PHASE ===== */}
                {phase === 'confirmation' && selectedStaff && (
                    <>
                        {/* Selected Staff Summary */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                            <div className="font-medium text-blue-900">
                                {selectedStaff.name}
                            </div>
                            <div className="text-sm text-blue-700">
                                {selectedStaff.role}
                            </div>
                        </div>

                        {/* Shift Info */}
                        {shiftStartTime && (
                            <div className="text-sm">
                                <span className="text-gray-600">Shift: </span>
                                <span className="font-medium">{shiftStartTime}</span>
                                {shiftLocation && (
                                    <>
                                        <span className="text-gray-600"> at </span>
                                        <span className="font-medium">{shiftLocation}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Hard Errors (Blocks) */}
                        {errors.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded">
                                <div className="font-medium text-red-900 mb-2">
                                    ❌ Cannot Assign
                                </div>
                                <ul className="space-y-1">
                                    {errors.map((violation, idx) => (
                                        <li
                                            key={idx}
                                            className="text-sm text-red-800 flex gap-2"
                                        >
                                            <span>•</span>
                                            <span>{violation.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings */}
                        {warnings.length > 0 && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="font-medium text-yellow-900 mb-2">
                                    ⚠️ Warnings
                                </div>
                                <ul className="space-y-1">
                                    {warnings.map((violation, idx) => (
                                        <li
                                            key={idx}
                                            className="text-sm text-yellow-800 flex gap-2"
                                        >
                                            <span>•</span>
                                            <span>{violation.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* No Violations Message */}
                        {errors.length === 0 && warnings.length === 0 && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800">
                                ✓ Staff is available and qualified
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between gap-2 pt-4 border-t">
                            <Button variant="plain" onClick={handleBackToList}>
                                Back
                            </Button>

                            <Button
                                variant="solid"
                                onClick={handleConfirmAssignment}
                                disabled={
                                    hasHardBlocks ||
                                    createAssignmentMutation.isPending
                                }
                                className={
                                    hasHardBlocks
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                }
                            >
                                {createAssignmentMutation.isPending
                                    ? 'Assigning...'
                                    : 'Confirm Assignment'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    )
}
