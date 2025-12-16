import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../stores/gameStore'
import { formatCurrency } from '../../utils/formatters'

export function WinEffect() {
  const { showResult, lastPayout, clearResult } = useGameStore()
  
  // Track if we've already triggered effects for this result
  const hasTriggeredRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isWin = showResult && lastPayout !== null && lastPayout > 0
  const isLoss = showResult && lastPayout !== null && lastPayout === 0
  
  // Handle result display - only trigger once per result
  useEffect(() => {
    if (!showResult) {
      // Reset when result is cleared
      hasTriggeredRef.current = false
      return
    }
    
    // Don't re-trigger if already triggered
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Clear result after animation (sounds/confetti handled by EpochPositionCards)
    const duration = isWin ? 2500 : 2000
    timeoutRef.current = setTimeout(() => {
      clearResult()
    }, duration)
    
    // Cleanup only on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult])
  
  return (
    <AnimatePresence>
      {/* Win message - simplified animation */}
      {isWin && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-center"
        >
          <div className="text-6xl mb-2">🎉</div>
          <div className="text-2xl font-bold text-accent-up mb-1 drop-shadow-lg">
            You won!
          </div>
          <div className="text-3xl font-mono font-bold text-accent-up drop-shadow-lg">
            +{formatCurrency(lastPayout!)}
          </div>
        </motion.div>
      )}
      
      {/* Loss message */}
      {isLoss && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-center"
        >
          <div className="text-5xl mb-2">📉</div>
          <div className="text-xl font-bold text-accent-down drop-shadow-lg">
            Rugged!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
