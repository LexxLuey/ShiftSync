'use client'

import { FormEvent, useMemo, useState } from 'react'
import useShifts from '@/hooks/useShifts'
import type { NormalizedApiError } from '@/lib/api/types'

const Page = () => {
    const [locationId, setLocationId] = useState('')
    const [requiredSkillId, setRequiredSkillId] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [headcountNeeded, setHeadcountNeeded] = useState(1)
    const [successMessage, setSuccessMessage] = useState('')
    const [formError, setFormError] = useState('')

    const params = useMemo(
        () =>
            locationId
                ? {
                      locationId,
                  }
                : null,
        [locationId],
    )

    const { shiftsQuery, createShiftMutation, publishShiftMutation } =
        useShifts(params)

    const shiftList =
        shiftsQuery.data?.data ?? shiftsQuery.data?.shifts ?? []

    const handleCreateShift = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccessMessage('')
        setFormError('')

        try {
            await createShiftMutation.mutateAsync({
                locationId,
                requiredSkillId,
                startTime,
                endTime,
                headcountNeeded,
            })
            setSuccessMessage('Shift created successfully.')
        } catch (error) {
            const normalizedError = error as NormalizedApiError
            setFormError(
                normalizedError.message || 'Failed to create shift.',
            )
        }
    }

    const handlePublishShift = async (shiftId: string) => {
        setSuccessMessage('')
        setFormError('')

        try {
            await publishShiftMutation.mutateAsync(shiftId)
            setSuccessMessage('Shift published successfully.')
        } catch (error) {
            const normalizedError = error as NormalizedApiError
            setFormError(
                normalizedError.message || 'Failed to publish shift.',
            )
        }
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-xl font-semibold">Shifts</h1>

            <div className="rounded border p-4">
                <h2 className="mb-3 font-medium">Load Shifts</h2>
                <input
                    className="w-full rounded border px-3 py-2"
                    placeholder="Location ID"
                    value={locationId}
                    onChange={(event) => setLocationId(event.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500">
                    Enter a location id to fetch shifts.
                </p>
            </div>

            <form className="rounded border p-4" onSubmit={handleCreateShift}>
                <h2 className="mb-3 font-medium">Create Shift</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <input
                        className="rounded border px-3 py-2"
                        placeholder="Required Skill ID"
                        value={requiredSkillId}
                        onChange={(event) =>
                            setRequiredSkillId(event.target.value)
                        }
                        required
                    />
                    <input
                        className="rounded border px-3 py-2"
                        type="number"
                        min={1}
                        placeholder="Headcount"
                        value={headcountNeeded}
                        onChange={(event) =>
                            setHeadcountNeeded(Number(event.target.value))
                        }
                        required
                    />
                    <input
                        className="rounded border px-3 py-2"
                        type="datetime-local"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                    />
                    <input
                        className="rounded border px-3 py-2"
                        type="datetime-local"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        required
                    />
                </div>
                <button
                    className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                    type="submit"
                    disabled={
                        !locationId || createShiftMutation.isPending
                    }
                >
                    {createShiftMutation.isPending
                        ? 'Creating...'
                        : 'Create Shift'}
                </button>
            </form>

            {formError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
                    {formError}
                </div>
            ) : null}

            {successMessage ? (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <div className="rounded border p-4">
                <h2 className="mb-3 font-medium">Shift List</h2>
                {!locationId ? (
                    <p className="text-sm text-gray-500">
                        Provide a location id to view shifts.
                    </p>
                ) : null}
                {shiftsQuery.isLoading ? <p>Loading shifts...</p> : null}
                {shiftsQuery.isError ? (
                    <p className="text-red-600">
                        {
                            (shiftsQuery.error as unknown as NormalizedApiError)
                                ?.message ||
                            'Failed to load shifts.'}
                    </p>
                ) : null}
                {shiftList.length === 0 && !shiftsQuery.isLoading ? (
                    <p className="text-sm text-gray-500">No shifts found.</p>
                ) : null}
                <ul className="space-y-2">
                    {shiftList.map((shift) => (
                        <li
                            key={shift.id}
                            className="flex items-center justify-between rounded border p-3"
                        >
                            <div>
                                <p className="font-medium">{shift.id}</p>
                                <p className="text-sm text-gray-600">
                                    {shift.startTime} - {shift.endTime}
                                </p>
                                <p className="text-xs text-gray-500">
                                    status: {shift.status} | headcount:{' '}
                                    {shift.headcountNeeded}
                                </p>
                            </div>
                            <button
                                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                                onClick={() => handlePublishShift(shift.id)}
                                disabled={publishShiftMutation.isPending}
                                type="button"
                            >
                                Publish
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default Page
