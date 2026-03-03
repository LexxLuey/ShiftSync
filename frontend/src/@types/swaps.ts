export type SwapType = 'SWAP' | 'DROP'
export type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'

export interface SwapRequest {
  id: string
  shiftId: string
  requestingUserId: string
  requestingUser: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  targetUserId?: string
  targetUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  shift: {
    id: string
    startTime: string
    endTime: string
    locationId: string
    location: {
      id: string
      name: string
      timezone: string
    }
    requiredSkill: {
      id: string
      name: string
    }
  }
  type: SwapType
  status: SwapStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface CreateSwapRequestPayload extends Record<string, unknown> {
  type: 'SWAP' | 'DROP'
  targetUserId?: string
}

export interface AcceptSwapRequestPayload {}

export interface RejectSwapRequestPayload extends Record<string, unknown> {
  reason?: string
}

export interface ApproveSwapRequestPayload extends Record<string, unknown> {
  reason?: string
}

export interface CancelSwapRequestPayload {}

export interface GetSwapRequestsParams {
  status?: SwapStatus
  userId?: string
  locationId?: string
  limit?: number
  offset?: number
}

export interface SwapListResponse {
  data: SwapRequest[]
  total: number
  hasMore: boolean
}

export interface EligibleSwapTarget {
  userId: string
  firstName: string
  lastName: string
  email: string
  available: boolean
  warnings?: {
    type: string
    severity: 'warning' | 'error'
    message: string
    details?: Record<string, unknown>
  }[]
}

export interface GetEligibleSwapTargetsParams {
  shiftId: string
  limit?: number
  search?: string
}

export interface SwapViolation {
  type: string
  severity: 'warning' | 'error'
  message: string
  details?: Record<string, unknown>
}

export interface ValidateSwapResponse {
  valid: boolean
  violations: SwapViolation[]
}
