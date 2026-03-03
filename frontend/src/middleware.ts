import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export default function middleware(_request: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
}
