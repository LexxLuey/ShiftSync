'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import useLocations from '@/hooks/useLocations'
import useFairnessMetrics from '@/hooks/useFairnessMetrics'
import FairnessChart from '@/components/shared/FairnessChart'
import MetricsCard from '@/components/shared/MetricsCard'
import ReportFilters from '@/components/shared/ReportFilters'
import ReportTable from '@/components/shared/ReportTable'
import type { StaffFairnessData } from '@/lib/api/types'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function FairnessPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { locationsQuery } = useLocations()

    // Redirect if not ADMIN or MANAGER
    if (user && !['ADMIN', 'MANAGER'].includes(user.role)) {
        router.push('/home')
        return null
    }

    const [filters, setFilters] = useState<{
        locationId: string
        startDate: string
        endDate: string
    } | null>(null)

    const { fairnessQuery, exportMutation } = useFairnessMetrics(filters)

    const handleFilterChange = (locationId: string, startDate: string, endDate: string) => {
        setFilters({ locationId, startDate, endDate })
    }

    // Calculate aggregate metrics
    const fairnessData = fairnessQuery.data?.data ?? []
    const avgFairnessScore = fairnessData.length > 0 ? fairnessData.reduce((sum, d) => sum + d.fairnessScore, 0) / fairnessData.length : 0
    const unfairCount = fairnessData.filter((d) => d.fairnessScore > 1.2).length
    const fairCount = fairnessData.filter((d) => d.fairnessScore < 0.8).length

    // Table columns
    const columnHelper = createColumnHelper<StaffFairnessData>()
    const columns: any[] = [
        columnHelper.accessor('userName', {
            header: 'Staff Member',
            cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('totalHours', {
            header: 'Total Hours',
            cell: (info) => `${info.getValue().toFixed(1)}h`,
        }),
        columnHelper.accessor('premiumShiftCount', {
            header: 'Premium Shifts',
            cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('premiumPercentage', {
            header: '% Premium',
            cell: (info) => `${info.getValue().toFixed(1)}%`,
        }),
        columnHelper.accessor('fairnessScore', {
            header: 'Fairness Score',
            cell: (info) => {
                const score = info.getValue()
                return <span className="font-semibold">{score.toFixed(2)}</span>
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: (info) => {
                const status = info.getValue()
                const colors = {
                    under: 'bg-green-100 text-green-800',
                    balanced: 'bg-blue-100 text-blue-800',
                    over: 'bg-red-100 text-red-800',
                }
                return (
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
                        {status}
                    </span>
                )
            },
        }),
    ]

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold text-gray-900">Fairness Dashboard</h1>

            {/* Filters */}
            {locationsQuery.data?.data && (
                <ReportFilters
                    locations={locationsQuery.data.data}
                    onFilterChange={handleFilterChange}
                    isLoading={fairnessQuery.isLoading}
                />
            )}

            {/* Metrics Summary */}
            {filters && (
                <div className="grid gap-4 md:grid-cols-4">
                    <MetricsCard
                        label="Average Fairness Score"
                        value={avgFairnessScore.toFixed(2)}
                        color="blue"
                        subtext={avgFairnessScore < 1 ? 'Well distributed' : 'May need rebalancing'}
                    />
                    <MetricsCard
                        label="Fair Assignments"
                        value={fairCount}
                        color="green"
                        subtext="Score < 0.8"
                    />
                    <MetricsCard
                        label="Imbalanced Assignments"
                        value={unfairCount}
                        color="red"
                        subtext="Score > 1.2"
                    />
                    <MetricsCard
                        label="Total Staff"
                        value={fairnessData.length}
                        color="blue"
                    />
                </div>
            )}

            {/* Chart */}
            {fairnessData.length > 0 && (
                <FairnessChart data={fairnessData.map((d) => ({ name: d.userName, fairnessScore: d.fairnessScore }))} />
            )}

            {/* Table */}
            {filters && (
                <ReportTable<StaffFairnessData>
                    data={fairnessData}
                    columns={columns}
                    title="Fairness Report"
                    onExport={() => exportMutation.mutate()}
                    isLoading={fairnessQuery.isLoading}
                />
            )}
        </div>
    )
}
