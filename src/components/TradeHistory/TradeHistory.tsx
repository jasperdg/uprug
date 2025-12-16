import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../stores/userStore'
import { formatCurrency } from '../../utils/formatters'

export function TradeHistory() {
  const [isExpanded, setIsExpanded] = useState(false)
  const betHistory = useUserStore((state) => state.betHistory)
  
  // Memoize calculations to prevent recalculating on every render
  const { recentTrades, totalTrades, wins, losses, totalPnL } = useMemo(() => {
    const recent = betHistory.slice(0, 20)
    const total = betHistory.length
    const w = betHistory.filter(b => b.payout && b.payout > 0).length
    const l = betHistory.filter(b => b.payout === 0).length
    const pnl = betHistory.reduce((acc, b) => {
      if (b.payout === null) return acc
      return acc + (b.payout - b.amount)
    }, 0)
    return { recentTrades: recent, totalTrades: total, wins: w, losses: l, totalPnL: pnl }
  }, [betHistory])
  
  return (
    <div className="border-t border-border bg-bg-secondary">
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">
            Trade History
          </span>
          <span className="text-xs font-mono text-text-secondary">
            {totalTrades} trades
          </span>
          {totalTrades > 0 && (
            <span className={`text-xs font-mono font-bold ${totalPnL >= 0 ? 'text-accent-up' : 'text-accent-down'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-secondary"
        >
          ▼
        </motion.span>
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Stats Bar */}
            {totalTrades > 0 && (
              <div className="px-4 py-2 border-t border-border/50 flex gap-4 text-xs">
                <div>
                  <span className="text-text-secondary">Win Rate: </span>
                  <span className="font-mono font-bold text-text-primary">
                    {totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">W/L: </span>
                  <span className="font-mono text-accent-up">{wins}</span>
                  <span className="text-text-secondary">/</span>
                  <span className="font-mono text-accent-down">{losses}</span>
                </div>
              </div>
            )}
            
            {/* Trade List */}
            <div className="max-h-48 overflow-y-auto">
              {recentTrades.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-secondary">
                  No trades yet. Place your first bet!
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentTrades.map((trade, i) => (
                    <div
                      key={`${trade.roundNumber}-${trade.timestamp}-${i}`}
                      className="px-4 py-2 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${trade.direction === 'up' ? '' : ''}`}>
                          {trade.direction === 'up' ? '⬆️' : '⬇️'}
                        </span>
                        <div>
                          <div className="font-mono text-text-primary">
                            {formatCurrency(trade.amount)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            #{trade.roundNumber}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {trade.payout === null ? (
                          <span className="text-text-secondary">Pending...</span>
                        ) : trade.payout > 0 ? (
                          <div>
                            <div className="font-mono font-bold text-accent-up">
                              +{formatCurrency(trade.payout - trade.amount)}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Won {formatCurrency(trade.payout)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-bold text-accent-down">
                              -{formatCurrency(trade.amount)}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Rugged
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

