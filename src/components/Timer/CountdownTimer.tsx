import { useGameStore, useSeconds } from '../../stores/gameStore'

export function CountdownTimer() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const seconds = useSeconds() // Derived selector - only re-renders when second changes
  const progress = timeRemaining / 10000 // 0 to 1
  
  // Color based on urgency - red when low time
  const barColor = seconds <= 3 ? 'bg-accent-down' : 'bg-accent-up'
  const textColor = seconds <= 3 ? 'text-accent-down' : 'text-text-primary'
  
  return (
    <div className="w-full px-4 py-3">
      {/* Timer bar container */}
      <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
        {/* Progress bar */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-100 ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
        
        {/* Glow effect on bar */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full blur-sm opacity-50 ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      
      {/* Timer text and status */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-secondary uppercase tracking-wide">
          Place your bet
        </span>
        <span className={`font-mono text-lg font-bold ${textColor}`}>
          {seconds}s
        </span>
      </div>
    </div>
  )
}

