import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../stores/gameStore'
import { formatCurrency } from '../../utils/formatters'

export function ResultToast() {
  const { showResult, lastPayout } = useGameStore()
  
  if (!showResult || lastPayout === null) return null
  
  const isWin = lastPayout > 0
  
  return (
    <AnimatePresence>
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
        >
          <div className={`
            px-6 py-3 rounded-full font-mono font-bold text-lg
            shadow-lg
            ${isWin 
              ? 'bg-accent-up text-bg-primary shadow-accent-up/30' 
              : 'bg-accent-down text-bg-primary shadow-accent-down/30'
            }
          `}>
            {isWin ? '+' : '-'}{formatCurrency(isWin ? lastPayout : 0)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

