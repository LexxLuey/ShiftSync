import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import { ReactNode } from 'react'
import AuthGate from '@/components/auth/AuthGate'

const Layout = ({ children }: { children: ReactNode }) => {
    return (
        <AuthGate mode="protected">
            <PostLoginLayout>{children}</PostLoginLayout>
        </AuthGate>
    )
}

export default Layout
