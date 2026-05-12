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
import EligibleStaffModal from '@/components/shifts/EligibleStaffModal'
import { shiftService } from '@/lib/api/shifts'
import type {
    EventTemplate,
    GenerateScheduleResponse,
    NormalizedApiError,
    PublishShiftResponse,
} from '@/lib/api/types'

type AssignmentModalState = {
    shiftId: string
    locationName: string
    startTime: string
} | null

const todayDateString = (): string => new Date().toISOString().slice(0, 10)

const plusDaysDateString = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
}

const ScheduleBuilderPage = () => {
    const { locationsQuery } = useLocations()
    const { templatesQuery } = useEventTemplates()
    const { generateScheduleMutation } = useScheduleGeneration()
    const skillsQuery = useSkills()

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
    const [assignmentModalState, setAssignmentModalState] =
        useState<AssignmentModalState>(null)

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

    const groupedCreatedShifts = useMemo(() => {
        if (!generatedResult) {
            return []
        }

        const groups = new Map<
            string,
            {
                key: string
                eventDate: string
                locationName: string
                templateTitle: string
                eventInstanceId: string
                shifts: GenerateScheduleResponse['created']
            }
        >()

        generatedResult.created.forEach((shift) => {
            const key = `${shift.eventDate}|${shift.locationId}|${shift.eventInstanceId}`
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    eventDate: shift.eventDate,
                    locationName: shift.locationName,
                    templateTitle: shift.templateTitle,
                    eventInstanceId: shift.eventInstanceId,
                    shifts: [],
                })
            }

            groups.get(key)?.shifts.push(shift)
        })

        return Array.from(groups.values()).sort((firstGroup, secondGroup) => {
            if (firstGroup.eventDate !== secondGroup.eventDate) {
                return firstGroup.eventDate.localeCompare(secondGroup.eventDate)
            }
            return firstGroup.locationName.localeCompare(secondGroup.locationName)
        })
    }, [generatedResult])

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
        setSelectedShiftIds(generatedResult?.created.map((shift) => shift.shiftId) || [])
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
            setSelectedShiftIds(response.data.created.map((shift) => shift.shiftId))
            setSuccessMessage(
                `Generated ${response.data.summary.createdCount} slots. Skipped ${response.data.summary.skippedCount} existing slots.`,
            )
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
                                <Button size="sm" variant="plain" onClick={selectAllGeneratedShifts}>
                                    Select All
                                </Button>
                                <Button size="sm" variant="plain" onClick={clearSelectedShifts}>
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
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
                            {groupedCreatedShifts.map((group) => (
                                <div key={group.key} className="rounded border p-3">
                                    <p className="font-semibold">
                                        {group.eventDate} • {group.locationName}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {group.templateTitle} • {group.eventInstanceId}
                                    </p>

                                    <div className="mt-2 space-y-2">
                                        {group.shifts.map((shift) => (
                                            <div
                                                key={shift.shiftId}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 p-2"
                                            >
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedShiftIds.includes(
                                                            shift.shiftId,
                                                        )}
                                                        onChange={() =>
                                                            toggleShiftSelection(shift.shiftId)
                                                        }
                                                    />
                                                        <span>
                                                            {shift.startTime} - {shift.endTime} •
                                                        Skill{' '}
                                                        {skillNameById.get(
                                                            shift.requiredSkillId,
                                                        ) || shift.requiredSkillId}{' '}
                                                        •
                                                        Headcount {shift.headcountNeeded}
                                                        {shift.isOptional ? ' • Optional' : ''}
                                                    </span>
                                                </label>

                                                <Button
                                                    size="sm"
                                                    variant="plain"
                                                    onClick={() =>
                                                        setAssignmentModalState({
                                                            shiftId: shift.shiftId,
                                                            locationName: shift.locationName,
                                                            startTime: shift.startTime,
                                                        })
                                                    }
                                                >
                                                    Suggest + Assign
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {generatedResult.skipped.length > 0 ? (
                            <details className="rounded border p-3">
                                <summary className="cursor-pointer font-medium">
                                    View Skipped Duplicates ({generatedResult.skipped.length})
                                </summary>
                                <div className="mt-2 space-y-2 text-sm">
                                    {generatedResult.skipped.map((skipped) => (
                                        <div
                                            key={`${skipped.eventInstanceId}-${skipped.requiredSkillId}`}
                                            className="rounded bg-gray-50 p-2"
                                        >
                                            {skipped.eventDate} • {skipped.locationName} •{' '}
                                            {skipped.templateTitle} • existing shift{' '}
                                            {skipped.existingShiftId}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        ) : null}
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
            />
        </div>
    )
}

export default ScheduleBuilderPage
