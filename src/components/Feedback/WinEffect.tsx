import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../stores/gameStore'
import { useHaptics } from '../../hooks/useHaptics'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { formatCurrency } from '../../utils/formatters'
import { useIsMobile } from '../../hooks/useIsMobile'

export function WinEffect() {
  const { showResult, lastPayout, clearResult } = useGameStore()
  const { vibrateOnWin, vibrateOnLoss } = useHaptics()
  const { playWin, playLoss } = useSoundEffects()
  const isMobile = useIsMobile()
  
  const isWin = showResult && lastPayout !== null && lastPayout > 0
  const isLoss = showResult && lastPayout !== null && lastPayout === 0
  
  const triggerConfetti = useCallback(() => {
    const particleCount = isMobile ? 50 : 150
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00d26a', '#ffffff', '#00ff88'],
    })
  }, [isMobile])
  
  useEffect(() => {
    if (isWin) {
      triggerConfetti()
      vibrateOnWin()
      playWin()
      
      // Clear result after animation
      const timer = setTimeout(clearResult, 2500)
      return () => clearTimeout(timer)
    } else if (isLoss) {
      vibrateOnLoss()
      playLoss()
      
      // Clear result after animation
      const timer = setTimeout(clearResult, 2000)
      return () => clearTimeout(timer)
    }
  }, [isWin, isLoss, triggerConfetti, vibrateOnWin, vibrateOnLoss, playWin, playLoss, clearResult])
  
  return (
    <AnimatePresence>
      {/* Win overlay */}
      {isWin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
          {/* Green flash */}
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-accent-up"
          />
          
          {/* Win message */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="text-6xl mb-2"
            >
              🎉
            </motion.div>
            <div className="text-2xl font-bold text-accent-up mb-1">
              You won!
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-mono font-bold text-accent-up"
            >
              +{formatCurrency(lastPayout!)}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Loss overlay */}
      {isLoss && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
          {/* Red flash */}
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-accent-down"
          />
          
          {/* Shake container */}
          <motion.div
            animate={{ x: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="text-4xl mb-2">
              📉
            </div>
            <div className="text-xl font-bold text-accent-down">
              Rugged!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

