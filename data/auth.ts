export type UserRole = 'student' | 'organizer'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  password?: string
}

export type SafeUser = Omit<AppUser, 'password'>

export const users: AppUser[] = [
  {
    id: 'stu-1',
    name: 'Aditi Rao',
    email: 'student@campus.edu',
    password: 'student123',
    role: 'student',
  },
  {
    id: 'org-1',
    name: 'Rohan Verma',
    email: 'organizer@campus.edu',
    password: 'organizer123',
    role: 'organizer',
  },
]

export function getUserById(id: string): AppUser | undefined {
  return users.find((user) => user.id === id)
}

export function getUserByEmail(email: string): AppUser | undefined {
  return users.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
  )
}

export function getSafeUser(user: AppUser): SafeUser {
  const { password, ...safe } = user
  return safe
}

export function authenticateUser(
  emailOrId: string,
  password: string,
): SafeUser | null {
  const clean = emailOrId.trim().toLowerCase()
  const user = users.find(
    (u) =>
      u.id.toLowerCase() === clean || u.email.toLowerCase() === clean,
  )

  if (!user || user.password !== password) {
    return null
  }

  return getSafeUser(user)
}

export function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserRole,
): SafeUser {
  const cleanEmail = email.trim().toLowerCase()
  if (!name.trim()) throw new Error('Name is required')
  if (!cleanEmail) throw new Error('Email is required')
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters')
  }

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists')
  }

  const prefix = role === 'student' ? 'stu' : 'org'
  const newId = `${prefix}-${Date.now().toString(36)}`
  const newUser: AppUser = {
    id: newId,
    name: name.trim(),
    email: cleanEmail,
    password,
    role,
  }

  users.push(newUser)
  return getSafeUser(newUser)
}
