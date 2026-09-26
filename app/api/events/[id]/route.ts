import { NextResponse } from 'next/server'
import { updateEvent, cancelEvent, getEventById } from '@/data/events'
import { getUserById } from '@/data/auth'
import { countActiveRegistrations } from '@/data/registrations'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const event = getEventById(params.id)
  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 },
    )
  }
  return NextResponse.json(
    { success: true, event },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    },
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { organizerId, ...updates } = body

    if (!organizerId) {
      return NextResponse.json(
        { success: false, error: 'organizerId is required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can edit events' },
        { status: 403 },
      )
    }

    const event = getEventById(params.id)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 },
      )
    }

    if (updates.capacity !== undefined) {
      const newCapacity = Number(updates.capacity)
      if (!Number.isInteger(newCapacity) || newCapacity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Capacity must be a positive integer',
            errors: [{ field: 'capacity', message: 'Capacity must be a positive integer' }],
          },
          { status: 400 },
        )
      }

      const activeCount = countActiveRegistrations(event.id)
      if (newCapacity < activeCount) {
        return NextResponse.json(
          {
            success: false,
            error: `Capacity can't be lower than the ${activeCount} students already registered.`,
            errors: [
              {
                field: 'capacity',
                message: `Capacity can't be lower than the ${activeCount} students already registered.`,
              },
            ],
          },
          { status: 400 },
        )
      }

      updates.capacity = newCapacity
    }

    const updatedEvent = updateEvent(params.id, organizerId, updates)
    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (err: any) {
    const message = err.message || 'Failed to update event'
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    let organizerId = ''
    const { searchParams } = new URL(request.url)
    organizerId = searchParams.get('organizerId') || ''

    if (!organizerId) {
      try {
        const body = await request.json()
        organizerId = body.organizerId || ''
      } catch {
        // No body
      }
    }

    if (!organizerId) {
      return NextResponse.json(
        { success: false, error: 'organizerId is required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can cancel events' },
        { status: 403 },
      )
    }

    const event = cancelEvent(params.id, organizerId)
    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    const message = err.message || 'Failed to cancel event'
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
