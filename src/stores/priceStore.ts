import { create } from 'zustand'

export interface PricePoint {
  price: number
  timestamp: number
  epoch?: number
  isEpochEnd?: boolean
}

interface PriceState {
  currentPrice: number
  previousPrice: number
  priceHistory: PricePoint[]
  isConnected: boolean
  lastUpdate: number
  
  // Actions
  setPrice: (price: number) => void
  addPricePoint: (point: PricePoint) => void
  setConnected: (connected: boolean) => void
  initializeHistory: (history: PricePoint[]) => void
  clearHistory: () => void
  markLastPointAsEpochEnd: () => void
}

const MAX_HISTORY_POINTS = 100

export const usePriceStore = create<PriceState>((set, get) => ({
  currentPrice: 0,
  previousPrice: 0,
  priceHistory: [],
  isConnected: false,
  lastUpdate: 0,
  
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
    
    const newHistory = [...priceHistory, point].slice(-MAX_HISTORY_POINTS)
    
    set({
      priceHistory: newHistory,
      previousPrice: currentPrice,
      currentPrice: point.price,
      lastUpdate: point.timestamp,
    })
  },
  
  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },
  
  initializeHistory: (history: PricePoint[]) => {
    const lastPoint = history[history.length - 1]
    set({
      priceHistory: history.slice(-MAX_HISTORY_POINTS),
      currentPrice: lastPoint?.price || 0,
      lastUpdate: lastPoint?.timestamp || Date.now(),
    })
  },
  
  clearHistory: () => {
    set({ priceHistory: [] })
  },
  
  markLastPointAsEpochEnd: () => {
    const { priceHistory } = get()
    if (priceHistory.length === 0) return
    
    // Mark the last point as epoch end (server determined this is the settlement tick)
    const newHistory = [...priceHistory]
    newHistory[newHistory.length - 1] = {
      ...newHistory[newHistory.length - 1],
      isEpochEnd: true
    }
    set({ priceHistory: newHistory })
  },
}))
