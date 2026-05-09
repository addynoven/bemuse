import './SDKLoadingScene.scss'

import React, { useEffect, useState } from 'react'
import Scene from 'bemuse/ui/Scene'
import type { ChartInfo } from 'bemuse-types'
import type { Tasks } from 'bemuse/game/ui/LoadingSceneProgress'
import type { Difficulty } from 'bemuse/sdk/chart-generator'
import type { Analysis } from 'bemuse/sdk/api'

export interface SDKLoadingSceneProps {
  tasks: Tasks
  song: ChartInfo
  eyecatchImagePromise: PromiseLike<HTMLImageElement>
  difficulty: Difficulty
  noteCount: number
  thumbnailUrl?: string
  bpm?: number
  songKey?: Analysis['key']
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
}

function getLoadingLabel(progress: number): string {
  if (progress < 0.4) return 'PREPARING NOTES...'
  if (progress < 0.85) return 'BUFFERING AUDIO...'
  return 'GET READY!'
}

const SDKLoadingScene = ({
  tasks,
  song,
  eyecatchImagePromise,
  difficulty,
  noteCount,
  thumbnailUrl,
  bpm,
  songKey,
}: SDKLoadingSceneProps) => {
  const [progress, setProgress] = useState(0)
  const [thumbSrc, setThumbSrc] = useState<string | undefined>(thumbnailUrl)

  useEffect(() => {
    const unsubscribe = tasks.watch((items) => {
      if (!items || items.length === 0) return
      const total = items.reduce((sum, t) => sum + (t.progress ?? 0), 0)
      setProgress(total / items.length)
    })
    return () => {
      unsubscribe()
    }
  }, [tasks])

  useEffect(() => {
    if (thumbnailUrl) return
    Promise.resolve(eyecatchImagePromise).then((img) => {
      if (img?.src) setThumbSrc(img.src)
    })
  }, [eyecatchImagePromise, thumbnailUrl])

  const barWidth = `${Math.round(progress * 100)}%`
  const loadingLabel = getLoadingLabel(progress)

  return (
    <Scene className='SDKLoadingScene'>
      <div className='SDKLoadingScene__bg' />
      <div className='SDKLoadingScene__shimmer' />
      <div className='SDKLoadingScene__inner'>
        <div className='SDKLoadingScene__thumbWrap'>
          {thumbSrc ? (
            <img
              className='SDKLoadingScene__thumb'
              src={thumbSrc}
              alt={song.title}
            />
          ) : (
            <div className='SDKLoadingScene__thumbPlaceholder' />
          )}
          <div className='SDKLoadingScene__thumbHalo' />
        </div>

        <div className='SDKLoadingScene__songInfo'>
          <div className='SDKLoadingScene__songTitle'>{song.title}</div>
          <div className='SDKLoadingScene__songArtist'>{song.artist}</div>
          <div
            className={`SDKLoadingScene__diffPill SDKLoadingScene__diffPill--${difficulty}`}
          >
            {DIFFICULTY_LABEL[difficulty]}
            <span className='SDKLoadingScene__noteCount'>
              {noteCount} notes
            </span>
          </div>
          {bpm && (
            <div className='SDKLoadingScene__metaRow'>
              <span className='SDKLoadingScene__bpm'>{Math.round(bpm)} BPM</span>
              {songKey && (
                <span className='SDKLoadingScene__key'>
                  {songKey.camelot} ({songKey.tonic} {songKey.mode})
                </span>
              )}
            </div>
          )}
        </div>

        <div className='SDKLoadingScene__progressWrap'>
          <div className='SDKLoadingScene__progressTrack'>
            <div
              className='SDKLoadingScene__progressFill'
              style={{ width: barWidth }}
            />
          </div>
          <div className='SDKLoadingScene__progressLabel'>{loadingLabel}</div>
        </div>
      </div>
    </Scene>
  )
}

export default SDKLoadingScene
