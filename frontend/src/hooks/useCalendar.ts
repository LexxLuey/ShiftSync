'use client'

import { useQuery } from '@tanstack/react-query'
import { calendarService } from '@/lib/api/calendar'
import type { CalendarQuery } from '@/lib/api/types'

export default function useCalendar(query: CalendarQuery | null) {
    const calendarQuery = useQuery({
        queryKey: ['calendar', query],
        queryFn: () => calendarService.getCalendar(query as CalendarQuery),
        enabled: Boolean(query?.startDate && query?.endDate),
    })

    return { calendarQuery }
}

