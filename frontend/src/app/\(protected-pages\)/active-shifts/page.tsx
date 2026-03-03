'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import useActiveShifts from '@/hooks/useActiveShifts'
import useSocketEvents from '@/hooks/useSocketEvents'
import ActiveShiftsList from '@/components/shared/ActiveShiftsList'
import Select from '@/components/ui/Select'
import { locationService } from '@/lib/api/locations'
import type { LocationRecord } from '@/lib/api/locations'

export default function ActiveShiftsPage() {
    const { user } = useAuth()
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

    // Setup socket events
    useSocketEvents()

    // Fetch locations
    const locationsQuery = useQuery({
        queryKey: ['locations'],
        queryFn: () => locationService.getLocations(),
    })

    const locations: LocationRecord[] = useMemo(() => {
        const data = locationsQuery.data?.data ?? []

        // Filter based on user role
        if (user?.role === 'ADMIN') {
            return data
        }

        // Managers only see assigned locations (simplified: show all for now)
        // In production, you'd filter by user.managerLocations
        return data
    }, [locationsQuery.data?.data, user?.role])

    // Set default location
    useMemo(() => {
        if (locations.length > 0 && !selectedLocationId) {
            setSelectedLocationId(locations[0].id)
        }
    }, [locations, selectedLocationId])

    // Fetch active shifts for selected location
    const activeShiftsQuery = useActiveShifts(selectedLocationId)

    // Role-based access check
    const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    if (!isAuthorized) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-gray-600 mt-2">
                    You don't have permission to view active shifts.
                </p>
            </div>
        )
    }

    const shifts = activeShiftsQuery.data?.data ?? []

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">On-Duty Now</h1>
                <p className="text-gray-600 mt-2">
                    View staff currently working across all locations
                </p>
            </div>

            {/* Location Selector */}
            {locations.length > 1 && (
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                    </label>
                    <Select
                        value={selectedLocationId || ''}
                        onChange={(e) => setSelectedLocationId(e.target.value || null)}
                    >
                        <option value="">Select a location...</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </Select>
                </div>
            )}

            {/* Info Cards */}
            {selectedLocationId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Active Shifts</p>
                        <p className="text-3xl font-bold text-blue-900 mt-1">
                            {shifts.length}
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Staff Working</p>
                        <p className="text-3xl font-bold text-green-900 mt-1">
                            {shifts.reduce((sum, s) => sum + s.assignedStaff.length, 0)}
                        </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-yellow-600 font-medium">Needed</p>
                        <p className="text-3xl font-bold text-yellow-900 mt-1">
                            {shifts.reduce(
                                (sum, s) =>
                                    sum +
                                    Math.max(0, s.headcountNeeded - s.assignedStaff.length),
                                0,
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Active Shifts List */}
            <ActiveShiftsList
                shifts={shifts}
                isLoading={activeShiftsQuery.isLoading}
            />
        </div>
    )
}
