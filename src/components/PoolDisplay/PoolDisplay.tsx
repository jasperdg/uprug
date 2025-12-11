import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { formatCurrency, formatOdds } from '../../utils/formatters'
import { calculateOdds } from '../../utils/parimutuel'

export function PoolDisplay() {
  const { currentPools } = useGameStore()
  
  const { upPercent, downPercent, upOdds, downOdds } = useMemo(() => {
    const total = currentPools.up + currentPools.down
    const upPct = total > 0 ? (currentPools.up / total) * 100 : 50
    const downPct = total > 0 ? (currentPools.down / total) * 100 : 50
    
    return {
      upPercent: upPct,
      downPercent: downPct,
      upOdds: calculateOdds(currentPools.up, currentPools.down),
      downOdds: calculateOdds(currentPools.down, currentPools.up),
    }
  }, [currentPools])
  
  return (
    <div className="px-4 py-2">
      {/* Pool bar */}
      <div className="relative h-3 bg-bg-tertiary rounded-full overflow-hidden flex">
        <div
          className="h-full bg-accent-up transition-all duration-300"
          style={{ width: `${upPercent}%` }}
        />
        <div
          className="h-full bg-accent-down transition-all duration-300"
          style={{ width: `${downPercent}%` }}
        />
      </div>
      
      {/* Pool details */}
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-accent-up font-medium">UP</span>
          <span className="text-text-secondary">{formatCurrency(currentPools.up)}</span>
          <span className="text-text-secondary">({upPercent.toFixed(0)}%)</span>
          <span className="font-mono text-accent-up">{formatOdds(upOdds)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-accent-down">{formatOdds(downOdds)}</span>
          <span className="text-text-secondary">({downPercent.toFixed(0)}%)</span>
          <span className="text-text-secondary">{formatCurrency(currentPools.down)}</span>
          <span className="text-accent-down font-medium">RUG</span>
        </div>
      </div>
    </div>
  )
}

