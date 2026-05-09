// Target loudness for normalization (modern streaming standard).
export const TARGET_LUFS = -14

// Compute peak-normalization gain (linear multiplier) from a decoded
// AudioBuffer. v1 fast approximation: RMS over the first ~30s, treated as
// a rough LUFS proxy (no K-weighting per ITU-R BS.1770).
export function computeGainFromBuffer(
  buffer: AudioBuffer,
  sampleSeconds = 30
): number {
  const windowSeconds = Math.min(sampleSeconds, buffer.duration)
  const sampleCount = Math.floor(windowSeconds * buffer.sampleRate)

  if (sampleCount === 0) {
    return 1.0
  }

  let totalMeanSquare = 0

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    let sum = 0
    for (let i = 0; i < sampleCount; i++) {
      sum += data[i] * data[i]
    }
    totalMeanSquare += sum / sampleCount
  }

  const meanSquare = totalMeanSquare / buffer.numberOfChannels

  if (meanSquare === 0) {
    return 1.0
  }

  const approxLufs = 20 * Math.log10(Math.sqrt(meanSquare))

  return gainFromLoudness(approxLufs, TARGET_LUFS)
}

// Convert an explicit loudness value (e.g. youtube loudnessDb) to a gain.
// Formula: gain = 10 ^ ((target - songLufs) / 20)
export function gainFromLoudness(
  songLufs: number,
  targetLufs: number = TARGET_LUFS
): number {
  return Math.pow(10, (targetLufs - songLufs) / 20)
}

export function formatReplayGainTag(gain: number): string {
  const db = 20 * Math.log10(gain)
  const sign = db >= 0 ? '+' : '-'
  return `${sign}${Math.abs(db).toFixed(1)} dB`
}

// Convenience: fetch a proxy URL, decode, compute gain. Throws on
// fetch/decode failure — caller handles.
export async function analyzeReplayGain(
  audioContext: AudioContext,
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<{ gain: number; lufs: number; tag: string }> {
  const response = await fetchFn(url)

  if (!response.ok) {
    throw new Error(
      `analyzeReplayGain: fetch failed with status ${response.status}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const decoded = await audioContext.decodeAudioData(arrayBuffer)

  const gain = computeGainFromBuffer(decoded)
  const lufs = TARGET_LUFS - 20 * Math.log10(gain)
  const tag = formatReplayGainTag(gain)

  return { gain, lufs, tag }
}
