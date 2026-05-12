'use client'

import { useQuery } from '@tanstack/react-query'
import type { Skill } from '@/lib/api/types'
import { skillService } from '@/lib/api/skills'

export default function useSkills() {
    const skillsQuery = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            const response = await skillService.getSkills()
            return {
                skills: (response.data || []) as Skill[],
            }
        },
    })

    return skillsQuery
}
