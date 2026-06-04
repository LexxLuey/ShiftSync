'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'
import toast from '@/components/ui/toast'
import useUsers from '@/hooks/useUsers'
import useLocations from '@/hooks/useLocations'
import { useAuth } from '@/context/AuthContext'
import type { AppRole } from '@/lib/auth/types'
import type { NormalizedApiError } from '@/lib/api/types'
import type { UserRecord } from '@/lib/api/users'

const { THead, TBody, Tr, Th, Td } = Table

type UserFormState = {
    id?: string
    email: string
    password: string
    firstName: string
    lastName: string
    role: AppRole
    phone: string
    locationIds: string[]
}

const emptyForm: UserFormState = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'STAFF',
    phone: '',
    locationIds: [],
}

const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'STAFF', label: 'Staff' },
]

const getUserLocationIds = (user: UserRecord): string[] => {
    const certificationIds = (user.certifications || [])
        .filter((cert) => !cert.revokedAt)
        .map((cert) => cert.locationId)
    const managerIds = (user.managerLocations || [])
        .map((entry) => entry.location?.id)
        .filter((locationId): locationId is string => Boolean(locationId))

    return Array.from(new Set([...certificationIds, ...managerIds]))
}

const getUserLocationNames = (user: UserRecord): string => {
    const certificationNames = (user.certifications || [])
        .filter((cert) => !cert.revokedAt)
        .map((cert) => cert.location?.name || cert.locationId)
    const managerNames = (user.managerLocations || [])
        .map((entry) => entry.location?.name)
        .filter((locationName): locationName is string => Boolean(locationName))

    return Array.from(new Set([...certificationNames, ...managerNames])).join(', ') || '-'
}

const Page = () => {
    const { user } = useAuth()

    const [page, setPage] = useState(1)
    const [limit] = useState(20)
    const [selectedRole, setSelectedRole] = useState<AppRole | ''>('')
    const [selectedLocation, setSelectedLocation] = useState('')
    const [nameQuery, setNameQuery] = useState('')
    const [skillQuery, setSkillQuery] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState<UserFormState>(emptyForm)
    const [formError, setFormError] = useState('')

    const queryParams = useMemo(
        () => ({
            page,
            limit,
            role: selectedRole,
            locationId: selectedLocation || undefined,
        }),
        [limit, page, selectedLocation, selectedRole],
    )

    const {
        usersQuery,
        createUserMutation,
        updateUserMutation,
        deactivateUserMutation,
    } = useUsers(queryParams)
    const { locationsQuery } = useLocations()

    if (user?.role === 'STAFF') {
        return <div className="p-4">You are not authorized to view this page.</div>
    }

    const locations = locationsQuery.data?.data || []
    const isAdmin = user?.role === 'ADMIN'
    const editableRoleOptions = isAdmin
        ? roleOptions.filter((option) => option.value)
        : roleOptions.filter((option) => option.value && option.value !== 'ADMIN')

    const users = usersQuery.data?.data || []
    const pagination = usersQuery.data?.pagination

    const filteredUsers = users.filter((staff) => {
        const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase()
        const normalizedNameQuery = nameQuery.toLowerCase().trim()
        const normalizedSkillQuery = skillQuery.toLowerCase().trim()
        const nameMatches = normalizedNameQuery
            ? fullName.includes(normalizedNameQuery) ||
              staff.email.toLowerCase().includes(normalizedNameQuery)
            : true

        const skillMatches = normalizedSkillQuery
            ? (staff.skills || [])
                  .map((skill) => skill.name.toLowerCase())
                  .some((skill) => skill.includes(normalizedSkillQuery))
            : true

        return nameMatches && skillMatches
    })

    const locationOptions = [
        { value: '', label: 'All Centers' },
        ...locations.map((location) => ({
            value: location.id,
            label: location.name,
        })),
    ]

    const error = usersQuery.error as NormalizedApiError | null
    const saving = createUserMutation.isPending || updateUserMutation.isPending

    const openCreateDialog = () => {
        setForm({
            ...emptyForm,
            role: isAdmin ? 'STAFF' : 'STAFF',
            locationIds: locations.length === 1 ? [locations[0]!.id] : [],
        })
        setFormError('')
        setDialogOpen(true)
    }

    const openEditDialog = (record: UserRecord) => {
        setForm({
            id: record.id,
            email: record.email,
            password: '',
            firstName: record.firstName,
            lastName: record.lastName,
            role: record.role,
            phone: record.phone || '',
            locationIds: getUserLocationIds(record),
        })
        setFormError('')
        setDialogOpen(true)
    }

    const toggleLocation = (locationId: string) => {
        setForm((current) => ({
            ...current,
            locationIds: current.locationIds.includes(locationId)
                ? current.locationIds.filter((id) => id !== locationId)
                : [...current.locationIds, locationId],
        }))
    }

    const validateForm = (): string => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
            return 'Name and email are required.'
        }
        if (!form.id && form.password.length < 8) {
            return 'Password must be at least 8 characters.'
        }
        if (form.role !== 'ADMIN' && form.locationIds.length === 0) {
            return 'Select at least one center for manager or staff users.'
        }
        if (!isAdmin && form.role === 'ADMIN') {
            return 'Managers cannot create or edit admin users.'
        }
        return ''
    }

    const submitForm = async () => {
        const validationMessage = validateForm()
        if (validationMessage) {
            setFormError(validationMessage)
            return
        }

        try {
            if (form.id) {
                await updateUserMutation.mutateAsync({
                    userId: form.id,
                    payload: {
                        firstName: form.firstName.trim(),
                        lastName: form.lastName.trim(),
                        phone: form.phone.trim() || null,
                        role: form.role,
                        locationIds: form.role === 'ADMIN' ? [] : form.locationIds,
                    },
                })
                toast.push('User updated.', { placement: 'top-end' })
            } else {
                await createUserMutation.mutateAsync({
                    email: form.email.trim(),
                    password: form.password,
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    role: form.role,
                    phone: form.phone.trim() || undefined,
                    locationIds: form.role === 'ADMIN' ? [] : form.locationIds,
                })
                toast.push('User created.', { placement: 'top-end' })
            }
            setDialogOpen(false)
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            setFormError(apiError.message || 'Failed to save user.')
        }
    }

    const deactivateUser = async (record: UserRecord) => {
        const confirmed = window.confirm(`Deactivate ${record.firstName} ${record.lastName}?`)
        if (!confirmed) {
            return
        }

        try {
            await deactivateUserMutation.mutateAsync(record.id)
            toast.push('User deactivated.', { placement: 'top-end' })
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            toast.push(apiError.message || 'Failed to deactivate user.', { placement: 'top-end' })
        }
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">User Management</h1>
                    <p className="text-sm text-gray-500">
                        {isAdmin
                            ? 'Create and manage admins, managers, and staff across centers.'
                            : 'Create and manage non-admin users in your centers.'}
                    </p>
                </div>
                <Button type="button" variant="solid" onClick={openCreateDialog}>
                    Create User
                </Button>
            </div>

            <Card>
                <div className="grid gap-4 md:grid-cols-5">
                    <Input
                        value={nameQuery}
                        onChange={(event) => {
                            setPage(1)
                            setNameQuery(event.target.value)
                        }}
                        placeholder="Search name or email"
                    />
                    <Select
                        instanceId="role-filter"
                        value={roleOptions.find((option) => option.value === selectedRole) || null}
                        options={roleOptions}
                        isSearchable={false}
                        onChange={(option) => {
                            setPage(1)
                            setSelectedRole((option?.value as AppRole | '') || '')
                        }}
                    />
                    <Select
                        instanceId="location-filter"
                        value={locationOptions.find((option) => option.value === selectedLocation) || null}
                        options={locationOptions}
                        isSearchable={false}
                        onChange={(option) => {
                            setPage(1)
                            setSelectedLocation((option?.value as string) || '')
                        }}
                    />
                    <Input
                        value={skillQuery}
                        onChange={(event) => {
                            setPage(1)
                            setSkillQuery(event.target.value)
                        }}
                        placeholder="Filter by skill"
                    />
                    <Button
                        type="button"
                        onClick={() => {
                            setPage(1)
                            setNameQuery('')
                            setSkillQuery('')
                            setSelectedRole('')
                            setSelectedLocation('')
                        }}
                    >
                        Reset Filters
                    </Button>
                </div>
            </Card>

            <Card>
                {usersQuery.isLoading ? <p>Loading users...</p> : null}
                {error ? <p className="text-red-600">{error.message || 'Failed to load users.'}</p> : null}
                {!usersQuery.isLoading && !error && filteredUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No users found.</p>
                ) : null}

                <Table>
                    <THead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Centers</Th>
                            <Th>Skills</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {filteredUsers.map((staff) => (
                            <Tr key={staff.id}>
                                <Td>{`${staff.firstName} ${staff.lastName}`}</Td>
                                <Td>{staff.email}</Td>
                                <Td>{staff.role}</Td>
                                <Td>{getUserLocationNames(staff)}</Td>
                                <Td>{(staff.skills || []).map((skill) => skill.name).join(', ') || '-'}</Td>
                                <Td>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/staff/${staff.id}`} className="text-blue-600 hover:underline">
                                            View
                                        </Link>
                                        <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={() => openEditDialog(staff)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="text-red-600 hover:underline"
                                            onClick={() => deactivateUser(staff)}
                                            disabled={deactivateUserMutation.isPending}
                                        >
                                            Deactivate
                                        </button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>

                <div className="mt-4 flex justify-end">
                    <Pagination
                        currentPage={pagination?.page || page}
                        pageSize={pagination?.limit || limit}
                        total={pagination?.total || 0}
                        onChange={setPage}
                    />
                </div>
            </Card>

            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} width={680}>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold">{form.id ? 'Edit User' : 'Create User'}</h2>
                        <p className="text-sm text-gray-500">
                            Role and center rules are enforced again by the backend.
                        </p>
                    </div>
                    {formError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</p> : null}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            value={form.firstName}
                            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                            placeholder="First name"
                        />
                        <Input
                            value={form.lastName}
                            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                            placeholder="Last name"
                        />
                        <Input
                            value={form.email}
                            disabled={Boolean(form.id)}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            placeholder="Email"
                        />
                        <Input
                            value={form.phone}
                            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                            placeholder="Phone (optional)"
                        />
                        {!form.id ? (
                            <Input
                                type="password"
                                value={form.password}
                                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                placeholder="Temporary password"
                            />
                        ) : null}
                        <Select
                            instanceId="user-form-role"
                            value={editableRoleOptions.find((option) => option.value === form.role) || null}
                            options={editableRoleOptions}
                            isSearchable={false}
                            onChange={(option) =>
                                setForm((current) => ({
                                    ...current,
                                    role: option?.value as AppRole,
                                    locationIds: option?.value === 'ADMIN' ? [] : current.locationIds,
                                }))
                            }
                        />
                    </div>

                    {form.role !== 'ADMIN' ? (
                        <div>
                            <p className="mb-2 text-sm font-medium">Centers</p>
                            <div className="grid gap-2 md:grid-cols-2">
                                {locations.map((location) => (
                                    <label
                                        key={location.id}
                                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.locationIds.includes(location.id)}
                                            onChange={() => toggleLocation(location.id)}
                                        />
                                        <span>{location.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2">
                        <Button type="button" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="solid" loading={saving} onClick={submitForm}>
                            {form.id ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default Page
