import { apiClient } from './client'
import type {
    CreateEventTemplatePayload,
    EventTemplate,
    EventTemplateScope,
    UpdateEventTemplatePayload,
} from './types'

type EventTemplatesListResponse = {
    data: EventTemplate[]
    count: number
}

type EventTemplateResponse = {
    data: EventTemplate
}

type ListEventTemplatesParams = {
    scope?: EventTemplateScope
    locationId?: string
    includeInactive?: boolean
    isActive?: boolean
}

export const eventTemplateService = {
    list(params?: ListEventTemplatesParams) {
        return apiClient.get<EventTemplatesListResponse>('/event-templates', {
            params,
        })
    },
    getById(id: string) {
        return apiClient.get<EventTemplateResponse>(`/event-templates/${id}`)
    },
    create(payload: CreateEventTemplatePayload) {
        return apiClient.post<EventTemplateResponse, CreateEventTemplatePayload>(
            '/event-templates',
            payload,
        )
    },
    update(id: string, payload: UpdateEventTemplatePayload) {
        return apiClient.put<EventTemplateResponse, UpdateEventTemplatePayload>(
            `/event-templates/${id}`,
            payload,
        )
    },
    archive(id: string) {
        return apiClient.del<EventTemplateResponse>(`/event-templates/${id}`)
    },
}
