import { useCallback, useRef, useEffect } from 'react'
import { useUserStore } from '../stores/userStore'

// Web Audio API context
let audioContext: AudioContext | null = null
let audioUnlocked = false

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

// Ensure audio context is ready - must be called before playing sounds
async function ensureAudioReady(): Promise<AudioContext> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e)
    }
  }
  return ctx
}

// Unlock audio on mobile - must be called from user gesture
async function unlockAudio() {
  if (audioUnlocked) return
  
  const ctx = getAudioContext()
  
  // Resume context if suspended
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e)
    }
  }
  
  // Play a silent buffer to fully unlock on iOS
  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch (e) {
    console.warn('Failed to play silent buffer:', e)
  }
  
  audioUnlocked = true
  console.log('Audio unlocked, context state:', ctx.state)
}

// Set up global unlock listener
if (typeof window !== 'undefined') {
  const unlockHandler = () => {
    unlockAudio()
    // Remove listeners after unlock
    document.removeEventListener('touchstart', unlockHandler, true)
    document.removeEventListener('touchend', unlockHandler, true)
    document.removeEventListener('click', unlockHandler, true)
    document.removeEventListener('keydown', unlockHandler, true)
  }
  
  document.addEventListener('touchstart', unlockHandler, true)
  document.addEventListener('touchend', unlockHandler, true)
  document.addEventListener('click', unlockHandler, true)
  document.addEventListener('keydown', unlockHandler, true)
}

// Play a coin/bell tone (uses pre-ensured context)
function playBellTone(ctx: AudioContext, frequency: number, duration: number, volume: number, delay: number) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
  
  // Bell-like envelope: quick attack, longer decay
  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.005)
  gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, ctx.currentTime + delay + 0.1)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  
  oscillator.start(ctx.currentTime + delay)
  oscillator.stop(ctx.currentTime + delay + duration)
}

// Play metallic click (uses pre-ensured context)
function playClick(ctx: AudioContext, frequency: number, volume: number, delay: number) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
  
  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.001)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.03)
  
  oscillator.start(ctx.currentTime + delay)
  oscillator.stop(ctx.currentTime + delay + 0.03)
}

// Coin drop sound (uses pre-ensured context)
function playCoinDrop(ctx: AudioContext, delay: number) {
  // Multiple harmonics for metallic coin sound
  const frequencies = [4200, 5600, 7000]
  
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
    
    const vol = 0.08 / (i + 1)
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15)
    
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + 0.15)
  })
}

// Ka-ching! Cash register / money sound
async function playWinSound() {
  const ctx = await ensureAudioReady()
  
  // Initial drawer open click
  playClick(ctx, 1500, 0.12, 0)
  playClick(ctx, 800, 0.08, 0.01)
  
  // Main bell "CHING!" - two-tone bell like a cash register
  playBellTone(ctx, 2093, 0.4, 0.2, 0.03)  // C7
  playBellTone(ctx, 2637, 0.4, 0.15, 0.03) // E7
  playBellTone(ctx, 3136, 0.35, 0.1, 0.05) // G7
  
  // Coin cascade
  playCoinDrop(ctx, 0.12)
  playCoinDrop(ctx, 0.18)
  playCoinDrop(ctx, 0.23)
  playCoinDrop(ctx, 0.27)
  playCoinDrop(ctx, 0.30)
  
  // Final sparkle
  playBellTone(ctx, 4186, 0.2, 0.06, 0.35) // C8
}

// Soft "womp" sound for losses - less harsh
async function playLossSound() {
  const ctx = await ensureAudioReady()
  
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  // Descending tone - softer "womp womp"
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(300, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2)
  
  // Softer volume, quicker fade
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.25)
}

// Bet sound - satisfying click
async function playBetSound() {
  const ctx = await ensureAudioReady()
  
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05)
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
  
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
}

// Tick sound
async function playTickSound() {
  const ctx = await ensureAudioReady()
  
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1000, ctx.currentTime)
  
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
  
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.03)
}

export function useSoundEffects() {
  const soundEnabled = useUserStore((state) => state.soundEnabled)
  const initializedRef = useRef(false)
  
  // Try to unlock audio when component mounts
  useEffect(() => {
    // Pre-create audio context
    getAudioContext()
  }, [])
  
  const loadSounds = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    unlockAudio()
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
