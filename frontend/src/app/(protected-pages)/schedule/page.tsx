'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import type { DatesSetArg, EventInput } from '@fullcalendar/core'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui'
import CalendarView from '@/components/shared/CalendarView'
import { useAuth } from '@/context/AuthContext'
import useLocations from '@/hooks/useLocations'
import useCalendar from '@/hooks/useCalendar'
import type { CalendarQuery, CalendarShift, NormalizedApiError } from '@/lib/api/types'

type SelectOption = {
    label: string
    value: string
}

const formatDisplayDate = (dateValue: string): string =>
    format(new Date(`${dateValue}T00:00:00.000Z`), 'MMM d, yyyy')

export default function SchedulePage() {
    const { user } = useAuth()
    const { locationsQuery } = useLocations()
    const isStaff = user?.role === 'STAFF'
    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    const [locationId, setLocationId] = useState('')
    const [titleFilter, setTitleFilter] = useState('')
    const [assignedUserId, setAssignedUserId] = useState('')
    const [mine, setMine] = useState<boolean>(isStaff)
    const [rangeStartDate, setRangeStartDate] = useState<string>('')
    const [rangeEndDate, setRangeEndDate] = useState<string>('')

    useEffect(() => {
        if (isStaff) {
            setMine(true)
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
        }
    }, [assignedUserId, isStaff, locationId, mine, rangeEndDate, rangeStartDate, titleFilter])

    const { calendarQuery } = useCalendar(calendarQueryParams)
    const calendarShifts = (calendarQuery.data?.data || []) as CalendarShift[]

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

    const handleDatesSet = (arg: DatesSetArg) => {
        setRangeStartDate(format(arg.start, 'yyyy-MM-dd'))
        setRangeEndDate(format(subDays(arg.end, 1), 'yyyy-MM-dd'))
    }

    const normalizedCalendarError =
        calendarQuery.error as unknown as NormalizedApiError | undefined
    const fallbackCalendarError = calendarQuery.error as Error | null
    const calendarErrorMessage =
        normalizedCalendarError?.message ||
        fallbackCalendarError?.message ||
        'Failed to load calendar data.'

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Schedule Calendar</h1>
                    <p className="text-sm text-gray-600">
                        Weekly and monthly schedule view for centers and personal duty roster.
                    </p>
                </div>

                {isManagerOrAdmin ? (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/event-templates"
                            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                            Event Templates
                        </Link>
                        <Link
                            href="/schedule-builder"
                            className="rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                            Schedule Builder
                        </Link>
                    </div>
                ) : null}
            </div>

            <Card>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Center
                        </label>
                        <Select
                            instanceId="calendar-center-filter"
                            options={[
                                { label: 'All Centers', value: '' },
                                ...locationOptions,
                            ]}
                            value={
                                [
                                    { label: 'All Centers', value: '' },
                                    ...locationOptions,
                                ].find((option) => option.value === locationId) || null
                            }
                            onChange={(selected) =>
                                setLocationId((selected as SelectOption | null)?.value || '')
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Event Title
                        </label>
                        <Input
                            value={titleFilter}
                            placeholder="Search event title..."
                            onChange={(event) => setTitleFilter(event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Assigned Staff
                        </label>
                        <Select
                            isDisabled={isStaff || mine}
                            instanceId="calendar-assignee-filter"
                            options={[
                                { label: 'All Assigned Staff', value: '' },
                                ...assigneeOptions,
                            ]}
                            value={
                                [
                                    { label: 'All Assigned Staff', value: '' },
                                    ...assigneeOptions,
                                ].find((option) => option.value === assignedUserId) || null
                            }
                            onChange={(selected) =>
                                setAssignedUserId((selected as SelectOption | null)?.value || '')
                            }
                        />
                    </div>

                    <div className="flex items-end">
                        <label className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-3">
                            <input
                                type="checkbox"
                                checked={mine}
                                disabled={isStaff}
                                onChange={(event) => setMine(event.target.checked)}
                            />
                            <span className="text-sm">My schedule only</span>
                        </label>
                    </div>
                </div>

                {rangeStartDate && rangeEndDate ? (
                    <p className="mt-3 text-xs text-gray-500">
                        Visible range: {formatDisplayDate(rangeStartDate)} -{' '}
                        {formatDisplayDate(rangeEndDate)}
                    </p>
                ) : null}
            </Card>

            {calendarQuery.isError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {calendarErrorMessage}
                </div>
            ) : null}

            <Card>
                <CalendarView
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'timeGridWeek,dayGridMonth',
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
                />

                {calendarQuery.isLoading ? (
                    <p className="mt-3 text-sm text-gray-500">Loading calendar...</p>
                ) : null}

                {!calendarQuery.isLoading && calendarShifts.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">
                        No published shifts found for the current filters.
                    </p>
                ) : null}
            </Card>
        </div>
    )
}
