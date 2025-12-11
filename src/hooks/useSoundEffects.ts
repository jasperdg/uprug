import { useCallback, useRef } from 'react'
import { useUserStore } from '../stores/userStore'

// Web Audio API context
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

// Generate a simple tone
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  const ctx = getAudioContext()
  
  // Resume context if suspended (required for autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  
  // Envelope for smoother sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// Win sound - ascending happy tones
function playWinSound() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  
  // Play a cheerful arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 80)
  })
}

// Loss sound - descending sad tones
function playLossSound() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  
  // Play a descending minor tone
  playTone(400, 0.15, 'sawtooth', 0.2)
  setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.15), 100)
}

// Bet sound - quick click
function playBetSound() {
  playTone(800, 0.05, 'square', 0.15)
}

// Tick sound - subtle tick
function playTickSound() {
  playTone(1000, 0.03, 'sine', 0.1)
}

export function useSoundEffects() {
  const soundEnabled = useUserStore((state) => state.soundEnabled)
  const initializedRef = useRef(false)
  
  // Initialize audio context on first user interaction
  const loadSounds = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    
    // Create and resume audio context
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  }, [])
  
  const playWin = useCallback(() => {
    if (!soundEnabled) return
    playWinSound()
  }, [soundEnabled])
  
  const playLoss = useCallback(() => {
    if (!soundEnabled) return
    playLossSound()
  }, [soundEnabled])
  
  const playTick = useCallback(() => {
    if (!soundEnabled) return
    playTickSound()
  }, [soundEnabled])
  
  const playBet = useCallback(() => {
    if (!soundEnabled) return
    playBetSound()
  }, [soundEnabled])
  
  return {
    loadSounds,
    playWin,
    playLoss,
    playTick,
    playBet,
  }
}
