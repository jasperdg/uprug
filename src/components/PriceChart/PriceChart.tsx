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

// Memoized chart component
const MemoizedLineChart = memo(function MemoizedLineChart({
  chartData,
  minPrice,
  maxPrice,
  isUp,
  referencePrice,
  resolvedMarker,
  resolvedMarkerIndex,
  markerColor,
  epochBoundaries,
}: {
  chartData: Array<{ index: number; price: number; epoch?: number }>
  minPrice: number
  maxPrice: number
  isUp: boolean
  referencePrice: number | null
  resolvedMarker: { referencePrice: number; outcome: string } | null
  resolvedMarkerIndex: number
  markerColor: string
  epochBoundaries: number[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <XAxis dataKey="index" hide />
        <YAxis domain={[minPrice, maxPrice]} hide />
        
        {/* Epoch boundary vertical lines */}
        {epochBoundaries.map((index, i) => (
          <ReferenceLine
            key={`epoch-${i}-${index}`}
            x={index}
            stroke="var(--text-secondary)"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        ))}
        
        {/* Reference price horizontal line (current epoch reference) */}
        {referencePrice && (
          <ReferenceLine
            y={referencePrice}
            stroke="var(--text-primary)"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        )}
        
        {/* Resolved marker horizontal line */}
        {resolvedMarker && resolvedMarkerIndex >= 0 && (
          <ReferenceLine
            y={resolvedMarker.referencePrice}
            stroke={markerColor}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        )}
        
        {/* Resolved marker dot */}
        {resolvedMarker && resolvedMarkerIndex >= 0 && (
          <ReferenceDot
            x={resolvedMarkerIndex}
            y={resolvedMarker.referencePrice}
            r={5}
            fill={markerColor}
            stroke={markerColor}
            strokeWidth={2}
          />
        )}
        
        <Line
          type="natural"
          dataKey="price"
          stroke={isUp ? 'var(--accent-up)' : 'var(--accent-down)'}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={150}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export function PriceChart() {
  const { priceHistory, currentPrice, previousPrice } = usePriceStore()
  const { referencePrice, resolvedMarker } = useGameStore()
  
  const percentChange = useMemo(() => {
    if (referencePrice) {
      return calculatePercentChange(currentPrice, referencePrice)
    }
    return calculatePercentChange(currentPrice, previousPrice)
  }, [currentPrice, previousPrice, referencePrice])
  
  const isUp = percentChange >= 0
  
  // Transform data and find epoch boundaries
  const { chartData, epochBoundaries } = useMemo(() => {
    const data: Array<{ index: number; price: number; epoch?: number }> = []
    const boundaries: number[] = []
    let lastEpoch: number | undefined = undefined
    
    priceHistory.forEach((point, index) => {
      data.push({
        index,
        price: point.price,
        epoch: point.epoch,
      })
      
      // Detect epoch change
      if (point.epoch !== undefined && lastEpoch !== undefined && point.epoch !== lastEpoch) {
        boundaries.push(index)
      }
      lastEpoch = point.epoch
    })
    
    return { chartData: data, epochBoundaries: boundaries }
  }, [priceHistory])
  
  // Find index for resolved marker
  const resolvedMarkerIndex = useMemo(() => {
    if (!resolvedMarker || chartData.length === 0) return -1
    
    let bestIndex = -1
    let minDiff = Infinity
    
    const checkLength = Math.min(chartData.length, Math.floor(chartData.length / 2) + 10)
    for (let i = 0; i < checkLength; i++) {
      const diff = Math.abs(chartData[i].price - resolvedMarker.referencePrice)
      if (diff < minDiff) {
        minDiff = diff
        bestIndex = i
      }
      if (diff < 0.001) break
    }
    
    return bestIndex
  }, [chartData, resolvedMarker])
  
  // Calculate Y-axis domain
  const [minPrice, maxPrice] = useMemo(() => {
    if (chartData.length === 0) return [0, 100]
    let min = Infinity
    let max = -Infinity
    for (const d of chartData) {
      if (d.price < min) min = d.price
      if (d.price > max) max = d.price
    }
    const padding = (max - min) * 0.1 || 0.1
    return [min - padding, max + padding]
  }, [chartData])
  
  const markerColor = resolvedMarker?.outcome === 'up' 
    ? 'var(--accent-up)' 
    : 'var(--accent-down)'
  
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
          resolvedMarkerIndex={resolvedMarkerIndex}
          markerColor={markerColor}
          epochBoundaries={epochBoundaries}
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
