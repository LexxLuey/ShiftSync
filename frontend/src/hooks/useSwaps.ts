import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { swapService } from '@/lib/api/swaps'
import type {
  SwapRequest,
  GetSwapRequestsParams,
  CreateSwapRequestPayload,
  RejectSwapRequestPayload,
  ApproveSwapRequestPayload,
  GetEligibleSwapTargetsParams,
  EligibleSwapTarget,
} from '@/@types/swaps'

export default function useSwaps() {
  const queryClient = useQueryClient()

  const getSwapRequestsQuery = (params: GetSwapRequestsParams | null) => {
    return useQuery({
      queryKey: ['swaps', params],
      queryFn: () => swapService.getSwapRequests(params),
      enabled: Boolean(params),
    })
  }

  const getEligibleSwapTargetsQuery = (
    params: GetEligibleSwapTargetsParams | null
  ) => {
    return useQuery({
      queryKey: ['eligible-swap-targets', params],
      queryFn: () => swapService.getEligibleSwapTargets(params!),
      enabled: Boolean(params?.shiftId),
    })
  }

  const createSwapMutation = useMutation({
    mutationFn: ({ shiftId, payload }: { shiftId: string; payload: CreateSwapRequestPayload }) =>
      swapService.createSwapRequest(shiftId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] })
    },
  })

  const acceptSwapMutation = useMutation({
    mutationFn: (swapRequestId: string) => swapService.acceptSwapRequest(swapRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] })
    },
  })

  const rejectSwapMutation = useMutation({
    mutationFn: ({
      swapRequestId,
      payload,
    }: {
      swapRequestId: string
      payload: RejectSwapRequestPayload
    }) => swapService.rejectSwapRequest(swapRequestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] })
    },
  })

  const approveSwapMutation = useMutation({
    mutationFn: ({
      swapRequestId,
      payload,
    }: {
      swapRequestId: string
      payload: ApproveSwapRequestPayload
    }) => swapService.approveSwapRequest(swapRequestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const cancelSwapMutation = useMutation({
    mutationFn: (swapRequestId: string) => swapService.cancelSwapRequest(swapRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] })
    },
  })

  return {
    getSwapRequestsQuery,
    getEligibleSwapTargetsQuery,
    createSwapMutation,
    acceptSwapMutation,
    rejectSwapMutation,
    approveSwapMutation,
    cancelSwapMutation,
  }
}
