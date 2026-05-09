const API_BASE = process.env.MUSICSTREAM_API_URL || '/api'

interface LyricLine {
  time: number
  text: string
}

interface TrackInfo {
  title: string
  artist: string
  duration: number
  thumbnail?: string
}

export async function loadFromMusicStream(videoId: string): Promise<{
  bmson: any
  track: TrackInfo
  lyrics: LyricLine[]
}> {
  const [trackRes, lyricsRes] = await Promise.all([
    fetch(`${API_BASE}/music/track/${videoId}`),
    fetch(`${API_BASE}/music/lyrics/${videoId}`),
  ])

  if (!trackRes.ok) {
    throw new Error(
      `Failed to fetch track: ${trackRes.status} ${trackRes.statusText}`
    )
  }
  if (!lyricsRes.ok) {
    throw new Error(
      `Failed to fetch lyrics: ${lyricsRes.status} ${lyricsRes.statusText}`
    )
  }

  const trackData = await trackRes.json()
  const lyricsData = await lyricsRes.json()

  const track: TrackInfo = {
    title: trackData.data?.title || 'Unknown',
    artist: trackData.data?.artist || 'Unknown',
    duration: trackData.data?.duration || 180,
    thumbnail: trackData.data?.thumbnail,
  }

  const lyrics: LyricLine[] = lyricsData.data?.synced || []

  // Build bmson structure from lyrics
  const bmson = generateBmson(track, lyrics)

  return { bmson, track, lyrics }
}

function generateBmson(track: TrackInfo, lyrics: LyricLine[]): any {
  const PPQN = 240 // Pulses Per Quarter Note
  const BPM = 60 // BPM=60 so that 1 beat = 1 second, making time calc simple

  // Filter out lyrics without valid time and sort by time
  const validLyrics = lyrics
    .filter((l) => typeof l.time === 'number' && !isNaN(l.time))
    .sort((a, b) => a.time - b.time)

  // Ensure we have at least a dummy note at time 0 so keysoundStart accumulates correctly
  const allNotes: LyricLine[] =
    validLyrics.length > 0 && validLyrics[0].time > 0
      ? [{ time: 0, text: '' }, ...validLyrics]
      : validLyrics

  if (allNotes.length === 0) {
    allNotes.push({ time: 0, text: 'No lyrics' })
    allNotes.push({ time: 5, text: '' })
  }

  // Map notes to bmson note format
  // y = time * BPM * PPQN / 60 = time * 60 * 240 / 60 = time * 240
  const bmsonNotes = allNotes.map((line, i) => {
    const y = Math.floor(line.time * 240)
    const isDummy = i === 0 && line.text === ''
    // Dummy note at x=0 = auto-keysound (non-playable, starts the song)
    // Real notes at lanes 1-7
    const lane = isDummy ? 0 : ((i - 1) % 7) + 1
    return {
      x: lane,
      y: y,
      l: 0,
      c: i > 0, // c=true for all except first (accumulate keysoundStart)
    }
  })

  // Remove duplicate y positions (bmson notes at same position can conflict)
  const uniqueNotes = bmsonNotes.filter(
    (note, i, arr) => i === 0 || note.y !== arr[i - 1].y
  )

  const durationY = Math.floor(track.duration * 240)

  return {
    version: '1.0.0',
    info: {
      title: track.title,
      artist: track.artist,
      genre: 'Auto-generated',
      chart_name: 'MusicStream Auto',
      level: 1,
      init_bpm: BPM,
      mode_hint: 'beat-7k',
      resolution: PPQN,
    },
    lines: [{ y: 0 }, { y: durationY }],
    bpm_events: [{ y: 0, bpm: BPM }],
    // Single sound channel: all notes share the same audio file
    // keysoundStart accumulates to each note's song time because c=true
    sound_channels: [
      {
        name: 'audio.mp3',
        notes: uniqueNotes,
      },
    ],
    bga: {
      bga_header: [],
      bga_events: [],
      layer_events: [],
      poor_events: [],
    },
  }
}
