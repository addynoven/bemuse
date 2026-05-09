import React, { useContext } from 'react'
import './SDKResultOverlay.scss'
import { SceneManagerContext } from 'bemuse/scene-manager'
import Scene from 'bemuse/ui/Scene'
import {
  calculateMusicStreamGrade,
  type NoteStats,
  type MSGrade,
} from 'bemuse/sdk/scoring'
import type { Song } from 'bemuse/sdk/api'
import type { Difficulty } from 'bemuse/sdk/chart-generator'

interface Props {
  stats: NoteStats
  song: Song
  difficulty: Difficulty
  onPlayAgain?: () => void
}

const GRADE_COLOR: Record<MSGrade, string> = {
  S: '#ffd700',
  A: '#4a9eff',
  B: '#7eea7e',
  C: '#ffae42',
  D: '#ff6b6b',
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
}

const SDKResultOverlay: React.FC<Props> = ({ stats, song, difficulty, onPlayAgain }) => {
  const sceneManager = useContext(SceneManagerContext)
  const result = calculateMusicStreamGrade(stats)

  const scorePercent = result.score.toFixed(1)
  const lyricAccuracyPercent = (result.lyricAccuracy * 100).toFixed(1)
  const gradeColor = GRADE_COLOR[result.grade]

  const handleDone = () => {
    sceneManager?.pop()
  }

  const handlePlayAgain = () => {
    if (onPlayAgain) {
      onPlayAgain()
    } else {
      sceneManager?.pop()
    }
  }

  return (
    <Scene className='SDKResultOverlay'>
      <div
        className='SDKResultOverlay__inner'
        style={{ ['--ms-grade-color' as string]: gradeColor } as React.CSSProperties}
      >
        <div className='SDKResultOverlay__gradeRing'>
          <span className='SDKResultOverlay__grade'>{result.grade}</span>
        </div>

        {result.perfectLyricsMedal && (
          <div className='SDKResultOverlay__medal'>Perfect Lyrics</div>
        )}

        <div className='SDKResultOverlay__songInfo'>
          <div className='SDKResultOverlay__songTitle'>{song.title}</div>
          <div className='SDKResultOverlay__songArtist'>{song.artist}</div>
          <div className='SDKResultOverlay__difficulty'>
            {DIFFICULTY_LABEL[difficulty]}
          </div>
        </div>

        <div className='SDKResultOverlay__stats'>
          <StatRow label='Score' value={`${scorePercent}%`} index={0} />
          <StatRow label='Lyric Accuracy' value={`${lyricAccuracyPercent}%`} index={1} />
          <StatRow
            label='Max Combo'
            value={`${stats.maxCombo} / ${stats.totalNotes}`}
            index={2}
          />
          <StatRow label='Misses' value={String(stats.misses)} index={3} />
        </div>

        <div className='SDKResultOverlay__buttons'>
          <button
            className='SDKResultOverlay__btn SDKResultOverlay__btn--secondary'
            onClick={handlePlayAgain}
          >
            Play Again
          </button>
          <button
            className='SDKResultOverlay__btn SDKResultOverlay__btn--primary'
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    </Scene>
  )
}

interface StatRowProps {
  label: string
  value: string
  index: number
}

const StatRow: React.FC<StatRowProps> = ({ label, value, index }) => (
  <div
    className='SDKResultOverlay__statRow'
    style={{ ['--stagger' as string]: `${index * 80}ms` } as React.CSSProperties}
  >
    <div className='SDKResultOverlay__statLabel'>{label}</div>
    <div className='SDKResultOverlay__statValue'>{value}</div>
  </div>
)

export default SDKResultOverlay
