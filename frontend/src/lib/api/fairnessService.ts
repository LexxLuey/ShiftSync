import { apiClient } from './client'
import type { FairnessReportResponse } from './types'

export const fairnessService = {
    getFairnessReport(locationId: string, startDate: string, endDate: string) {
        return apiClient.get<FairnessReportResponse>('/reports/fairness', {
            params: { locationId, startDate, endDate },
        })
    },

    exportFairnessReport(locationId: string, startDate: string, endDate: string) {
        return apiClient.get<Blob>('/reports/fairness/export', {
            params: { locationId, startDate, endDate },
            responseType: 'blob',
        })
    },
}
