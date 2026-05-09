import type { LyricLine, Analysis } from './api'

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface ChartGenOptions {
  title: string
  artist: string
  duration: number
  lines: LyricLine[]
  difficulty: Difficulty
  analysis?: Analysis | null
}

export interface GeneratedChart {
  bmson: string
  title: string
  artist: string
  duration: number
  bpm: number
  difficulty: Difficulty
  noteCount: number
}

const DEFAULT_BPM = 120
const RESOLUTION = 240
const LANE_COUNT = 7
const MIN_NOTE_GAP_MS = 50
const MIN_LN_DURATION_SEC = 0.25
const LN_SPRINKLE_MIN_SEC = 0.5
const MAX_LN_DURATION_SEC = 4.0

interface RawNote {
  x: number
  y: number
  l?: number // length in pulses; undefined / 0 = tap, > 0 = long note
}

function toPulse(timeSec: number, bpm: number): number {
  return Math.round((timeSec * bpm * RESOLUTION) / 60)
}

function durationToPulses(durationSec: number, bpm: number): number {
  return Math.round((durationSec * bpm * RESOLUTION) / 60)
}

// Per-lane gap enforcement that respects long-note end positions so a tap
// can't drop on top of an in-progress hold.
function dedupeByLane(notes: RawNote[], bpm: number): RawNote[] {
  const lastEndPulseByLane = new Map<number, number>()
  const minGapPulses = Math.round(((MIN_NOTE_GAP_MS / 1000) * bpm * RESOLUTION) / 60)
  const sorted = notes.slice().sort((a, b) => a.y - b.y || a.x - b.x)
  const result: RawNote[] = []

  for (const note of sorted) {
    const lastEnd = lastEndPulseByLane.get(note.x) ?? -Infinity
    if (note.y - lastEnd >= minGapPulses) {
      result.push(note)
      const endPulse = note.y + (note.l ?? 0)
      lastEndPulseByLane.set(note.x, endPulse)
    }
  }

  return result
}

function makeJack(lane: number, count: number, baseTimeSec: number, gapSec: number, bpm: number): RawNote[] {
  const notes: RawNote[] = []
  for (let i = 0; i < count; i++) {
    notes.push({ x: lane, y: toPulse(baseTimeSec + i * gapSec, bpm) })
  }
  return notes
}

export function makeStream(lanes: number[], baseTimeSec: number, gapSec: number, bpm: number): RawNote[] {
  return lanes.map((lane, i) => ({ x: lane, y: toPulse(baseTimeSec + i * gapSec, bpm) }))
}

function makeChord(lanes: number[], timeSec: number, bpm: number): RawNote[] {
  const pulse = toPulse(timeSec, bpm)
  return lanes.map((lane) => ({ x: lane, y: pulse }))
}

function makeStaircase(
  startLane: number,
  endLane: number,
  baseTimeSec: number,
  gapSec: number,
  bpm: number
): RawNote[] {
  const notes: RawNote[] = []
  const step = startLane <= endLane ? 1 : -1
  let t = baseTimeSec
  for (let lane = startLane; lane !== endLane + step; lane += step) {
    notes.push({ x: lane, y: toPulse(t, bpm) })
    t += gapSec
  }
  return notes
}

export function makeTrill(
  laneA: number,
  laneB: number,
  count: number,
  baseTimeSec: number,
  gapSec: number,
  bpm: number
): RawNote[] {
  const notes: RawNote[] = []
  for (let i = 0; i < count; i++) {
    notes.push({ x: i % 2 === 0 ? laneA : laneB, y: toPulse(baseTimeSec + i * gapSec, bpm) })
  }
  return notes
}

export function makeRoll(
  startLane: number,
  descendingLanes: number[],
  baseTimeSec: number,
  gapSec: number,
  bpm: number
): RawNote[] {
  const lanes = [startLane, ...descendingLanes]
  return lanes.map((lane, i) => ({ x: lane, y: toPulse(baseTimeSec + i * gapSec, bpm) }))
}

export function makeHold(lane: number, timeSec: number, durationSec: number, bpm: number): RawNote {
  return { x: lane, y: toPulse(timeSec, bpm), l: durationToPulses(durationSec, bpm) }
}

function laneForIndex(i: number): number {
  return (i % LANE_COUNT) + 1
}

function isEmphasized(text: string): boolean {
  const trimmed = text.trim()
  return trimmed === trimmed.toUpperCase() || trimmed.endsWith('!')
}

function tokenize(
  line: LyricLine
): { time: number; text: string; duration?: number }[] {
  if (line.words && line.words.length > 0) {
    return line.words.map((w) => ({ time: w.time, text: w.text, duration: w.duration }))
  }
  const parts = line.text.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return [{ time: line.time, text: line.text }]
  // No word-level timing: spread tokens across an estimated 1s window.
  const approxDuration = 1.0
  return parts.map((text, i) => ({
    time: line.time + (i / parts.length) * approxDuration,
    text,
  }))
}

// Hard/expert without word timing: synthesize denser tokens to hit per-tier
// density targets. `seed` keeps the per-line count deterministic across renders.
function tokenizeFallback(
  line: LyricLine,
  minTokens: number,
  maxTokens: number,
  seed: number
): { time: number; text: string }[] {
  const parts = line.text.trim().split(/\s+/).filter(Boolean)
  const range = maxTokens - minTokens + 1
  const count = minTokens + (seed % range)
  const base = parts.length > 0 ? parts : ['x']
  const spread = 1.5
  const result: { time: number; text: string }[] = []
  for (let i = 0; i < count; i++) {
    result.push({
      time: line.time + (i / count) * spread,
      text: base[i % base.length],
    })
  }
  return result
}

// Compute the playable duration of a lyric line from its word timings.
// Returns undefined when no usable duration info is available.
function lineDurationFromWords(line: LyricLine): number | undefined {
  if (!line.words || line.words.length === 0) return undefined
  const last = line.words[line.words.length - 1]
  const lastEnd = last.duration !== undefined
    ? last.time + last.duration
    : last.time
  const dur = lastEnd - line.time
  if (dur < MIN_LN_DURATION_SEC) return undefined
  return Math.min(dur, MAX_LN_DURATION_SEC)
}

function generateEasy(lines: LyricLine[], bpm: number): RawNote[] {
  return lines.map((line, i) => {
    const lane = laneForIndex(i)
    const dur = lineDurationFromWords(line)
    if (dur !== undefined) {
      return makeHold(lane, line.time, dur, bpm)
    }
    return { x: lane, y: toPulse(line.time, bpm) }
  })
}

function generateNormal(lines: LyricLine[], bpm: number): RawNote[] {
  const notes: RawNote[] = []
  let laneCounter = 0

  for (const line of lines) {
    const primaryLane = laneForIndex(laneCounter++)
    const dur = lineDurationFromWords(line)

    if (dur !== undefined) {
      notes.push(makeHold(primaryLane, line.time, dur, bpm))
    } else {
      notes.push({ x: primaryLane, y: toPulse(line.time, bpm) })
    }

    if (isEmphasized(line.text)) {
      const chordLane = laneForIndex(laneCounter++)
      if (chordLane !== primaryLane) {
        if (dur !== undefined) {
          notes.push(makeHold(chordLane, line.time, dur, bpm))
        } else {
          notes.push({ x: chordLane, y: toPulse(line.time, bpm) })
        }
      }
    }

    if (line.words) {
      for (const word of line.words) {
        if (isEmphasized(word.text) && word.time > line.time + 0.05) {
          const extraLane = laneForIndex(laneCounter++)
          notes.push({ x: extraLane, y: toPulse(word.time, bpm) })
        }
      }
    }
  }

  return notes
}

function generateHard(lines: LyricLine[], bpm: number): RawNote[] {
  const notes: RawNote[] = []
  let laneCounter = 0

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const hasWordTiming = !!(line.words && line.words.length > 0)
    const rawTokens = hasWordTiming
      ? tokenize(line)
      : tokenizeFallback(line, 4, 8, li * 7 + 3)

    for (let ti = 0; ti < rawTokens.length; ti++) {
      const token = rawTokens[ti]
      const lane = laneForIndex(laneCounter++)

      const dur = (token as { duration?: number }).duration
      if (dur !== undefined && dur >= MIN_LN_DURATION_SEC) {
        notes.push(makeHold(lane, token.time, dur, bpm))
      } else {
        notes.push({ x: lane, y: toPulse(token.time, bpm) })
      }

      const next = rawTokens[ti + 1]
      if (next && next.time - token.time <= 0.3) {
        const streamLane = laneForIndex(laneCounter++)
        notes.push({ x: streamLane, y: toPulse(next.time, bpm) })
        ti++
      }
    }
  }

  return notes
}

function generateExpert(lines: LyricLine[], bpm: number): RawNote[] {
  const notes: RawNote[] = []
  let laneCounter = 0

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const hasWordTiming = !!(line.words && line.words.length > 0)
    const rawTokens = hasWordTiming
      ? tokenize(line)
      : tokenizeFallback(line, 8, 12, li * 11 + 5)

    const phraseStart = li % 4 === 0
    if (phraseStart && rawTokens.length > 0) {
      const splashLanes = [laneForIndex(laneCounter), laneForIndex(laneCounter + 1)]
      laneCounter += 2
      notes.push(...makeChord(splashLanes, rawTokens[0].time, bpm))
    }

    // Roll detection: 4+ tokens within 0.5s — descending lane sweep.
    if (rawTokens.length >= 4) {
      const clusterEnd = rawTokens[0].time + 0.5
      const clusterCount = rawTokens.filter((t) => t.time <= clusterEnd).length
      if (clusterCount >= 4) {
        const gap = 0.5 / clusterCount
        const rollStart = laneForIndex(laneCounter)
        const rollExtra: number[] = []
        for (let k = 1; k < clusterCount; k++) {
          rollExtra.push(laneForIndex(laneCounter + k))
        }
        laneCounter += clusterCount
        notes.push(...makeRoll(rollStart, rollExtra, rawTokens[0].time, gap, bpm))
        for (let ti = clusterCount; ti < rawTokens.length; ti++) {
          const token = rawTokens[ti]
          const lane = laneForIndex(laneCounter++)
          notes.push({ x: lane, y: toPulse(token.time, bpm) })
        }
        continue
      }
    }

    for (let ti = 0; ti < rawTokens.length; ti++) {
      const token = rawTokens[ti]
      const dur = (token as { duration?: number }).duration

      const isLongNote = dur !== undefined && dur >= LN_SPRINKLE_MIN_SEC
      const lane = laneForIndex(laneCounter++)

      if (isLongNote && dur !== undefined) {
        notes.push(makeHold(lane, token.time, dur, bpm))

        // Sprinkles: short tokens that fall within the hold land on other lanes,
        // testing the player's ability to hold + tap simultaneously.
        const holdEnd = token.time + dur
        const sprinkleTokens: typeof rawTokens = []
        while (ti + 1 < rawTokens.length && rawTokens[ti + 1].time < holdEnd) {
          ti++
          sprinkleTokens.push(rawTokens[ti])
        }
        for (const st of sprinkleTokens) {
          const sprinkleLane = laneForIndex(laneCounter++)
          if (sprinkleLane !== lane) {
            notes.push({ x: sprinkleLane, y: toPulse(st.time, bpm) })
          }
        }
        continue
      }

      if (dur !== undefined && dur >= MIN_LN_DURATION_SEC) {
        notes.push(makeHold(lane, token.time, dur, bpm))
        continue
      }

      notes.push({ x: lane, y: toPulse(token.time, bpm) })

      const next = rawTokens[ti + 1]
      const withinStream = !!next && next.time - token.time <= 0.3
      const fastCluster = !!next && next.time - token.time <= 0.1

      if (fastCluster && next) {
        const trillLaneB = laneForIndex(laneCounter++)
        const gap = next.time - token.time
        notes.push(...makeTrill(lane, trillLaneB, 4, token.time, gap / 4, bpm))
        ti++
      } else if (withinStream && next) {
        const gapSec = next.time - token.time
        const startLane = laneForIndex(laneCounter)
        const endLane = laneForIndex(laneCounter + 2)
        notes.push(...makeStaircase(startLane, endLane, token.time + gapSec / 3, gapSec / 3, bpm))
        laneCounter += 3
        ti++
      }

      if (
        ti + 1 < rawTokens.length &&
        rawTokens[ti + 1].text.toLowerCase() === token.text.toLowerCase()
      ) {
        const gapSec = rawTokens[ti + 1].time - token.time
        if (gapSec > 0.05) {
          notes.push(...makeJack(lane, 2, token.time, gapSec, bpm))
          ti++
        }
      }
    }
  }

  return notes
}

const FALLBACK_NOTES_PER_MIN: Record<Difficulty, number> = {
  easy: 20,
  normal: 40,
  hard: 80,
  expert: 150,
}

function generateFallback(duration: number, difficulty: Difficulty, bpm: number): RawNote[] {
  const notesPerMin = FALLBACK_NOTES_PER_MIN[difficulty]
  const totalNotes = Math.max(1, Math.round((duration / 60) * notesPerMin))
  const interval = duration / (totalNotes + 1)
  const notes: RawNote[] = []
  for (let i = 1; i <= totalNotes; i++) {
    const t = i * interval
    notes.push({ x: laneForIndex(i - 1), y: toPulse(t, bpm) })
  }
  return notes
}

function buildBmson(
  title: string,
  artist: string,
  difficulty: Difficulty,
  rawNotes: RawNote[],
  bpm: number
): { json: string; noteCount: number } {
  const safe = dedupeByLane(rawNotes, bpm)
  const levelMap: Record<Difficulty, number> = { easy: 1, normal: 4, hard: 7, expert: 10 }

  const bmson = {
    version: '1.0.0',
    info: {
      title,
      artist,
      genre: 'SDK',
      chart_name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      level: levelMap[difficulty],
      init_bpm: bpm,
      mode_hint: 'beat-7k',
      resolution: RESOLUTION,
    },
    lines: [{ y: 0 }],
    bpm_events: [{ y: 0, bpm: bpm }],
    stop_events: null,
    sound_channels: [
      {
        name: 'silent.ogg',
        notes: safe.map((n) => ({ x: n.x, y: n.y, l: n.l ?? 0, c: false })),
      },
    ],
    bga: {
      bga_header: [],
      bga_events: [],
      layer_events: [],
      poor_events: [],
    },
  }

  return { json: JSON.stringify(bmson), noteCount: safe.length }
}

// Snap a timestamp to the nearest beat in the beatGrid.
function snapToBeat(timeSec: number, beatGrid: number[]): number {
  if (!beatGrid.length) return timeSec
  let closest = beatGrid[0]
  let bestDelta = Math.abs(timeSec - closest)
  for (const beat of beatGrid) {
    const delta = Math.abs(timeSec - beat)
    if (delta < bestDelta) {
      bestDelta = delta
      closest = beat
    }
  }
  return closest
}

// Generate drum-lane notes from percussive onsets.
// Onsets are placed on lanes 5–7 (the right side of the 7-key layout),
// cycling through them and avoiding collisions with existing notes.
function generateOnsetNotes(
  onsets: number[],
  existingNotes: RawNote[],
  bpm: number,
  beatGrid?: number[]
): RawNote[] {
  if (!onsets.length) return []

  const drumLanes = [5, 6, 7]
  const occupied = new Set<number>()
  for (const n of existingNotes) {
    occupied.add(n.y)
  }

  const result: RawNote[] = []
  let laneIndex = 0
  for (const onset of onsets) {
    let t = onset
    if (beatGrid && beatGrid.length > 0) {
      t = snapToBeat(t, beatGrid)
    }
    const pulse = toPulse(t, bpm)
    // Skip if too close to an existing note on any lane (within 50ms)
    const minGapPulses = Math.round(((MIN_NOTE_GAP_MS / 1000) * bpm * RESOLUTION) / 60)
    let tooClose = false
    for (const existingPulse of occupied) {
      if (Math.abs(pulse - existingPulse) < minGapPulses) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    const lane = drumLanes[laneIndex % drumLanes.length]
    result.push({ x: lane, y: pulse })
    occupied.add(pulse)
    laneIndex++
  }

  return result
}

export function generateBmsonFromLyrics(opts: ChartGenOptions): GeneratedChart
export function generateBmsonFromLyrics(
  title: string,
  artist: string,
  duration: number,
  lines: LyricLine[]
): GeneratedChart
export function generateBmsonFromLyrics(
  optsOrTitle: ChartGenOptions | string,
  artist?: string,
  duration?: number,
  lines?: LyricLine[]
): GeneratedChart {
  let title: string
  let resolvedArtist: string
  let resolvedDuration: number
  let resolvedLines: LyricLine[]
  let difficulty: Difficulty
  let analysis: Analysis | null | undefined

  if (typeof optsOrTitle === 'string') {
    title = optsOrTitle
    resolvedArtist = artist!
    resolvedDuration = duration!
    resolvedLines = lines!
    difficulty = 'normal'
    analysis = null
  } else {
    title = optsOrTitle.title
    resolvedArtist = optsOrTitle.artist
    resolvedDuration = optsOrTitle.duration
    resolvedLines = optsOrTitle.lines
    difficulty = optsOrTitle.difficulty
    analysis = optsOrTitle.analysis
  }

  const bpm = analysis?.tempo?.bpm ?? DEFAULT_BPM
  const beatGrid = analysis?.tempo?.beatGrid
  const onsets = analysis?.onsets

  const sorted = [...resolvedLines]
    .filter((l) => l.text.trim() && l.time < resolvedDuration - 1)
    .sort((a, b) => a.time - b.time)

  // Apply beat-grid snapping to lyric lines before generation so that
  // every generated note is rhythmically aligned.
  const snappedLines: LyricLine[] =
    beatGrid && beatGrid.length > 0
      ? sorted.map((l) => ({
          ...l,
          time: snapToBeat(l.time, beatGrid),
          words: l.words?.map((w) => ({
            ...w,
            time: snapToBeat(w.time, beatGrid),
          })),
        }))
      : sorted

  let rawNotes: RawNote[]

  if (snappedLines.length === 0) {
    rawNotes = generateFallback(resolvedDuration, difficulty, bpm)
  } else {
    switch (difficulty) {
      case 'easy':
        rawNotes = generateEasy(snappedLines, bpm)
        break
      case 'normal':
        rawNotes = generateNormal(snappedLines, bpm)
        break
      case 'hard':
        rawNotes = generateHard(snappedLines, bpm)
        break
      case 'expert':
        rawNotes = generateExpert(snappedLines, bpm)
        break
    }
  }

  // Inject drum-lane notes from onsets for hard/expert tiers.
  if (onsets && onsets.length > 0 && (difficulty === 'hard' || difficulty === 'expert')) {
    const onsetNotes = generateOnsetNotes(onsets, rawNotes, bpm, beatGrid)
    rawNotes.push(...onsetNotes)
    // Re-sort by pulse so dedupe works correctly.
    rawNotes.sort((a, b) => a.y - b.y || a.x - b.x)
  }

  const { json: bmson, noteCount } = buildBmson(title, resolvedArtist, difficulty, rawNotes, bpm)

  return {
    bmson,
    title,
    artist: resolvedArtist,
    duration: resolvedDuration,
    bpm,
    difficulty,
    noteCount,
  }
}
