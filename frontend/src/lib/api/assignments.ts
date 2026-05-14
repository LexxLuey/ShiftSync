import { apiClient } from './client'
import type {
    CreateAssignmentPayload,
    CreateAssignmentResponse,
    EligibleStaffMember,
    GetEligibleStaffParams,
    ShiftAssignment,
} from './types'

export const assignmentService = {
    /**
     * Get list of eligible staff for a shift
     */
    async getEligibleStaff(params: GetEligibleStaffParams) {
        const { shiftId, ...query } = params

        const response = await apiClient.get<{
            success: boolean
            data: EligibleStaffMember[]
        }>(
            `/shifts/${shiftId}/eligible-staff`,
            { params: query },
        )

        return response.data
    },

    /**
     * Create assignment for a staff member to a shift
     */
    createAssignment(shiftId: string, payload: CreateAssignmentPayload) {
        return apiClient.post<CreateAssignmentResponse>(
            `/shifts/${shiftId}/assignments`,
            payload,
        )
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
