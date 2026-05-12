import { apiClient } from './client'
import type { CalendarQuery, CalendarResponse } from './types'

export const calendarService = {
    getCalendar(query: CalendarQuery) {
        return apiClient.get<CalendarResponse>('/calendar', {
            params: query,
        })
    },
}

