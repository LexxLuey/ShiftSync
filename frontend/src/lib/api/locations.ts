import { apiClient } from './client'

export type LocationRecord = {
    id: string
    name: string
    address: string
    timezone: string
}

export type LocationsResponse = {
    data: LocationRecord[]
}

export const locationService = {
    getLocations() {
        return apiClient.get<LocationsResponse>('/locations')
    },
}
