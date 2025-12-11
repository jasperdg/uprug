import { useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'
import { usePriceStore } from '../../stores/priceStore'
import { useGameStore } from '../../stores/gameStore'
import { formatPrice, formatPercentage, calculatePercentChange } from '../../utils/formatters'

const EPOCH_DURATION = 10000 // 10 seconds
const FUTURE_EPOCHS_TO_SHOW = 2

// Memoized chart component
const MemoizedLineChart = memo(function MemoizedLineChart({
  chartData,
  minPrice,
  maxPrice,
  isUp,
  referencePrice,
  resolvedMarker,
  epochBoundaries,
  futureEpochBoundaries,
  lastDataIndex,
  lastPrice,
}: {
  chartData: Array<{ index: number; price: number | null }>
  minPrice: number
  maxPrice: number
  isUp: boolean
  referencePrice: number | null
  resolvedMarker: { referencePrice: number; referenceIndex: number; outcome: string } | null
  epochBoundaries: number[]
  futureEpochBoundaries: number[]
  lastDataIndex: number
  lastPrice: number
}) {
  const markerColor = resolvedMarker?.outcome === 'up' 
    ? 'var(--accent-up)' 
    : 'var(--accent-down)'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <XAxis dataKey="index" hide domain={[0, chartData.length - 1]} />
        <YAxis domain={[minPrice, maxPrice]} hide />
        
        {/* Past epoch boundary vertical lines */}
        {epochBoundaries.map((index, i) => (
          <ReferenceLine
            key={`epoch-past-${i}-${index}`}
            x={index}
            stroke="var(--text-secondary)"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        ))}
        
        {/* Future epoch boundary vertical lines */}
        {futureEpochBoundaries.map((index, i) => (
          <ReferenceLine
            key={`epoch-future-${i}-${index}`}
            x={index}
            stroke="var(--accent-highlight)"
            strokeDasharray="6 4"
            strokeOpacity={0.3 + (i === 0 ? 0.2 : 0)}
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
        
        {/* Resolved marker horizontal line - server provided */}
        {resolvedMarker && resolvedMarker.referenceIndex >= 0 && (
          <ReferenceLine
            y={resolvedMarker.referencePrice}
            stroke={markerColor}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        )}
        
        {/* Resolved marker dot - using server-provided index */}
        {resolvedMarker && resolvedMarker.referenceIndex >= 0 && (
          <ReferenceDot
            x={resolvedMarker.referenceIndex}
            y={resolvedMarker.referencePrice}
            r={5}
            fill={markerColor}
            stroke={markerColor}
            strokeWidth={2}
          />
        )}
        
        {/* Current position dot (last tick of line) */}
        {lastDataIndex >= 0 && lastPrice > 0 && (
          <ReferenceDot
            x={lastDataIndex}
            y={lastPrice}
            r={4}
            fill={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
            stroke="var(--bg-primary)"
            strokeWidth={2}
          />
        )}
        
        <Line
          type="natural"
          dataKey="price"
          stroke={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
          strokeWidth={2}
          dot={false}
          activeDot={false}
          isAnimationActive={true}
          animationDuration={150}
          animationEasing="ease-out"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export function PriceChart() {
  const { priceHistory, currentPrice, previousPrice } = usePriceStore()
  const { referencePrice, resolvedMarker, timeRemaining } = useGameStore()
  
  const percentChange = useMemo(() => {
    if (referencePrice) {
      return calculatePercentChange(currentPrice, referencePrice)
    }
    return calculatePercentChange(currentPrice, previousPrice)
  }, [currentPrice, previousPrice, referencePrice])
  
  const isUp = percentChange >= 0
  
  // Transform data and find epoch boundaries
  const { chartData, epochBoundaries, futureEpochBoundaries, actualDataLength } = useMemo(() => {
    const data: Array<{ index: number; price: number | null }> = []
    const pastBoundaries: number[] = []
    let lastEpoch: number | undefined = undefined
    
    // Add actual price data
    priceHistory.forEach((point, index) => {
      data.push({
        index,
        price: point.price,
      })
      
      // Detect epoch change
      if (point.epoch !== undefined && lastEpoch !== undefined && point.epoch !== lastEpoch) {
        pastBoundaries.push(index)
      }
      lastEpoch = point.epoch
    })
    
    const actualLength = data.length
    
    // Add future empty points (same length as actual data)
    const futurePointsCount = Math.max(actualLength, 50)
    for (let i = 0; i < futurePointsCount; i++) {
      data.push({
        index: actualLength + i,
        price: null,
      })
    }
    
    // Calculate future epoch boundaries
    const futureBoundaries: number[] = []
    if (actualLength > 0 && timeRemaining > 0) {
      const pointsPerSecond = 10
      const pointsPerEpoch = (EPOCH_DURATION / 1000) * pointsPerSecond
      const pointsUntilNextEpoch = Math.round((timeRemaining / 1000) * pointsPerSecond)
      
      for (let i = 0; i < FUTURE_EPOCHS_TO_SHOW; i++) {
        const futureIndex = actualLength + pointsUntilNextEpoch + (i * pointsPerEpoch)
        if (futureIndex < data.length) {
          futureBoundaries.push(Math.round(futureIndex))
        }
      }
    }
    
    return { 
      chartData: data, 
      epochBoundaries: pastBoundaries, 
      futureEpochBoundaries: futureBoundaries,
      actualDataLength: actualLength
    }
  }, [priceHistory, timeRemaining])
  
  // Calculate Y-axis domain (only from actual data)
  const [minPrice, maxPrice] = useMemo(() => {
    if (actualDataLength === 0) return [0, 100]
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < actualDataLength; i++) {
      const price = chartData[i]?.price
      if (price !== null) {
        if (price < min) min = price
        if (price > max) max = price
      }
    }
    const padding = (max - min) * 0.15 || 0.1
    return [min - padding, max + padding]
  }, [chartData, actualDataLength])
  
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
          isUp={isUp}
          referencePrice={referencePrice}
          resolvedMarker={resolvedMarker}
          epochBoundaries={epochBoundaries}
          futureEpochBoundaries={futureEpochBoundaries}
          lastDataIndex={actualDataLength - 1}
          lastPrice={currentPrice}
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
