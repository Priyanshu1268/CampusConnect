import { NextResponse } from 'next/server'
import { authenticateUser, registerUser } from '@/data/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'login') {
      const { emailOrId, password } = body
      if (!emailOrId || !password) {
        return NextResponse.json(
          { success: false, error: 'Email/ID and password are required' },
          { status: 400 },
        )
      }

      const user = authenticateUser(emailOrId, password)
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid email/ID or password' },
          { status: 401 },
        )
      }

      return NextResponse.json({ success: true, user })
    }

    if (action === 'register') {
      const { name, email, password, role } = body
      if (!role || (role !== 'student' && role !== 'organizer')) {
        return NextResponse.json(
          { success: false, error: 'Role must be student or organizer' },
          { status: 400 },
        )
      }

      const user = registerUser(name, email, password, role)
      return NextResponse.json({ success: true, user }, { status: 201 })
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 },
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication error' },
      { status: 400 },
    )
  }
}
