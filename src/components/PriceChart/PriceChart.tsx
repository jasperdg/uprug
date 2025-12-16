import { useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { usePriceStore } from '../../stores/priceStore'
import { useGameStore } from '../../stores/gameStore'
import { formatPrice, formatPercentage, calculatePercentChange } from '../../utils/formatters'

interface EpochLine {
  timestamp: number
  isPast: boolean
}

interface EpochZone {
  start: number
  end: number
  type: 'resolving' | 'betting' | 'future'
}

// Memoized chart component
const MemoizedLineChart = memo(function MemoizedLineChart({
  chartData,
  minPrice,
  maxPrice,
  xDomain,
  isUp,
  referencePrice,
  epochLines,
  epochZones,
}: {
  chartData: Array<{ timestamp: number; price: number }>
  minPrice: number
  maxPrice: number
  xDomain: [number, number]
  isUp: boolean
  referencePrice: number | null
  epochLines: EpochLine[]
  epochZones: EpochZone[]
}) {
  const lastDataPoint = chartData[chartData.length - 1]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <XAxis 
          dataKey="timestamp" 
          hide 
          domain={xDomain}
          type="number"
          allowDataOverflow
        />
        <YAxis domain={[minPrice, maxPrice]} hide />
        
        {/* Epoch zone backgrounds */}
        {epochZones.map((zone, i) => (
          <ReferenceArea
            key={`zone-${i}-${zone.start}`}
            x1={zone.start}
            x2={zone.end}
            fill={
              zone.type === 'resolving' 
                ? 'rgba(255, 160, 60, 0.08)' // Warm amber for resolving
                : zone.type === 'betting'
                  ? 'rgba(120, 60, 180, 0.12)' // Dark purple for betting
                  : 'rgba(60, 60, 80, 0.05)' // Subtle gray for future
            }
            fillOpacity={1}
          />
        ))}
        
        {/* Epoch boundary vertical lines from server timestamps */}
        {epochLines.map((line, i) => (
          <ReferenceLine
            key={`epoch-${i}-${line.timestamp}`}
            x={line.timestamp}
            stroke="var(--text-secondary)"
            strokeDasharray="3 3"
            strokeOpacity={line.isPast ? 0.5 : 0.25}
            strokeWidth={1}
          />
        ))}
        
        {/* Reference price horizontal line */}
        {referencePrice && (
          <ReferenceLine
            y={referencePrice}
            stroke="var(--text-primary)"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        )}
        
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: { timestamp: number; price: number } }) => {
            // Only render dot on the last data point
            if (!props.payload || !props.cx || !props.cy) return null
            if (props.payload.timestamp !== lastDataPoint?.timestamp) return null
            return (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
                stroke="var(--bg-primary)"
                strokeWidth={2}
              />
            )
          }}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export function PriceChart() {
  const { priceHistory, currentPrice, previousPrice } = usePriceStore()
  const { referencePrice, epochTimestamps } = useGameStore()
  
  const percentChange = useMemo(() => {
    if (referencePrice) {
      return calculatePercentChange(currentPrice, referencePrice)
    }
    return calculatePercentChange(currentPrice, previousPrice)
  }, [currentPrice, previousPrice, referencePrice])
  
  const isUp = percentChange >= 0
  
  // Transform price history to use timestamps as x-axis
  const { chartData, epochLines, epochZones, xDomain } = useMemo(() => {
    const data: Array<{ timestamp: number; price: number }> = []
    
    // Add actual price data with timestamps
    priceHistory.forEach((point) => {
      data.push({
        timestamp: point.timestamp,
        price: point.price,
      })
    })
    
    const now = Date.now()
    const lastTimestamp = data.length > 0 ? data[data.length - 1].timestamp : now
    
    // Calculate domain: show data centered with current time in middle
    // Show ~20 seconds of history and ~20 seconds of future
    const timeWindow = 40000 // 40 seconds total
    const halfWindow = timeWindow / 2
    const domainStart = lastTimestamp - halfWindow
    const domainEnd = lastTimestamp + halfWindow
    const domain: [number, number] = [domainStart, domainEnd]
    
    // Convert epoch timestamps to epoch lines
    const lines: EpochLine[] = epochTimestamps
      .filter(ts => ts >= domainStart && ts <= domainEnd)
      .map(ts => ({
        timestamp: ts,
        isPast: ts <= lastTimestamp
      }))
    
    // Create epoch zones for background highlighting
    const zones: EpochZone[] = []
    const visibleTimestamps = epochTimestamps.filter(ts => ts >= domainStart - 10000 && ts <= domainEnd + 10000)
    
    for (let i = 0; i < visibleTimestamps.length; i++) {
      const epochEnd = visibleTimestamps[i]
      const epochStart = epochEnd - 10000 // 10 second epochs
      
      // Clamp to visible domain
      const zoneStart = Math.max(epochStart, domainStart)
      const zoneEnd = Math.min(epochEnd, domainEnd)
      
      if (zoneStart >= zoneEnd) continue
      
      // Determine zone type based on current time
      let zoneType: 'resolving' | 'betting' | 'future'
      
      if (epochEnd <= lastTimestamp) {
        // This epoch has already ended - it's in the past (no special highlight)
        continue
      } else if (epochStart <= lastTimestamp && epochEnd > lastTimestamp) {
        // Current time is within this epoch - this is the resolving epoch
        zoneType = 'resolving'
      } else if (epochStart > lastTimestamp) {
        // Find the next epoch after resolving
        const resolvingEpochEnd = visibleTimestamps.find(ts => ts > lastTimestamp)
        if (resolvingEpochEnd && epochStart === resolvingEpochEnd) {
          // This is the betting open epoch (next one after resolving)
          zoneType = 'betting'
        } else {
          // Future epochs
          zoneType = 'future'
        }
      } else {
        continue
      }
      
      zones.push({
        start: zoneStart,
        end: zoneEnd,
        type: zoneType
      })
    }
    
    return { 
      chartData: data, 
      epochLines: lines,
      epochZones: zones,
      xDomain: domain
    }
  }, [priceHistory, epochTimestamps])
  
  // Calculate Y-axis domain
  const [minPrice, maxPrice] = useMemo(() => {
    if (chartData.length === 0) return [0, 100]
    let min = Infinity
    let max = -Infinity
    for (const point of chartData) {
      if (point.price < min) min = point.price
      if (point.price > max) max = point.price
    }
    const padding = (max - min) * 0.15 || 0.1
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
          <span className="text-xs text-text-secondary">SOL/USD</span>
        </div>
        <div className={`flex items-center gap-1 text-lg font-mono font-semibold ${
          isUp ? 'text-accent-up' : 'text-accent-down'
        }`}>
          <span>{isUp ? '▲' : '▼'}</span>
          <span>{formatPercentage(percentChange)}</span>
        </div>
      </div>
      
      {/* Reference price indicator */}
      {referencePrice && (
        <div className="absolute top-14 left-4 text-xs text-text-secondary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-text-primary animate-pulse" />
          <span>Ref: ${formatPrice(referencePrice)}</span>
        </div>
      )}
      
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <MemoizedLineChart
          chartData={chartData}
          minPrice={minPrice}
          maxPrice={maxPrice}
          xDomain={xDomain}
          isUp={isUp}
          referencePrice={referencePrice}
          epochLines={epochLines}
          epochZones={epochZones}
        />
      </div>
      
      {/* Connection indicator */}
      {priceHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-text-primary animate-pulse" />
            <span>Connecting to price feed...</span>
          </div>
        </div>
      )}
    </div>
  )
}
