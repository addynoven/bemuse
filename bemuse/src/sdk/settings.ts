const STORAGE_KEY = 'musicstream.settings'
const MAX_RECENT = 20
const DEFAULT_DIFFICULTY_VALUE: Difficulty = 'normal'
const DEFAULT_SPEED_VALUE = 1.0

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface RecentSong {
  videoId: string
  title: string
  artist: string
  thumbnail?: string
  playedAt: number
}

export interface MusicStreamSettings {
  version: 1
  recentSongs: RecentSong[]
  favoriteSongs: string[]
  defaultDifficulty: Difficulty
  defaultSpeed: number
}

export const DEFAULT_SETTINGS: MusicStreamSettings = {
  version: 1,
  recentSongs: [],
  favoriteSongs: [],
  defaultDifficulty: DEFAULT_DIFFICULTY_VALUE,
  defaultSpeed: DEFAULT_SPEED_VALUE,
}

function isValidDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard' || value === 'expert'
}

function isValidSettings(parsed: unknown): parsed is MusicStreamSettings {
  if (typeof parsed !== 'object' || parsed === null) return false
  const s = parsed as Record<string, unknown>
  if (s['version'] !== 1) return false
  if (!Array.isArray(s['recentSongs'])) return false
  if (!Array.isArray(s['favoriteSongs'])) return false
  if (!isValidDifficulty(s['defaultDifficulty'])) return false
  if (typeof s['defaultSpeed'] !== 'number') return false
  return true
}

export function loadSettings(): MusicStreamSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidSettings(parsed)) return { ...DEFAULT_SETTINGS }
    return parsed
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function persist(settings: MusicStreamSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

export function getRecentSongs(): RecentSong[] {
  return loadSettings().recentSongs
}

export function getFavoriteSongs(): string[] {
  return loadSettings().favoriteSongs
}

export function isFavorite(videoId: string): boolean {
  return loadSettings().favoriteSongs.includes(videoId)
}

export function getDefaultDifficulty(): Difficulty {
  return loadSettings().defaultDifficulty
}

export function getDefaultSpeed(): number {
  return loadSettings().defaultSpeed
}

export function saveSettings(s: Partial<MusicStreamSettings>): void {
  const current = loadSettings()
  persist({ ...current, ...s, version: 1 })
}

export function addRecentSong(song: RecentSong): void {
  const settings = loadSettings()
  const filtered = settings.recentSongs.filter((r) => r.videoId !== song.videoId)
  const updated = [song, ...filtered].slice(0, MAX_RECENT)
  persist({ ...settings, recentSongs: updated })
}

export function clearRecentSongs(): void {
  const settings = loadSettings()
  persist({ ...settings, recentSongs: [] })
}

export function toggleFavorite(videoId: string): boolean {
  const settings = loadSettings()
  const exists = settings.favoriteSongs.includes(videoId)
  const updated = exists
    ? settings.favoriteSongs.filter((id) => id !== videoId)
    : [...settings.favoriteSongs, videoId]
  persist({ ...settings, favoriteSongs: updated })
  return !exists
}

export function setDefaultDifficulty(d: Difficulty): void {
  const settings = loadSettings()
  persist({ ...settings, defaultDifficulty: d })
}

export function setDefaultSpeed(speed: number): void {
  const clamped = Math.min(2.0, Math.max(0.5, speed))
  const settings = loadSettings()
  persist({ ...settings, defaultSpeed: clamped })
}

export function exportSettings(): string {
  return JSON.stringify(loadSettings())
}

export function importSettings(json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isValidSettings(parsed)) return false
    persist(parsed)
    return true
  } catch {
    return false
  }
}
