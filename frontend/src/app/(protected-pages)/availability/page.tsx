'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import useAvailability from '@/hooks/useAvailability'
import { useAuth } from '@/context/AuthContext'
import { Button, Dialog, Input } from '@/components/ui'
import type { CreateAvailabilityPayload, CreateExceptionPayload } from '@/lib/api/types'

export default function AvailabilityPage() {
    const { user } = useAuth()
    const { availabilityQuery, createAvailabilityMutation, deleteAvailabilityMutation, createExceptionMutation, deleteExceptionMutation } = useAvailability(user?.id)

    const [error, setError] = useState('')
    const [selectedWeek, setSelectedWeek] = useState<{
        dayOfWeek: number
        startTime: string
        endTime: string
    } | null>(null)
    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false)
    const [exceptionDate, setExceptionDate] = useState('')
    const [exceptionStartTime, setExceptionStartTime] = useState('')
    const [exceptionEndTime, setExceptionEndTime] = useState('')

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const hours = Array.from({ length: 24 }, (_, i) => i)

    const handleSelectBlock = (dayOfWeek: number, startHour: number, endHour: number) => {
        const startTime = `${String(startHour).padStart(2, '0')}:00`
        const endTime = `${String(endHour).padStart(2, '0')}:00`
        setSelectedWeek({ dayOfWeek, startTime, endTime })
    }

    const handleSaveRecurring = async () => {
        if (!selectedWeek || !user?.id) return
        setError('')
        try {
            const payload: CreateAvailabilityPayload = {
                dayOfWeek: selectedWeek.dayOfWeek,
                startTime: selectedWeek.startTime,
                endTime: selectedWeek.endTime,
            }
            await createAvailabilityMutation.mutateAsync(payload)
            setSelectedWeek(null)
        } catch (err: any) {
            setError(err?.message || 'Failed to save availability')
        }
    }

    const handleAddException = async () => {
        if (!user?.id || !exceptionDate) return
        setError('')
        try {
            const payload: CreateExceptionPayload = {
                date: exceptionDate,
                startTime: exceptionStartTime || undefined,
                endTime: exceptionEndTime || undefined,
            }
            await createExceptionMutation.mutateAsync(payload)
            setExceptionDate('')
            setExceptionStartTime('')
            setExceptionEndTime('')
            setIsExceptionModalOpen(false)
        } catch (err: any) {
            setError(err?.message || 'Failed to add exception')
        }
    }

    const handleDelete = async (availabilityId: string) => {
        if (!user?.id) return
        setError('')
        try {
            await deleteAvailabilityMutation.mutateAsync(availabilityId)
        } catch (err: any) {
            setError(err?.message || 'Failed to delete availability')
        }
    }

    const handleDeleteException = async (exceptionId: string) => {
        if (!user?.id) return
        setError('')
        try {
            await deleteExceptionMutation.mutateAsync(exceptionId)
        } catch (err: any) {
            setError(err?.message || 'Failed to delete exception')
        }
    }

    if (!user?.id) {
        return <div className="p-6">Please log in to manage availability.</div>
    }

    const recurring = availabilityQuery.data?.recurring || []
    const exceptions = availabilityQuery.data?.exceptions || []

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">My Availability</h1>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

            {/* Recurring Availability Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Weekly Availability</h2>
                <p className="text-sm text-gray-600">Click to set your recurring availability hours</p>

                <div className="border rounded-lg overflow-x-auto">
                    <div className="min-w-max">
                        {/* Header */}
                        <div className="flex bg-gray-100 border-b">
                            <div className="w-24 flex-shrink-0 border-r p-2 text-xs font-semibold">
                                Time
                            </div>
                            {dayNames.map((day, idx) => (
                                <div
                                    key={idx}
                                    className="flex-1 min-w-24 border-r p-2 text-center text-xs font-semibold"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Hour rows */}
                        {hours.map((hour) => (
                            <div key={hour} className="flex border-b">
                                <div className="w-24 flex-shrink-0 border-r p-2 text-xs font-medium text-gray-600">
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                                {dayNames.map((_, dayIdx) => {
                                    const hasAvailability = recurring.some(
                                        (av) =>
                                            av.dayOfWeek === dayIdx &&
                                            parseInt(av.startTime) <= hour &&
                                            parseInt(av.endTime) > hour,
                                    )
                                    return (
                                        <div
                                            key={`${dayIdx}-${hour}`}
                                            className={`flex-1 min-w-24 border-r p-1 min-h-12 cursor-pointer ${
                                                hasAvailability
                                                    ? 'bg-green-100 hover:bg-green-200'
                                                    : 'bg-white hover:bg-gray-50'
                                            }`}
                                            onClick={() =>
                                                handleSelectBlock(dayIdx, hour, hour + 1)
                                            }
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {selectedWeek && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <p className="text-sm">
                            Set availability for <strong>{dayNames[selectedWeek.dayOfWeek]}</strong> from{' '}
                            <strong>{selectedWeek.startTime}</strong> to <strong>{selectedWeek.endTime}</strong>?
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSaveRecurring}
                                disabled={createAvailabilityMutation.isPending}
                            >
                                {createAvailabilityMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="plain" onClick={() => setSelectedWeek(null)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {recurring.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Current Recurring Availability</h3>
                        <div className="space-y-2">
                            {recurring.map((av) => (
                                <div
                                    key={av.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                                >
                                    <span className="text-sm">
                                        {dayNames[av.dayOfWeek]} {av.startTime} - {av.endTime}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(av.id)}
                                        disabled={deleteAvailabilityMutation.isPending}
                                        className="text-red-600 hover:text-red-700 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Exceptions */}
            <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold">Unavailability Exceptions</h2>
                <Button onClick={() => setIsExceptionModalOpen(true)}>Add Exception</Button>

                {exceptions.length > 0 && (
                    <div className="space-y-2">
                        {exceptions.map((ex) => (
                            <div
                                key={ex.id}
                                className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-200"
                            >
                                <span className="text-sm">
                                    {format(new Date(ex.date), 'MMM d, yyyy')}
                                    {ex.startTime && ex.endTime && ` ${ex.startTime} - ${ex.endTime}`}
                                    {!ex.startTime && ' (All day)'}
                                </span>
                                <button
                                    onClick={() => handleDeleteException(ex.id)}
                                    disabled={deleteExceptionMutation.isPending}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog
                isOpen={isExceptionModalOpen}
                onRequestClose={() => setIsExceptionModalOpen(false)}
            >
                <div className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Add Unavailability Exception</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <Input
                            type="date"
                            value={exceptionDate}
                            onChange={(e) => setExceptionDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Start Time (optional)</label>
                        <Input
                            type="time"
                            value={exceptionStartTime}
                            onChange={(e) => setExceptionStartTime(e.target.value)}
                            placeholder="Leave blank for all day"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">End Time (optional)</label>
                        <Input
                            type="time"
                            value={exceptionEndTime}
                            onChange={(e) => setExceptionEndTime(e.target.value)}
                            placeholder="Leave blank for all day"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            onClick={handleAddException}
                            disabled={createExceptionMutation.isPending || !exceptionDate}
                        >
                            {createExceptionMutation.isPending ? 'Adding...' : 'Add Exception'}
                        </Button>
                        <Button
                            variant="plain"
                            onClick={() => setIsExceptionModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
