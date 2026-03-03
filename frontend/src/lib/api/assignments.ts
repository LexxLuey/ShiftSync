import { apiClient } from './client'
import type {
    CreateAssignmentPayload,
    EligibleStaffMember,
    GetEligibleStaffParams,
    ShiftAssignment,
} from './types'

export const assignmentService = {
    /**
     * Get list of eligible staff for a shift
     */
    getEligibleStaff(params: GetEligibleStaffParams) {
        const { shiftId, ...query } = params

        return apiClient.get<EligibleStaffMember[]>(
            `/shifts/${shiftId}/eligible-staff`,
            { params: query },
        )
    },

    /**
     * Create assignment for a staff member to a shift
     */
    createAssignment(shiftId: string, payload: CreateAssignmentPayload) {
        return apiClient.post<ShiftAssignment>(`/shifts/${shiftId}/assignments`, payload)
    },

    /**
     * Remove assignment
     */
    deleteAssignment(assignmentId: string) {
        return apiClient.del<ShiftAssignment>(`/assignments/${assignmentId}`)
    },

    /**
     * Override assignment (manager only, bypasses non-critical violations)
     */
    overrideAssignment(
        shiftId: string,
        payload: CreateAssignmentPayload & { reason: string },
    ) {
        return apiClient.post<ShiftAssignment>(`/assignments/override`, {
            shiftId,
            ...payload,
        })
    },
}
