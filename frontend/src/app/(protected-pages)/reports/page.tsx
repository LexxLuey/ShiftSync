'use client'

import { useState } from 'react'
import useReports from '@/hooks/useReports'
import useShifts from '@/hooks/useShifts'
import useLocations from '@/hooks/useLocations'
import MetricsCard from '@/components/shared/MetricsCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Tabs from '@/components/ui/Tabs'
import type { HoursDistributionData } from '@/lib/api/types'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { locationsQuery } = useLocations()

    // Redirect if not ADMIN or MANAGER
    if (user && !['ADMIN', 'MANAGER'].includes(user.role)) {
        router.push('/home')
        return null
    }

    const [selectedTab, setSelectedTab] = useState<'hours' | 'projection' | 'whatif'>('hours')
    const [selectedLocation, setSelectedLocation] = useState<string>(locationsQuery.data?.data?.[0]?.id || '')
    const [weekStartDate, setWeekStartDate] = useState<string>('')
    const [selectedShiftId, setSelectedShiftId] = useState<string>('')
    const [selectedUserId, setSelectedUserId] = useState<string>('')

    const { hoursQuery, projectionQuery, whatIfMutation } = useReports()
    const { shiftsQuery } = useShifts({ locationId: selectedLocation })

    const handleHoursApply = () => {
        if (!weekStartDate) {
            alert('Please select a week start date')
            return
        }
        // In a real app, we'd refetch with proper params
        // For now, mock the data
    }

    const handleProjectionApply = () => {
        if (!selectedShiftId || !selectedUserId) {
            alert('Please select a shift and staff member')
            return
        }
        // Refetch projection based on selection
    }

    const handleWhatIfSubmit = () => {
        whatIfMutation.mutate([{ shiftId: selectedShiftId, userId: selectedUserId }])
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setSelectedTab('hours')}
                    className={`px-4 py-2 font-medium ${selectedTab === 'hours' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                    Hours Distribution
                </button>
                <button
                    onClick={() => setSelectedTab('projection')}
                    className={`px-4 py-2 font-medium ${selectedTab === 'projection' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                    Projection
                </button>
                <button
                    onClick={() => setSelectedTab('whatif')}
                    className={`px-4 py-2 font-medium ${selectedTab === 'whatif' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                    What-If Simulator
                </button>
            </div>

            {/* Hours Distribution Tab */}
            {selectedTab === 'hours' && (
                <div className="space-y-4">
                    <Card className="space-y-4 p-4">
                        <h3 className="text-lg font-semibold">Weekly Hours Distribution</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value!)}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                >
                                    {locationsQuery.data?.data?.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Week Start Date</label>
                                <input
                                    type="date"
                                    value={weekStartDate}
                                    onChange={(e) => setWeekStartDate(e.target.value!)}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            </div>
                        </div>
                        <Button onClick={handleHoursApply}>View Distribution</Button>
                    </Card>

                    {/* Sample Hours Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <MetricsCard
                            label="Average Weekly Hours"
                            value="38.5"
                            color="blue"
                            subtext="Across all staff"
                        />
                        <MetricsCard
                            label="Staff on Overtime"
                            value="3"
                            color="red"
                            subtext="Over 40 hours"
                        />
                        <MetricsCard
                            label="Under 40 Hours"
                            value="12"
                            color="green"
                            subtext="Normal schedule"
                        />
                    </div>

                    {/* Sample data */}
                    <Card className="p-4">
                        <h4 className="mb-4 font-semibold">Staff Breakdown (Sample)</h4>
                        <div className="space-y-3">
                            {[
                                { name: 'Sarah Chen', hours: 42, status: 'overtime' as const },
                                { name: 'John Smith', hours: 38, status: 'balanced' as const },
                                { name: 'Maria Garcia', hours: 35, status: 'under' as const },
                            ].map((staff) => (
                                <div key={staff.name} className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="flex-1">
                                        <p className="font-medium">{staff.name}</p>
                                        <p className="text-sm text-gray-500">{staff.hours}h this week</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            staff.status === 'overtime'
                                                ? 'bg-red-100 text-red-800'
                                                : staff.status === 'under'
                                                  ? 'bg-green-100 text-green-800'
                                                  : 'bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        {staff.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Projection Tab */}
            {selectedTab === 'projection' && (
                <div className="space-y-4">
                    <Card className="space-y-4 p-4">
                        <h3 className="text-lg font-semibold">Hours Projection</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value!)}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                >
                                    {locationsQuery.data?.data?.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Shift</label>
                                <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value!)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
                                    <option value="">-- Choose Shift --</option>
                                    {shiftsQuery.data?.shifts?.map((shift) => (
                                        <option key={shift.id} value={shift.id}>
                                            {new Date(shift.startTime).toLocaleString()} (
                                            {shift.headcountNeeded - (shift.assignments?.length || 0)} open)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleProjectionApply}>Calculate Projection</Button>
                    </Card>

                    {/* Sample Projection Result */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <MetricsCard
                            label="Current Weekly Hours"
                            value="38"
                            color="blue"
                        />
                        <MetricsCard
                            label="Projected Total (with new shift)"
                            value="42"
                            color="yellow"
                            subtext="Approaches 40h limit"
                        />
                    </div>

                    <Card className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                        <p className="font-semibold text-yellow-800">⚠️ Warning</p>
                        <p className="mt-1 text-sm text-yellow-700">This assignment would bring the staff member to 42 hours this week (40+ warning threshold)</p>
                    </Card>
                </div>
            )}

            {/* What-If Tab */}
            {selectedTab === 'whatif' && (
                <div className="space-y-4">
                    <Card className="space-y-4 p-4">
                        <h3 className="text-lg font-semibold">What-If Simulator</h3>
                        <p className="text-sm text-gray-600">Test potential assignments without saving changes</p>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value!)}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                >
                                    {locationsQuery.data?.data?.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Shift</label>
                                <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value!)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
                                    <option value="">-- Choose Shift --</option>
                                    {shiftsQuery.data?.shifts?.map((shift) => (
                                        <option key={shift.id} value={shift.id}>
                                            {new Date(shift.startTime).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleWhatIfSubmit} disabled={whatIfMutation.isPending}>
                            Calculate Results
                        </Button>
                    </Card>

                    {/* Sample What-If Results */}
                    {whatIfMutation.isSuccess && whatIfMutation.data && (
                        <Card className="space-y-4 p-4">
                            <h4 className="font-semibold">Simulation Results</h4>
                            <div className="grid gap-4 md:grid-cols-4">
                                <MetricsCard
                                    label="Total Proposed"
                                    value={whatIfMutation.data.totalProposed}
                                    color="blue"
                                />
                                <MetricsCard
                                    label="Can Assign"
                                    value={whatIfMutation.data.canAssign}
                                    color="green"
                                />
                                <MetricsCard
                                    label="Will Warn"
                                    value={whatIfMutation.data.willWarn}
                                    color="yellow"
                                />
                                <MetricsCard
                                    label="Will Block"
                                    value={whatIfMutation.data.willBlock}
                                    color="red"
                                />
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
