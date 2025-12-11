import { motion, AnimatePresence } from 'framer-motion'
import { usePriceStore } from '../../stores/priceStore'
import { useBinanceWebSocket } from '../../hooks/useBinanceWebSocket'

export function ConnectionStatus() {
  const isConnected = usePriceStore((state) => state.isConnected)
  const { reconnect } = useBinanceWebSocket()
  
  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-4 right-4 z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-accent-down/20 border border-accent-down/30 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-down animate-pulse" />
              <span className="text-sm text-text-primary">
                Reconnecting to price feed...
              </span>
            </div>
            <button
              onClick={reconnect}
              className="px-3 py-1 text-xs font-medium bg-accent-down/30 rounded-full hover:bg-accent-down/40 transition-colors touch-manipulation"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

