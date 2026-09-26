export interface StoreData {
  users?: any[]
  events?: any[]
  registrations?: any[]
}

function getFs(): any {
  if (typeof window !== 'undefined') return null
  try {
    return eval('require')('fs')
  } catch {
    return null
  }
}

function getStorePath(): string {
  if (typeof window !== 'undefined') return ''
  try {
    const path = eval('require')('path')
    return path.join(process.cwd(), 'data', '.campus_data.json')
  } catch {
    return ''
  }
}

export function loadStoreArray<T>(key: keyof StoreData, fallback: T[]): T[] {
  if (
    typeof window !== 'undefined' ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST
  ) {
    return [...fallback]
  }

  const fs = getFs()
  const storePath = getStorePath()
  if (!fs || !storePath) return [...fallback]

  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf-8')
      const parsed: StoreData = JSON.parse(raw)
      if (parsed && Array.isArray(parsed[key]) && parsed[key]!.length > 0) {
        return parsed[key] as T[]
      }
    }
  } catch (err) {
    // If read/parse fails, return fallback
  }
  return [...fallback]
}

export function saveStoreArray<T>(key: keyof StoreData, data: T[]): void {
  if (
    typeof window !== 'undefined' ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST
  ) {
    return
  }

  const fs = getFs()
  const storePath = getStorePath()
  if (!fs || !storePath) return

  try {
    let currentStore: StoreData = {}
    if (fs.existsSync(storePath)) {
      try {
        const raw = fs.readFileSync(storePath, 'utf-8')
        currentStore = JSON.parse(raw) || {}
      } catch {
        currentStore = {}
      }
    }
    currentStore[key] = data
    fs.writeFileSync(storePath, JSON.stringify(currentStore, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save to campus storage:', err)
  }
}
