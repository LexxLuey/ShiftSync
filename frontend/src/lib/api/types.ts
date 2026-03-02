export type ApiErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export type ApiViolation = {
    type?: string
    message: string
    [key: string]: unknown
}

export type NormalizedApiError = {
    code: string
    message: string
    details: unknown
    severity: ApiErrorSeverity
    suggestions: string[]
    violations?: ApiViolation[]
    status?: number
}

export type ShiftStatus = 'DRAFT' | 'PUBLISHED'

export type ShiftAssignment = {
    id: string
    userId: string
    status: 'ASSIGNED' | 'PENDING_SWAP'
}

export type Shift = {
    id: string
    locationId: string
    startTime: string
    endTime: string
    requiredSkillId: string
    headcountNeeded: number
    status: ShiftStatus
    publishedAt?: string | null
    assignments?: ShiftAssignment[]
}

export type GetShiftsByLocationParams = {
    locationId: string
    startDate?: string
    endDate?: string
}

export type CreateShiftPayload = {
    locationId: string
    startTime: string
    endTime: string
    requiredSkillId: string
    headcountNeeded: number
}
