import { useGameStore } from '../../stores/gameStore'

export function CountdownTimer() {
  const { timeRemaining, roundPhase } = useGameStore()
  
  const seconds = Math.ceil(timeRemaining / 1000)
  const progress = timeRemaining / 10000 // 0 to 1
  
  // Color based on urgency
  const getBarColor = () => {
    if (roundPhase === 'locked' || roundPhase === 'resolving') {
      return 'bg-accent-highlight'
    }
    if (seconds <= 3) {
      return 'bg-accent-down'
    }
    return 'bg-accent-up'
  }
  
  const getTextColor = () => {
    if (roundPhase === 'locked' || roundPhase === 'resolving') {
      return 'text-accent-highlight'
    }
    if (seconds <= 3) {
      return 'text-accent-down'
    }
    return 'text-text-primary'
  }
  
  return (
    <div className="w-full px-4 py-3">
      {/* Timer bar container */}
      <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
        {/* Progress bar */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-100 ${getBarColor()}`}
          style={{ width: `${progress * 100}%` }}
        />
        
        {/* Glow effect on bar */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full blur-sm opacity-50 ${getBarColor()}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      
      {/* Timer text and status */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-secondary uppercase tracking-wide">
          {roundPhase === 'betting' && 'Place your bet'}
          {roundPhase === 'locked' && 'Bets locked'}
          {roundPhase === 'resolving' && 'Resolving...'}
        </span>
        <span className={`font-mono text-lg font-bold ${getTextColor()}`}>
          {seconds}s
        </span>
      </div>
    </div>
  )
}

