'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import useDashboardSummary from '@/hooks/useDashboardSummary'
import useLocations from '@/hooks/useLocations'
import { useAuth } from '@/context/AuthContext'
import type { NormalizedApiError } from '@/lib/api/types'

const formatDateTime = (value: string, timezone?: string): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
    }).format(date)
}

const Page = () => {
    const { user } = useAuth()
    const { locationsQuery } = useLocations()
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const dashboardQuery = useDashboardSummary(selectedLocationId || undefined)

    const locations = locationsQuery.data?.data || []
    const locationOptions = useMemo(
        () => [
            { value: '', label: user?.role === 'ADMIN' ? 'All Centers' : 'My Centers' },
            ...locations.map((location) => ({
                value: location.id,
                label: location.name,
            })),
        ],
        [locations, user?.role],
    )

    useEffect(() => {
        if (selectedLocationId && !locations.some((location) => location.id === selectedLocationId)) {
            setSelectedLocationId('')
        }
    }, [locations, selectedLocationId])

    const summary = dashboardQuery.data?.data
    const stats = summary?.stats
    const error = dashboardQuery.error as NormalizedApiError | null
    const displayName = user?.firstName || user?.email || 'there'

    const statCards = [
        { label: 'Centers', value: stats?.centers ?? 0, hint: 'Active centers in scope' },
        { label: 'Users', value: stats?.users ?? 0, hint: 'Active people in scope' },
        { label: 'Draft Shifts', value: stats?.draftShifts ?? 0, hint: 'Upcoming drafts' },
        { label: 'Published Shifts', value: stats?.publishedShifts ?? 0, hint: 'Upcoming published' },
        { label: 'Open Headcount', value: stats?.openHeadcount ?? 0, hint: 'Unfilled slots soon' },
        { label: 'Upcoming Shifts', value: stats?.upcomingShifts ?? 0, hint: 'Next 14 days' },
    ]

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-wide text-gray-500">Dashboard</p>
                    <h1 className="text-2xl font-semibold">Welcome, {displayName}</h1>
                    <p className="text-sm text-gray-500">
                        {user?.role === 'ADMIN'
                            ? 'Director view across all active centers.'
                            : user?.role === 'MANAGER'
                              ? 'Manager view scoped to your centers.'
                              : 'Your upcoming assigned schedule.'}
                    </p>
                </div>
                <div className="min-w-64">
                    <Select
                        instanceId="dashboard-location-filter"
                        value={locationOptions.find((option) => option.value === selectedLocationId) || null}
                        options={locationOptions}
                        isSearchable={false}
                        onChange={(option) => setSelectedLocationId((option?.value as string) || '')}
                    />
                </div>
            </div>

            {error ? <p className="text-red-600">{error.message || 'Failed to load dashboard.'}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {statCards.map((card) => (
                    <Card key={card.label}>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">{card.label}</p>
                            <p className="text-3xl font-semibold">{dashboardQuery.isLoading ? '—' : card.value}</p>
                            <p className="text-xs text-gray-500">{card.hint}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <h2 className="mb-4 text-lg font-semibold">Upcoming Focus</h2>
                    {dashboardQuery.isLoading ? <p>Loading upcoming shifts...</p> : null}
                    {!dashboardQuery.isLoading && (summary?.upcoming || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No upcoming shifts in this scope.</p>
                    ) : null}
                    <div className="space-y-3">
                        {(summary?.upcoming || []).map((shift) => (
                            <div
                                key={shift.id}
                                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="font-semibold">{shift.title}</p>
                                        <p className="text-sm text-gray-500">{shift.location.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatDateTime(shift.startTime, shift.location.timezone)}
                                        </p>
                                    </div>
                                    <div className="text-sm md:text-right">
                                        <p>{shift.status}</p>
                                        <p className="text-gray-500">
                                            {shift.assignedCount}/{shift.headcountNeeded} assigned
                                        </p>
                                        {shift.openHeadcount > 0 ? (
                                            <p className="text-amber-600">{shift.openHeadcount} open</p>
                                        ) : (
                                            <p className="text-emerald-600">Covered</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="mb-4 text-lg font-semibold">Next Actions</h2>
                    <ul className="space-y-3">
                        {(summary?.nextActions || []).map((action) => (
                            <li key={action} className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                {action}
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    )
}

export default Page
