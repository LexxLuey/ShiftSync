import { ReactNode } from 'react'
import Side from '@/components/layouts/AuthLayout/Side'
import AuthGate from '@/components/auth/AuthGate'
// import Split from '@/components/layouts/AuthLayout/Split'
// import Simple from '@/components/layouts/AuthLayout/Simple'

const Layout = ({ children }: { children: ReactNode }) => {
    return (
        <div className="flex flex-auto flex-col h-[100vh]">
            <AuthGate mode="guest">
                <Side>{children}</Side>
            </AuthGate>
        </div>
    )
}

export default Layout
