'use client'

import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import useEventTemplates from '@/hooks/useEventTemplates'
import useLocations from '@/hooks/useLocations'
import useSkills from '@/hooks/useSkills'
import { useAuth } from '@/context/AuthContext'
import type {
    CreateEventTemplatePayload,
    EventTemplate,
    EventTemplateRequirementInput,
    EventTemplateScope,
    NormalizedApiError,
} from '@/lib/api/types'

const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
]

const emptyRequirement = (): EventTemplateRequirementInput => ({
    requiredSkillId: '',
    headcountNeeded: 1,
    isOptional: false,
})

const EventTemplatesPage = () => {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'

    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [scope, setScope] = useState<EventTemplateScope>('LOCATION')
    const [locationId, setLocationId] = useState('')
    const [dayOfWeek, setDayOfWeek] = useState(0)
    const [startTimeLocal, setStartTimeLocal] = useState('07:00')
    const [endTimeLocal, setEndTimeLocal] = useState('08:00')
    const [requirements, setRequirements] = useState<EventTemplateRequirementInput[]>([
        emptyRequirement(),
    ])
    const [formError, setFormError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const { locationsQuery } = useLocations()
    const skillsQuery = useSkills()
    const {
        templatesQuery,
        createTemplateMutation,
        updateTemplateMutation,
        archiveTemplateMutation,
    } = useEventTemplates()

    const locationOptions = useMemo(
        () =>
            (locationsQuery.data?.data || []).map((location) => ({
                value: location.id,
                label: location.name,
            })),
        [locationsQuery.data],
    )

    const skillOptions = useMemo(
        () =>
            (skillsQuery.data?.skills || []).map((skill) => ({
                value: skill.id,
                label: skill.name,
            })),
        [skillsQuery.data],
    )

    const isSkillsLoading = skillsQuery.isLoading
    const isSkillsError = skillsQuery.isError
    const hasSkills = skillOptions.length > 0

    const skillsErrorMessage =
        skillsQuery.error instanceof Error
            ? skillsQuery.error.message
            : 'Failed to load skills catalog.'

    const templates = templatesQuery.data?.data || []
    const templatesErrorMessage =
        templatesQuery.error instanceof Error
            ? templatesQuery.error.message
            : 'Failed to load templates.'

    const resetForm = () => {
        setEditingTemplateId(null)
        setTitle('')
        setDescription('')
        setScope('LOCATION')
        setLocationId('')
        setDayOfWeek(0)
        setStartTimeLocal('07:00')
        setEndTimeLocal('08:00')
        setRequirements([emptyRequirement()])
        setFormError('')
    }

    const startEdit = (template: EventTemplate) => {
        setEditingTemplateId(template.id)
        setTitle(template.title)
        setDescription(template.description || '')
        setScope(template.scope)
        setLocationId(template.locationId || '')
        setDayOfWeek(template.dayOfWeek)
        setStartTimeLocal(template.startTimeLocal)
        setEndTimeLocal(template.endTimeLocal)
        setRequirements(
            template.requirements.map((requirement) => ({
                requiredSkillId: requirement.requiredSkillId,
                headcountNeeded: requirement.headcountNeeded,
                isOptional: requirement.isOptional,
                sortOrder: requirement.sortOrder,
            })),
        )
        setFormError('')
        setSuccessMessage('')
    }

    const setRequirement = (
        index: number,
        partial: Partial<EventTemplateRequirementInput>,
    ) => {
        setRequirements((previous) =>
            previous.map((requirement, requirementIndex) =>
                requirementIndex === index
                    ? { ...requirement, ...partial }
                    : requirement,
            ),
        )
    }

    const addRequirement = () => {
        setRequirements((previous) => [...previous, emptyRequirement()])
    }

    const removeRequirement = (index: number) => {
        setRequirements((previous) =>
            previous.filter((_, requirementIndex) => requirementIndex !== index),
        )
    }

    const normalizeRequirements = (): EventTemplateRequirementInput[] =>
        requirements.map((requirement, index) => ({
            requiredSkillId: requirement.requiredSkillId,
            headcountNeeded: requirement.headcountNeeded,
            isOptional: requirement.isOptional ?? false,
            sortOrder: index,
        }))

    const validatePayload = () => {
        if (!title.trim()) {
            return 'Template title is required'
        }

        if (isSkillsLoading) {
            return 'Skills are still loading. Please wait a moment and try again.'
        }

        if (isSkillsError) {
            return 'Skills catalog could not be loaded. Resolve the connection issue and retry.'
        }

        if (!hasSkills) {
            return 'No skills available. Seed or create skills before templating.'
        }

        if (scope === 'LOCATION' && !locationId) {
            return 'Select a center for location templates'
        }

        if (requirements.length === 0) {
            return 'At least one requirement is required'
        }

        const hasInvalidRequirement = requirements.some(
            (requirement) =>
                !requirement.requiredSkillId || requirement.headcountNeeded < 1,
        )

        if (hasInvalidRequirement) {
            return 'Every requirement must include skill and valid headcount'
        }

        return ''
    }

    const handleSubmit = async () => {
        setFormError('')
        setSuccessMessage('')

        const validationMessage = validatePayload()
        if (validationMessage) {
            setFormError(validationMessage)
            return
        }

        const payload: CreateEventTemplatePayload = {
            title: title.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            scope,
            ...(scope === 'LOCATION' ? { locationId } : {}),
            dayOfWeek,
            startTimeLocal,
            endTimeLocal,
            requirements: normalizeRequirements(),
        }

        try {
            if (editingTemplateId) {
                await updateTemplateMutation.mutateAsync({
                    id: editingTemplateId,
                    payload,
                })
                setSuccessMessage('Template updated successfully.')
            } else {
                await createTemplateMutation.mutateAsync(payload)
                setSuccessMessage('Template created successfully.')
            }
            resetForm()
        } catch (error) {
            const normalized = error as NormalizedApiError
            const baseMessage = normalized.message || 'Failed to save template.'
            const statusSuffix = normalized.status
                ? ` (HTTP ${normalized.status})`
                : ''

            setFormError(`${baseMessage}${statusSuffix}`)
        }
    }

    const handleArchive = async (template: EventTemplate) => {
        setFormError('')
        setSuccessMessage('')

        if (!window.confirm(`Archive template "${template.title}"?`)) {
            return
        }

        try {
            await archiveTemplateMutation.mutateAsync(template.id)
            setSuccessMessage('Template archived successfully.')
        } catch (error) {
            const normalized = error as NormalizedApiError
            setFormError(normalized.message || 'Failed to archive template.')
        }
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold">Event Templates</h1>

            <Card>
                <div className="space-y-4">
                    <h2 className="text-lg font-medium">
                        {editingTemplateId ? 'Edit Template' : 'Create Template'}
                    </h2>

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
                            placeholder="Template title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                        />

                        <Input
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />

                        <Select
                            instanceId="template-scope"
                            value={
                                [
                                    { value: 'LOCATION', label: 'Center' },
                                    { value: 'MINISTRY', label: 'Ministry-wide' },
                                ].find((option) => option.value === scope) || null
                            }
                            options={
                                isAdmin
                                    ? [
                                          { value: 'LOCATION', label: 'Center' },
                                          { value: 'MINISTRY', label: 'Ministry-wide' },
                                      ]
                                    : [{ value: 'LOCATION', label: 'Center' }]
                            }
                            isSearchable={false}
                            onChange={(option) => {
                                const nextScope = (option?.value || 'LOCATION') as EventTemplateScope
                                setScope(nextScope)
                                if (nextScope === 'MINISTRY') {
                                    setLocationId('')
                                }
                            }}
                        />

                        <Select
                            instanceId="template-location"
                            value={
                                locationOptions.find(
                                    (option) => option.value === locationId,
                                ) || null
                            }
                            options={locationOptions}
                            isDisabled={scope !== 'LOCATION'}
                            onChange={(option) => setLocationId(option?.value || '')}
                            placeholder={
                                scope === 'LOCATION'
                                    ? 'Select center'
                                    : 'Not required for ministry templates'
                            }
                        />

                        <Select
                            instanceId="template-day"
                            value={
                                dayOptions.find((option) => option.value === dayOfWeek) ||
                                null
                            }
                            options={dayOptions}
                            isSearchable={false}
                            onChange={(option) => setDayOfWeek(Number(option?.value ?? 0))}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="time"
                                value={startTimeLocal}
                                onChange={(event) => setStartTimeLocal(event.target.value)}
                            />
                            <Input
                                type="time"
                                value={endTimeLocal}
                                onChange={(event) => setEndTimeLocal(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Requirements</h3>
                            <Button
                                size="sm"
                                type="button"
                                onClick={addRequirement}
                                disabled={isSkillsLoading || isSkillsError || !hasSkills}
                            >
                                Add Requirement
                            </Button>
                        </div>

                        {isSkillsLoading ? (
                            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                                Loading skills catalog...
                            </div>
                        ) : null}

                        {isSkillsError ? (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                Unable to load skills catalog: {skillsErrorMessage}
                            </div>
                        ) : null}

                        {!isSkillsLoading && !isSkillsError && !hasSkills ? (
                            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                                No skills found. Run backend seed data or add skills first.
                            </div>
                        ) : null}

                        {requirements.map((requirement, index) => (
                            <div
                                key={`${index}-${requirement.requiredSkillId}`}
                                className="grid gap-2 rounded border p-3 md:grid-cols-4"
                            >
                                <Select
                                    instanceId={`requirement-skill-${index}`}
                                    value={
                                        skillOptions.find(
                                            (option) =>
                                                option.value === requirement.requiredSkillId,
                                        ) || null
                                    }
                                    options={skillOptions}
                                    isDisabled={isSkillsLoading || isSkillsError || !hasSkills}
                                    onChange={(option) =>
                                        setRequirement(index, {
                                            requiredSkillId: option?.value || '',
                                        })
                                    }
                                    placeholder="Required skill"
                                />

                                <Input
                                    type="number"
                                    min={1}
                                    value={requirement.headcountNeeded}
                                    onChange={(event) =>
                                        setRequirement(index, {
                                            headcountNeeded: Number(event.target.value),
                                        })
                                    }
                                />

                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(requirement.isOptional)}
                                        onChange={(event) =>
                                            setRequirement(index, {
                                                isOptional: event.target.checked,
                                            })
                                        }
                                    />
                                    Optional slot
                                </label>

                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        type="button"
                                        disabled={requirements.length === 1}
                                        onClick={() => removeRequirement(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleSubmit}
                            loading={
                                createTemplateMutation.isPending ||
                                updateTemplateMutation.isPending
                            }
                            disabled={isSkillsLoading || isSkillsError || !hasSkills}
                        >
                            {editingTemplateId ? 'Update Template' : 'Create Template'}
                        </Button>
                        {editingTemplateId ? (
                            <Button variant="plain" onClick={resetForm}>
                                Cancel Edit
                            </Button>
                        ) : null}
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="mb-3 text-lg font-medium">Templates</h2>

                {templatesQuery.isLoading ? <p>Loading templates...</p> : null}
                {templatesQuery.isError ? (
                    <p className="text-red-600">
                        {templatesErrorMessage}
                    </p>
                ) : null}

                {!templatesQuery.isLoading && templates.length === 0 ? (
                    <p className="text-sm text-gray-500">No templates created yet.</p>
                ) : null}

                <div className="space-y-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="rounded border p-3"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{template.title}</p>
                                    <p className="text-sm text-gray-600">
                                        {dayOptions.find(
                                            (day) => day.value === template.dayOfWeek,
                                        )?.label || 'Unknown day'}{' '}
                                        • {template.startTimeLocal} - {template.endTimeLocal}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Scope: {template.scope}
                                        {template.location?.name
                                            ? ` • Center: ${template.location.name}`
                                            : ''}
                                    </p>
                                    {template.description ? (
                                        <p className="mt-1 text-sm text-gray-700">
                                            {template.description}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        onClick={() => startEdit(template)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        className="text-red-600"
                                        onClick={() => handleArchive(template)}
                                        loading={archiveTemplateMutation.isPending}
                                    >
                                        Archive
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {template.requirements.map((requirement) => (
                                    <div
                                        key={requirement.id}
                                        className="rounded bg-gray-50 p-2 text-sm"
                                    >
                                        <p className="font-medium">
                                            {requirement.requiredSkill?.name ||
                                                requirement.requiredSkillId}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Headcount: {requirement.headcountNeeded}
                                            {requirement.isOptional ? ' • Optional' : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default EventTemplatesPage
