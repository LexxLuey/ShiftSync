'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Skill } from '@/lib/api/types'
import {
    skillService,
    type CreateSkillPayload,
    type UpdateSkillPayload,
} from '@/lib/api/skills'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useSkills() {
    const queryClient = useQueryClient()

    const skillsQuery = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            const response = await skillService.getSkills()
            const skills = Array.isArray(response.data)
                ? (response.data as Skill[])
                : []

            return {
                skills,
            }
        },
    })

    const createSkillMutation = useMutation<
        { data: Skill },
        NormalizedApiError,
        CreateSkillPayload
    >({
        mutationFn: (payload) => skillService.createSkill(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] })
        },
    })

    const updateSkillMutation = useMutation<
        { data: Skill },
        NormalizedApiError,
        { skillId: string; payload: UpdateSkillPayload }
    >({
        mutationFn: ({ skillId, payload }) =>
            skillService.updateSkill(skillId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] })
        },
    })

    const deleteSkillMutation = useMutation<
        { data: Skill },
        NormalizedApiError,
        string
    >({
        mutationFn: (skillId) => skillService.deleteSkill(skillId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] })
        },
    })

    return {
        ...skillsQuery,
        createSkillMutation,
        updateSkillMutation,
        deleteSkillMutation,
    }
}
