import { Chart, Song as BemuseSong } from 'bemuse/collection-model/types'
import { SceneManager } from 'bemuse/scene-manager'
import { initialState as defaultOptions } from './entities/Options'
import { launch } from './game-launcher'
import { MusicStreamResources } from './musicstream-adapter'
import defaultAudioContext from 'bemuse/audio-context'
import { sdkAudioPlayer } from 'bemuse/sdk/audio-player'
import { getProxyUrl, type Song, type Analysis } from 'bemuse/sdk/api'
import type { GeneratedChart } from 'bemuse/sdk/chart-generator'
import { type NoteStats } from 'bemuse/sdk/scoring'
import { playHitClick } from 'bemuse/sdk/hit-feedback'
import { MISSED } from 'bemuse/game/judgments'
import { PlayerStats } from 'bemuse/game/state/player-stats'
import React from 'react'
import SDKResultOverlay from './ui/SDKResultOverlay'
import SDKLoadingScene from './ui/SDKLoadingScene'

function mapPlayerStatsToNoteStats(stats: PlayerStats): NoteStats {
  // counts[MISSED] (-1) holds miss count.
  // counts[1] is Judgment.Meticulous (~20ms window) — used as "perfects".
  const misses = stats.counts[MISSED]
  return {
    totalNotes: stats.totalNotes,
    hits: stats.numJudgments - misses,
    perfects: stats.counts[1],
    misses,
    combo: stats.combo,
    maxCombo: stats.maxCombo,
  }
}

// Wait for an <audio> element to be playable. Resolves on `canplaythrough`
// (readyState >= 4) or after `timeoutMs` so a slow connection can't block forever.
function waitForCanPlay(audio: HTMLAudioElement, timeoutMs = 8000): Promise<void> {
  if (audio.readyState >= 4) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      audio.removeEventListener('canplaythrough', finish)
      resolve()
    }
    audio.addEventListener('canplaythrough', finish, { once: true })
    setTimeout(finish, timeoutMs)
  })
}

export async function launchSDKGame(
  sceneManager: SceneManager,
  song: Song,
  chart: GeneratedChart,
  analysis?: Analysis | null,
  onComplete?: (stats: NoteStats) => void
): Promise<void> {
  // Resume AudioContext on user gesture (Chrome autoplay policy).
  if (defaultAudioContext.state === 'suspended') {
    await defaultAudioContext.resume()
  }

  const resources = new MusicStreamResources(song.videoId, chart.bmson)
  const thumbnail = song.thumbnails?.[0]?.url ?? ''

  const bemuseSong: BemuseSong = {
    id: song.videoId,
    title: song.title,
    artist: song.artist,
    genre: 'Auto-generated',
    bpm: chart.bpm,
    artist_url: '',
    replaygain: '-12.2 dB',
    readme: '',
    charts: [],
    path: '',
    resources: resources as any,
    custom: true,
    eyecatch_image_url: thumbnail,
    back_image_url: thumbnail,
    bemusepack_url: null,
  }

  // Map our SDK difficulty to bemuse's numeric difficulty/level so the
  // loading screen and game HUD reflect the picked density.
  const DIFFICULTY_RANK: Record<typeof chart.difficulty, number> = {
    easy: 1, normal: 2, hard: 3, expert: 4,
  }
  const LEVEL_BY_DIFFICULTY: Record<typeof chart.difficulty, number> = {
    easy: 1, normal: 4, hard: 7, expert: 10,
  }

  const bemuseChart: Chart = {
    md5: song.videoId,
    info: {
      title: song.title,
      artist: song.artist,
      genre: 'Auto-generated',
      subtitles: [
        `${chart.difficulty.toUpperCase()} • ${chart.noteCount} notes`,
      ],
      subartists: [],
      difficulty: DIFFICULTY_RANK[chart.difficulty],
      level: LEVEL_BY_DIFFICULTY[chart.difficulty],
    },
    noteCount: chart.noteCount,
    bpm: {
      init: chart.bpm,
      min: chart.bpm,
      median: chart.bpm,
      max: chart.bpm,
    },
    duration: song.duration,
    scratch: false,
    keys: '7K',
    file: 'musicstream.bmson',
  }

  bemuseSong.charts = [bemuseChart]

  // Continuous background audio piped through defaultAudioContext via
  // createMediaElementSource. Pre-load only — don't play yet. We start audio
  // in lockstep with bemuse's controller.start() via the onGameStart hook so
  // notes stay synced with what the user is hearing.
  sdkAudioPlayer.load(getProxyUrl(song.videoId))
  const audioEl = sdkAudioPlayer.getAudioElement()

  if (audioEl) {
    try {
      const source = defaultAudioContext.createMediaElementSource(audioEl)
      source.connect(defaultAudioContext.destination)
    } catch (e) {
      // createMediaElementSource throws if the element is already connected
      // (re-launch case); playback through the element still works.
      console.warn('[SDK-Audio] createMediaElementSource failed:', e)
    }
  }

  // Wait for enough audio to be buffered before bemuse opens the loading scene.
  // This avoids a "play() called but no samples ready" gap when the game starts.
  if (audioEl) {
    await waitForCanPlay(audioEl)
  }

  const options = defaultOptions as any

  let capturedStats: NoteStats | null = null

  // Hook bemuse's clock start: await the `playing` event so controller.start()
  // fires only after the browser confirms the first audio frame is being output,
  // not merely after play() has been called. A 600ms safety timeout ensures we
  // never block the game indefinitely on a slow device.
  const startAudioOnGameStart = async () => {
    if (!audioEl) return
    try {
      audioEl.currentTime = 0
    } catch {
      // currentTime can throw if the media isn't seekable yet — safe to ignore.
    }
    const playing = new Promise<void>((resolve) => {
      const onPlaying = () => {
        audioEl.removeEventListener('playing', onPlaying)
        resolve()
      }
      audioEl.addEventListener('playing', onPlaying, { once: true })
    })
    audioEl.play().catch((err) => {
      console.warn('[SDK-Audio] play() rejected:', err)
    })
    await Promise.race([
      playing,
      new Promise<void>((resolve) => setTimeout(resolve, 600)),
    ])
  }

  try {
    await launch({
      server: { url: '' },
      song: bemuseSong,
      chart: bemuseChart,
      options,
      saveSpeed: () => {},
      saveLeadTime: () => {},
      onRagequitted: () => {},
      autoplayEnabled: false,
      sceneManager,
      skipResultScene: true,
      onGameStart: startAudioOnGameStart,
      onResult: (playerStats) => {
        capturedStats = mapPlayerStatsToNoteStats(playerStats)
      },
      onJudgment: (event) => playHitClick(event.judgment),
      loadingSceneFactory: (props) => (
        <SDKLoadingScene
          {...props}
          difficulty={chart.difficulty}
          noteCount={chart.noteCount}
          thumbnailUrl={song.thumbnails?.[0]?.url}
          bpm={chart.bpm}
          songKey={analysis?.key ?? null}
        />
      ),
    })
  } finally {
    sdkAudioPlayer.destroy()
  }

  // Fall back to zero-hit stats only if the game was quit before finishing
  // (state.finished === false), in which case onResult is never called.
  const resultStats: NoteStats = capturedStats ?? {
    totalNotes: chart.noteCount,
    hits: 0,
    perfects: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0,
  }

  if (onComplete) onComplete(resultStats)

  const playAgain = () => {
    sceneManager.pop()
    launchSDKGame(sceneManager, song, chart, analysis, onComplete)
  }

  await sceneManager.push(
    React.createElement(SDKResultOverlay, {
      stats: resultStats,
      song,
      difficulty: chart.difficulty,
      onPlayAgain: playAgain,
    })
  )
}
