'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import useShifts from '@/hooks/useShifts'
import useAssignments from '@/hooks/useAssignments'
import { Dialog, Button } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EligibleStaffModal from './EligibleStaffModal'
import toast from '@/components/ui/toast'
import type { Shift, ShiftAssignment } from '@/lib/api/types'

interface ShiftDetailModalProps {
    isOpen: boolean
    onClose: () => void
    shift: Shift
    locationId: string
    staffNames?: Record<string, string> // Map of userId -> name for display
}

export default function ShiftDetailModal({
    isOpen,
    onClose,
    shift,
    locationId,
    staffNames,
}: ShiftDetailModalProps) {
    const { deleteShiftMutation, publishShiftMutation } = useShifts(
        locationId ? { locationId } : null,
    )
    const { deleteAssignmentMutation } = useAssignments()

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showEligibleStaffModal, setShowEligibleStaffModal] = useState(false)
    const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setError('')
        try {
            await deleteShiftMutation.mutateAsync(shift.id)
            setShowDeleteConfirm(false)
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to delete shift')
        }
    }

    const handlePublish = async () => {
        setError('')
        try {
            await publishShiftMutation.mutateAsync(shift.id)
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to publish shift')
        }
    }

    const handleRemoveAssignment = async () => {
        if (!deleteAssignmentId) return

        setError('')
        try {
            await deleteAssignmentMutation.mutateAsync(deleteAssignmentId)
            toast.push('Staff removed from shift', { placement: 'top-end' })
            setDeleteAssignmentId(null)
        } catch (err: any) {
            const msg = err?.message || 'Failed to remove staff'
            setError(msg)
            toast.push(msg, { placement: 'top-end' })
        }
    }

    const canPublish = shift.status === 'DRAFT'
    const canDelete = shift.status === 'DRAFT'
    const startTime = format(new Date(shift.startTime), 'MMM d, yyyy h:mm a')
    const endTime = format(new Date(shift.endTime), 'h:mm a')

    // Get staff names for assignments
    const getStaffName = (userId: string, assignment: ShiftAssignment) => {
        return staffNames?.[userId] || `Staff ${userId.substring(0, 8)}`
    }

    return (
        <>
            <Dialog isOpen={isOpen} onRequestClose={onClose}>
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    <h2 className="text-lg font-semibold">Shift Details</h2>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-600">Time</p>
                            <p className="font-medium">
                                {startTime} - {endTime}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-600">Headcount Needed</p>
                            <p className="font-medium">{shift.headcountNeeded}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <p
                                className={`font-medium px-2 py-1 rounded-full text-xs w-fit ${
                                    shift.status === 'PUBLISHED'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                            >
                                {shift.status}
                            </p>
                        </div>

                        {/* ASSIGNMENTS SECTION */}
                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-3">
                                Assignments ({shift.assignments?.length || 0}/
                                {shift.headcountNeeded})
                            </p>

                            {shift.assignments && shift.assignments.length > 0 ? (
                                <div className="space-y-2 mb-3">
                                    {shift.assignments.map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    {getStaffName(
                                                        assignment.userId,
                                                        assignment,
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {assignment.status}
                                                </p>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="plain"
                                                onClick={() =>
                                                    setDeleteAssignmentId(assignment.id)
                                                }
                                                className="text-red-600 hover:text-red-700 text-xs"
                                                disabled={deleteAssignmentMutation.isPending}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 mb-3">
                                    No staff assigned yet
                                </p>
                            )}

                            {/* Find Available Staff Button */}
                            {(shift.assignments?.length || 0) < shift.headcountNeeded && (
                                <Button
                                    variant="solid"
                                    onClick={() => setShowEligibleStaffModal(true)}
                                    className="w-full"
                                >
                                    Find Available Staff
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4 flex-wrap border-t">
                        {canPublish && (
                            <Button
                                onClick={handlePublish}
                                disabled={publishShiftMutation.isPending}
                            >
                                {publishShiftMutation.isPending
                                    ? 'Publishing...'
                                    : 'Publish'}
                            </Button>
                        )}

                        {canDelete && (
                            <Button
                                variant="plain"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-red-600 hover:text-red-700"
                            >
                                Delete
                            </Button>
                        )}

                        <Button variant="plain" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Delete Shift Confirmation */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                type="danger"
                title="Delete Shift"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Delete"
                cancelText="Cancel"
            >
                Are you sure you want to delete this shift? This action cannot be undone.
            </ConfirmDialog>

            {/* Remove Assignment Confirmation */}
            <ConfirmDialog
                isOpen={Boolean(deleteAssignmentId)}
                type="warning"
                title="Remove Staff"
                onConfirm={handleRemoveAssignment}
                onCancel={() => setDeleteAssignmentId(null)}
                confirmText="Remove"
                cancelText="Cancel"
            >
                Remove this staff member from the shift?
            </ConfirmDialog>

            {/* Eligible Staff Modal */}
            <EligibleStaffModal
                isOpen={showEligibleStaffModal}
                onClose={() => setShowEligibleStaffModal(false)}
                shiftId={shift.id}
                shiftStartTime={startTime}
                shiftLocation={locationId}
                onAssignmentSuccess={() => setShowEligibleStaffModal(false)}
            />
        </>
    )
}

