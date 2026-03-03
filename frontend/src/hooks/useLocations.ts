'use client'

import { useQuery } from '@tanstack/react-query'
import { locationService } from '@/lib/api/locations'

export default function useLocations() {
    const locationsQuery = useQuery({
        queryKey: ['locations'],
        queryFn: () => locationService.getLocations(),
    })

    return { locationsQuery }
}
