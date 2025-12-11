import { create } from 'zustand'

export interface PricePoint {
  price: number
  timestamp: number
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
  clearHistory: () => void
}

const MAX_HISTORY_POINTS = 120 // 2 minutes at 1 point per second

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
  
  clearHistory: () => {
    set({ priceHistory: [] })
  },
}))

