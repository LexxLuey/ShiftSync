'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import useShifts from '@/hooks/useShifts'
import useSkills from '@/hooks/useSkills'
import { Dialog, Input, Button } from '@/components/ui'
import type { CreateShiftPayload } from '@/lib/api/types'

interface ShiftCreateModalProps {
    isOpen: boolean
    onClose: () => void
    locationId: string
    initialDate?: Date
    initialHour?: number
}

export default function ShiftCreateModal({
    isOpen,
    onClose,
    locationId,
    initialDate,
    initialHour,
}: ShiftCreateModalProps) {
    const { register, handleSubmit, reset, watch, setValue } = useForm<{
        date: string
        startTime: string
        endTime: string
        skillId: string
        headcount: number
    }>({
        defaultValues: {
            date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            startTime: initialHour ? `${String(initialHour).padStart(2, '0')}:00` : '09:00',
            endTime: initialHour ? `${String(initialHour + 1).padStart(2, '0')}:00` : '10:00',
            skillId: '',
            headcount: 1,
        },
    })

    const skillsQuery = useSkills()
    const { createShiftMutation } = useShifts(locationId ? { locationId } : null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (initialDate) {
            setValue('date', format(initialDate, 'yyyy-MM-dd'))
        }
        if (initialHour) {
            const hour = String(initialHour).padStart(2, '0')
            setValue('startTime', `${hour}:00`)
            setValue('endTime', `${String(initialHour + 1).padStart(2, '0')}:00`)
        }
    }, [initialDate, initialHour, setValue])

    const onSubmit = async (data: {
        date: string
        startTime: string
        endTime: string
        skillId: string
        headcount: number
    }) => {
        setError('')
        try {
            const payload: CreateShiftPayload = {
                locationId,
                startTime: `${data.date}T${data.startTime}:00Z`,
                endTime: `${data.date}T${data.endTime}:00Z`,
                requiredSkillId: data.skillId,
                headcountNeeded: data.headcount,
            }

            await createShiftMutation.mutateAsync(payload)
            reset()
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to create shift')
        }
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose}>
            <div className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Create Shift</h2>

                {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <Input type="date" {...register('date')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Time</label>
                            <Input type="time" {...register('startTime')} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Time</label>
                            <Input type="time" {...register('endTime')} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Skill Required</label>
                        <select
                            {...register('skillId', { required: 'Skill is required' })}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                            <option value="">Select skill...</option>
                            {skillsQuery.data?.skills?.map((skill: any) => (
                                <option key={skill.id} value={skill.id}>
                                    {skill.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Headcount Needed</label>
                        <Input type="number" min="1" {...register('headcount', { valueAsNumber: true })} />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="submit"
                            disabled={createShiftMutation.isPending}
                            className="flex-1"
                        >
                            {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
                        </Button>
                        <Button type="button" variant="plain" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    )
}
