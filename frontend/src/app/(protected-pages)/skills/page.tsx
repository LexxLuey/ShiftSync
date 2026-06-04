'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import toast from '@/components/ui/toast'
import useSkills from '@/hooks/useSkills'
import { useAuth } from '@/context/AuthContext'
import type { NormalizedApiError } from '@/lib/api/types'
import type { Skill } from '@/lib/api/types'

const { THead, TBody, Tr, Th, Td } = Table

type SkillFormState = {
    id?: string
    name: string
}

const emptyForm: SkillFormState = {
    name: '',
}

const Page = () => {
    const { user } = useAuth()
    const {
        data,
        isLoading,
        error,
        createSkillMutation,
        updateSkillMutation,
        deleteSkillMutation,
    } = useSkills()

    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState<SkillFormState>(emptyForm)
    const [formError, setFormError] = useState('')

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
        return <div className="p-4">Only admins and managers can manage skills.</div>
    }

    const skills = data?.skills || []
    const normalizedError = error as NormalizedApiError | null
    const saving = createSkillMutation.isPending || updateSkillMutation.isPending

    const openCreateDialog = () => {
        setForm(emptyForm)
        setFormError('')
        setDialogOpen(true)
    }

    const openEditDialog = (skill: Skill) => {
        setForm({
            id: skill.id,
            name: skill.name,
        })
        setFormError('')
        setDialogOpen(true)
    }

    const validateForm = (): string => {
        if (!form.name.trim()) {
            return 'Skill name is required.'
        }

        if (form.name.trim().length > 120) {
            return 'Skill name must be 120 characters or fewer.'
        }

        return ''
    }

    const submitForm = async () => {
        const validationMessage = validateForm()
        setFormError('')
        if (validationMessage) {
            setFormError(validationMessage)
            return
        }

        try {
            const payload = {
                name: form.name.trim(),
            }

            if (form.id) {
                await updateSkillMutation.mutateAsync({
                    skillId: form.id,
                    payload,
                })
                toast.push('Skill updated.', { placement: 'top-end' })
            } else {
                await createSkillMutation.mutateAsync(payload)
                toast.push('Skill created.', { placement: 'top-end' })
            }

            setDialogOpen(false)
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            setFormError(apiError.message || 'Failed to save skill.')
        }
    }

    const removeSkill = async (skill: Skill) => {
        const confirmed = window.confirm(
            `Delete ${skill.name}? This only works when no shifts or templates reference it.`,
        )

        if (!confirmed) {
            return
        }

        try {
            await deleteSkillMutation.mutateAsync(skill.id)
            toast.push('Skill deleted.', { placement: 'top-end' })
        } catch (mutationError) {
            const apiError = mutationError as NormalizedApiError
            const detailText =
                apiError.details && typeof apiError.details === 'object'
                    ? ` ${JSON.stringify(apiError.details)}`
                    : ''
            toast.push(
                `${apiError.message || 'Failed to delete skill.'}${detailText}`,
                { placement: 'top-end' },
            )
        }
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Skills Management</h1>
                    <p className="text-sm text-gray-500">
                        Create, edit, and remove skill catalog entries used across
                        shifts and event templates.
                    </p>
                </div>
                <Button type="button" variant="solid" onClick={openCreateDialog}>
                    Create Skill
                </Button>
            </div>

            <Card>
                {isLoading ? <p>Loading skills...</p> : null}
                {normalizedError ? (
                    <p className="text-red-600">
                        {normalizedError.message || 'Failed to load skills.'}
                    </p>
                ) : null}
                {!isLoading && !normalizedError && skills.length === 0 ? (
                    <p className="text-sm text-gray-500">No skills found.</p>
                ) : null}

                <Table>
                    <THead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {skills.map((skill) => (
                            <Tr key={skill.id}>
                                <Td>{skill.name}</Td>
                                <Td>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={() => openEditDialog(skill)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="text-red-600 hover:underline"
                                            disabled={deleteSkillMutation.isPending}
                                            onClick={() => removeSkill(skill)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </Card>

            <Dialog
                isOpen={dialogOpen}
                onRequestClose={() => setDialogOpen(false)}
                width={560}
            >
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold">
                            {form.id ? 'Edit Skill' : 'Create Skill'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Skill names must be unique.
                        </p>
                    </div>
                    {formError ? (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {formError}
                        </p>
                    ) : null}
                    <div className="space-y-4">
                        <Input
                            value={form.name}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                            placeholder="Skill name"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="solid"
                            loading={saving}
                            onClick={submitForm}
                        >
                            {form.id ? 'Save Changes' : 'Create Skill'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default Page
