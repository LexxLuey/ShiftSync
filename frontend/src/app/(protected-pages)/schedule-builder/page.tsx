'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import useLocations from '@/hooks/useLocations'
import useEventTemplates from '@/hooks/useEventTemplates'
import useScheduleGeneration from '@/hooks/useScheduleGeneration'
import useSkills from '@/hooks/useSkills'
import useAssignments from '@/hooks/useAssignments'
import EligibleStaffModal from '@/components/shifts/EligibleStaffModal'
import toast from '@/components/ui/toast'
import { shiftService } from '@/lib/api/shifts'
import type {
    AssignmentMutationMode,
    EventTemplate,
    GenerateScheduleResponse,
    NormalizedApiError,
    PublishShiftResponse,
    ShiftStatus,
} from '@/lib/api/types'

type AssignmentModalState = {
    shiftId: string
    locationName: string
    startTime: string
    autoReplace: boolean
    currentAssigneeName?: string
} | null

type ActionableSlot = {
    shiftId: string
    source: 'CREATED' | 'EXISTING'
    templateTitle: string
    locationId: string
    locationName: string
    eventDate: string
    eventInstanceId: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional: boolean
    startTime: string
    endTime: string
    existingShiftStatus?: ShiftStatus
}

type ShiftAssignmentWithUser = {
    id: string
    userId: string
    status: 'ASSIGNED' | 'PENDING_SWAP'
    user?: {
        firstName?: string
        lastName?: string
    }
}

type ShiftWithAssignmentUsers = {
    assignments?: ShiftAssignmentWithUser[]
}

type AssignmentSummary = {
    id: string
    userId: string
    staffName: string
    status: 'ASSIGNED' | 'PENDING_SWAP'
}

const todayDateString = (): string => new Date().toISOString().slice(0, 10)

const plusDaysDateString = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
}

const formatEventDateLabel = (eventDate: string): string => {
    const [yearPart, monthPart, dayPart] = eventDate.split('-')
    const year = Number(yearPart)
    const month = Number(monthPart)
    const day = Number(dayPart)

    if (!year || !month || !day) {
        return eventDate
    }

    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date)
}

const formatLocalTime = (isoValue: string): string => {
    const date = new Date(isoValue)
    if (Number.isNaN(date.getTime())) {
        return isoValue
    }

    return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date)
}

const formatLocalDateTime = (isoValue: string): string => {
    const date = new Date(isoValue)
    if (Number.isNaN(date.getTime())) {
        return isoValue
    }

    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date)
}

const formatLocalTimeRange = (startIso: string, endIso: string): string => {
    return `${formatLocalTime(startIso)} - ${formatLocalTime(endIso)}`
}

const ScheduleBuilderPage = () => {
    const { locationsQuery } = useLocations()
    const { templatesQuery } = useEventTemplates()
    const { generateScheduleMutation } = useScheduleGeneration()
    const skillsQuery = useSkills()
    const { deleteAssignmentMutation } = useAssignments()

    const [startDate, setStartDate] = useState(todayDateString())
    const [endDate, setEndDate] = useState(plusDaysDateString(30))
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
    const [generatedResult, setGeneratedResult] = useState<GenerateScheduleResponse | null>(
        null,
    )
    const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])
    const [formError, setFormError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [publishWarnings, setPublishWarnings] = useState<
        Array<{ shiftId: string; warning: string }>
    >([])
    const [assignmentsByShiftId, setAssignmentsByShiftId] = useState<
        Record<string, AssignmentSummary[]>
    >({})
    const [assignmentModalState, setAssignmentModalState] =
        useState<AssignmentModalState>(null)
    const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null)

    const publishShiftMutation = useMutation<
        PublishShiftResponse,
        NormalizedApiError,
        string
    >({
        mutationFn: (shiftId) => shiftService.publishShift(shiftId),
    })

    const locations = locationsQuery.data?.data || []
    const templates = (templatesQuery.data?.data || []).filter(
        (template) => template.isActive,
    ) as EventTemplate[]

    useEffect(() => {
        if (locations.length > 0 && selectedLocationIds.length === 0) {
            setSelectedLocationIds(locations.map((location) => location.id))
        }
    }, [locations, selectedLocationIds.length])

    const filteredTemplates = useMemo(() => {
        if (selectedLocationIds.length === 0) {
            return templates
        }

        return templates.filter((template) => {
            if (template.scope === 'MINISTRY') {
                return true
            }
            if (!template.locationId) {
                return false
            }
            return selectedLocationIds.includes(template.locationId)
        })
    }, [selectedLocationIds, templates])

    const skillNameById = useMemo(() => {
        const entries: Array<[string, string]> = (skillsQuery.data?.skills || []).map(
            (skill) => [skill.id, skill.name],
        )
        return new Map(entries)
    }, [skillsQuery.data?.skills])

    const actionableSlots = useMemo<ActionableSlot[]>(() => {
        if (!generatedResult) {
            return []
        }

        const createdSlots: ActionableSlot[] = generatedResult.created.map((shift) => ({
            shiftId: shift.shiftId,
            source: 'CREATED',
            templateTitle: shift.templateTitle,
            locationId: shift.locationId,
            locationName: shift.locationName,
            eventDate: shift.eventDate,
            eventInstanceId: shift.eventInstanceId,
            requiredSkillId: shift.requiredSkillId,
            headcountNeeded: shift.headcountNeeded,
            isOptional: shift.isOptional,
            startTime: shift.startTime,
            endTime: shift.endTime,
        }))

        const skippedSlots: ActionableSlot[] = generatedResult.skipped.map((shift) => ({
            shiftId: shift.existingShiftId,
            source: 'EXISTING',
            templateTitle: shift.templateTitle,
            locationId: shift.locationId,
            locationName: shift.locationName,
            eventDate: shift.eventDate,
            eventInstanceId: shift.eventInstanceId,
            requiredSkillId: shift.requiredSkillId,
            headcountNeeded: shift.headcountNeeded,
            isOptional: shift.isOptional,
            startTime: shift.startTime,
            endTime: shift.endTime,
            existingShiftStatus: shift.existingShiftStatus,
        }))

        const slotByShiftId = new Map<string, ActionableSlot>()
        ;[...createdSlots, ...skippedSlots].forEach((slot) => {
            slotByShiftId.set(slot.shiftId, slot)
        })

        return Array.from(slotByShiftId.values())
    }, [generatedResult])

    const groupedActionableSlots = useMemo(() => {
        if (actionableSlots.length === 0) {
            return []
        }

        const groups = new Map<
            string,
            {
                key: string
                eventDate: string
                locationName: string
                templateTitle: string
                slots: ActionableSlot[]
            }
        >()

        actionableSlots.forEach((shift) => {
            const key = `${shift.eventDate}|${shift.locationId}|${shift.eventInstanceId}`
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    eventDate: shift.eventDate,
                    locationName: shift.locationName,
                    templateTitle: shift.templateTitle,
                    slots: [],
                })
            }

            groups.get(key)?.slots.push(shift)
        })

        const groupedValues = Array.from(groups.values())
        groupedValues.forEach((group) => {
            group.slots.sort((firstSlot, secondSlot) =>
                firstSlot.startTime.localeCompare(secondSlot.startTime),
            )
        })

        return groupedValues.sort((firstGroup, secondGroup) => {
            if (firstGroup.eventDate !== secondGroup.eventDate) {
                return firstGroup.eventDate.localeCompare(secondGroup.eventDate)
            }
            return firstGroup.locationName.localeCompare(secondGroup.locationName)
        })
    }, [actionableSlots])

    const allActionableShiftIds = useMemo(
        () => actionableSlots.map((slot) => slot.shiftId),
        [actionableSlots],
    )

    const extractAssignments = (
        assignments: ShiftAssignmentWithUser[] | undefined,
    ): AssignmentSummary[] => {
        if (!assignments || assignments.length === 0) {
            return []
        }

        const mappedAssignments = assignments
            .filter((assignment) =>
                ['ASSIGNED', 'PENDING_SWAP'].includes(assignment.status),
            )
            .map((assignment) => {
                const staffName =
                    assignment.user?.firstName || assignment.user?.lastName
                        ? `${assignment.user.firstName || ''} ${
                              assignment.user.lastName || ''
                          }`.trim()
                        : assignment.userId

                return {
                    id: assignment.id,
                    userId: assignment.userId,
                    staffName,
                    status: assignment.status,
                }
            })
            .filter((assignment) => Boolean(assignment.staffName))

        const uniqueByAssignmentId = new Map<string, AssignmentSummary>()
        mappedAssignments.forEach((assignment) => {
            uniqueByAssignmentId.set(assignment.id, assignment)
        })

        return Array.from(uniqueByAssignmentId.values())
    }

    const loadAssignmentsForShiftIds = async (shiftIds: string[]) => {
        const uniqueShiftIds = Array.from(new Set(shiftIds))
        if (uniqueShiftIds.length === 0) {
            setAssignmentsByShiftId({})
            return
        }

        const results = await Promise.allSettled(
            uniqueShiftIds.map(async (shiftId) => {
                const shift = (await shiftService.getShiftById(
                    shiftId,
                )) as unknown as ShiftWithAssignmentUsers
                return {
                    shiftId,
                    assignments: extractAssignments(shift.assignments),
                }
            }),
        )

        const mapped: Record<string, AssignmentSummary[]> = {}
        const failedShiftIds: string[] = []

        results.forEach((result, index) => {
            const shiftId = uniqueShiftIds[index]
            if (!shiftId) {
                return
            }

            if (result.status === 'fulfilled') {
                mapped[shiftId] = result.value.assignments
                return
            }

            failedShiftIds.push(shiftId)
        })

        if (Object.keys(mapped).length > 0) {
            setAssignmentsByShiftId((previous) => ({
                ...previous,
                ...mapped,
            }))
        }

        if (failedShiftIds.length > 0) {
            setFormError(
                `Could not refresh assignment data for ${failedShiftIds.length} shift(s). Retry this action.`,
            )
        }
    }

    const handleRemoveAssignment = async ({
        shiftId,
        assignmentId,
        staffName,
    }: {
        shiftId: string
        assignmentId: string
        staffName: string
    }) => {
        setFormError('')
        setSuccessMessage('')
        setRemovingAssignmentId(assignmentId)

        const previousAssignments = assignmentsByShiftId[shiftId] || []
        setAssignmentsByShiftId((previous) => ({
            ...previous,
            [shiftId]: (previous[shiftId] || []).filter(
                (assignment) => assignment.id !== assignmentId,
            ),
        }))

        try {
            await deleteAssignmentMutation.mutateAsync(assignmentId)
            setSuccessMessage(`${staffName} removed from shift.`)
            toast.push(`${staffName} removed from shift`, {
                placement: 'top-end',
            })
            await loadAssignmentsForShiftIds([shiftId])
        } catch (error) {
            const normalized = error as NormalizedApiError
            setFormError(normalized.message || 'Failed to remove assignment.')
            toast.push(
                normalized.message ||
                    'Failed to remove assignment. This may be blocked by publish rules.',
                { placement: 'top-end' },
            )
            setAssignmentsByShiftId((previous) => ({
                ...previous,
                [shiftId]: previousAssignments,
            }))
        } finally {
            setRemovingAssignmentId(null)
        }
    }

    const handleAssignmentSuccess = ({
        shiftId,
        staffName,
        mode,
        replacedStaffName,
    }: {
        shiftId: string
        staffName: string
        mode: AssignmentMutationMode
        replacedStaffName?: string
    }) => {
        if (mode === 'replaced') {
            setSuccessMessage(
                `Reassigned ${replacedStaffName || 'existing assignee'} to ${staffName}.`,
            )
        } else if (mode === 'noop_already_assigned') {
            setSuccessMessage(`${staffName} is already assigned.`)
        } else {
            setSuccessMessage(`${staffName} assigned successfully.`)
        }
        void loadAssignmentsForShiftIds([shiftId])
    }

    const toggleLocation = (locationId: string) => {
        setSelectedLocationIds((previous) =>
            previous.includes(locationId)
                ? previous.filter((id) => id !== locationId)
                : [...previous, locationId],
        )
    }

    const toggleTemplate = (templateId: string) => {
        setSelectedTemplateIds((previous) =>
            previous.includes(templateId)
                ? previous.filter((id) => id !== templateId)
                : [...previous, templateId],
        )
    }

    const toggleShiftSelection = (shiftId: string) => {
        setSelectedShiftIds((previous) =>
            previous.includes(shiftId)
                ? previous.filter((id) => id !== shiftId)
                : [...previous, shiftId],
        )
    }

    const selectAllGeneratedShifts = () => {
        setSelectedShiftIds(allActionableShiftIds)
    }

    const clearSelectedShifts = () => {
        setSelectedShiftIds([])
    }

    const handleGenerate = async () => {
        setFormError('')
        setSuccessMessage('')
        setPublishWarnings([])

        if (selectedLocationIds.length === 0) {
            setFormError('Select at least one center.')
            return
        }

        try {
            const response = await generateScheduleMutation.mutateAsync({
                startDate,
                endDate,
                locationIds: selectedLocationIds,
                ...(selectedTemplateIds.length > 0
                    ? { templateIds: selectedTemplateIds }
                    : {}),
            })

            setGeneratedResult(response.data)
            const createdShiftIds = response.data.created.map((shift) => shift.shiftId)
            const skippedShiftIds = response.data.skipped.map((shift) => shift.existingShiftId)
            const actionableShiftIds = Array.from(
                new Set([...createdShiftIds, ...skippedShiftIds]),
            )
            setSelectedShiftIds(actionableShiftIds)
            void loadAssignmentsForShiftIds(actionableShiftIds)

            if (
                response.data.summary.createdCount === 0 &&
                response.data.summary.skippedCount > 0
            ) {
                setSuccessMessage(
                    `No new slots were created. ${response.data.summary.skippedCount} existing slots are ready for review, assignment, and publish.`,
                )
            } else {
                setSuccessMessage(
                    `Generated ${response.data.summary.createdCount} slots. Skipped ${response.data.summary.skippedCount} existing slots.`,
                )
            }
        } catch (error) {
            const normalized = error as NormalizedApiError
            setFormError(normalized.message || 'Failed to generate schedule.')
        }
    }

    const handlePublishSelected = async () => {
        setFormError('')
        setSuccessMessage('')
        setPublishWarnings([])

        if (selectedShiftIds.length === 0) {
            setFormError('Select at least one shift to publish.')
            return
        }

        const warnings: Array<{ shiftId: string; warning: string }> = []
        const failedPublishes: string[] = []

        for (const shiftId of selectedShiftIds) {
            try {
                const publishResult = await publishShiftMutation.mutateAsync(shiftId)
                ;(publishResult.warnings || []).forEach((warning) => {
                    warnings.push({
                        shiftId,
                        warning: warning.message,
                    })
                })
            } catch {
                failedPublishes.push(shiftId)
            }
        }

        setPublishWarnings(warnings)

        if (failedPublishes.length > 0) {
            setFormError(
                `Failed to publish ${failedPublishes.length} shift(s). Check 48-hour cutoff or permissions.`,
            )
        } else {
            setSuccessMessage(`Published ${selectedShiftIds.length} shift(s).`)
        }
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold">Schedule Builder</h1>

            <Card>
                <div className="space-y-4">
                    <h2 className="text-lg font-medium">Generate Draft Schedule</h2>

                    {formError ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {formError}
                        </div>
                    ) : null}

                    {successMessage ? (
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            {successMessage}
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                        />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="font-medium">Centers</p>
                        <div className="grid gap-2 md:grid-cols-2">
                            {locations.map((location) => (
                                <label
                                    key={location.id}
                                    className="flex items-center gap-2 rounded border p-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedLocationIds.includes(location.id)}
                                        onChange={() => toggleLocation(location.id)}
                                    />
                                    {location.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="font-medium">Template Filter (optional)</p>
                        <div className="grid gap-2 md:grid-cols-2">
                            {filteredTemplates.map((template) => (
                                <label
                                    key={template.id}
                                    className="flex items-start gap-2 rounded border p-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplateIds.includes(template.id)}
                                        onChange={() => toggleTemplate(template.id)}
                                    />
                                    <span>
                                        <span className="font-medium">{template.title}</span>
                                        <span className="block text-xs text-gray-600">
                                            {template.scope}
                                            {template.location?.name
                                                ? ` • ${template.location.name}`
                                                : ''}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleGenerate}
                            loading={generateScheduleMutation.isPending}
                            variant="solid"
                            className="border border-emerald-700 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                        >
                            Generate Draft Slots
                        </Button>
                    </div>
                </div>
            </Card>

            {generatedResult ? (
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-medium">Generated Slots</h2>
                                <p className="text-sm text-gray-600">
                                    Created: {generatedResult.summary.createdCount} • Skipped:{' '}
                                    {generatedResult.summary.skippedCount}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="solid"
                                    className="border border-blue-700 bg-blue-600 font-semibold text-white hover:bg-blue-700"
                                    onClick={selectAllGeneratedShifts}
                                >
                                    Select All
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    className="border border-rose-700 bg-rose-600 font-semibold text-white hover:bg-rose-700"
                                    onClick={clearSelectedShifts}
                                >
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    className="border border-orange-700 bg-orange-600 font-semibold text-white hover:bg-orange-700"
                                    onClick={handlePublishSelected}
                                    loading={publishShiftMutation.isPending}
                                >
                                    Publish Selected
                                </Button>
                            </div>
                        </div>

                        {publishWarnings.length > 0 ? (
                            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                <p className="font-medium">Publish warnings</p>
                                <ul className="mt-1 space-y-1">
                                    {publishWarnings.map((warning, index) => (
                                        <li key={`${warning.shiftId}-${index}`}>
                                            {warning.shiftId}: {warning.warning}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            {groupedActionableSlots.map((group) => (
                                <div key={group.key} className="rounded-lg border bg-gray-50 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-base font-semibold text-gray-900">
                                            {group.templateTitle}
                                        </p>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                            {group.locationName}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-gray-700">
                                        {formatEventDateLabel(group.eventDate)}
                                    </p>

                                    <div className="mt-3 space-y-3">
                                        {group.slots.map((shift) => (
                                            <div
                                                key={shift.shiftId}
                                                className="rounded-lg border bg-white p-3"
                                            >
                                                {/** Inline assignment management for quick replace flow */}
                                                {(() => {
                                                    const slotAssignments =
                                                        assignmentsByShiftId[shift.shiftId]
                                                    const assignedNames =
                                                        slotAssignments?.filter(
                                                            (assignment) =>
                                                                assignment.status === 'ASSIGNED',
                                                        ).map((assignment) => assignment.staffName) || []

                                                    return (
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1"
                                                            checked={selectedShiftIds.includes(
                                                                shift.shiftId,
                                                            )}
                                                            onChange={() =>
                                                                toggleShiftSelection(
                                                                    shift.shiftId,
                                                                )
                                                            }
                                                        />

                                                        <div className="min-w-0 flex-1 space-y-2">
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {formatLocalTimeRange(
                                                                    shift.startTime,
                                                                    shift.endTime,
                                                                )}
                                                            </p>

                                                            <div className="flex flex-wrap gap-2 text-xs">
                                                                <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-800">
                                                                    Skill:{' '}
                                                                    {skillNameById.get(
                                                                        shift.requiredSkillId,
                                                                    ) || shift.requiredSkillId}
                                                                </span>
                                                                <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                                                                    Headcount: {shift.headcountNeeded}
                                                                </span>
                                                                {shift.isOptional ? (
                                                                    <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700">
                                                                        Optional
                                                                    </span>
                                                                ) : null}
                                                                <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                                                                    {shift.source === 'EXISTING'
                                                                        ? 'Existing'
                                                                        : 'New'}
                                                                </span>
                                                                {shift.existingShiftStatus ? (
                                                                    <span className="rounded-full bg-violet-50 px-2 py-1 font-medium text-violet-700">
                                                                        {shift.existingShiftStatus}
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            <p className="text-xs text-gray-500">
                                                                Starts{' '}
                                                                {formatLocalDateTime(
                                                                    shift.startTime,
                                                                )}
                                                            </p>

                                                            <div className="rounded-md bg-slate-50 px-2 py-2 text-xs">
                                                                <p className="font-semibold text-slate-700">
                                                                    Assigned
                                                                </p>
                                                                {slotAssignments === undefined ? (
                                                                    <span className="text-amber-800">
                                                                        Assignment data unavailable.
                                                                        Retry refresh.
                                                                    </span>
                                                                ) : slotAssignments.length > 0 ? (
                                                                    <div className="mt-1 space-y-1">
                                                                        {slotAssignments.map(
                                                                            (
                                                                                assignment,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        assignment.id
                                                                                    }
                                                                                    className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1"
                                                                                >
                                                                                    <span className="text-slate-900">
                                                                                        {
                                                                                            assignment.staffName
                                                                                        }
                                                                                        {assignment.status ===
                                                                                        'PENDING_SWAP'
                                                                                            ? ' (Swap Pending)'
                                                                                            : ''}
                                                                                    </span>
                                                                                    <Button
                                                                                        size="xs"
                                                                                        variant="solid"
                                                                                        className="border border-red-700 bg-red-600 font-semibold text-white hover:bg-red-700"
                                                                                        loading={
                                                                                            removingAssignmentId ===
                                                                                            assignment.id
                                                                                        }
                                                                                        disabled={
                                                                                            removingAssignmentId !==
                                                                                                null &&
                                                                                            removingAssignmentId !==
                                                                                                assignment.id
                                                                                        }
                                                                                        onClick={() =>
                                                                                            handleRemoveAssignment(
                                                                                                {
                                                                                                    shiftId: shift.shiftId,
                                                                                                    assignmentId:
                                                                                                        assignment.id,
                                                                                                    staffName:
                                                                                                        assignment.staffName,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        Remove
                                                                                    </Button>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-900">
                                                                        No one yet
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="solid"
                                                        className="border border-cyan-700 bg-cyan-600 font-semibold text-white hover:bg-cyan-700"
                                                        onClick={() =>
                                                            setAssignmentModalState({
                                                                shiftId: shift.shiftId,
                                                                locationName: shift.locationName,
                                                                startTime:
                                                                    formatLocalDateTime(
                                                                        shift.startTime,
                                                                    ),
                                                                autoReplace:
                                                                    shift.headcountNeeded === 1 &&
                                                                    assignedNames.length > 0,
                                                                currentAssigneeName:
                                                                    assignedNames[0],
                                                            })
                                                        }
                                                    >
                                                        {assignedNames.length > 0
                                                            ? 'Change Assignee'
                                                            : 'Suggest + Assign'}
                                                    </Button>
                                                </div>
                                                    )
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            ) : null}

            <EligibleStaffModal
                isOpen={Boolean(assignmentModalState)}
                onClose={() => setAssignmentModalState(null)}
                shiftId={assignmentModalState?.shiftId || ''}
                shiftLocation={assignmentModalState?.locationName}
                shiftStartTime={assignmentModalState?.startTime}
                fairnessStartDate={startDate}
                fairnessEndDate={endDate}
                autoReplace={Boolean(assignmentModalState?.autoReplace)}
                currentAssigneeName={assignmentModalState?.currentAssigneeName}
                onAssignmentSuccess={handleAssignmentSuccess}
            />
        </div>
    )
}

export default ScheduleBuilderPage
