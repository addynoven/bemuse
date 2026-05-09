// MusicStream Rhythm — v1 scoring helper.
// Pure functions, no side effects, no bemuse imports.
// Callers map bemuse's PlayerStats to NoteStats before invoking.

export type MSGrade = 'S' | 'A' | 'B' | 'C' | 'D'

// Subset of bemuse PlayerState.stats needed for MS scoring.
// Mapping (caller's responsibility):
//   totalNotes  ← PlayerStats.totalNotes
//   hits        ← PlayerStats.numJudgments - PlayerStats.counts[Judgment.Missed]
//   perfects    ← PlayerStats.counts[Judgment.Meticulous]  (judgment === 1)
//   misses      ← PlayerStats.counts[Judgment.Missed]
//   combo       ← PlayerStats.combo
//   maxCombo    ← PlayerStats.maxCombo
export interface NoteStats {
  totalNotes: number
  hits: number
  perfects: number
  misses: number
  combo: number
  maxCombo: number
}

export interface MSScoreResult {
  grade: MSGrade
  score: number
  lyricAccuracy: number
  perfectLyricsMedal: boolean
  comboBonus: number
}

// Bemuse defaults are tighter (~20/50/100/200ms). Sparse lyric charts
// benefit from slightly more leniency so a single late syllable doesn't tank a run.
export const MS_JUDGMENT_WINDOWS_MS: {
  perfect: number
  great: number
  good: number
  bad: number
} = {
  perfect: 50,
  great: 90,
  good: 140,
  bad: 200,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function gradeFromScore(score: number): MSGrade {
  if (score >= 95) return 'S'
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

export function calculateMusicStreamGrade(stats: NoteStats): MSScoreResult {
  const { totalNotes, hits, perfects, maxCombo } = stats

  if (totalNotes === 0) {
    return {
      grade: 'D',
      score: 0,
      lyricAccuracy: 0,
      perfectLyricsMedal: false,
      comboBonus: 0,
    }
  }

  const baseAccuracy = hits / totalNotes
  const lyricAccuracy = perfects / totalNotes
  const comboBonusRatio = maxCombo / totalNotes

  // Base = 90% of score; lyric and combo each contribute up to +5%.
  const rawScore = baseAccuracy * 90 + lyricAccuracy * 5 + comboBonusRatio * 5

  const score = round2(clamp(rawScore, 0, 100))
  const comboBonus = round2(clamp(comboBonusRatio, 0, 1))
  const perfectLyricsMedal = hits === totalNotes && lyricAccuracy === 1

  return {
    grade: gradeFromScore(score),
    score,
    lyricAccuracy: round2(lyricAccuracy),
    perfectLyricsMedal,
    comboBonus,
  }
}
