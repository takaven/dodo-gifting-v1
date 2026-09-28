export class SoundEffects {
  private audioContext: AudioContext | null = null

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
      const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('AudioContext is not available')
      }
      this.audioContext = new AudioContextClass()
    }
    return this.audioContext
  }

  playCrack() {
    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 800
    noiseFilter.Q.value = 2

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.01)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    const snap = ctx.createOscillator()
    snap.type = 'sine'
    snap.frequency.setValueAtTime(400, now)
    snap.frequency.exponentialRampToValueAtTime(100, now + 0.1)

    const snapGain = ctx.createGain()
    snapGain.gain.setValueAtTime(0.2, now)
    snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    snap.connect(snapGain)
    snapGain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.3)
    snap.start(now)
    snap.stop(now + 0.1)
  }

  playHatch() {
    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    const breakNoise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const breakData = breakNoise.getChannelData(0)
    for (let i = 0; i < breakData.length; i++) {
      breakData[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = breakNoise

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 1200
    noiseFilter.Q.value = 1.5

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.02)
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.2)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(600, now)
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.3)

    const gain1 = ctx.createGain()
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(300, now + 0.1)
    osc2.frequency.linearRampToValueAtTime(500, now + 0.3)
    osc2.frequency.linearRampToValueAtTime(400, now + 0.5)

    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0, now + 0.1)
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.15)
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.5)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.5)
    osc1.start(now)
    osc1.stop(now + 0.3)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.5)

    setTimeout(() => {
      this.playChirp()
    }, 600)
  }

  private playChirp() {
    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.linearRampToValueAtTime(1200, now + 0.05)
    osc.frequency.linearRampToValueAtTime(900, now + 0.1)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }
}

export const soundEffects = new SoundEffects()
