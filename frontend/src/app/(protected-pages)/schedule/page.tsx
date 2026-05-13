'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { useMutation } from '@tanstack/react-query'
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { Button, Dialog, Select } from '@/components/ui'
import toast from '@/components/ui/toast'
import CalendarView from '@/components/shared/CalendarView'
import EligibleStaffModal from '@/components/shifts/EligibleStaffModal'
import { useAuth } from '@/context/AuthContext'
import useLocations from '@/hooks/useLocations'
import useCalendar from '@/hooks/useCalendar'
import useAssignments from '@/hooks/useAssignments'
import { shiftService } from '@/lib/api/shifts'
import type {
    CalendarQuery,
    CalendarShift,
    CalendarStatusFilter,
    NormalizedApiError,
} from '@/lib/api/types'

type SelectOption = {
    label: string
    value: string
}

const formatDisplayDate = (dateValue: string): string =>
    format(new Date(`${dateValue}T00:00:00.000Z`), 'MMM d, yyyy')

const getStatusChipClass = (status: CalendarShift['status']) =>
    status === 'PUBLISHED'
        ? 'border border-green-200 bg-green-100 text-green-800'
        : 'border border-amber-200 bg-amber-100 text-amber-800'

export default function SchedulePage() {
    const { user } = useAuth()
    const { locationsQuery } = useLocations()
    const { deleteAssignmentMutation } = useAssignments()
    const isStaff = user?.role === 'STAFF'
    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    const [locationId, setLocationId] = useState('')
    const [titleFilter, setTitleFilter] = useState('')
    const [assignedUserId, setAssignedUserId] = useState('')
    const [mine, setMine] = useState<boolean>(isStaff)
    const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('PUBLISHED')
    const [rangeStartDate, setRangeStartDate] = useState<string>('')
    const [rangeEndDate, setRangeEndDate] = useState<string>('')
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
    const [assignmentModalShiftId, setAssignmentModalShiftId] = useState<string | null>(null)

    useEffect(() => {
        if (isStaff) {
            setMine(true)
            setStatusFilter('PUBLISHED')
        }
    }, [isStaff])

    const calendarQueryParams = useMemo<CalendarQuery | null>(() => {
        if (!rangeStartDate || !rangeEndDate) {
            return null
        }

        return {
            startDate: rangeStartDate,
            endDate: rangeEndDate,
            ...(locationId ? { locationId } : {}),
            ...(titleFilter.trim() ? { title: titleFilter.trim() } : {}),
            ...(!isStaff && assignedUserId ? { assignedUserId } : {}),
            ...(mine ? { mine: true } : {}),
            ...(isManagerOrAdmin ? { status: statusFilter } : {}),
        }
    }, [
        assignedUserId,
        isManagerOrAdmin,
        isStaff,
        locationId,
        mine,
        rangeEndDate,
        rangeStartDate,
        statusFilter,
        titleFilter,
    ])

    const { calendarQuery } = useCalendar(calendarQueryParams)
    const calendarShifts = (calendarQuery.data?.data || []) as CalendarShift[]

    const publishMutation = useMutation({
        mutationFn: (shiftId: string) => shiftService.publishShift(shiftId),
    })

    const locationOptions = useMemo<SelectOption[]>(
        () =>
            (locationsQuery.data?.data || []).map((location) => ({
                label: location.name,
                value: location.id,
            })),
        [locationsQuery.data],
    )

    const assigneeOptions = useMemo<SelectOption[]>(() => {
        const optionsByUser = new Map<string, SelectOption>()

        calendarShifts.forEach((shift) => {
            shift.assignments.forEach((assignment) => {
                const name = `${assignment.user.firstName} ${assignment.user.lastName}`.trim()
                optionsByUser.set(assignment.user.id, {
                    label: name || assignment.user.email,
                    value: assignment.user.id,
                })
            })
        })

        return Array.from(optionsByUser.values()).sort((first, second) =>
            first.label.localeCompare(second.label),
        )
    }, [calendarShifts])

    const calendarEvents = useMemo<EventInput[]>(
        () =>
            calendarShifts.map((shift) => ({
                id: shift.id,
                title: shift.title,
                start: shift.startTime,
                end: shift.endTime,
                extendedProps: {
                    eventColor: shift.isOptional
                        ? 'orange'
                        : shift.assignments.length < shift.headcountNeeded
                          ? 'yellow'
                          : 'green',
                },
            })),
        [calendarShifts],
    )

    const shiftById = useMemo(
        () => new Map(calendarShifts.map((shift) => [shift.id, shift])),
        [calendarShifts],
    )

    const selectedShift = selectedShiftId ? shiftById.get(selectedShiftId) || null : null
    const assignmentModalShift = assignmentModalShiftId
        ? shiftById.get(assignmentModalShiftId) || null
        : null

    const handleDatesSet = (arg: DatesSetArg) => {
        setRangeStartDate(format(arg.start, 'yyyy-MM-dd'))
        setRangeEndDate(format(subDays(arg.end, 1), 'yyyy-MM-dd'))
    }

    const handleEventClick = (arg: EventClickArg) => {
        setSelectedShiftId(arg.event.id)
    }

    const handleUnassign = async (assignmentId: string, assigneeName: string) => {
        try {
            await deleteAssignmentMutation.mutateAsync(assignmentId)
            toast.push(`${assigneeName} removed from shift`, { placement: 'top-end' })
            await calendarQuery.refetch()
        } catch (error) {
            const apiError = error as NormalizedApiError
            toast.push(apiError.message || 'Failed to remove assignment.', {
                placement: 'top-end',
            })
        }
    }

    const handlePublish = async () => {
        if (!selectedShift) {
            return
        }

        try {
            const published = await publishMutation.mutateAsync(selectedShift.id)
            const warningCount = Array.isArray(published.warnings) ? published.warnings.length : 0
            toast.push(
                warningCount > 0
                    ? `Shift published with ${warningCount} warning${warningCount > 1 ? 's' : ''}`
                    : 'Shift published successfully',
                { placement: 'top-end' },
            )
            await calendarQuery.refetch()
        } catch (error) {
            const apiError = error as NormalizedApiError
            toast.push(apiError.message || 'Failed to publish shift.', {
                placement: 'top-end',
            })
        }
    }

    const normalizedCalendarError =
        calendarQuery.error as unknown as NormalizedApiError | undefined
    const fallbackCalendarError = calendarQuery.error as Error | null
    const calendarErrorMessage =
        normalizedCalendarError?.message ||
        fallbackCalendarError?.message ||
        'Failed to load calendar data.'

    const statusOptions: SelectOption[] = [
        { label: 'Published', value: 'PUBLISHED' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'All', value: 'ALL' },
    ]

    const centersWithAllOption = [
        { label: 'All Centers', value: '' },
        ...locationOptions,
    ]

    const assigneesWithAllOption = [
        { label: 'All Assigned Staff', value: '' },
        ...assigneeOptions,
    ]

    return (
        <div className="space-y-6 p-4">
            <Card className="border border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Schedule Calendar</h1>
                        <p className="mt-1 text-sm text-slate-700">
                            View monthly or weekly duty rosters and quickly fix assignment gaps.
                        </p>
                    </div>

                    {isManagerOrAdmin ? (
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/event-templates"
                                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                            >
                                Event Templates
                            </Link>
                            <Link
                                href="/schedule-builder"
                                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                            >
                                Open Schedule Builder
                            </Link>
                        </div>
                    ) : null}
                </div>
            </Card>

            <Card className="border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Center
                        </label>
                        <Select
                            instanceId="calendar-center-filter"
                            options={centersWithAllOption}
                            value={
                                centersWithAllOption.find((option) => option.value === locationId) ||
                                null
                            }
                            onChange={(selected) =>
                                setLocationId((selected as SelectOption | null)?.value || '')
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Event Title
                        </label>
                        <Input
                            value={titleFilter}
                            placeholder="Search by title"
                            onChange={(event) => setTitleFilter(event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Assigned Staff
                        </label>
                        <Select
                            isDisabled={isStaff || mine}
                            instanceId="calendar-assignee-filter"
                            options={assigneesWithAllOption}
                            value={
                                assigneesWithAllOption.find(
                                    (option) => option.value === assignedUserId,
                                ) || null
                            }
                            onChange={(selected) =>
                                setAssignedUserId((selected as SelectOption | null)?.value || '')
                            }
                        />
                    </div>

                    {isManagerOrAdmin ? (
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                                Status
                            </label>
                            <Select
                                instanceId="calendar-status-filter"
                                options={statusOptions}
                                value={
                                    statusOptions.find((option) => option.value === statusFilter) ||
                                    null
                                }
                                onChange={(selected) =>
                                    setStatusFilter(
                                        ((selected as SelectOption | null)?.value ||
                                            'PUBLISHED') as CalendarStatusFilter,
                                    )
                                }
                            />
                        </div>
                    ) : null}

                    <div className="flex items-end">
                        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={mine}
                                disabled={isStaff}
                                onChange={(event) => setMine(event.target.checked)}
                            />
                            My schedule only
                        </label>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {rangeStartDate && rangeEndDate ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            Range: {formatDisplayDate(rangeStartDate)} - {formatDisplayDate(rangeEndDate)}
                        </span>
                    ) : null}
                    <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-green-800">
                        Filled
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-amber-800">
                        Needs staffing
                    </span>
                    <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-orange-800">
                        Optional slot
                    </span>
                </div>

                {isManagerOrAdmin && statusFilter !== 'PUBLISHED' ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                        Draft shifts are visible only to managers and admins.
                    </p>
                ) : null}
            </Card>

            {calendarQuery.isError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {calendarErrorMessage}
                </div>
            ) : null}

            <Card className="border border-slate-200 p-4">
                <CalendarView
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                    }}
                    events={calendarEvents}
                    datesSet={handleDatesSet}
                    editable={false}
                    selectable={false}
                    allDaySlot={false}
                    nowIndicator
                    height="auto"
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    eventTimeFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        meridiem: 'short',
                    }}
                    eventClick={handleEventClick}
                />

                {calendarQuery.isLoading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading calendar...</p>
                ) : null}

                {!calendarQuery.isLoading && calendarShifts.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                        {statusFilter === 'DRAFT'
                            ? 'No draft shifts found for the current filters.'
                            : statusFilter === 'ALL'
                              ? 'No shifts found for the current filters.'
                              : 'No published shifts found for the current filters.'}
                    </p>
                ) : null}
            </Card>

            <Dialog
                isOpen={Boolean(selectedShift)}
                onRequestClose={() => setSelectedShiftId(null)}
                width={700}
            >
                <div className="space-y-5 p-6">
                    {selectedShift ? (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedShift.title}</h2>
                                    <p className="text-sm text-slate-600">{selectedShift.location.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusChipClass(
                                            selectedShift.status,
                                        )}`}
                                    >
                                        {selectedShift.status}
                                    </span>
                                    {selectedShift.isOptional ? (
                                        <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
                                            Optional
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                                    <p className="font-medium text-slate-800">
                                        {format(new Date(selectedShift.startTime), 'EEE, MMM d, yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
                                    <p className="font-medium text-slate-800">
                                        {format(new Date(selectedShift.startTime), 'h:mm a')} -{' '}
                                        {format(new Date(selectedShift.endTime), 'h:mm a')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skill</p>
                                    <p className="font-medium text-slate-800">
                                        {selectedShift.requiredSkill.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Headcount</p>
                                    <p className="font-medium text-slate-800">
                                        {selectedShift.assignments.length}/{selectedShift.headcountNeeded}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                                    Assigned Staff
                                </h3>
                                {selectedShift.assignments.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                                        No one assigned yet.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {selectedShift.assignments.map((assignment) => {
                                            const assigneeName = `${assignment.user.firstName} ${assignment.user.lastName}`
                                            return (
                                                <li
                                                    key={assignment.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {assigneeName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {assignment.user.role}
                                                        </p>
                                                    </div>
                                                    {isManagerOrAdmin ? (
                                                        <Button
                                                            size="sm"
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                            loading={deleteAssignmentMutation.isPending}
                                                            onClick={() =>
                                                                handleUnassign(
                                                                    assignment.id,
                                                                    assigneeName,
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </Button>
                                                    ) : null}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>

                            {isManagerOrAdmin ? (
                                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                                        Quick Actions
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            className="bg-blue-700 text-white hover:bg-blue-800"
                                            onClick={() => setAssignmentModalShiftId(selectedShift.id)}
                                        >
                                            {selectedShift.headcountNeeded === 1 &&
                                            selectedShift.assignments.length > 0
                                                ? 'Reassign Staff'
                                                : 'Assign Staff'}
                                        </Button>

                                        {selectedShift.status === 'DRAFT' ? (
                                            <Button
                                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                loading={publishMutation.isPending}
                                                onClick={handlePublish}
                                            >
                                                Publish Shift
                                            </Button>
                                        ) : null}

                                        <Link
                                            href={`/shifts?editShiftId=${selectedShift.id}`}
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                        >
                                            Open Full Editor
                                        </Link>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex justify-end">
                                <Button variant="plain" onClick={() => setSelectedShiftId(null)}>
                                    Close
                                </Button>
                            </div>
                        </>
                    ) : null}
                </div>
            </Dialog>

            <EligibleStaffModal
                isOpen={Boolean(assignmentModalShift)}
                onClose={() => setAssignmentModalShiftId(null)}
                shiftId={assignmentModalShift?.id || ''}
                shiftStartTime={
                    assignmentModalShift
                        ? format(
                              new Date(assignmentModalShift.startTime),
                              'EEE, MMM d, h:mm a',
                          )
                        : undefined
                }
                shiftLocation={assignmentModalShift?.location.name}
                fairnessStartDate={rangeStartDate || undefined}
                fairnessEndDate={rangeEndDate || undefined}
                autoReplace={Boolean(
                    assignmentModalShift &&
                        assignmentModalShift.headcountNeeded === 1 &&
                        assignmentModalShift.assignments.length > 0,
                )}
                currentAssigneeName={
                    assignmentModalShift?.assignments[0]
                        ? `${assignmentModalShift.assignments[0].user.firstName} ${assignmentModalShift.assignments[0].user.lastName}`
                        : undefined
                }
                onAssignmentSuccess={async () => {
                    await calendarQuery.refetch()
                }}
            />
        </div>
    )
}
