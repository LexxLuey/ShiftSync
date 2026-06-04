'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { locationService } from '@/lib/api/locations'

export default function useLocations() {
    const queryClient = useQueryClient()
    const locationsQuery = useQuery({
        queryKey: ['locations'],
        queryFn: () => locationService.getLocations(),
    })

    const createLocationMutation = useMutation({
        mutationFn: locationService.createLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
    })

    const updateLocationMutation = useMutation({
        mutationFn: ({
            locationId,
            payload,
        }: {
            locationId: string
            payload: Parameters<typeof locationService.updateLocation>[1]
        }) => locationService.updateLocation(locationId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
    })

    const deactivateLocationMutation = useMutation({
        mutationFn: locationService.deactivateLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
    })

    return {
        locationsQuery,
        createLocationMutation,
        updateLocationMutation,
        deactivateLocationMutation,
    }
}
