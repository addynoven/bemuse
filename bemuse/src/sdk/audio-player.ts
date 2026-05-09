export class BackgroundAudioPlayer {
  private audio: HTMLAudioElement | null = null
  private _onEnded: (() => void) | null = null

  load(url: string) {
    this.destroy()
    this.audio = new Audio(url)
    this.audio.crossOrigin = 'anonymous'
    this.audio.preload = 'auto'
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audio
  }

  play() {
    if (this.audio) {
      this.audio.play().catch((e) => console.warn('Audio play failed:', e))
    }
  }

  pause() {
    if (this.audio) {
      this.audio.pause()
    }
  }

  destroy() {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
  }

  get currentTime(): number {
    return this.audio?.currentTime ?? 0
  }

  get duration(): number {
    return this.audio?.duration ?? 0
  }

  get ended(): boolean {
    return this.audio?.ended ?? false
  }

  set onEnded(handler: (() => void) | null) {
    if (this.audio) {
      if (this._onEnded) {
        this.audio.removeEventListener('ended', this._onEnded)
      }
      this._onEnded = handler
      if (handler) {
        this.audio.addEventListener('ended', handler)
      }
    }
  }
}

export const sdkAudioPlayer = new BackgroundAudioPlayer()
