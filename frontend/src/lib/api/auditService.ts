import { apiClient } from './client'
import type { AuditLogsResponse, GetAuditLogsParams } from './types'

export const auditService = {
    getAuditLogs(params: GetAuditLogsParams) {
        return apiClient.get<AuditLogsResponse>('/audit-logs', {
            params,
        })
    },

    exportAuditLogs(params: GetAuditLogsParams) {
        return apiClient.get<Blob>('/audit-logs/export', {
            params,
            responseType: 'blob',
        })
    },
}
