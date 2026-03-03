'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignmentService } from '@/lib/api/assignments'
import type {
    CreateAssignmentPayload,
    EligibleStaffMember,
    GetEligibleStaffParams,
} from '@/lib/api/types'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useAssignments() {
    const queryClient = useQueryClient()

    /**
     * Fetch eligible staff for a shift
     */
    const getEligibleStaffQuery = (params: GetEligibleStaffParams | null) => {
        return useQuery<EligibleStaffMember[], NormalizedApiError>({
            queryKey: ['eligible-staff', params],
            queryFn: () =>
                assignmentService.getEligibleStaff(params as GetEligibleStaffParams),
            enabled: Boolean(params?.shiftId),
        })
    }

    /**
     * Create assignment mutation
     */
    const createAssignmentMutation = useMutation<
        unknown,
        NormalizedApiError,
        { shiftId: string; userId: string }
    >({
        mutationFn: ({ shiftId, userId }) =>
            assignmentService.createAssignment(shiftId, { userId }),
        onSuccess: () => {
            // Invalidate shifts to refresh assignments
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
        },
    })

    /**
     * Delete assignment mutation
     */
    const deleteAssignmentMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (assignmentId) => assignmentService.deleteAssignment(assignmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
        },
    })

    /**
     * Override assignment mutation (manager only)
     */
    const overrideAssignmentMutation = useMutation<
        unknown,
        NormalizedApiError,
        { shiftId: string; userId: string; reason: string }
    >({
        mutationFn: ({ shiftId, userId, reason }) =>
            assignmentService.overrideAssignment(shiftId, {
                userId,
                reason,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
        },
    })

    return {
        getEligibleStaffQuery,
        createAssignmentMutation,
        deleteAssignmentMutation,
        overrideAssignmentMutation,
    }
}
