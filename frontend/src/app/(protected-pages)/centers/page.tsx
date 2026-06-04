'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import toast from '@/components/ui/toast'
import useLocations from '@/hooks/useLocations'
import { useAuth } from '@/context/AuthContext'
import type { NormalizedApiError } from '@/lib/api/types'
import type { LocationRecord } from '@/lib/api/locations'

const { THead, TBody, Tr, Th, Td } = Table

type CenterFormState = {
    id?: string
    name: string
    address: string
    timezone: string
}

const emptyForm: CenterFormState = {
    name: '',
    address: '',
    timezone: 'Africa/Lagos',
}

const Page = () => {
    const { user } = useAuth()
    const {
        locationsQuery,
        createLocationMutation,
        updateLocationMutation,
        deactivateLocationMutation,
    } = useLocations()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState<CenterFormState>(emptyForm)
    const [formError, setFormError] = useState('')

    if (user?.role !== 'ADMIN') {
        return <div className="p-4">Only admins can manage centers.</div>
    }

    const centers = locationsQuery.data?.data || []
    const error = locationsQuery.error as NormalizedApiError | null
    const saving = createLocationMutation.isPending || updateLocationMutation.isPending

    const openCreateDialog = () => {
        setForm(emptyForm)
        setFormError('')
        setDialogOpen(true)
    }

    const openEditDialog = (center: LocationRecord) => {
        setForm({
            id: center.id,
            name: center.name,
            address: center.address,
            timezone: center.timezone,
        })
        setFormError('')
        setDialogOpen(true)
    }

    const validateForm = (): string => {
        if (!form.name.trim() || !form.address.trim() || !form.timezone.trim()) {
            return 'Name, address, and timezone are required.'
        }
        try {
            Intl.DateTimeFormat(undefined, { timeZone: form.timezone })
        } catch {
            return 'Timezone must be a valid IANA timezone, for example Africa/Lagos.'
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
            const payload = {
                name: form.name.trim(),
                address: form.address.trim(),
                timezone: form.timezone.trim(),
            }
            if (form.id) {
                await updateLocationMutation.mutateAsync({ locationId: form.id, payload })
                toast.push('Center updated.', { placement: 'top-end' })
            } else {
                await createLocationMutation.mutateAsync(payload)
                toast.push('Center created.', { placement: 'top-end' })
            }
            setDialogOpen(false)
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            setFormError(apiError.message || 'Failed to save center.')
        }
    }

    const deactivateCenter = async (center: LocationRecord) => {
        const confirmed = window.confirm(`Deactivate ${center.name}? Existing history will be preserved.`)
        if (!confirmed) {
            return
        }

        try {
            await deactivateLocationMutation.mutateAsync(center.id)
            toast.push('Center deactivated.', { placement: 'top-end' })
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            toast.push(apiError.message || 'Failed to deactivate center.', { placement: 'top-end' })
        }
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Center Management</h1>
                    <p className="text-sm text-gray-500">
                        Create, edit, and deactivate active centers. Times are stored in UTC and displayed by center timezone.
                    </p>
                </div>
                <Button type="button" variant="solid" onClick={openCreateDialog}>
                    Create Center
                </Button>
            </div>

            <Card>
                {locationsQuery.isLoading ? <p>Loading centers...</p> : null}
                {error ? <p className="text-red-600">{error.message || 'Failed to load centers.'}</p> : null}
                {!locationsQuery.isLoading && !error && centers.length === 0 ? (
                    <p className="text-sm text-gray-500">No centers found.</p>
                ) : null}

                <Table>
                    <THead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Address</Th>
                            <Th>Timezone</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {centers.map((center) => (
                            <Tr key={center.id}>
                                <Td>{center.name}</Td>
                                <Td>{center.address}</Td>
                                <Td>{center.timezone}</Td>
                                <Td>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={() => openEditDialog(center)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="text-red-600 hover:underline"
                                            disabled={deactivateLocationMutation.isPending}
                                            onClick={() => deactivateCenter(center)}
                                        >
                                            Deactivate
                                        </button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </Card>

            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} width={620}>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold">{form.id ? 'Edit Center' : 'Create Center'}</h2>
                        <p className="text-sm text-gray-500">Use an IANA timezone like Africa/Lagos.</p>
                    </div>
                    {formError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</p> : null}
                    <div className="space-y-4">
                        <Input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Center name"
                        />
                        <Input
                            value={form.address}
                            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                            placeholder="Address"
                        />
                        <Input
                            value={form.timezone}
                            onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                            placeholder="Timezone"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="solid" loading={saving} onClick={submitForm}>
                            {form.id ? 'Save Changes' : 'Create Center'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default Page
