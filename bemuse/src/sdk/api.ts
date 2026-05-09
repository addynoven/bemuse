import {
  fromFetchResponse,
  fromFetchError,
  MSError,
} from './errors'

const API_BASE = '/api/music'

export interface Song {
  type: 'song'
  videoId: string
  title: string
  artist: string
  album?: string
  duration: number
  thumbnails: { url: string; width: number; height: number }[]
}

export interface LyricLine {
  time: number
  text: string
  words?: { time: number; text: string; duration?: number }[]
}

export interface Lyrics {
  plain: string
  synced: LyricLine[] | null
  source?: string
}

export interface Analysis {
  videoId: string
  duration: number
  tempo: {
    bpm: number
    confidence: number
    beatGrid: number[]
  }
  onsets: number[]
  key: {
    tonic: string
    mode: 'major' | 'minor'
    camelot: string
    confidence: number
  } | null
  energy: {
    overall: number
    envelope?: { t: number; rms: number }[]
  } | null
  sections: {
    start: number
    end: number
    label: string
    loudness: number
  }[] | null
  analyzedAt: string
}

export async function searchSongs(query: string, limit = 10): Promise<Song[]> {
  try {
    const res = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(query)}&filter=songs&limit=${limit}`
    )
    if (!res.ok) throw fromFetchResponse(res)
    const data = await res.json()
    if (!data.success) {
      throw new MSError({
        code: 'UNKNOWN',
        userMessage: data.message ?? 'Search failed',
        action: 'Retry',
      })
    }
    return data.data.songs || data.data
  } catch (err) {
    throw fromFetchError(err)
  }
}

export async function getLyrics(videoId: string): Promise<Lyrics | null> {
  try {
    const res = await fetch(`${API_BASE}/lyrics/${videoId}`)
    if (!res.ok) {
      // 404 means the server has no lyrics entry — treat as "no lyrics found"
      // rather than an error so callers can still play the song with a fallback chart.
      if (res.status === 404) return null
      throw fromFetchResponse(res)
    }
    const data = await res.json()
    if (!data.success) return null
    return data.data
  } catch (err) {
    throw fromFetchError(err)
  }
}

export function getProxyUrl(videoId: string): string {
  return `${API_BASE}/proxy/${videoId}`
}

export async function getTrack(videoId: string) {
  try {
    const res = await fetch(`${API_BASE}/track/${videoId}`)
    if (!res.ok) throw fromFetchResponse(res)
    const data = await res.json()
    if (!data.success) {
      throw new MSError({
        code: 'UNKNOWN',
        userMessage: data.message ?? 'Request failed',
        action: 'Retry',
      })
    }
    return data.data
  } catch (err) {
    throw fromFetchError(err)
  }
}

export async function getAnalysis(videoId: string): Promise<Analysis | null> {
  try {
    const res = await fetch(`${API_BASE}/analyze/${videoId}`)
    if (!res.ok) {
      // 408 = timeout — partial result might still be useful, but for now
      // treat as "no analysis" so the game can fall back to guessing.
      if (res.status === 408) return null
      throw fromFetchResponse(res)
    }
    const data = await res.json()
    if (!data.success) return null
    return data.data as Analysis
  } catch (err) {
    throw fromFetchError(err)
  }
}
