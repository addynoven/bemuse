import { ICustomSongResources, IResource } from 'bemuse/resources/types'

import Progress from 'bemuse/progress'

const API_BASE = process.env.MUSICSTREAM_API_URL || '/api'

// 1-second silent WAV (PCM, 1ch, 8000Hz, 8-bit unsigned).
// Browsers' decodeAudioData rejects zero-sample WAV with EncodingError, so we
// pad with 8000 silent samples (8-bit unsigned silence = 0x80). This is the
// keysound channel; chart-generator emits c:false for all notes so it's never
// triggered — real audio playback is handled by BackgroundAudioPlayer.
const SILENT_WAV: ArrayBuffer = (() => {
  const SAMPLE_COUNT = 8000
  const HEADER_SIZE = 44
  const buf = new ArrayBuffer(HEADER_SIZE + SAMPLE_COUNT)
  const view = new DataView(buf)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + SAMPLE_COUNT, true) // chunk size
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // subchunk1 size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, 8000, true) // sample rate
  view.setUint32(28, 8000, true) // byte rate
  view.setUint16(32, 1, true) // block align
  view.setUint16(34, 8, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, SAMPLE_COUNT, true) // data size
  // Fill samples with 0x80 (silence midpoint for 8-bit unsigned PCM).
  const samples = new Uint8Array(buf, HEADER_SIZE, SAMPLE_COUNT)
  samples.fill(0x80)
  return buf
})()

class BmsonResource implements IResource {
  name = 'musicstream.bmson'
  constructor(private data: string) {}
  resolveUrl(): Promise<string> {
    const blob = new Blob([this.data], { type: 'application/json' })
    return Promise.resolve(URL.createObjectURL(blob))
  }
  read(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    return Promise.resolve(encoder.encode(this.data).buffer as ArrayBuffer)
  }
}

class SilentAudioResource implements IResource {
  constructor(public name: string) {}
  resolveUrl(): Promise<string> {
    const blob = new Blob([SILENT_WAV], { type: 'audio/wav' })
    return Promise.resolve(URL.createObjectURL(blob))
  }
  read(): Promise<ArrayBuffer> {
    return Promise.resolve(SILENT_WAV.slice(0))
  }
}

export class MusicStreamResource implements IResource {
  constructor(
    public name: string,
    private videoId: string,
    private type: 'audio' | 'image' | 'data'
  ) {}

  resolveUrl(): Promise<string> {
    if (this.type === 'audio') {
      return Promise.resolve(`${API_BASE}/music/proxy/${this.videoId}`)
    }
    return Promise.resolve(`${API_BASE}/music/track/${this.videoId}`)
  }

  async read(progress?: Progress): Promise<ArrayBuffer> {
    const url = await this.resolveUrl()
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${this.name}: ${response.status} ${response.statusText}`
      )
    }
    return response.arrayBuffer()
  }

  getBlob(): Promise<Blob> {
    return this.read().then((buffer) => new Blob([buffer]))
  }

  getDataUrl(): Promise<string> {
    return this.getBlob().then((blob) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    })
  }
}

export class MusicStreamResources implements ICustomSongResources {
  readonly fileList: Promise<string[]>
  private videoId: string
  private bmsonData: string

  constructor(videoId: string, bmsonData: string) {
    this.videoId = videoId
    this.bmsonData = bmsonData
    this.fileList = Promise.resolve([
      'silent.ogg',
      'metadata',
      'lyrics',
      'musicstream.bmson',
    ])
  }

  file(name: string): Promise<IResource> {
    if (name === 'musicstream.bmson') {
      return Promise.resolve(new BmsonResource(this.bmsonData))
    }
    const isAudio =
      name === 'audio.mp3' ||
      name === 'silent.ogg' ||
      name.endsWith('.ogg') ||
      name.endsWith('.mp3') ||
      name.endsWith('.m4a') ||
      name.endsWith('.flac') ||
      name.endsWith('.wav')
    if (isAudio) {
      return Promise.resolve(new SilentAudioResource(name))
    }
    const type: 'image' | 'data' =
      name.endsWith('.png') || name.endsWith('.jpg') ? 'image' : 'data'
    return Promise.resolve(new MusicStreamResource(name, this.videoId, type))
  }

  setLoggingFunction() {}
}
