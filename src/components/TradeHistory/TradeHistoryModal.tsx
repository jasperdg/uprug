import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../stores/userStore'
import { formatCurrency } from '../../utils/formatters'

interface TradeHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TradeHistoryModal({ isOpen, onClose }: TradeHistoryModalProps) {
  const betHistory = useUserStore((state) => state.betHistory)
  
  const { recentTrades, totalTrades, wins, losses, totalPnL, winRate } = useMemo(() => {
    const recent = betHistory.slice(0, 50)
    const total = betHistory.length
    const w = betHistory.filter(b => b.payout && b.payout > 0).length
    const l = betHistory.filter(b => b.payout === 0).length
    const pnl = betHistory.reduce((acc, b) => {
      if (b.payout === null) return acc
      return acc + (b.payout - b.amount)
    }, 0)
    const rate = total > 0 ? Math.round((w / total) * 100) : 0
    return { recentTrades: recent, totalTrades: total, wins: w, losses: l, totalPnL: pnl, winRate: rate }
  }, [betHistory])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 top-16 bottom-24 z-50 bg-bg-secondary rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-bold text-text-primary">Trade History</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Stats */}
            {totalTrades > 0 && (
              <div className="px-4 py-3 border-b border-border/50 bg-bg-tertiary/30">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-xl font-mono font-bold text-text-primary">{totalTrades}</div>
                    <div className="text-xs text-text-secondary">Trades</div>
                  </div>
                  <div>
                    <div className="text-xl font-mono font-bold text-accent-up">{winRate}%</div>
                    <div className="text-xs text-text-secondary">Win Rate</div>
                  </div>
                  <div>
                    <div className="text-xl font-mono font-bold">
                      <span className="text-accent-up">{wins}</span>
                      <span className="text-text-secondary">/</span>
                      <span className="text-accent-down">{losses}</span>
                    </div>
                    <div className="text-xs text-text-secondary">W/L</div>
                  </div>
                  <div>
                    <div className={`text-xl font-mono font-bold ${totalPnL >= 0 ? 'text-accent-up' : 'text-accent-down'}`}>
                      {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                    </div>
                    <div className="text-xs text-text-secondary">P&L</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Trade List */}
            <div className="flex-1 overflow-y-auto">
              {recentTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                  <span className="text-4xl mb-2">📊</span>
                  <span>No trades yet</span>
                  <span className="text-sm">Place your first bet!</span>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentTrades.map((trade, i) => (
                    <div
                      key={`${trade.roundNumber}-${trade.timestamp}-${i}`}
                      className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center text-xl
                          ${trade.direction === 'up' ? 'bg-accent-up/20' : 'bg-accent-down/20'}
                        `}>
                          {trade.direction === 'up' ? '⬆️' : '⬇️'}
                        </div>
                        <div>
                          <div className="font-mono font-bold text-text-primary">
                            {formatCurrency(trade.amount)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            Epoch #{trade.roundNumber}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {trade.payout === null ? (
                          <div className="text-text-secondary">
                            <div className="font-mono">Pending</div>
                            <div className="text-xs">⏳</div>
                          </div>
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
                              Rugged 💀
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
        </>
      )}
    </AnimatePresence>
  )
}

