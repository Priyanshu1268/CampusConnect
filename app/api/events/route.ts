import { NextResponse } from 'next/server'
import {
  events,
  isPastEvent,
  searchEventsByName,
  filterEventsByCategory,
  createEvent,
  EventCategory,
} from '@/data/events'
import { getUserById } from '@/data/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const upcomingOnly = searchParams.get('upcoming') !== 'false'
  const forStudent = searchParams.get('forStudent') !== 'false'
  const search = searchParams.get('search') || ''
  const category = (searchParams.get('category') || 'All') as EventCategory | 'All'

  let list = [...events]

  if (upcomingOnly) {
    list = list.filter((e) => !isPastEvent(e))
  }

  if (forStudent) {
    list = list.filter((e) => !e.cancelled)
  }

  if (search) {
    list = searchEventsByName(list, search)
  }

  if (category && category !== 'All') {
    list = filterEventsByCategory(list, category)
  }

  return NextResponse.json({ success: true, events: list })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, date, venue, category, capacity, organizerId } = body

    if (!organizerId) {
      return NextResponse.json(
        { success: false, error: 'organizerId is required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can create events' },
        { status: 403 },
      )
    }

    const event = createEvent({
      name,
      description: description || '',
      date,
      venue,
      category,
      capacity: Number(capacity),
      organizerId,
    })

    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create event' },
      { status: 400 },
    )
  }
}
