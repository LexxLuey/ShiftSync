'use client'

import { useQuery } from '@tanstack/react-query'
import type { Skill } from '@/lib/api/types'

// Temporary: Return mock skills - in Phase 3 we'll add a proper skills endpoint
export default function useSkills() {
    const skillsQuery = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            return {
                skills: [
                    { id: 'skill-1', name: 'Bartender' },
                    { id: 'skill-2', name: 'Server' },
                    { id: 'skill-3', name: 'Line Cook' },
                    { id: 'skill-4', name: 'Host' },
                ] as Skill[],
            }
        },
    })

    return skillsQuery
}
