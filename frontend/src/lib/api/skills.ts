import { apiClient } from './client'
import type { Skill } from './types'

type SkillsResponse = {
    data: Skill[]
    count: number
}

export const skillService = {
    getSkills() {
        return apiClient.get<SkillsResponse>('/skills')
    },
}
