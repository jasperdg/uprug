import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { usePriceStore } from '../../stores/priceStore'
import { useGameStore } from '../../stores/gameStore'
import { formatPrice, formatPercentage, calculatePercentChange } from '../../utils/formatters'

export function PriceChart() {
  const { priceHistory, currentPrice, previousPrice } = usePriceStore()
  const { pendingRound } = useGameStore()
  
  const percentChange = useMemo(() => {
    if (pendingRound?.referencePrice) {
      return calculatePercentChange(currentPrice, pendingRound.referencePrice)
    }
    return calculatePercentChange(currentPrice, previousPrice)
  }, [currentPrice, previousPrice, pendingRound])
  
  const isUp = percentChange >= 0
  
  // Transform data for chart
  const chartData = useMemo(() => {
    return priceHistory.map((point, index) => ({
      index,
      price: point.price,
      timestamp: point.timestamp,
    }))
  }, [priceHistory])
  
  // Calculate Y-axis domain with some padding
  const [minPrice, maxPrice] = useMemo(() => {
    if (chartData.length === 0) return [0, 100]
    const prices = chartData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const padding = (max - min) * 0.1 || 0.1
    return [min - padding, max + padding]
  }, [chartData])
  
  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Price display */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-mono font-bold text-text-primary">
            ${formatPrice(currentPrice)}
          </span>
          <span className="text-xs text-text-secondary">SOL/USDT</span>
        </div>
        <div className={`flex items-center gap-1 text-lg font-mono font-semibold ${
          isUp ? 'text-accent-up' : 'text-accent-down'
        }`}>
          <span>{isUp ? '▲' : '▼'}</span>
          <span>{formatPercentage(percentChange)}</span>
        </div>
      </div>
      
      {/* Reference price indicator */}
      {pendingRound && (
        <div className="absolute top-14 left-4 text-xs text-text-secondary">
          Ref: ${formatPrice(pendingRound.referencePrice)}
        </div>
      )}
      
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
                  stopOpacity={0}
                />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <XAxis dataKey="index" hide />
            <YAxis domain={[minPrice, maxPrice]} hide />
            
            {/* Reference price line */}
            {pendingRound && (
              <ReferenceLine
                y={pendingRound.referencePrice}
                stroke="var(--text-secondary)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="price"
              stroke={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              filter="url(#glow)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Connection indicator */}
      {priceHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-accent-highlight animate-pulse" />
            <span>Connecting to price feed...</span>
          </div>
        </div>
      )}
    </div>
  )
}

