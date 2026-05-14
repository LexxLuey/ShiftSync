'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from '@/components/ui/toast'
import SwapRequestModal from '@/components/swaps/SwapRequestModal'
import useLocations from '@/hooks/useLocations'
import useSkills from '@/hooks/useSkills'
import useShiftTable from '@/hooks/useShiftTable'
import { useAuth } from '@/context/AuthContext'
import { userService, type UserRecord } from '@/lib/api/users'
import { shiftService } from '@/lib/api/shifts'
import type {
    NormalizedApiError,
    Shift,
    ShiftListStatus,
    UpdateShiftPayload,
} from '@/lib/api/types'

const { THead, TBody, Tr, Th, Td } = Table

type SelectOption = {
    value: string
    label: string
}

type ShiftEditorMode = 'create' | 'edit'

type ShiftEditorForm = {
    locationId: string
    title: string
    startTimeLocal: string
    endTimeLocal: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional: boolean
}

const statusOptions: Array<{ value: ShiftListStatus; label: string }> = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
]

const toLocalDateTimeInputValue = (isoString: string): string => {
    const source = new Date(isoString)
    const local = new Date(source.getTime() - source.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 16)
}

const getShiftStatusBadgeClass = (status: Shift['status']): string =>
    status === 'PUBLISHED'
        ? 'bg-green-100 text-green-800'
        : 'bg-amber-100 text-amber-800'

const getSwapActionHint = (
    shift: Shift,
    currentUserId: string | undefined,
): string | null => {
    const assignedToCurrentUser = (shift.assignments || []).some(
        (assignment) =>
            assignment.userId === currentUserId &&
            assignment.status === 'ASSIGNED',
    )
    if (!assignedToCurrentUser) {
        return 'Only your assigned shifts can be swapped.'
    }

    if (shift.status !== 'PUBLISHED') {
        return 'Swap is available only for published shifts.'
    }

    const hoursUntilShift = (new Date(shift.startTime).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilShift < 24) {
        return 'Swap requests are blocked within 24 hours of shift start.'
    }

    return null
}

export default function Page() {
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const deepLinkEditShiftId = searchParams.get('editShiftId')
    const isStaff = user?.role === 'STAFF'
    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    const [page, setPage] = useState(1)
    const [limit] = useState(20)
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 31), 'yyyy-MM-dd'))
    const [status, setStatus] = useState<ShiftListStatus>('ALL')
    const [titleFilter, setTitleFilter] = useState('')
    const [assignedUserIdFilter, setAssignedUserIdFilter] = useState('')

    const [viewShift, setViewShift] = useState<Shift | null>(null)
    const [deleteShift, setDeleteShift] = useState<Shift | null>(null)
    const [swapShiftId, setSwapShiftId] = useState<string | null>(null)

    const [editorOpen, setEditorOpen] = useState(false)
    const [editorMode, setEditorMode] = useState<ShiftEditorMode>('create')
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
    const [editorError, setEditorError] = useState('')
    const [deepLinkHandled, setDeepLinkHandled] = useState(false)
    const [editorForm, setEditorForm] = useState<ShiftEditorForm>({
        locationId: '',
        title: '',
        startTimeLocal: '',
        endTimeLocal: '',
        requiredSkillId: '',
        headcountNeeded: 1,
        isOptional: false,
    })

    const { locationsQuery } = useLocations()
    const skillsQuery = useSkills()

    const listQueryParams = useMemo(
        () => ({
            page,
            limit,
            locationId: selectedLocationId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            status: isStaff ? 'PUBLISHED' : status,
            title: titleFilter.trim() || undefined,
            assignedUserId: isStaff
                ? undefined
                : assignedUserIdFilter || undefined,
        }),
        [
            assignedUserIdFilter,
            endDate,
            isStaff,
            limit,
            page,
            selectedLocationId,
            startDate,
            status,
            titleFilter,
        ],
    )

    const {
        shiftsQuery,
        createShiftMutation,
        updateShiftMutation,
        deleteShiftMutation,
    } = useShiftTable(listQueryParams)

    const assigneesQuery = useQuery({
        queryKey: ['shift-assignees', selectedLocationId],
        queryFn: async () => {
            const response = await userService.listUsers({
                page: 1,
                limit: 100,
                locationId: selectedLocationId || undefined,
            })
            return response.data
        },
        enabled: isManagerOrAdmin,
    })

    const shifts = (shiftsQuery.data?.data || []) as Shift[]
    const pagination = shiftsQuery.data?.pagination
    const totalCount = pagination?.total || 0

    const locationOptions = [
        { value: '', label: 'All Centers' },
        ...((locationsQuery.data?.data || []).map((location) => ({
            value: location.id,
            label: location.name,
        })) as SelectOption[]),
    ]

    const assigneeOptions = [
        { value: '', label: 'All Assigned Staff' },
        ...((assigneesQuery.data || []).map((staff: UserRecord) => ({
            value: staff.id,
            label: `${staff.firstName} ${staff.lastName}`,
        })) as SelectOption[]),
    ]

    useEffect(() => {
        setDeepLinkHandled(false)
    }, [deepLinkEditShiftId])

    const openCreateEditor = () => {
        setEditorMode('create')
        setEditingShiftId(null)
        setEditorError('')
        const fallbackLocationId =
            selectedLocationId || locationsQuery.data?.data?.[0]?.id || ''
        setEditorForm({
            locationId: fallbackLocationId,
            title: '',
            startTimeLocal: '',
            endTimeLocal: '',
            requiredSkillId: '',
            headcountNeeded: 1,
            isOptional: false,
        })
        setEditorOpen(true)
    }

    const openEditEditor = (shift: Shift) => {
        setEditorMode('edit')
        setEditingShiftId(shift.id)
        setEditorError('')
        setEditorForm({
            locationId: shift.locationId,
            title: shift.title,
            startTimeLocal: toLocalDateTimeInputValue(shift.startTime),
            endTimeLocal: toLocalDateTimeInputValue(shift.endTime),
            requiredSkillId: shift.requiredSkillId,
            headcountNeeded: shift.headcountNeeded,
            isOptional: Boolean(shift.isOptional),
        })
        setEditorOpen(true)
    }

    const resetFilters = () => {
        setPage(1)
        setSelectedLocationId('')
        setStartDate(format(new Date(), 'yyyy-MM-dd'))
        setEndDate(format(addDays(new Date(), 31), 'yyyy-MM-dd'))
        setStatus('ALL')
        setTitleFilter('')
        setAssignedUserIdFilter('')
    }

    const closeEditor = () => {
        if (
            createShiftMutation.isPending ||
            updateShiftMutation.isPending
        ) {
            return
        }

        setEditorOpen(false)
        setEditorError('')
    }

    useEffect(() => {
        if (!isManagerOrAdmin || !deepLinkEditShiftId || deepLinkHandled) {
            return
        }

        let cancelled = false

        const openDeepLinkedShiftEditor = async () => {
            try {
                const shift = await shiftService.getShiftById(deepLinkEditShiftId)
                if (cancelled) {
                    return
                }
                openEditEditor(shift)
            } catch (error) {
                if (!cancelled) {
                    const apiError = error as NormalizedApiError
                    toast.push(
                        apiError.message || 'Failed to open shift editor for selected event.',
                        { placement: 'top-end' },
                    )
                }
            } finally {
                if (!cancelled) {
                    setDeepLinkHandled(true)
                }
            }
        }

        openDeepLinkedShiftEditor()

        return () => {
            cancelled = true
        }
    }, [deepLinkEditShiftId, deepLinkHandled, isManagerOrAdmin])

    const submitEditor = async () => {
        setEditorError('')

        if (!editorForm.title.trim()) {
            setEditorError('Title is required.')
            return
        }

        if (!editorForm.requiredSkillId) {
            setEditorError('Please select a required skill.')
            return
        }

        if (!editorForm.startTimeLocal || !editorForm.endTimeLocal) {
            setEditorError('Start and end date/time are required.')
            return
        }

        const startDateTime = new Date(editorForm.startTimeLocal)
        const endDateTime = new Date(editorForm.endTimeLocal)
        if (endDateTime <= startDateTime) {
            setEditorError('End time must be after start time.')
            return
        }

        if (!Number.isFinite(editorForm.headcountNeeded) || editorForm.headcountNeeded < 1) {
            setEditorError('Headcount must be at least 1.')
            return
        }

        try {
            if (editorMode === 'create') {
                if (!editorForm.locationId) {
                    setEditorError('Please select a center for this shift.')
                    return
                }

                await createShiftMutation.mutateAsync({
                    locationId: editorForm.locationId,
                    title: editorForm.title.trim(),
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    requiredSkillId: editorForm.requiredSkillId,
                    headcountNeeded: editorForm.headcountNeeded,
                    isOptional: editorForm.isOptional,
                })
                toast.push('Shift created successfully.', { placement: 'top-end' })
            } else {
                if (!editingShiftId) {
                    setEditorError('Shift ID not found for update.')
                    return
                }

                const payload: UpdateShiftPayload = {
                    title: editorForm.title.trim(),
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    requiredSkillId: editorForm.requiredSkillId,
                    headcountNeeded: editorForm.headcountNeeded,
                    isOptional: editorForm.isOptional,
                }

                await updateShiftMutation.mutateAsync({
                    id: editingShiftId,
                    payload,
                })
                toast.push('Shift updated successfully.', { placement: 'top-end' })
            }

            setEditorOpen(false)
            setEditorError('')
        } catch (error) {
            const apiError = error as NormalizedApiError
            setEditorError(apiError.message || 'Failed to save shift.')
        }
    }

    const handleDeleteShift = async () => {
        if (!deleteShift) {
            return
        }

        try {
            await deleteShiftMutation.mutateAsync(deleteShift.id)
            toast.push('Shift deleted successfully.', { placement: 'top-end' })
            setDeleteShift(null)
        } catch (error) {
            const apiError = error as NormalizedApiError
            toast.push(apiError.message || 'Failed to delete shift.', {
                placement: 'top-end',
            })
        }
    }

    const listError = shiftsQuery.error as NormalizedApiError | null
    const loading = shiftsQuery.isLoading

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Shifts</h1>
                    <p className="text-sm text-gray-600">
                        Manage one-off shifts with clear visibility of date, time, center, and assignees.
                    </p>
                </div>
                {isManagerOrAdmin ? (
                    <Button
                        onClick={openCreateEditor}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        New Shift
                    </Button>
                ) : null}
            </div>

            <Card>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Center</label>
                        <Select
                            instanceId="shifts-location-filter"
                            value={locationOptions.find((opt) => opt.value === selectedLocationId) || null}
                            options={locationOptions}
                            onChange={(option) => {
                                setPage(1)
                                setSelectedLocationId((option?.value as string) || '')
                            }}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Start Date</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(event) => {
                                setPage(1)
                                setStartDate(event.target.value)
                            }}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">End Date</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(event) => {
                                setPage(1)
                                setEndDate(event.target.value)
                            }}
                        />
                    </div>

                    {!isStaff ? (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                            <Select
                                instanceId="shifts-status-filter"
                                value={statusOptions.find((opt) => opt.value === status) || null}
                                options={statusOptions}
                                onChange={(option) => {
                                    setPage(1)
                                    setStatus(
                                        ((option?.value as ShiftListStatus) || 'ALL'),
                                    )
                                }}
                            />
                        </div>
                    ) : null}

                    {!isStaff ? (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Assigned Staff
                            </label>
                            <Select
                                instanceId="shifts-assignee-filter"
                                value={
                                    assigneeOptions.find(
                                        (opt) => opt.value === assignedUserIdFilter,
                                    ) || null
                                }
                                options={assigneeOptions}
                                onChange={(option) => {
                                    setPage(1)
                                    setAssignedUserIdFilter((option?.value as string) || '')
                                }}
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                        <Input
                            value={titleFilter}
                            placeholder="Search title..."
                            onChange={(event) => {
                                setPage(1)
                                setTitleFilter(event.target.value)
                            }}
                        />
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <Button variant="plain" onClick={resetFilters}>
                        Reset Filters
                    </Button>
                </div>
            </Card>

            <Card>
                {listError ? (
                    <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {listError.message || 'Failed to load shifts.'}
                    </div>
                ) : null}

                <div className="h-[62vh] overflow-scroll rounded-lg border border-gray-200">
                    <Table overflow={false} className="min-w-[1200px]">
                        <THead>
                            <Tr>
                                <Th>Date</Th>
                                <Th>Time</Th>
                                <Th>Center</Th>
                                <Th>Title</Th>
                                <Th>Skill</Th>
                                <Th>Filled/Needed</Th>
                                <Th>Status</Th>
                                <Th>Assigned Staff</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {shifts.map((shift) => {
                                const assignmentCount = shift.assignments?.length || 0
                                const assignedNames = (shift.assignments || []).map((assignment) => {
                                    if (assignment.user) {
                                        return `${assignment.user.firstName} ${assignment.user.lastName}`
                                    }
                                    return assignment.userId.slice(0, 8)
                                })
                                const swapHint = getSwapActionHint(shift, user?.id)

                                return (
                                    <Tr key={shift.id}>
                                        <Td>{format(new Date(shift.startTime), 'EEE, MMM d, yyyy')}</Td>
                                        <Td>
                                            {format(new Date(shift.startTime), 'h:mm a')} -{' '}
                                            {format(new Date(shift.endTime), 'h:mm a')}
                                        </Td>
                                        <Td>{shift.location?.name || '-'}</Td>
                                        <Td className="font-medium">{shift.title}</Td>
                                        <Td>{shift.requiredSkill?.name || '-'}</Td>
                                        <Td>{assignmentCount}/{shift.headcountNeeded}</Td>
                                        <Td>
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${getShiftStatusBadgeClass(shift.status)}`}
                                            >
                                                {shift.status}
                                            </span>
                                        </Td>
                                        <Td>
                                            {assignedNames.length > 0 ? assignedNames.join(', ') : 'Unassigned'}
                                        </Td>
                                        <Td>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="plain"
                                                    className="border border-gray-300"
                                                    onClick={() => setViewShift(shift)}
                                                >
                                                    View
                                                </Button>
                                                {isManagerOrAdmin ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="bg-amber-500 text-white hover:bg-amber-600"
                                                            onClick={() => openEditEditor(shift)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                            onClick={() => setDeleteShift(shift)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                ) : null}
                                                {isStaff ? (
                                                    <Button
                                                        size="sm"
                                                        className="bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        disabled={Boolean(swapHint)}
                                                        onClick={() => setSwapShiftId(shift.id)}
                                                    >
                                                        Request Swap
                                                    </Button>
                                                ) : null}
                                            </div>
                                            {isStaff && swapHint ? (
                                                <p className="mt-1 text-xs text-gray-500">{swapHint}</p>
                                            ) : null}
                                        </Td>
                                    </Tr>
                                )
                            })}
                        </TBody>
                    </Table>
                </div>

                {loading ? (
                    <p className="mt-3 text-sm text-gray-500">Loading shifts...</p>
                ) : null}

                {!loading && shifts.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No shifts found for the current filters.</p>
                ) : null}

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {totalCount > 0
                            ? `Showing ${shifts.length} of ${totalCount} shifts`
                            : 'No shifts to display'}
                    </p>
                    <Pagination
                        currentPage={pagination?.page || page}
                        pageSize={pagination?.limit || limit}
                        total={totalCount}
                        onChange={setPage}
                    />
                </div>
            </Card>

            <Dialog isOpen={Boolean(viewShift)} onRequestClose={() => setViewShift(null)} width={720}>
                {viewShift ? (
                    <div className="space-y-4 p-6">
                        <h2 className="text-lg font-semibold">{viewShift.title}</h2>
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                            <p><span className="font-medium">Center:</span> {viewShift.location?.name || '-'}</p>
                            <p><span className="font-medium">Skill:</span> {viewShift.requiredSkill?.name || '-'}</p>
                            <p><span className="font-medium">Date:</span> {format(new Date(viewShift.startTime), 'EEE, MMM d, yyyy')}</p>
                            <p>
                                <span className="font-medium">Time:</span>{' '}
                                {format(new Date(viewShift.startTime), 'h:mm a')} - {format(new Date(viewShift.endTime), 'h:mm a')}
                            </p>
                            <p><span className="font-medium">Headcount:</span> {(viewShift.assignments?.length || 0)}/{viewShift.headcountNeeded}</p>
                            <p><span className="font-medium">Status:</span> {viewShift.status}</p>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium">Assigned Staff</p>
                            {viewShift.assignments && viewShift.assignments.length > 0 ? (
                                <ul className="space-y-1 text-sm">
                                    {viewShift.assignments.map((assignment) => (
                                        <li key={assignment.id} className="rounded border border-gray-200 px-3 py-2">
                                            {assignment.user
                                                ? `${assignment.user.firstName} ${assignment.user.lastName} (${assignment.user.role})`
                                                : assignment.userId}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">No staff assigned yet.</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button variant="plain" onClick={() => setViewShift(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Dialog>

            <Dialog isOpen={editorOpen} onRequestClose={closeEditor} width={760}>
                <div className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold">
                        {editorMode === 'create' ? 'Create Shift' : 'Edit Shift'}
                    </h2>

                    {editorError ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {editorError}
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                        {editorMode === 'create' ? (
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Center</label>
                                <Select
                                    instanceId="shift-editor-location"
                                    value={
                                        locationOptions.find((option) => option.value === editorForm.locationId) || null
                                    }
                                    options={locationOptions.filter((option) => option.value !== '')}
                                    onChange={(option) =>
                                        setEditorForm((previous) => ({
                                            ...previous,
                                            locationId: (option?.value as string) || '',
                                        }))
                                    }
                                />
                            </div>
                        ) : null}

                        <div className={editorMode === 'create' ? '' : 'md:col-span-2'}>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                            <Input
                                value={editorForm.title}
                                onChange={(event) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        title: event.target.value,
                                    }))
                                }
                                placeholder="Shift title"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Start</label>
                            <Input
                                type="datetime-local"
                                value={editorForm.startTimeLocal}
                                onChange={(event) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        startTimeLocal: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">End</label>
                            <Input
                                type="datetime-local"
                                value={editorForm.endTimeLocal}
                                onChange={(event) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        endTimeLocal: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Required Skill</label>
                            <Select
                                instanceId="shift-editor-skill"
                                value={
                                    ((skillsQuery.data?.skills || [])
                                        .map((skill) => ({
                                            value: skill.id,
                                            label: skill.name,
                                        }))
                                        .find((option) => option.value === editorForm.requiredSkillId) ||
                                        null)
                                }
                                options={(skillsQuery.data?.skills || []).map((skill) => ({
                                    value: skill.id,
                                    label: skill.name,
                                }))}
                                onChange={(option) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        requiredSkillId: (option?.value as string) || '',
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Headcount Needed</label>
                            <Input
                                type="number"
                                min={1}
                                value={editorForm.headcountNeeded}
                                onChange={(event) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        headcountNeeded: Number(event.target.value),
                                    }))
                                }
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm md:col-span-2">
                            <input
                                type="checkbox"
                                checked={editorForm.isOptional}
                                onChange={(event) =>
                                    setEditorForm((previous) => ({
                                        ...previous,
                                        isOptional: event.target.checked,
                                    }))
                                }
                            />
                            Optional shift (can stay unfilled)
                        </label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="plain" onClick={closeEditor}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={submitEditor}
                            loading={createShiftMutation.isPending || updateShiftMutation.isPending}
                        >
                            {editorMode === 'create' ? 'Create Shift' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={Boolean(deleteShift)}
                type="danger"
                title="Delete Shift"
                onConfirm={handleDeleteShift}
                onCancel={() => setDeleteShift(null)}
                confirmText="Delete"
                cancelText="Cancel"
            >
                {deleteShift ? `Delete "${deleteShift.title}" scheduled on ${format(new Date(deleteShift.startTime), 'EEE, MMM d, yyyy h:mm a')}?` : 'Delete selected shift?'}
            </ConfirmDialog>

            <SwapRequestModal
                isOpen={Boolean(swapShiftId)}
                onClose={() => setSwapShiftId(null)}
                shiftId={swapShiftId || ''}
                onSuccess={() => {
                    setSwapShiftId(null)
                    shiftsQuery.refetch()
                }}
            />
        </div>
    )
}
