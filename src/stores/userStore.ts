import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BetDirection } from './gameStore'

export interface BetRecord {
  roundNumber: number
  direction: BetDirection
  amount: number
  outcome: BetDirection | null
  payout: number | null
  timestamp: number
}

interface UserState {
  balance: number
  currentBet: { direction: BetDirection; amount: number; spread?: number } | null
  selectedStake: number
  betHistory: BetRecord[]
  soundEnabled: boolean
  hapticEnabled: boolean
  
  // Actions
  setBalance: (balance: number) => void
  adjustBalance: (amount: number) => void
  placeBet: (direction: BetDirection, amount: number, spread?: number) => boolean
  clearCurrentBet: () => void
  setSelectedStake: (stake: number) => void
  addBetRecord: (record: BetRecord) => void
  toggleSound: () => void
  toggleHaptic: () => void
  resetBalance: () => void
}

const INITIAL_BALANCE = 100

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      currentBet: null,
      selectedStake: 1,
      betHistory: [],
      soundEnabled: true,
      hapticEnabled: true,
      
      setBalance: (balance: number) => set({ balance }),
      
      adjustBalance: (amount: number) => {
        const { balance } = get()
        set({ balance: Math.max(0, balance + amount) })
      },
      
      placeBet: (direction: BetDirection, amount: number, spread?: number) => {
        const { balance, currentBet } = get()
        
        // If already bet, refund previous bet first
        const refund = currentBet?.amount ?? 0
        const effectiveBalance = balance + refund
        
        if (amount > effectiveBalance) {
          return false
        }
        
        set({
          balance: effectiveBalance - amount,
          currentBet: { direction, amount, spread },
        })
        return true
      },
      
      clearCurrentBet: () => set({ currentBet: null }),
      
      setSelectedStake: (stake: number) => set({ selectedStake: stake }),
      
      addBetRecord: (record: BetRecord) => {
        const { betHistory } = get()
        const newHistory = [record, ...betHistory].slice(0, 50) // Keep last 50 bets
        set({ betHistory: newHistory })
      },
      
      toggleSound: () => {
        const { soundEnabled } = get()
        set({ soundEnabled: !soundEnabled })
      },
      
      toggleHaptic: () => {
        const { hapticEnabled } = get()
        set({ hapticEnabled: !hapticEnabled })
      },
      
      resetBalance: () => set({ balance: INITIAL_BALANCE, betHistory: [] }),
    }),
    {
      name: 'uprug-user-store',
      partialize: (state) => ({
        balance: state.balance,
        betHistory: state.betHistory,
        soundEnabled: state.soundEnabled,
        hapticEnabled: state.hapticEnabled,
        selectedStake: state.selectedStake,
      }),
    }
  )
)

