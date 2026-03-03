'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import type { Location } from '@/lib/api/types'

type ReportFiltersProps = {
    locations: Location[]
    onFilterChange: (locationId: string, startDate: string, endDate: string) => void
    isLoading?: boolean
}

export default function ReportFilters({ locations, onFilterChange, isLoading }: ReportFiltersProps) {
    const [selectedLocation, setSelectedLocation] = useState<string>(locations[0]?.id || '')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    const handleApply = () => {
        if (!selectedLocation || !startDate || !endDate) {
            alert('Please select location and date range')
            return
        }
        onFilterChange(selectedLocation, startDate, endDate)
    }

    return (
        <Card className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <div className="grid gap-4 md:grid-cols-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value!)}
                        disabled={isLoading}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value!)}
                        disabled={isLoading}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value!)}
                        disabled={isLoading}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleApply} disabled={isLoading}>
                    Apply Filters
                </Button>
            </div>
        </Card>
    )
}
