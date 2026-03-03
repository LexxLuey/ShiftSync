import { apiClient } from './client'
import type {
  SwapRequest,
  SwapListResponse,
  CreateSwapRequestPayload,
  GetSwapRequestsParams,
  GetEligibleSwapTargetsParams,
  EligibleSwapTarget,
  ValidateSwapResponse,
  ApproveSwapRequestPayload,
  RejectSwapRequestPayload,
} from '@/@types/swaps'

export const swapService = {
  async getSwapRequests(params: GetSwapRequestsParams | null) {
    if (!params?.locationId && !params?.userId) {
      return { data: [], total: 0, hasMore: false } as SwapListResponse
    }

    const queryParams: Record<string, any> = {}
    if (params.status) queryParams.status = params.status
    if (params.limit) queryParams.limit = params.limit
    if (params.offset) queryParams.offset = params.offset

    return apiClient.get<SwapListResponse>('/swap-requests', {
      params: queryParams,
    })
  },

  async createSwapRequest(shiftId: string, payload: CreateSwapRequestPayload) {
    return apiClient.post<SwapRequest>(
      `/shifts/${shiftId}/swap-requests`,
      payload
    )
  },

  async acceptSwapRequest(swapRequestId: string) {
    return apiClient.post<SwapRequest>(
      `/swap-requests/${swapRequestId}/accept`,
      {}
    )
  },

  async rejectSwapRequest(
    swapRequestId: string,
    payload: RejectSwapRequestPayload
  ) {
    return apiClient.post<SwapRequest>(
      `/swap-requests/${swapRequestId}/reject`,
      payload
    )
  },

  async approveSwapRequest(
    swapRequestId: string,
    payload: ApproveSwapRequestPayload
  ) {
    return apiClient.post<SwapRequest>(
      `/swap-requests/${swapRequestId}/approve`,
      payload
    )
  },

  async cancelSwapRequest(swapRequestId: string) {
    return apiClient.post<SwapRequest>(
      `/swap-requests/${swapRequestId}/cancel`,
      {}
    )
  },

  async getEligibleSwapTargets(params: GetEligibleSwapTargetsParams) {
    return apiClient.get<EligibleSwapTarget[]>(
      `/shifts/${params.shiftId}/eligible-swap-targets`,
      {
        params: {
          limit: params.limit,
          search: params.search,
        },
      }
    )
  },

  async validateSwapRequest(shiftId: string, payload: CreateSwapRequestPayload) {
    return apiClient.post<ValidateSwapResponse>(
      `/shifts/${shiftId}/swap-requests/validate`,
      payload
    )
  },
}
