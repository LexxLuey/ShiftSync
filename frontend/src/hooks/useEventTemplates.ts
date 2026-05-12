'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventTemplateService } from '@/lib/api/eventTemplates'
import type {
    CreateEventTemplatePayload,
    EventTemplate,
    EventTemplateScope,
    NormalizedApiError,
    UpdateEventTemplatePayload,
} from '@/lib/api/types'

type EventTemplateFilters = {
    scope?: EventTemplateScope
    locationId?: string
    includeInactive?: boolean
}

export default function useEventTemplates(filters?: EventTemplateFilters) {
    const queryClient = useQueryClient()

    const templatesQuery = useQuery({
        queryKey: ['event-templates', filters],
        queryFn: async () => eventTemplateService.list(filters),
    })

    const createTemplateMutation = useMutation<
        { data: EventTemplate },
        NormalizedApiError,
        CreateEventTemplatePayload
    >({
        mutationFn: (payload) => eventTemplateService.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-templates'] })
        },
    })

    const updateTemplateMutation = useMutation<
        { data: EventTemplate },
        NormalizedApiError,
        { id: string; payload: UpdateEventTemplatePayload }
    >({
        mutationFn: ({ id, payload }) => eventTemplateService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-templates'] })
        },
    })

    const archiveTemplateMutation = useMutation<
        { data: EventTemplate },
        NormalizedApiError,
        string
    >({
        mutationFn: (id) => eventTemplateService.archive(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-templates'] })
        },
    })

    return {
        templatesQuery,
        createTemplateMutation,
        updateTemplateMutation,
        archiveTemplateMutation,
    }
}
