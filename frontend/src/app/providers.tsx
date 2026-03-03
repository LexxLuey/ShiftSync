'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import GlobalSocketSetup from '@/components/shared/GlobalSocketSetup'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false
      }
    }
  }))

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalSocketSetup />
        {children}
      </QueryClientProvider>
    </AuthProvider>
  )
}
