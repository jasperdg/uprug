import { useCallback } from 'react'
import { useUserStore } from '../stores/userStore'

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning'

const PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [25],
  heavy: [50],
  success: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
  warning: [30, 20, 30],
}

export function useHaptics() {
  const hapticEnabled = useUserStore((state) => state.hapticEnabled)
  
  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    if (!hapticEnabled) return
    
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(PATTERNS[pattern])
      } catch (e) {
        // Vibration not supported or failed
      }
    }
  }, [hapticEnabled])
  
  const vibrateOnBet = useCallback(() => {
    vibrate('medium')
  }, [vibrate])
  
  const vibrateOnWin = useCallback(() => {
    vibrate('success')
  }, [vibrate])
  
  const vibrateOnLoss = useCallback(() => {
    vibrate('error')
  }, [vibrate])
  
  return {
    vibrate,
    vibrateOnBet,
    vibrateOnWin,
    vibrateOnLoss,
  }
}

