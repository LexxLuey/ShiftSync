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

export type Skill = {
    id: string
    name: string
}

export type ShiftAssignment = {
    id: string
    userId: string
    status: 'ASSIGNED' | 'PENDING_SWAP'
}

export type Shift = {
    id: string
    locationId: string
    title: string
    startTime: string
    endTime: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional?: boolean
    eventInstanceId?: string | null
    status: ShiftStatus
    publishedAt?: string | null
    assignments?: ShiftAssignment[]
}

export type PublishWarning = {
    code: string
    message: string
    details?: Record<string, unknown>
}

export type PublishShiftResponse = Shift & {
    hoursUntilDeadline?: number
    warnings?: PublishWarning[]
}

export type GetShiftsByLocationParams = {
    locationId: string
    startDate?: string
    endDate?: string
}

export type CreateShiftPayload = {
    locationId: string
    title?: string
    startTime: string
    endTime: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional?: boolean
    eventInstanceId?: string
}

export type UpdateShiftPayload = Partial<Omit<CreateShiftPayload, 'locationId'>>

export type Availability = {
    id: string
    userId: string
    dayOfWeek: number
    startTime: string
    endTime: string
    locationId?: string
    isRecurring: boolean
    validFrom: string
    validTo?: string
}

export type Exception = {
    id: string
    userId: string
    date: string
    startTime?: string
    endTime?: string
}

export type CreateAvailabilityPayload = {
    dayOfWeek: number
    startTime: string
    endTime: string
    locationId?: string
}

export type CreateExceptionPayload = {
    date: string
    startTime?: string
    endTime?: string
}

export type UserAvailabilityResponse = {
    recurring: Availability[]
    exceptions: Exception[]
}

export type CheckAvailabilityParams = {
    date: string
    startTime: string
    endTime: string
    locationId?: string
}

export type CheckAvailabilityResponse = {
    available: boolean
    reason?: string
}

// Assignment Types
export type AssignmentViolation = {
    type: string // 'overlap', 'weekly_hours', 'daily_hours', 'consecutive_days', etc
    severity: 'warning' | 'error'
    message: string
    details?: Record<string, unknown>
}

export type EligibleStaffMember = {
    userId: string
    name: string
    role: string
    available: boolean
    warnings: AssignmentViolation[]
    availabilityIndicator: 'green' | 'yellow' | 'red'
    assignmentCountInWindow: number
    rank: number
}

export type GetEligibleStaffParams = {
    shiftId: string
    limit?: number
    search?: string
    fairnessStartDate?: string
    fairnessEndDate?: string
}

export type CreateAssignmentPayload = {
    userId: string
}

export type AssignmentResponse = {
    success?: boolean
    error?: NormalizedApiError & { violations?: AssignmentViolation[] }
}

// Audit Types (Phase 5)
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    PUBLISH = 'PUBLISH',
    ASSIGN = 'ASSIGN',
    REASSIGN = 'REASSIGN',
    UNASSIGN = 'UNASSIGN',
    SWAP_REQUEST_CREATE = 'SWAP_REQUEST_CREATE',
    SWAP_REQUEST_APPROVE = 'SWAP_REQUEST_APPROVE',
    SWAP_REQUEST_REJECT = 'SWAP_REQUEST_REJECT',
    SWAP_REQUEST_CANCEL = 'SWAP_REQUEST_CANCEL',
    ROLE_CHANGE = 'ROLE_CHANGE',
    CERT_REVOKE = 'CERT_REVOKE',
}

export enum AuditEntity {
    SHIFT = 'SHIFT',
    ASSIGNMENT = 'ASSIGNMENT',
    SWAP_REQUEST = 'SWAP_REQUEST',
    USER = 'USER',
    LOCATION = 'LOCATION',
    CERTIFICATION = 'CERTIFICATION',
}

export type AuditLogUser = {
    id: string
    firstName: string
    lastName: string
    email: string
}

export type AuditLog = {
    id: string
    userId: string
    action: AuditAction | string
    entityType: AuditEntity | string
    entityId: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
    user: AuditLogUser
    createdAt: string
}

export type GetAuditLogsParams = {
    startDate?: string
    endDate?: string
    entityType?: AuditEntity | string
    action?: AuditAction | string
    limit?: number
    offset?: number
}

export type AuditLogsResponse = {
    data: AuditLog[]
    count: number
}

// Active Shifts Types (Phase 5)
export type AssignedStaffMember = {
    id: string
    firstName: string
    lastName: string
    email: string
}

export type ActiveShift = {
    id: string
    locationId: string
    locationName: string
    startTime: string
    endTime: string
    skill: Skill
    headcountNeeded: number
    assignedStaff: AssignedStaffMember[]
}

export type ActiveShiftsResponse = {
    data: ActiveShift[]
    count: number
}

// Fairness & Reports Types (Phase 6)

export type FairnessStatus = 'under' | 'balanced' | 'over'

export type StaffFairnessData = {
    userId: string
    userName: string
    totalHours: number
    premiumShiftCount: number
    totalShiftCount: number
    premiumPercentage: number
    hoursPercentage: number
    fairnessScore: number
    status: FairnessStatus
}

export type FairnessReportResponse = {
    data: StaffFairnessData[]
    count: number
}

export type DailyHours = Record<string, number>

export type OvertimeStatus = 'under' | 'warning' | 'overtime'

export type HoursDistributionData = {
    userId: string
    userName: string
    weeklyTotal: number
    dailyBreakdown: DailyHours
    consecutiveDaysWorked: number
    overtimeStatus: OvertimeStatus
}

export type HoursDistributionResponse = {
    data: HoursDistributionData[]
    count: number
}

export type WarningBlock = {
    type: string
    message: string
}

export type ProjectionResult = {
    currentWeeklyHours: number
    projectedWeeklyHours: number
    warnings: WarningBlock[]
    blocks: WarningBlock[]
    canAssign: boolean
}

export type WhatIfShiftInput = {
    shiftId: string
    userId: string
}

export type WhatIfProjectionDetail = {
    shiftId: string
    userId: string
    currentWeeklyHours: number
    projectedWeeklyHours: number
    canAssign: boolean
    willWarn: boolean
    willBlock: boolean
}

export type WhatIfResult = {
    totalProposed: number
    canAssign: number
    willWarn: number
    willBlock: number
    details: WhatIfProjectionDetail[]
}

export type NotificationType =
    | 'shift:assigned'
    | 'shift:updated'
    | 'shift:cancelled'
    | 'shift:published'
    | 'reminder:24h'
    | 'reminder:2h'
    | 'swap:created'
    | 'swap:approved'
    | 'swap:rejected'
    | 'overtime:warning'
    | 'availability:updated'

export type Notification = {
    id: string
    userId: string
    type: NotificationType
    message: string
    relatedEntityId?: string
    relatedEntityType?: string
    isRead: boolean
    createdAt: string
}

export type NotificationsResponse = {
    data: Notification[]
    count: number
}

export type Location = {
    id: string
    name: string
    address: string
    timezone: string
}

export type CalendarAssignmentUser = {
    id: string
    firstName: string
    lastName: string
    email: string
    role: 'ADMIN' | 'MANAGER' | 'STAFF'
}

export type CalendarAssignment = {
    id: string
    userId: string
    status: 'ASSIGNED' | 'PENDING_SWAP'
    user: CalendarAssignmentUser
}

export type CalendarShift = {
    id: string
    locationId: string
    title: string
    startTime: string
    endTime: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional: boolean
    eventInstanceId?: string | null
    status: ShiftStatus
    publishedAt?: string | null
    location: {
        id: string
        name: string
        timezone: string
    }
    requiredSkill: Skill
    assignments: CalendarAssignment[]
}

export type CalendarQuery = {
    startDate: string
    endDate: string
    locationId?: string
    title?: string
    assignedUserId?: string
    mine?: boolean
}

export type CalendarResponse = {
    data: CalendarShift[]
    count: number
}

export type EventTemplateScope = 'LOCATION' | 'MINISTRY'

export type EventTemplateRequirement = {
    id: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional: boolean
    sortOrder: number
    requiredSkill?: Skill
}

export type EventTemplate = {
    id: string
    title: string
    description?: string | null
    scope: EventTemplateScope
    locationId?: string | null
    dayOfWeek: number
    startTimeLocal: string
    endTimeLocal: string
    timezone: string
    isActive: boolean
    requirements: EventTemplateRequirement[]
    location?: {
        id: string
        name: string
        timezone: string
    } | null
    createdAt: string
    updatedAt: string
}

export type EventTemplateRequirementInput = {
    requiredSkillId: string
    headcountNeeded: number
    isOptional?: boolean
    sortOrder?: number
}

export type CreateEventTemplatePayload = {
    title: string
    description?: string
    scope: EventTemplateScope
    locationId?: string
    dayOfWeek: number
    startTimeLocal: string
    endTimeLocal: string
    requirements: EventTemplateRequirementInput[]
}

export type UpdateEventTemplatePayload = Partial<CreateEventTemplatePayload>

export type GenerateScheduleRequest = {
    startDate: string
    endDate: string
    locationIds?: string[]
    templateIds?: string[]
}

export type GeneratedShiftSummary = {
    shiftId: string
    templateId: string
    templateTitle: string
    scope: EventTemplateScope
    locationId: string
    locationName: string
    eventDate: string
    eventInstanceId: string
    requiredSkillId: string
    headcountNeeded: number
    isOptional: boolean
    startTime: string
    endTime: string
}

export type SkippedShiftSummary = Omit<GeneratedShiftSummary, 'shiftId'> & {
    reason: 'already_exists'
    existingShiftId: string
}

export type GenerateScheduleResponse = {
    summary: {
        createdCount: number
        skippedCount: number
        templatesProcessed: number
        locationsProcessed: number
        startDate: string
        endDate: string
    }
    created: GeneratedShiftSummary[]
    skipped: SkippedShiftSummary[]
}
