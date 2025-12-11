import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../stores/userStore'
import { formatCurrency } from '../../utils/formatters'

export function BalanceDisplay() {
  const { balance, resetBalance } = useUserStore()
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary uppercase tracking-wide">Balance</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={balance.toFixed(2)}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-lg font-bold text-text-primary"
          >
            {formatCurrency(balance)}
          </motion.span>
        </AnimatePresence>
      </div>
      
      {balance < 1 && (
        <button
          onClick={resetBalance}
          className="px-3 py-1 text-xs font-medium text-text-primary bg-text-primary/10 rounded-full hover:bg-text-primary/20 active:scale-95 transition-all"
        >
          Reset
        </button>
      )}
    </div>
  )
}

