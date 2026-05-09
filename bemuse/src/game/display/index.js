import './game-display.scss'

import $ from 'jquery'

import PlayerDisplay from './player-display'
import formatTime from '../../utils/formatTime'
import { shouldDisableFullScreen } from 'bemuse/devtools/query-flags'
import screenfull from 'screenfull'

export class GameDisplay {
  constructor({ game, context, backgroundImagePromise, video }) {
    this._game = game
    this._context = context
    const skinData = context.skinData
    this._players = new Map(
      game.players.map((player) => [
        player,
        new PlayerDisplay(player, skinData),
      ])
    )
    this._stateful = {}
    this._wrapper = this._createWrapper({
      backgroundImagePromise,
      video,
      panelPlacement: game.players[0].options.placement,
      infoPanelPosition: skinData.infoPanelPosition,
    })
    this._createTouchEscapeButton()
    this._createFullScreenButton()
    this._createKeyHintOverlay()
    this._escapeHintShown = false
  }

  setEscapeHandler(escapeHandler) {
    this._onEscape = escapeHandler
  }

  setReplayHandler(replayHandler) {
    this._onReplay = replayHandler
  }

  start() {
    this._started = new Date().getTime()
    const player = this._game.players[0]
    const songInfo = player.notechart.songInfo
    const prefix = player.options.autoplayEnabled ? '[AUTOPLAY] ' : ''
    this._stateful['song_title'] = prefix + songInfo.title
    this._stateful['song_artist'] = songInfo.artist
    this._duration = player.notechart.duration
  }

  destroy() {
    this._context.destroy()
  }

  update(gameTime, gameState) {
    const time = (new Date().getTime() - this._started) / 1000
    const data = this._getData(time, gameTime, gameState)
    this._updateStatefulData(time, gameTime, gameState)
    this._context.render(Object.assign({}, this._stateful, data))
    this._synchronizeVideo(gameTime)
    this._synchronizeTutorialEscapeHint(gameTime)
  }

  _synchronizeVideo(gameTime) {
    if (this._video && !this._videoStarted && gameTime >= this._videoOffset) {
      this._video.volume = 0
      this._video.play()
      this._video.classList.add('is-playing')
      this._videoStarted = true
    }
  }

  _synchronizeTutorialEscapeHint(gameTime) {
    if (this._game.options.tutorial) {
      const TUTORIAL_ESCAPE_HINT_SHOW_TIME = 101.123595506
      if (
        gameTime >= TUTORIAL_ESCAPE_HINT_SHOW_TIME &&
        !this._escapeHintShown
      ) {
        this._escapeHintShown = true
        this._escapeHint.classList.add('is-shown')
      }
    }
  }

  _getData(time, gameTime, gameState) {
    const data = {}
    data['tutorial'] = this._game.options.tutorial ? 'yes' : 'no'
    data['t'] = time
    data['gameTime'] = gameTime
    data['ready'] = this._getReady(gameState)
    data['song_time'] = this._getSongTime(gameTime)
    for (const [player, playerDisplay] of this._players) {
      const playerState = gameState.player(player)
      const playerData = playerDisplay.update(time, gameTime, playerState)
      for (const key in playerData) {
        data[`p${player.number}_${key}`] = playerData[key]
      }
    }
    return data
  }

  _updateStatefulData(time, gameTime, gameState) {
    const data = this._stateful
    if (data['started'] === undefined && gameState.started) {
      data['started'] = time
    }
    if (data['gettingStarted'] === undefined && gameState.gettingStarted) {
      data['gettingStarted'] = time
    }
  }

  _getSongTime(gameTime) {
    return (
      formatTime(Math.min(this._duration, Math.max(0, gameTime))) +
      ' / ' +
      formatTime(this._duration)
    )
  }

  _getReady(gameState) {
    const f = gameState.readyFraction
    return f > 0.5 ? Math.pow(1 - (f - 0.5) / 0.5, 2) : 0
  }

  _createWrapper({
    backgroundImagePromise,
    video,
    panelPlacement,
    infoPanelPosition,
  }) {
    const $wrapper = $('<div class="game-display"></div>')
      .attr('data-panel-placement', panelPlacement)
      .attr('data-info-panel-position', infoPanelPosition)
      .append('<div class="game-display--bg js-back-image"></div>')
      .append(this.view)
    if (backgroundImagePromise) {
      Promise.resolve(backgroundImagePromise).then((image) =>
        $wrapper.find('.js-back-image').append(image)
      )
    }
    if (video) {
      this._video = video.element
      this._videoOffset = video.offset
      $(video.element).addClass('game-display--video-bg').appendTo($wrapper)
    }
    return $wrapper[0]
  }

  _createTouchEscapeButton() {
    const touchButtons = document.createElement('div')
    touchButtons.className = 'game-display--touch-buttons is-left'
    this.wrapper.appendChild(touchButtons)
    touchButtons.classList.add('is-visible')
    const addTouchButton = (className, onClick) => {
      const button = createTouchButton(onClick, className)
      touchButtons.appendChild(button)
    }
    addTouchButton('game-display--touch-escape-button', () => this._onEscape())
    addTouchButton('game-display--touch-replay-button', () => this._onReplay())

    const escapeHint = document.createElement('div')
    escapeHint.textContent = 'Click or press Esc to exit the tutorial'
    escapeHint.className = 'game-display--escape-hint'
    this._escapeHint = escapeHint
    touchButtons.appendChild(escapeHint)
  }

  _createFullScreenButton() {
    if (shouldDisableFullScreen() || !screenfull.enabled) {
      return
    }
    const touchButtons = document.createElement('div')
    touchButtons.className = 'game-display--touch-buttons is-visible is-right'
    this.wrapper.appendChild(touchButtons)
    const onClick = () => {
      screenfull.request()
    }
    const button = createTouchButton(
      onClick,
      'game-display--touch-fullscreen-button'
    )
    touchButtons.appendChild(button)
  }

  _createKeyHintOverlay() {
    const player = this._game.players[0]
    const kbm = player.options.input.keyboard
    if (!kbm) return

    const keyNames = {
      8: 'Bksp', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl',
      18: 'Alt', 20: 'Caps', 27: 'Esc', 32: '␣',
      33: 'PgUp', 34: 'PgDn', 35: 'End', 36: 'Home',
      37: '←', 38: '↑', 39: '→', 40: '↓',
      45: 'Ins', 46: 'Del',
      48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
      53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
      65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F',
      71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L',
      77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R',
      83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X',
      89: 'Y', 90: 'Z',
      112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4',
      116: 'F5', 117: 'F6', 118: 'F7', 119: 'F8',
      120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
      186: ';', 187: '=', 188: ',', 189: '-', 190: '.',
      191: '/', 192: '`', 219: '[', 220: '\\', 221: ']',
      222: "'",
    }

    const getLabel = (code) => {
      const num = parseInt(code, 10)
      return keyNames[num] || String.fromCharCode(num)
    }

    const container = document.createElement('div')
    container.className = 'game-display--key-hints'

    const columns = ['1', '2', '3', '4', '5', '6', '7']
    for (const col of columns) {
      const hint = document.createElement('div')
      hint.className = 'game-display--key-hint'
      hint.textContent = getLabel(kbm[col])
      container.appendChild(hint)
    }

    this.wrapper.appendChild(container)
  }

  get context() {
    return this._context
  }

  get view() {
    return this._context.view
  }

  get wrapper() {
    return this._wrapper
  }
}

function createTouchButton(onClick, className) {
  const button = document.createElement('button')
  button.addEventListener(
    'touchstart',
    (e) => {
      e.stopPropagation()
    },
    true
  )
  button.onclick = (e) => {
    e.preventDefault()
    onClick()
  }
  button.className = className
  return button
}

export default GameDisplay
