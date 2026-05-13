'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek, subDays } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import toast from '@/components/ui/toast'
import useLocations from '@/hooks/useLocations'
import useReports from '@/hooks/useReports'
import useShifts from '@/hooks/useShifts'
import { useAuth } from '@/context/AuthContext'
import { userService, type UserRecord } from '@/lib/api/users'
import type {
    HoursDistributionData,
    NormalizedApiError,
    WhatIfShiftInput,
    OvertimeStatus,
} from '@/lib/api/types'

const { THead, TBody, Tr, Th, Td } = Table

type TabKey = 'hours' | 'projection' | 'whatif'

type SelectOption = {
    value: string
    label: string
}

const overtimeBadgeClass: Record<OvertimeStatus, string> = {
    under: 'border border-green-200 bg-green-100 text-green-700',
    warning: 'border border-amber-200 bg-amber-100 text-amber-800',
    overtime: 'border border-red-200 bg-red-100 text-red-700',
}

const formatHours = (hours: number): string => `${hours.toFixed(2)}h`

const buildWeekDayKeys = (weekStartDate: string): string[] => {
    const baseDate = new Date(`${weekStartDate}T00:00:00`)
    return Array.from({ length: 7 }).map((_, index) =>
        format(addDays(baseDate, index), 'yyyy-MM-dd'),
    )
}

export default function ReportsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { locationsQuery } = useLocations()
    const { useHoursDistributionQuery, useProjectionQuery, whatIfMutation } = useReports()

    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    useEffect(() => {
        if (user && !isManagerOrAdmin) {
            router.replace('/home')
        }
    }, [isManagerOrAdmin, router, user])

    const [selectedTab, setSelectedTab] = useState<TabKey>('hours')
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [weekStartInput, setWeekStartInput] = useState(
        format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
    )
    const [appliedWeekStartDate, setAppliedWeekStartDate] = useState(
        format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
    )

    const [projectionShiftId, setProjectionShiftId] = useState('')
    const [projectionUserId, setProjectionUserId] = useState('')

    const [whatIfShiftId, setWhatIfShiftId] = useState('')
    const [whatIfUserId, setWhatIfUserId] = useState('')
    const [whatIfProposals, setWhatIfProposals] = useState<WhatIfShiftInput[]>([])

    useEffect(() => {
        if (!selectedLocationId && locationsQuery.data?.data?.length) {
            setSelectedLocationId(locationsQuery.data.data[0]!.id)
        }
    }, [locationsQuery.data?.data, selectedLocationId])

    const dateRangeStart = format(subDays(new Date(), 7), 'yyyy-MM-dd')
    const dateRangeEnd = format(addDays(new Date(), 90), 'yyyy-MM-dd')

    const { shiftsQuery } = useShifts(
        selectedLocationId
            ? {
                  locationId: selectedLocationId,
                  startDate: dateRangeStart,
                  endDate: dateRangeEnd,
              }
            : null,
    )

    const shifts = useMemo(() => {
        const raw = shiftsQuery.data?.data || shiftsQuery.data?.shifts || []
        return raw
            .sort(
                (first, second) =>
                    new Date(first.startTime).getTime() - new Date(second.startTime).getTime(),
            )
    }, [shiftsQuery.data])

    const staffQuery = useQuery({
        queryKey: ['reports-staff', selectedLocationId],
        queryFn: async () => {
            const response = await userService.listUsers({
                page: 1,
                limit: 100,
                locationId: selectedLocationId || undefined,
            })
            return response.data
        },
        enabled: Boolean(selectedLocationId),
    })

    const staffList = useMemo(
        () =>
            (staffQuery.data || []).filter(
                (staff: UserRecord) => staff.role === 'MANAGER' || staff.role === 'STAFF',
            ) as UserRecord[],
        [staffQuery.data],
    )

    const locationOptions: SelectOption[] = (locationsQuery.data?.data || []).map((location) => ({
        value: location.id,
        label: location.name,
    }))

    const shiftOptions: SelectOption[] = shifts.map((shift) => ({
        value: shift.id,
        label: `${format(new Date(shift.startTime), 'EEE, MMM d h:mm a')} - ${shift.title}`,
    }))

    const staffOptions: SelectOption[] = staffList.map((staff) => ({
        value: staff.id,
        label: `${staff.firstName} ${staff.lastName} (${staff.role})`,
    }))

    const hoursQuery = useHoursDistributionQuery(
        selectedLocationId && appliedWeekStartDate
            ? {
                  locationId: selectedLocationId,
                  weekStartDate: appliedWeekStartDate,
              }
            : null,
    )

    const projectionQuery = useProjectionQuery(
        projectionShiftId && projectionUserId
            ? {
                  shiftId: projectionShiftId,
                  proposedUserId: projectionUserId,
              }
            : null,
    )

    const hoursRows = (hoursQuery.data?.data || []) as HoursDistributionData[]
    const weekDayKeys = buildWeekDayKeys(appliedWeekStartDate)

    const hoursSummary = useMemo(() => {
        if (hoursRows.length === 0) {
            return {
                averageHours: 0,
                overtimeCount: 0,
                warningCount: 0,
            }
        }

        const totalHours = hoursRows.reduce((sum, row) => sum + row.weeklyTotal, 0)
        return {
            averageHours: totalHours / hoursRows.length,
            overtimeCount: hoursRows.filter((row) => row.overtimeStatus === 'overtime').length,
            warningCount: hoursRows.filter((row) => row.overtimeStatus === 'warning').length,
        }
    }, [hoursRows])

    const reportsError = (hoursQuery.error || projectionQuery.error || whatIfMutation.error) as
        | NormalizedApiError
        | null

    const addWhatIfProposal = () => {
        if (!whatIfShiftId || !whatIfUserId) {
            toast.push('Select shift and staff before adding to simulation.', {
                placement: 'top-end',
            })
            return
        }

        const duplicate = whatIfProposals.some(
            (proposal) =>
                proposal.shiftId === whatIfShiftId && proposal.userId === whatIfUserId,
        )

        if (duplicate) {
            toast.push('This proposal is already added.', { placement: 'top-end' })
            return
        }

        setWhatIfProposals((previous) => [
            ...previous,
            { shiftId: whatIfShiftId, userId: whatIfUserId },
        ])
    }

    const runWhatIf = async () => {
        if (whatIfProposals.length === 0) {
            toast.push('Add at least one simulation proposal first.', {
                placement: 'top-end',
            })
            return
        }

        try {
            await whatIfMutation.mutateAsync(whatIfProposals)
        } catch {
            // error rendering handled below
        }
    }

    const removeWhatIfProposal = (index: number) => {
        setWhatIfProposals((previous) => previous.filter((_, idx) => idx !== index))
    }

    if (user && !isManagerOrAdmin) {
        return null
    }

    return (
        <div className="space-y-6 p-4">
            <Card className="border border-slate-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-5">
                <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                <p className="mt-1 text-sm text-slate-700">
                    Live staffing insights for overtime risk, projection checks, and what-if simulation.
                </p>
            </Card>

            <Card className="border border-slate-200 p-3">
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'hours', label: 'Hours Distribution' },
                        { key: 'projection', label: 'Projection' },
                        { key: 'whatif', label: 'What-If Simulator' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setSelectedTab(tab.key as TabKey)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                selectedTab === tab.key
                                    ? 'bg-blue-700 text-white shadow-sm'
                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Card>

            {reportsError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {reportsError.message}
                </div>
            ) : null}

            {selectedTab === 'hours' ? (
                <div className="space-y-4">
                    <Card className="border border-slate-200 p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Center
                                </label>
                                <Select
                                    instanceId="reports-hours-location"
                                    options={locationOptions}
                                    value={
                                        locationOptions.find(
                                            (option) => option.value === selectedLocationId,
                                        ) || null
                                    }
                                    onChange={(option) =>
                                        setSelectedLocationId((option?.value as string) || '')
                                    }
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Week Start Date
                                </label>
                                <Input
                                    type="date"
                                    value={weekStartInput}
                                    onChange={(event) => setWeekStartInput(event.target.value)}
                                />
                            </div>

                            <div className="flex items-end">
                                <Button
                                    className="bg-blue-700 text-white hover:bg-blue-800"
                                    onClick={() => setAppliedWeekStartDate(weekStartInput)}
                                >
                                    Refresh Distribution
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="grid gap-3 md:grid-cols-3">
                        <Card className="border border-blue-200 bg-blue-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Avg Weekly Hours
                            </p>
                            <p className="mt-1 text-2xl font-bold text-blue-900">
                                {formatHours(hoursSummary.averageHours)}
                            </p>
                        </Card>
                        <Card className="border border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                Warning (40h+)
                            </p>
                            <p className="mt-1 text-2xl font-bold text-amber-900">
                                {hoursSummary.warningCount}
                            </p>
                        </Card>
                        <Card className="border border-red-200 bg-red-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                                Overtime (52h+)
                            </p>
                            <p className="mt-1 text-2xl font-bold text-red-900">
                                {hoursSummary.overtimeCount}
                            </p>
                        </Card>
                    </div>

                    <Card className="border border-slate-200 p-4">
                        <h3 className="mb-3 text-base font-semibold text-slate-900">Staff Weekly Breakdown</h3>

                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Staff</Th>
                                    <Th>Weekly Total</Th>
                                    <Th>Status</Th>
                                    <Th>Consecutive Days</Th>
                                    <Th>Daily Breakdown</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {hoursRows.map((row) => (
                                    <Tr key={row.userId}>
                                        <Td className="font-medium">{row.userName}</Td>
                                        <Td>{formatHours(row.weeklyTotal)}</Td>
                                        <Td>
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${overtimeBadgeClass[row.overtimeStatus]}`}
                                            >
                                                {row.overtimeStatus}
                                            </span>
                                        </Td>
                                        <Td>{row.consecutiveDaysWorked}</Td>
                                        <Td>
                                            <div className="flex flex-wrap gap-1">
                                                {weekDayKeys.map((dayKey) => (
                                                    <span
                                                        key={dayKey}
                                                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                                    >
                                                        {format(new Date(`${dayKey}T00:00:00`), 'EEE')}:{' '}
                                                        {formatHours(row.dailyBreakdown[dayKey] || 0)}
                                                    </span>
                                                ))}
                                            </div>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>

                        {hoursQuery.isLoading ? (
                            <p className="mt-3 text-sm text-slate-500">Loading distribution...</p>
                        ) : null}

                        {!hoursQuery.isLoading && hoursRows.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">No hours data found for selected week.</p>
                        ) : null}
                    </Card>
                </div>
            ) : null}

            {selectedTab === 'projection' ? (
                <div className="space-y-4">
                    <Card className="border border-slate-200 p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Center
                                </label>
                                <Select
                                    instanceId="reports-projection-location"
                                    options={locationOptions}
                                    value={
                                        locationOptions.find(
                                            (option) => option.value === selectedLocationId,
                                        ) || null
                                    }
                                    onChange={(option) => {
                                        setSelectedLocationId((option?.value as string) || '')
                                        setProjectionShiftId('')
                                        setProjectionUserId('')
                                    }}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Shift
                                </label>
                                <Select
                                    instanceId="reports-projection-shift"
                                    options={shiftOptions}
                                    value={
                                        shiftOptions.find(
                                            (option) => option.value === projectionShiftId,
                                        ) || null
                                    }
                                    onChange={(option) =>
                                        setProjectionShiftId((option?.value as string) || '')
                                    }
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Proposed Staff
                                </label>
                                <Select
                                    instanceId="reports-projection-user"
                                    options={staffOptions}
                                    value={
                                        staffOptions.find(
                                            (option) => option.value === projectionUserId,
                                        ) || null
                                    }
                                    onChange={(option) =>
                                        setProjectionUserId((option?.value as string) || '')
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {projectionQuery.data ? (
                        <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-3">
                                <Card className="border border-slate-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Current Weekly Hours
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {formatHours(projectionQuery.data.currentWeeklyHours)}
                                    </p>
                                </Card>
                                <Card className="border border-slate-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Projected Weekly Hours
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {formatHours(projectionQuery.data.projectedWeeklyHours)}
                                    </p>
                                </Card>
                                <Card
                                    className={`p-4 ${
                                        projectionQuery.data.canAssign
                                            ? 'border border-green-200 bg-green-50'
                                            : 'border border-red-200 bg-red-50'
                                    }`}
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide">
                                        Assignment Verdict
                                    </p>
                                    <p className="mt-1 text-xl font-bold">
                                        {projectionQuery.data.canAssign ? 'Allowed' : 'Blocked'}
                                    </p>
                                </Card>
                            </div>

                            {projectionQuery.data.warnings.length > 0 ? (
                                <Card className="border border-amber-200 bg-amber-50 p-4">
                                    <h4 className="text-sm font-semibold text-amber-900">Warnings</h4>
                                    <ul className="mt-2 space-y-1 text-sm text-amber-800">
                                        {projectionQuery.data.warnings.map((warning) => (
                                            <li key={warning.type}>• {warning.message}</li>
                                        ))}
                                    </ul>
                                </Card>
                            ) : null}

                            {projectionQuery.data.blocks.length > 0 ? (
                                <Card className="border border-red-200 bg-red-50 p-4">
                                    <h4 className="text-sm font-semibold text-red-900">Blocking Reasons</h4>
                                    <ul className="mt-2 space-y-1 text-sm text-red-800">
                                        {projectionQuery.data.blocks.map((block) => (
                                            <li key={block.type}>• {block.message}</li>
                                        ))}
                                    </ul>
                                </Card>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {selectedTab === 'whatif' ? (
                <div className="space-y-4">
                    <Card className="border border-slate-200 p-4">
                        <p className="mb-3 text-sm text-slate-600">
                            Add one or more shift/staff proposals, then run simulation without changing live assignments.
                        </p>
                        <div className="grid gap-3 md:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Center
                                </label>
                                <Select
                                    instanceId="reports-whatif-location"
                                    options={locationOptions}
                                    value={
                                        locationOptions.find(
                                            (option) => option.value === selectedLocationId,
                                        ) || null
                                    }
                                    onChange={(option) =>
                                        setSelectedLocationId((option?.value as string) || '')
                                    }
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Shift
                                </label>
                                <Select
                                    instanceId="reports-whatif-shift"
                                    options={shiftOptions}
                                    value={
                                        shiftOptions.find((option) => option.value === whatIfShiftId) ||
                                        null
                                    }
                                    onChange={(option) =>
                                        setWhatIfShiftId((option?.value as string) || '')
                                    }
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Staff
                                </label>
                                <Select
                                    instanceId="reports-whatif-user"
                                    options={staffOptions}
                                    value={
                                        staffOptions.find((option) => option.value === whatIfUserId) ||
                                        null
                                    }
                                    onChange={(option) =>
                                        setWhatIfUserId((option?.value as string) || '')
                                    }
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    className="bg-blue-700 text-white hover:bg-blue-800"
                                    onClick={addWhatIfProposal}
                                >
                                    Add Proposal
                                </Button>
                            </div>
                        </div>

                        {whatIfProposals.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {whatIfProposals.map((proposal, index) => {
                                    const shiftLabel =
                                        shiftOptions.find((option) => option.value === proposal.shiftId)
                                            ?.label || proposal.shiftId
                                    const userLabel =
                                        staffOptions.find((option) => option.value === proposal.userId)
                                            ?.label || proposal.userId

                                    return (
                                        <div
                                            key={`${proposal.shiftId}-${proposal.userId}`}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                            <p className="text-sm text-slate-700">
                                                <span className="font-semibold">Shift:</span> {shiftLabel}{' '}
                                                <span className="mx-1">|</span>
                                                <span className="font-semibold">Staff:</span> {userLabel}
                                            </p>
                                            <Button
                                                size="sm"
                                                className="bg-red-600 text-white hover:bg-red-700"
                                                onClick={() => removeWhatIfProposal(index)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : null}

                        <div className="mt-4">
                            <Button
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                loading={whatIfMutation.isPending}
                                onClick={runWhatIf}
                            >
                                Run Simulation
                            </Button>
                        </div>
                    </Card>

                    {whatIfMutation.data ? (
                        <Card className="border border-slate-200 p-4">
                            <h3 className="mb-3 text-base font-semibold text-slate-900">Simulation Summary</h3>
                            <div className="grid gap-3 md:grid-cols-4">
                                <Card className="border border-slate-200 p-3">
                                    <p className="text-xs text-slate-600">Total Proposed</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {whatIfMutation.data.totalProposed}
                                    </p>
                                </Card>
                                <Card className="border border-green-200 bg-green-50 p-3">
                                    <p className="text-xs text-green-700">Can Assign</p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {whatIfMutation.data.canAssign}
                                    </p>
                                </Card>
                                <Card className="border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-xs text-amber-700">Will Warn</p>
                                    <p className="text-2xl font-bold text-amber-900">
                                        {whatIfMutation.data.willWarn}
                                    </p>
                                </Card>
                                <Card className="border border-red-200 bg-red-50 p-3">
                                    <p className="text-xs text-red-700">Will Block</p>
                                    <p className="text-2xl font-bold text-red-900">
                                        {whatIfMutation.data.willBlock}
                                    </p>
                                </Card>
                            </div>
                        </Card>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}
