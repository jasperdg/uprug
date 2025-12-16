import { create } from 'zustand'

export interface PricePoint {
  price: number
  timestamp: number
  epoch?: number
  isEpochEnd?: boolean
  isExtrapolated?: boolean // For synthetic horizontal points
}

interface PriceState {
  currentPrice: number
  previousPrice: number
  priceHistory: PricePoint[]
  isConnected: boolean
  lastUpdate: number
  lastRealUpdate: number // Track when we last got real data
  
  // Actions
  setPrice: (price: number) => void
  addPricePoint: (point: PricePoint) => void
  addExtrapolatedPoint: () => void // Add horizontal point at current price
  setConnected: (connected: boolean) => void
  initializeHistory: (history: PricePoint[]) => void
  clearHistory: () => void
  markLastPointAsEpochEnd: () => void
}

const MAX_HISTORY_POINTS = 500 // Store more history for smooth chart

export const usePriceStore = create<PriceState>((set, get) => ({
  currentPrice: 0,
  previousPrice: 0,
  priceHistory: [],
  isConnected: false,
  lastUpdate: 0,
  lastRealUpdate: 0,
  
  setPrice: (price: number) => {
    const { currentPrice } = get()
    set({
      previousPrice: currentPrice,
      currentPrice: price,
      lastUpdate: Date.now(),
    })
  },
  
  addPricePoint: (point: PricePoint) => {
    const { priceHistory, currentPrice } = get()
    const now = Date.now()
    
    // Efficiently add point - mutate if under limit, otherwise slice
    let newHistory: PricePoint[]
    if (priceHistory.length < MAX_HISTORY_POINTS) {
      newHistory = [...priceHistory, point]
    } else {
      // Remove oldest, add newest - avoid spread + slice combo
      newHistory = priceHistory.slice(1)
      newHistory.push(point)
    }
    
    set({
      priceHistory: newHistory,
      previousPrice: currentPrice,
      currentPrice: point.price,
      lastUpdate: now,
      lastRealUpdate: now,
    })
  },
  
  // Add a synthetic point at the current price (for horizontal line when no data)
  addExtrapolatedPoint: () => {
    const { priceHistory, currentPrice, lastRealUpdate, lastUpdate } = get()
    
    // Only extrapolate if we have data and haven't received real data recently
    if (priceHistory.length === 0 || currentPrice === 0) return
    
    const now = Date.now()
    const timeSinceRealData = now - lastRealUpdate
    
    // Only add extrapolated points if no real data for 200ms+
    // This drastically reduces extrapolated point creation
    if (timeSinceRealData < 200) return
    
    // Rate limit extrapolated points - max one every 100ms
    if (now - lastUpdate < 100) return
    
    // Get the last point's epoch
    const lastPoint = priceHistory[priceHistory.length - 1]
    
    // Don't extrapolate past epoch boundaries
    if (lastPoint?.isEpochEnd) return
    
    const newPoint: PricePoint = {
      price: currentPrice,
      timestamp: now,
      epoch: lastPoint?.epoch,
      isExtrapolated: true,
    }
    
    // Efficiently add point
    let newHistory: PricePoint[]
    if (priceHistory.length < MAX_HISTORY_POINTS) {
      newHistory = [...priceHistory, newPoint]
    } else {
      newHistory = priceHistory.slice(1)
      newHistory.push(newPoint)
    }
    
    set({
      priceHistory: newHistory,
      lastUpdate: now,
    })
  },
  
  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },
  
  initializeHistory: (history: PricePoint[]) => {
    const lastPoint = history[history.length - 1]
    const now = Date.now()
    set({
      priceHistory: history.slice(-MAX_HISTORY_POINTS),
      currentPrice: lastPoint?.price || 0,
      lastUpdate: now,
      lastRealUpdate: now,
    })
  },
  
  clearHistory: () => {
    set({ priceHistory: [] })
  },
  
  markLastPointAsEpochEnd: () => {
    const { priceHistory } = get()
    if (priceHistory.length === 0) return
    
    const lastPoint = priceHistory[priceHistory.length - 1]
    if (lastPoint && !lastPoint.isEpochEnd) {
      // Create new array with updated last point to properly trigger re-render
      const newHistory = priceHistory.slice(0, -1)
      newHistory.push({ ...lastPoint, isEpochEnd: true })
      set({ priceHistory: newHistory })
    }
  },
}))
