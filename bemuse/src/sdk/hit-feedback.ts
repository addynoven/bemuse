import defaultAudioContext from 'bemuse/audio-context'

// Judgment values from bemuse/game/judgments:
//   Meticulous = 1, Precise = 2, Good = 3, Offbeat = 4, Missed = -1

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle'

interface ClickProfile {
  frequency: number
  type: OscType
  gain: number
  decaySeconds: number
}

const PROFILES: Record<number, ClickProfile> = {
  1: { frequency: 1200, type: 'sine', gain: 0.30, decaySeconds: 0.040 },     // Meticulous
  2: { frequency: 900, type: 'sine', gain: 0.27, decaySeconds: 0.050 },      // Precise
  3: { frequency: 650, type: 'square', gain: 0.24, decaySeconds: 0.060 },    // Good
  4: { frequency: 400, type: 'square', gain: 0.20, decaySeconds: 0.080 },    // Offbeat
  [-1]: { frequency: 180, type: 'sawtooth', gain: 0.18, decaySeconds: 0.090 }, // Missed
}

let masterGain: GainNode | null = null

function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)
  }
  return masterGain
}

export function playHitClick(judgment: number): void {
  const profile = PROFILES[judgment]
  if (!profile) return

  const ctx = defaultAudioContext
  if (ctx.state === 'suspended') return

  const now = ctx.currentTime
  const master = getMasterGain(ctx)

  const osc = ctx.createOscillator()
  const env = ctx.createGain()

  osc.type = profile.type
  osc.frequency.setValueAtTime(profile.frequency, now)

  env.gain.setValueAtTime(0.0001, now)
  env.gain.exponentialRampToValueAtTime(profile.gain, now + 0.005)
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.005 + profile.decaySeconds)

  osc.connect(env)
  env.connect(master)

  osc.start(now)
  osc.stop(now + 0.005 + profile.decaySeconds + 0.005)
}
