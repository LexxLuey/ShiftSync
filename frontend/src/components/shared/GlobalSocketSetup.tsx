'use client'

import useSocketEvents from '@/hooks/useSocketEvents'

export default function GlobalSocketSetup() {
    // Initialize socket events globally
    useSocketEvents()

    return null
}
