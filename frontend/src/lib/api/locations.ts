import { apiClient } from './client'

export type LocationRecord = {
    id: string
    name: string
    address: string
    timezone: string
    isActive?: boolean
    deletedAt?: string | null
}

export type LocationsResponse = {
    data: LocationRecord[]
}

export const locationService = {
    getLocations() {
        return apiClient.get<LocationsResponse>('/locations')
    },
    createLocation(payload: Pick<LocationRecord, 'name' | 'address' | 'timezone'>) {
        return apiClient.post<{ data: LocationRecord }>('/locations', payload)
    },
    updateLocation(
        locationId: string,
        payload: Partial<Pick<LocationRecord, 'name' | 'address' | 'timezone'>>,
    ) {
        return apiClient.put<{ data: LocationRecord }>(`/locations/${locationId}`, payload)
    },
    deactivateLocation(locationId: string) {
        return apiClient.del<{ data: LocationRecord }>(`/locations/${locationId}`)
    },
}
