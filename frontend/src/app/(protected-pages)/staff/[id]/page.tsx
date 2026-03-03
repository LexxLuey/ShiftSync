'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import useUserDetail from '@/hooks/useUserDetail'
import useLocations from '@/hooks/useLocations'
import type { NormalizedApiError } from '@/lib/api/types'

const Page = () => {
    const params = useParams()
    const rawId = params?.id
    const userId = Array.isArray(rawId) ? rawId[0] : rawId || ''

    const { userQuery, addCertificationMutation, revokeCertificationMutation } =
        useUserDetail(userId)
    const { locationsQuery } = useLocations()

    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [feedback, setFeedback] = useState('')

    const user = userQuery.data?.data

    const activeCertificationIds = useMemo(
        () =>
            (user?.certifications || [])
                .filter((cert) => !cert.revokedAt)
                .map((cert) => cert.locationId),
        [user?.certifications],
    )

    const availableLocations = (locationsQuery.data?.data || []).filter(
        (location) => !activeCertificationIds.includes(location.id),
    )

    const locationOptions = [
        { value: '', label: 'Select location' },
        ...availableLocations.map((location) => ({
            value: location.id,
            label: location.name,
        })),
    ]

    const mutationError =
        (addCertificationMutation.error as NormalizedApiError | null) ||
        (revokeCertificationMutation.error as NormalizedApiError | null)

    const handleAddCertification = async () => {
        if (!selectedLocationId) {
            return
        }

        setFeedback('')

        try {
            await addCertificationMutation.mutateAsync({
                locationId: selectedLocationId,
            })
            setFeedback('Certification added successfully.')
            setSelectedLocationId('')
        } catch {
            // handled by mutationError UI
        }
    }

    const handleRevokeCertification = async (locationId: string) => {
        setFeedback('')

        try {
            await revokeCertificationMutation.mutateAsync({ locationId })
            setFeedback('Certification revoked successfully.')
        } catch {
            // handled by mutationError UI
        }
    }

    if (userQuery.isLoading) {
        return <div className="p-4">Loading staff detail...</div>
    }

    if (!user) {
        return <div className="p-4">Staff record not found.</div>
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-semibold">Staff Detail</h1>

            <Card>
                <div className="space-y-2">
                    <p>
                        <span className="font-semibold">Name:</span>{' '}
                        {user.firstName} {user.lastName}
                    </p>
                    <p>
                        <span className="font-semibold">Email:</span> {user.email}
                    </p>
                    <p>
                        <span className="font-semibold">Role:</span> {user.role}
                    </p>
                    <p>
                        <span className="font-semibold">Phone:</span>{' '}
                        {user.phone || '-'}
                    </p>
                </div>
            </Card>

            <Card header={{ content: 'Certifications' }}>
                <div className="space-y-4">
                    {(user.certifications || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No certifications yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {user.certifications?.map((certification) => {
                                const isRevoked = Boolean(certification.revokedAt)

                                return (
                                    <li
                                        key={certification.id}
                                        className="flex items-center justify-between rounded border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {certification.location?.name ||
                                                    certification.locationId}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {isRevoked
                                                    ? `Revoked at ${certification.revokedAt}`
                                                    : 'Active'}
                                            </p>
                                        </div>
                                        {!isRevoked ? (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleRevokeCertification(
                                                        certification.locationId,
                                                    )
                                                }
                                                loading={
                                                    revokeCertificationMutation.isPending
                                                }
                                            >
                                                Revoke
                                            </Button>
                                        ) : null}
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Select
                            instanceId="add-certification-location"
                            value={
                                locationOptions.find(
                                    (option) =>
                                        option.value === selectedLocationId,
                                ) || null
                            }
                            options={locationOptions}
                            isSearchable={false}
                            onChange={(option) =>
                                setSelectedLocationId((option?.value as string) || '')
                            }
                        />
                        <Button
                            onClick={handleAddCertification}
                            disabled={!selectedLocationId}
                            loading={addCertificationMutation.isPending}
                        >
                            Add Certification
                        </Button>
                    </div>
                </div>
            </Card>

            <Card header={{ content: 'Skills' }}>
                <div className="space-y-2">
                    {(user.skills || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No skills assigned.</p>
                    ) : (
                        <ul className="list-disc pl-5">
                            {user.skills?.map((entry, index) => (
                                <li key={entry.skill?.id || `skill-${index}`}>
                                    {entry.skill?.name || 'Unnamed skill'}
                                </li>
                            ))}
                        </ul>
                    )}
                    <Button size="sm" disabled>
                        Skill assignment coming in next phase
                    </Button>
                </div>
            </Card>

            {feedback ? <p className="text-green-700">{feedback}</p> : null}
            {mutationError ? (
                <p className="text-red-600">
                    {mutationError.message || 'Action failed.'}
                </p>
            ) : null}
        </div>
    )
}

export default Page
