import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import './SDKMusicSelectScene.scss'
import { SceneManagerContext } from 'bemuse/scene-manager'
import Scene from 'bemuse/ui/Scene'
import { searchSongs, getLyrics, getProxyUrl, getTrack, getAnalysis, type Song } from 'bemuse/sdk/api'
import { generateBmsonFromLyrics } from 'bemuse/sdk/chart-generator'
import { sdkAudioPlayer } from 'bemuse/sdk/audio-player'
import { launchSDKGame } from 'bemuse/app/sdk-game-launcher'
import { extractVideoId } from 'bemuse/sdk/youtube-url'
import {
  getRecentSongs,
  addRecentSong,
  isFavorite,
  toggleFavorite,
  getDefaultDifficulty,
  setDefaultDifficulty,
  saveSettings,
  type RecentSong,
  type Difficulty,
} from 'bemuse/sdk/settings'
import { isMSError } from 'bemuse/sdk/errors'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
}

const SDKMusicSelectScene = () => {
  const sceneManager = useContext(SceneManagerContext)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>([])
  const [favoritesVersion, bumpFavorites] = useState(0)
  const [difficultyVersion, bumpDifficulty] = useState(0)

  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(false)

  const [error, setError] = useState<{ msg: string; action?: string } | null>(null)
  const lastFailed = useRef<(() => void) | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecentSongs(getRecentSongs().slice(0, 10))
  }, [])

  const refreshRecent = () => {
    setRecentSongs(getRecentSongs().slice(0, 10))
  }

  const showError = (e: unknown) => {
    if (isMSError(e)) {
      setError({ msg: e.userMessage, action: e.action })
    } else {
      setError({ msg: 'Something went wrong.', action: 'Retry' })
    }
    console.error(e)
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const songs = await searchSongs(q, 10)
      setResults(songs)
    } catch (e) {
      console.error('Search failed:', e)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(val), 400)
  }

  const playPreview = (song: Song) => {
    sdkAudioPlayer.load(getProxyUrl(song.videoId))
    sdkAudioPlayer.play()
    setPlayingPreview(song.videoId)
    sdkAudioPlayer.onEnded = () => setPlayingPreview(null)
  }

  const stopPreview = () => {
    sdkAudioPlayer.destroy()
    setPlayingPreview(null)
  }

  const playSong = async (song: Song) => {
    setLoading(true)
    stopPreview()
    try {
      // Fire analysis and lyrics in parallel so analysis doesn't block.
      const [lyrics, analysis] = await Promise.all([
        getLyrics(song.videoId),
        getAnalysis(song.videoId),
      ])
      const difficulty = getDefaultDifficulty()
      const chart = generateBmsonFromLyrics({
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        lines: lyrics?.synced || [],
        difficulty,
        analysis,
      })
      console.log(
        `[MusicStream] generated chart for "${song.title}" — difficulty=${difficulty}, noteCount=${chart.noteCount}, lyricLines=${lyrics?.synced?.length ?? 0}, bpm=${chart.bpm}`
      )
      addRecentSong({
        videoId: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnails?.[0]?.url,
        playedAt: Date.now(),
      })
      refreshRecent()
      await launchSDKGame(sceneManager, song, chart, analysis)
    } catch (e) {
      lastFailed.current = () => playSong(song)
      showError(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUrlPlay = async () => {
    const videoId = extractVideoId(urlInput.trim())
    if (!videoId) {
      setUrlError('Invalid YouTube URL or video ID')
      return
    }
    setUrlError(null)
    setUrlLoading(true)
    try {
      const data = await getTrack(videoId)
      const song: Song = {
        type: 'song',
        videoId: data.videoId ?? videoId,
        title: data.title || 'Unknown',
        artist: data.artist || 'Unknown',
        duration: data.duration || 180,
        thumbnails: data.thumbnails || [],
        ...(data.album ? { album: data.album as string } : {}),
      }
      setUrlInput('')
      lastFailed.current = () => handleUrlPlay()
      await playSong(song)
    } catch (e) {
      lastFailed.current = () => handleUrlPlay()
      showError(e)
    } finally {
      setUrlLoading(false)
    }
  }

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleUrlPlay()
  }

  const selectRecentSong = (rs: RecentSong) => {
    const song: Song = {
      type: 'song',
      videoId: rs.videoId,
      title: rs.title,
      artist: rs.artist,
      duration: 180,
      thumbnails: rs.thumbnail ? [{ url: rs.thumbnail, width: 120, height: 90 }] : [],
    }
    lastFailed.current = () => selectRecentSong(rs)
    playSong(song)
  }

  const removeRecent = (videoId: string) => {
    const updated = recentSongs.filter((r) => r.videoId !== videoId)
    setRecentSongs(updated)
    saveSettings({ recentSongs: updated })
  }

  const handleFavorite = (videoId: string) => {
    toggleFavorite(videoId)
    bumpFavorites((v) => v + 1)
  }

  const handleDifficulty = (d: Difficulty) => {
    setDefaultDifficulty(d)
    bumpDifficulty((v) => v + 1)
  }

  const thumbnail = (song: Song) => {
    const t = song.thumbnails?.[0]
    return t?.url || ''
  }

  const showRecent = query.trim() === '' && results.length === 0

  void difficultyVersion
  const currentDifficulty = getDefaultDifficulty()

  return (
    <Scene className='SDKMusicSelectScene'>
      <div className='SDKMusicSelectScene__inner'>
        <h2 className='SDKMusicSelectScene__title'>MusicStream</h2>

        <div className='SDKMusicSelectScene__urlBar'>
          <div className='SDKMusicSelectScene__urlRow'>
            <input
              type='text'
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                if (urlError) setUrlError(null)
              }}
              onKeyDown={handleUrlKeyDown}
              placeholder='Paste YouTube URL or video ID...'
              className='SDKMusicSelectScene__urlInput'
              style={urlError ? { borderColor: '#ff6b6b' } : undefined}
            />
            <button
              onClick={handleUrlPlay}
              disabled={urlLoading || !urlInput.trim()}
              className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--primary SDKMusicSelectScene__btn--url'
            >
              {urlLoading ? '...' : 'Play'}
            </button>
          </div>
          {urlError && (
            <div className='SDKMusicSelectScene__urlError'>{urlError}</div>
          )}
        </div>

        <input
          type='text'
          value={query}
          onChange={onQueryChange}
          placeholder='Search any song...'
          className='SDKMusicSelectScene__searchInput'
        />

        <div className='SDKMusicSelectScene__difficultyBar'>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => handleDifficulty(d)}
              className={
                'SDKMusicSelectScene__difficultyBtn' +
                (currentDifficulty === d ? ' SDKMusicSelectScene__difficultyBtn--active' : '')
              }
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>

        {loading && <div className='SDKMusicSelectScene__loading'>Loading...</div>}

        <div className='SDKMusicSelectScene__list'>
          {error && (
            <div className='SDKMusicSelectScene__error'>
              <span className='SDKMusicSelectScene__errorMsg'>{error.msg}</span>
              {error.action && error.action !== 'Try another song' && (
                <button
                  onClick={() => {
                    setError(null)
                    lastFailed.current?.()
                  }}
                  className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--secondary'
                >
                  {error.action}
                </button>
              )}
              {error.action === 'Try another song' && (
                <button
                  onClick={() => setError(null)}
                  className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--secondary'
                >
                  Try another song
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className='SDKMusicSelectScene__errorDismiss'
                aria-label='Dismiss error'
              >
                ×
              </button>
            </div>
          )}

          {results.map((song) => {
            const isFav = isFavorite(song.videoId)
            void favoritesVersion
            return (
              <div
                key={song.videoId}
                className={
                  'SDKMusicSelectScene__card' +
                  (isFav ? ' SDKMusicSelectScene__card--favorite' : '')
                }
              >
                <img
                  src={thumbnail(song)}
                  alt=''
                  className='SDKMusicSelectScene__cardThumb'
                />
                <div className='SDKMusicSelectScene__cardMain'>
                  <div className='SDKMusicSelectScene__cardTitleRow'>
                    <div className='SDKMusicSelectScene__cardTitle'>{song.title}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFavorite(song.videoId)
                      }}
                      className='SDKMusicSelectScene__favBtn'
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFav ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className='SDKMusicSelectScene__cardArtist'>{song.artist}</div>
                  <div className='SDKMusicSelectScene__cardMeta'>
                    {Math.floor(song.duration / 60)}:
                    {String(Math.floor(song.duration % 60)).padStart(2, '0')}
                  </div>
                </div>
                <div className='SDKMusicSelectScene__cardActions'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (playingPreview === song.videoId) {
                        stopPreview()
                      } else {
                        playPreview(song)
                      }
                    }}
                    className='SDKMusicSelectScene__btn'
                  >
                    {playingPreview === song.videoId ? 'Stop' : 'Preview'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playSong(song)
                    }}
                    className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--primary'
                  >
                    Play
                  </button>
                </div>
              </div>
            )
          })}

          {showRecent && (
            <div>
              <div className='SDKMusicSelectScene__recentHeader'>Recent</div>
              {recentSongs.length === 0 ? (
                <div className='SDKMusicSelectScene__empty'>
                  Search above or paste a YouTube URL to play any song.
                </div>
              ) : (
                recentSongs.map((rs) => {
                  const isFav = isFavorite(rs.videoId)
                  void favoritesVersion
                  return (
                    <div
                      key={rs.videoId}
                      className={
                        'SDKMusicSelectScene__card' +
                        (isFav ? ' SDKMusicSelectScene__card--favorite' : '')
                      }
                    >
                      {rs.thumbnail ? (
                        <img
                          src={rs.thumbnail}
                          alt=''
                          className='SDKMusicSelectScene__cardThumb'
                        />
                      ) : (
                        <div className='SDKMusicSelectScene__cardThumbPlaceholder' />
                      )}
                      <div className='SDKMusicSelectScene__cardMain'>
                        <div className='SDKMusicSelectScene__cardTitleRow'>
                          <div className='SDKMusicSelectScene__cardTitle'>{rs.title}</div>
                          <button
                            onClick={() => handleFavorite(rs.videoId)}
                            className='SDKMusicSelectScene__favBtn'
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {isFav ? '♥' : '♡'}
                          </button>
                        </div>
                        <div className='SDKMusicSelectScene__cardArtist'>{rs.artist}</div>
                        <div className='SDKMusicSelectScene__cardMeta'>
                          {new Date(rs.playedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className='SDKMusicSelectScene__cardActions'>
                        <button
                          onClick={() => selectRecentSong(rs)}
                          className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--primary'
                        >
                          Play
                        </button>
                        <button
                          onClick={() => removeRecent(rs.videoId)}
                          className='SDKMusicSelectScene__btn SDKMusicSelectScene__btn--secondary'
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => sceneManager.pop()}
          className='SDKMusicSelectScene__back'
        >
          Back
        </button>
      </div>
    </Scene>
  )
}

export default SDKMusicSelectScene
