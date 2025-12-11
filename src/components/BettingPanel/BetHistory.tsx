import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../stores/userStore'
import { formatCurrency } from '../../utils/formatters'

export function BetHistory() {
  const [isOpen, setIsOpen] = useState(false)
  const { betHistory } = useUserStore()
  
  const recentBets = betHistory.slice(0, 10)
  
  if (recentBets.length === 0) return null
  
  const wins = recentBets.filter(b => b.payout && b.payout > 0).length
  const losses = recentBets.filter(b => b.payout === 0).length
  
  return (
    <div className="px-4 py-2 border-t border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm text-text-secondary hover:text-text-primary transition-colors touch-manipulation"
      >
        <span>Recent bets</span>
        <div className="flex items-center gap-3">
          <span className="text-accent-up">{wins}W</span>
          <span className="text-accent-down">{losses}L</span>
          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2 space-y-2 max-h-48 overflow-y-auto">
              {recentBets.map((bet, index) => {
                const isWin = bet.payout && bet.payout > 0
                return (
                  <div
                    key={`${bet.roundNumber}-${index}`}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${bet.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}`}>
                        {bet.direction.toUpperCase()}
                      </span>
                      <span className="text-text-secondary">
                        {formatCurrency(bet.amount)}
                      </span>
                    </div>
                    <span className={`font-mono ${isWin ? 'text-accent-up' : 'text-accent-down'}`}>
                      {isWin ? `+${formatCurrency(bet.payout!)}` : `-${formatCurrency(bet.amount)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

