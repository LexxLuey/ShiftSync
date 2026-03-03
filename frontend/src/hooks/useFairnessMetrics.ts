import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fairnessService } from '@/lib/api/fairnessService'
import { format } from 'date-fns'
import type { NormalizedApiError } from '@/lib/api/types'

export interface UseFairnessMetricsParams {
    locationId: string
    startDate: string
    endDate: string
}

export default function useFairnessMetrics(params?: UseFairnessMetricsParams | null) {
    const queryClient = useQueryClient()

    const fairnessQuery = useQuery({
        queryKey: ['fairness', params],
        queryFn: () => {
            if (!params?.locationId) throw new Error('locationId is required')
            return fairnessService.getFairnessReport(params.locationId, params.startDate, params.endDate)
        },
        enabled: Boolean(params?.locationId && params?.startDate && params?.endDate),
    })

    const exportMutation = useMutation<Blob, NormalizedApiError, void>({
        mutationFn: async () => {
            if (!params?.locationId) throw new Error('locationId is required')
            return fairnessService.exportFairnessReport(params.locationId, params.startDate, params.endDate)
        },
        onSuccess: (blob) => {
            // Trigger download
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fairness-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        },
    })

    return { fairnessQuery, exportMutation }
}
