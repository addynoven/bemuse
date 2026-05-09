const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export interface ParsedYouTube {
  videoId: string
  startSeconds?: number
  playlistId?: string
}

export function isValidVideoId(id: string): boolean {
  return VIDEO_ID_RE.test(id)
}

function parseStartSeconds(t: string): number | undefined {
  const simple = /^(\d+)s?$/.exec(t)
  if (simple) {
    const n = parseInt(simple[1], 10)
    return isNaN(n) ? undefined : n
  }

  const compound = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t)
  if (!compound) return undefined
  if (!compound[1] && !compound[2] && !compound[3]) return undefined

  const hours = compound[1] ? parseInt(compound[1], 10) : 0
  const minutes = compound[2] ? parseInt(compound[2], 10) : 0
  const seconds = compound[3] ? parseInt(compound[3], 10) : 0

  return hours * 3600 + minutes * 60 + seconds
}

function parseFromUrl(raw: string): ParsedYouTube | null {
  let normalized = raw.trim()

  // Allow protocol-less inputs like "youtu.be/abc" or "youtube.com/watch?v=abc".
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized
  }

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const isYouTube =
    host === 'www.youtube.com' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  const isShortUrl = host === 'youtu.be'

  if (!isYouTube && !isShortUrl) return null

  let videoId: string | null = null

  if (isShortUrl) {
    videoId = url.pathname.replace(/^\//, '').split('/')[0]
  } else {
    const path = url.pathname

    if (path.startsWith('/watch')) {
      videoId = url.searchParams.get('v')
    } else if (path.startsWith('/shorts/')) {
      videoId = path.replace('/shorts/', '').split('/')[0]
    } else if (path.startsWith('/embed/')) {
      videoId = path.replace('/embed/', '').split('/')[0]
    }
  }

  if (!videoId || !isValidVideoId(videoId)) return null

  const result: ParsedYouTube = { videoId }

  const t = url.searchParams.get('t')
  if (t) {
    const startSeconds = parseStartSeconds(t)
    if (startSeconds !== undefined) result.startSeconds = startSeconds
  }

  const list = url.searchParams.get('list')
  if (list) result.playlistId = list

  return result
}

export function parseYouTubeUrl(input: string): ParsedYouTube | null {
  const trimmed = input.trim()
  if (isValidVideoId(trimmed)) {
    return { videoId: trimmed }
  }
  return parseFromUrl(trimmed)
}

export function extractVideoId(input: string): string | null {
  const parsed = parseYouTubeUrl(input)
  return parsed ? parsed.videoId : null
}
