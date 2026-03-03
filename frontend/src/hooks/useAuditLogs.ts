'use client'

import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/lib/api/auditService'
import type { GetAuditLogsParams, NormalizedApiError } from '@/lib/api/types'

export default function useAuditLogs(params?: GetAuditLogsParams | null) {
    const auditLogsQuery = useQuery<unknown, NormalizedApiError>({
        queryKey: ['auditLogs', params],
        queryFn: () =>
            auditService.getAuditLogs(
                params as GetAuditLogsParams,
            ),
        enabled: Boolean(params),
        staleTime: 60000, // 1 minute
    })

    return {
        ...auditLogsQuery,
    }
}
