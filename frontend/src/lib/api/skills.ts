import { apiClient } from './client'
import type { Skill } from './types'

type SkillsResponse = {
    data: Skill[]
    count: number
}

type SkillResponse = {
    data: Skill
}

export type CreateSkillPayload = {
    name: string
}

export type UpdateSkillPayload = {
    name: string
}

export const skillService = {
    getSkills() {
        return apiClient.get<SkillsResponse>('/skills')
    },
    createSkill(payload: CreateSkillPayload) {
        return apiClient.post<SkillResponse, CreateSkillPayload>('/skills', payload)
    },
    updateSkill(skillId: string, payload: UpdateSkillPayload) {
        return apiClient.patch<SkillResponse, UpdateSkillPayload>(
            `/skills/${skillId}`,
            payload,
        )
    },
    deleteSkill(skillId: string) {
        return apiClient.del<SkillResponse>(`/skills/${skillId}`)
    },
}
