import { motion } from 'framer-motion'
import type { BetDirection } from '../../stores/gameStore'

interface BetButtonProps {
  direction: BetDirection
  odds: number
  isSelected: boolean
  isDisabled: boolean
  onClick: () => void
}

export function BetButton({
  direction,
  odds,
  isSelected,
  isDisabled,
  onClick,
}: BetButtonProps) {
  const isUp = direction === 'up'
  
  const baseClasses = `
    relative flex-1 min-h-[80px] md:min-h-[100px]
    flex flex-col items-center justify-center gap-1
    rounded-xl font-bold text-lg
    transition-all duration-150
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    touch-manipulation
    overflow-hidden
  `
  
  const upClasses = isSelected
    ? 'bg-accent-up text-bg-primary shadow-lg shadow-accent-up/40 border-2 border-accent-up'
    : 'bg-accent-up/15 text-accent-up border-2 border-accent-up/40 hover:bg-accent-up/25 hover:border-accent-up/60'
  
  const downClasses = isSelected
    ? 'bg-accent-down text-bg-primary shadow-lg shadow-accent-down/40 border-2 border-accent-down'
    : 'bg-accent-down/15 text-accent-down border-2 border-accent-down/40 hover:bg-accent-down/25 hover:border-accent-down/60'
  
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${isUp ? upClasses : downClasses}`}
    >
      {/* Selected glow effect */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`absolute inset-0 ${isUp ? 'bg-accent-up/20' : 'bg-accent-down/20'}`}
          style={{
            background: isUp 
              ? 'radial-gradient(circle at center, rgba(34, 197, 94, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)'
          }}
        />
      )}
      
      {/* Icon */}
      <motion.span 
        className="text-2xl md:text-3xl relative z-10"
        animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {isUp ? '▲' : '▼'}
      </motion.span>
      
      {/* Label */}
      <span className="text-base md:text-lg font-bold uppercase tracking-wide relative z-10">
        {isUp ? 'UP' : 'RUG'}
      </span>
      
      {/* Odds */}
      <span className={`font-mono text-sm relative z-10 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
        {odds > 0 && isFinite(odds) ? `${odds.toFixed(2)}x` : '-'}
      </span>
      
      {/* Bottom indicator bar when selected */}
      {isSelected && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`absolute bottom-0 left-0 right-0 h-1 ${isUp ? 'bg-white/50' : 'bg-white/50'}`}
        />
      )}
    </motion.button>
  )
}
