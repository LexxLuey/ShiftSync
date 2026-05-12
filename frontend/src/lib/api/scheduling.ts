import { apiClient } from './client'
import type {
    GenerateScheduleRequest,
    GenerateScheduleResponse,
} from './types'

type GenerateScheduleApiResponse = {
    data: GenerateScheduleResponse
}

export const schedulingService = {
    generate(payload: GenerateScheduleRequest) {
        return apiClient.post<GenerateScheduleApiResponse, GenerateScheduleRequest>(
            '/schedules/generate',
            payload,
        )
    },
}
