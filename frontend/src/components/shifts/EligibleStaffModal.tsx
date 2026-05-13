'use client'

import { useEffect, useState } from 'react'
import { Dialog, Input, Button } from '@/components/ui'
import toast from '@/components/ui/toast'
import useAssignments from '@/hooks/useAssignments'
import type {
    AssignmentMutationMode,
    EligibleStaffMember,
    AssignmentViolation,
    NormalizedApiError,
} from '@/lib/api/types'

type EligibleStaffModalProps = {
    isOpen: boolean
    onClose: () => void
    shiftId: string
    shiftStartTime?: string
    shiftLocation?: string
    fairnessStartDate?: string
    fairnessEndDate?: string
    autoReplace?: boolean
    currentAssigneeName?: string
    onAssignmentSuccess?: (payload: {
        shiftId: string
        staffName: string
        mode: AssignmentMutationMode
        replacedStaffName?: string
    }) => void
}

type ModalPhase = 'list' | 'confirmation'

export default function EligibleStaffModal({
    isOpen,
    onClose,
    shiftId,
    shiftStartTime,
    shiftLocation,
    fairnessStartDate,
    fairnessEndDate,
    autoReplace = false,
    currentAssigneeName,
    onAssignmentSuccess,
}: EligibleStaffModalProps) {
    const [phase, setPhase] = useState<ModalPhase>('list')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStaff, setSelectedStaff] = useState<EligibleStaffMember | null>(null)
    const [error, setError] = useState('')
    const [errorViolations, setErrorViolations] = useState<string[]>([])

    const { getEligibleStaffQuery, createAssignmentMutation } = useAssignments()

    // Fetch eligible staff
    const eligibleStaffQuery = getEligibleStaffQuery(
        isOpen
            ? {
                  shiftId,
                  limit: 50,
                  search: searchQuery,
                  ...(fairnessStartDate ? { fairnessStartDate } : {}),
                  ...(fairnessEndDate ? { fairnessEndDate } : {}),
                  ...(autoReplace ? { replaceExisting: true } : {}),
              }
            : null,
    )

    // Filter staff based on search (client-side for instant feedback)
    const filteredStaff =
        eligibleStaffQuery.data?.filter(
            (staff) =>
                staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.role.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || []

    const visibleStaff = autoReplace
        ? filteredStaff.filter((staff) => staff.isReplaceCapable)
        : filteredStaff

    // Sort by availability (green first, then yellow, then red)
    const sortedStaff = [...visibleStaff].sort((a, b) => {
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
            setErrorViolations([])
        }
    }, [isOpen])

    const handleSelectStaff = (staff: EligibleStaffMember) => {
        setSelectedStaff(staff)
        setPhase('confirmation')
        setError('')
        setErrorViolations([])
    }

    const handleBackToList = () => {
        setPhase('list')
        setSelectedStaff(null)
        setError('')
        setErrorViolations([])
    }

    const handleConfirmAssignment = async () => {
        if (!selectedStaff) return

        try {
            setError('')
            setErrorViolations([])
            const assignmentResponse = await createAssignmentMutation.mutateAsync({
                shiftId,
                userId: selectedStaff.userId,
                ...(autoReplace ? { replaceExisting: true } : {}),
            })

            const mode = assignmentResponse.data.mode
            const successMessage =
                mode === 'replaced'
                    ? `Reassigned shift to ${selectedStaff.name}`
                    : mode === 'noop_already_assigned'
                      ? `${selectedStaff.name} is already assigned`
                      : `${selectedStaff.name} assigned to shift`
            toast.push(successMessage, { placement: 'top-end' })

            onAssignmentSuccess?.({
                shiftId,
                staffName: selectedStaff.name,
                mode,
                ...(mode === 'replaced' && currentAssigneeName
                    ? { replacedStaffName: currentAssigneeName }
                    : {}),
            })
            onClose()
        } catch (err: any) {
            const normalizedError = err as NormalizedApiError
            const details = normalizedError.details as
                | { violations?: Array<{ message?: string }> }
                | null
                | undefined
            const detailsViolations = Array.isArray(details?.violations)
                ? details.violations
                : []
            const topLevelViolations = Array.isArray(normalizedError.violations)
                ? normalizedError.violations
                : []
            const violationMessages = [...topLevelViolations, ...detailsViolations]
                .map((violation) => violation.message)
                .filter((message): message is string => Boolean(message))
            const uniqueViolationMessages = Array.from(new Set(violationMessages))

            const errorMsg = normalizedError.message || 'Failed to assign staff'
            setError(errorMsg)
            setErrorViolations(uniqueViolationMessages)
            toast.push(errorMsg, { placement: 'top-end' })
        }
    }

    const isReplaceIgnoredError = (violation: AssignmentViolation): boolean =>
        autoReplace &&
        (violation.type === 'headcount_exceeded' || violation.type === 'already_assigned')

    // Get violations for display
    const warnings = selectedStaff?.warnings.filter((v) => v.severity === 'warning') || []
    const ignoredErrors =
        selectedStaff?.warnings.filter(
            (v) => v.severity === 'error' && isReplaceIgnoredError(v),
        ) || []
    const errors =
        selectedStaff?.warnings.filter(
            (v) => v.severity === 'error' && !isReplaceIgnoredError(v),
        ) || []
    const hasHardBlocks = errors.length > 0

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

                        {autoReplace && currentAssigneeName && (
                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded text-indigo-900 text-sm">
                                Reassignment mode: selecting this staff will replace{' '}
                                <span className="font-semibold">{currentAssigneeName}</span>.
                            </div>
                        )}

                        {ignoredErrors.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
                                Capacity conflicts will be handled automatically by replacing the
                                current assignee.
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
                                <p>{error}</p>
                                {errorViolations.length > 0 && (
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {errorViolations.map((violation, index) => (
                                            <li key={`${violation}-${index}`}>• {violation}</li>
                                        ))}
                                    </ul>
                                )}
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
                                    : autoReplace
                                      ? 'Confirm Reassignment'
                                      : 'Confirm Assignment'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    )
}
