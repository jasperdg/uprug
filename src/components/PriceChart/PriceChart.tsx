import { useMemo, memo, useCallback } from 'react'
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
  epochNumber?: number
}

// Helper to get epoch color based on epoch number (odd = blue, even = purple)
function getEpochColor(epochNumber: number): string {
  return epochNumber % 2 === 1
    ? 'rgba(60, 140, 180, 0.12)'  // Teal blue for odd epochs
    : 'rgba(120, 60, 180, 0.12)' // Purple for even epochs
}

// Extracted dot renderer to avoid recreating function on every render
interface DotProps {
  cx?: number
  cy?: number
  payload?: { timestamp: number; price: number }
}

const ChartDot = memo(function ChartDot({ 
  cx, 
  cy, 
  payload, 
  lastTimestamp, 
  isUp 
}: DotProps & { lastTimestamp: number; isUp: boolean }) {
  if (!payload || !cx || !cy) return null
  if (payload.timestamp !== lastTimestamp) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
      stroke="var(--bg-primary)"
      strokeWidth={2}
    />
  )
})

// Reference price overlay - rendered separately to avoid chart re-renders
const ReferencePriceOverlay = memo(function ReferencePriceOverlay({
  referencePrice,
  minPrice,
  maxPrice,
}: {
  referencePrice: number | null
  minPrice: number
  maxPrice: number
}) {
  if (!referencePrice) return null
  
  // Calculate Y position as percentage
  const range = maxPrice - minPrice
  if (range === 0) return null
  const yPercent = ((maxPrice - referencePrice) / range) * 100
  
  // Clamp to visible range
  if (yPercent < 0 || yPercent > 100) return null
  
  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none"
      style={{ top: `${yPercent}%` }}
    >
      <div className="border-t border-dashed border-text-primary/30 w-full" />
    </div>
  )
})

// Memoized chart component
const MemoizedLineChart = memo(function MemoizedLineChart({
  chartData,
  minPrice,
  maxPrice,
  xDomain,
  isUp,
  epochLines,
  epochZones,
  lastTimestamp,
}: {
  chartData: Array<{ timestamp: number; price: number }>
  minPrice: number
  maxPrice: number
  xDomain: [number, number]
  isUp: boolean
  epochLines: EpochLine[]
  epochZones: EpochZone[]
  lastTimestamp: number
}) {
  // Stable dot renderer using useCallback
  const renderDot = useCallback((props: DotProps) => (
    <ChartDot {...props} lastTimestamp={lastTimestamp} isUp={isUp} />
  ), [lastTimestamp, isUp])

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
            zone.epochNumber !== undefined
              ? getEpochColor(zone.epochNumber) // Alternating blue/purple based on epoch
              : 'rgba(60, 60, 80, 0.05)'
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
        
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
          strokeWidth={2}
          dot={renderDot}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export function PriceChart() {
  const { priceHistory, currentPrice, previousPrice } = usePriceStore()
  const { referencePrice, epochTimestamps, currentRound } = useGameStore()
  
  const percentChange = useMemo(() => {
    if (referencePrice) {
      return calculatePercentChange(currentPrice, referencePrice)
    }
    return calculatePercentChange(currentPrice, previousPrice)
  }, [currentPrice, previousPrice, referencePrice])
  
  const isUp = percentChange >= 0
  
  // Compute chart domain and data (changes frequently with price updates)
  const { chartData, xDomain, lastTimestamp } = useMemo(() => {
    const now = Date.now()
    const lastTs = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].timestamp : now
    
    // Fixed time window: 20 seconds past, 20 seconds future
    const PAST_WINDOW = 20000
    const FUTURE_WINDOW = 20000
    const domainStart = lastTs - PAST_WINDOW
    const domainEnd = lastTs + FUTURE_WINDOW
    const domain: [number, number] = [domainStart, domainEnd]
    
    // Only include data points within the visible window
    const data: Array<{ timestamp: number; price: number }> = []
    for (const point of priceHistory) {
      if (point.timestamp >= domainStart) {
        data.push({
          timestamp: point.timestamp,
          price: point.price,
        })
      }
    }
    
    return { 
      chartData: data, 
      xDomain: domain,
      lastTimestamp: lastTs
    }
  }, [priceHistory])
  
  // Extract domain bounds as primitives for stable dependency
  const domainStart = xDomain[0]
  const domainEnd = xDomain[1]
  
  // Compute epoch lines and zones separately (changes less frequently)
  const { epochLines, epochZones } = useMemo(() => {
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
    
    // The resolving epoch is currentRound, betting is currentRound + 1
    // This matches EpochPositionCards: Position card shows currentRound, Betting card shows currentRound + 1
    const resolvingEpochNumber = currentRound
    const bettingEpochNumber = currentRound + 1
    
    for (let i = 0; i < visibleTimestamps.length; i++) {
      const epochEnd = visibleTimestamps[i]
      const epochStart = epochEnd - 10000 // 10 second epochs
      
      // Clamp to visible domain
      const zoneStart = Math.max(epochStart, domainStart)
      const zoneEnd = Math.min(epochEnd, domainEnd)
      
      if (zoneStart >= zoneEnd) continue
      
      // Determine zone type and epoch number based on current time
      let zoneType: 'resolving' | 'betting' | 'future'
      let epochNumber: number | undefined
      
      if (epochEnd <= lastTimestamp) {
        // This epoch has already ended - it's in the past (no special highlight)
        continue
      } else if (epochStart <= lastTimestamp && epochEnd > lastTimestamp) {
        // Current time is within this epoch - this is the resolving epoch
        zoneType = 'resolving'
        epochNumber = resolvingEpochNumber
      } else if (epochStart > lastTimestamp) {
        // Find the next epoch after resolving
        const resolvingEpochEnd = visibleTimestamps.find(ts => ts > lastTimestamp)
        if (resolvingEpochEnd && epochStart === resolvingEpochEnd) {
          // This is the betting open epoch (next one after resolving)
          zoneType = 'betting'
          epochNumber = bettingEpochNumber
        } else {
          // Future epochs - calculate epoch number relative to current
          // Use epochStart (not epochEnd) to correctly count epochs ahead
          const epochsAhead = Math.round((epochStart - resolvingEpochEnd!) / 10000)
          epochNumber = bettingEpochNumber + epochsAhead
          zoneType = 'future'
        }
      } else {
        continue
      }
      
      zones.push({
        start: zoneStart,
        end: zoneEnd,
        type: zoneType,
        epochNumber
      })
    }
    
    return { 
      epochLines: lines,
      epochZones: zones
    }
  }, [epochTimestamps, domainStart, domainEnd, lastTimestamp, currentRound])
  
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
      <div className="flex-1 min-h-0 relative">
        <MemoizedLineChart
          chartData={chartData}
          minPrice={minPrice}
          maxPrice={maxPrice}
          xDomain={xDomain}
          isUp={isUp}
          epochLines={epochLines}
          epochZones={epochZones}
          lastTimestamp={lastTimestamp}
        />
        {/* Reference price overlay - rendered separately to avoid chart re-renders */}
        <div className="absolute inset-0 pointer-events-none" style={{ margin: '5px 10px 5px 10px' }}>
          <div className="relative w-full h-full">
            <ReferencePriceOverlay 
              referencePrice={referencePrice}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>
        </div>
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
