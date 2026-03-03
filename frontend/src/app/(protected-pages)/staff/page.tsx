'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'
import useUsers from '@/hooks/useUsers'
import useLocations from '@/hooks/useLocations'
import { useAuth } from '@/context/AuthContext'
import type { AppRole } from '@/lib/auth/types'
import type { NormalizedApiError } from '@/lib/api/types'

const { THead, TBody, Tr, Th, Td } = Table

const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'STAFF', label: 'Staff' },
]

const Page = () => {
    const { user } = useAuth()

    const [page, setPage] = useState(1)
    const [limit] = useState(20)
    const [selectedRole, setSelectedRole] = useState<AppRole | ''>('')
    const [selectedLocation, setSelectedLocation] = useState('')
    const [nameQuery, setNameQuery] = useState('')
    const [skillQuery, setSkillQuery] = useState('')

    const queryParams = useMemo(
        () => ({
            page,
            limit,
            role: selectedRole,
            locationId: selectedLocation || undefined,
        }),
        [limit, page, selectedLocation, selectedRole],
    )

    const { usersQuery } = useUsers(queryParams)
    const { locationsQuery } = useLocations()

    if (user?.role === 'STAFF') {
        return <div className="p-4">You are not authorized to view this page.</div>
    }

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
        { value: '', label: 'All Locations' },
        ...(locationsQuery.data?.data || []).map((location) => ({
            value: location.id,
            label: location.name,
        })),
    ]

    const error = usersQuery.error as NormalizedApiError | null

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold">Staff Management</h1>

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
                        value={
                            roleOptions.find(
                                (option) => option.value === selectedRole,
                            ) || null
                        }
                        options={roleOptions}
                        isSearchable={false}
                        onChange={(option) => {
                            setPage(1)
                            setSelectedRole((option?.value as AppRole | '') || '')
                        }}
                    />
                    <Select
                        instanceId="location-filter"
                        value={
                            locationOptions.find(
                                (option) => option.value === selectedLocation,
                            ) || null
                        }
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
                {usersQuery.isLoading ? <p>Loading staff...</p> : null}
                {error ? (
                    <p className="text-red-600">{error.message || 'Failed to load users.'}</p>
                ) : null}
                {!usersQuery.isLoading && !error && filteredUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No staff found.</p>
                ) : null}

                <Table>
                    <THead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Locations</Th>
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
                                <Td>
                                    {(staff.certifications || [])
                                        .filter((cert) => !cert.revokedAt)
                                        .map((cert) => cert.location?.name || cert.locationId)
                                        .join(', ') || '-'}
                                </Td>
                                <Td>
                                    {(staff.skills || [])
                                        .map((skill) => skill.name)
                                        .join(', ') || '-'}
                                </Td>
                                <Td>
                                    <Link
                                        href={`/staff/${staff.id}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        View
                                    </Link>
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
        </div>
    )
}

export default Page
