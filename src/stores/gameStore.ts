import { create } from 'zustand'

export type BetDirection = 'up' | 'down'
export type RoundPhase = 'betting' | 'locked' | 'resolving'

export interface UserBet {
  direction: BetDirection
  amount: number
  timestamp: number
}

export interface PendingRound {
  roundNumber: number
  referencePrice: number
  userBet: UserBet | null
  pools: { up: number; down: number }
}

export interface ResolvedMarker {
  referencePrice: number
  outcome: BetDirection
  timestamp: number
}

interface GameState {
  // Current betting round
  currentRound: number
  roundPhase: RoundPhase
  timeRemaining: number // in milliseconds
  roundStartTime: number
  
  // Pools for current betting window
  currentPools: { up: number; down: number }
  
  // Pending resolution (bet from previous round waiting for outcome)
  pendingRound: PendingRound | null
  
  // Last resolved outcome
  lastOutcome: BetDirection | null
  lastPayout: number | null
  showResult: boolean
  
  // Marker for chart showing last resolution point
  resolvedMarker: ResolvedMarker | null
  
  // Actions
  setRound: (round: number) => void
  setPhase: (phase: RoundPhase) => void
  setTimeRemaining: (time: number) => void
  setRoundStartTime: (time: number) => void
  addToPool: (direction: BetDirection, amount: number) => void
  resetPools: () => void
  setPendingRound: (pending: PendingRound | null) => void
  resolveRound: (outcome: BetDirection, payout: number | null, referencePrice: number) => void
  clearResult: () => void
  simulateOtherBets: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  currentRound: 0,
  roundPhase: 'betting',
  timeRemaining: 10000,
  roundStartTime: 0,
  currentPools: { up: 0, down: 0 },
  pendingRound: null,
  lastOutcome: null,
  lastPayout: null,
  showResult: false,
  resolvedMarker: null,
  
  setRound: (round: number) => set({ currentRound: round }),
  
  setPhase: (phase: RoundPhase) => set({ roundPhase: phase }),
  
  setTimeRemaining: (time: number) => set({ timeRemaining: Math.max(0, time) }),
  
  setRoundStartTime: (time: number) => set({ roundStartTime: time }),
  
  addToPool: (direction: BetDirection, amount: number) => {
    const { currentPools } = get()
    set({
      currentPools: {
        ...currentPools,
        [direction]: currentPools[direction] + amount,
      },
    })
  },
  
  resetPools: () => set({ currentPools: { up: 0, down: 0 } }),
  
  setPendingRound: (pending: PendingRound | null) => set({ pendingRound: pending }),
  
  resolveRound: (outcome: BetDirection, payout: number | null, referencePrice: number) => {
    set({
      lastOutcome: outcome,
      lastPayout: payout,
      showResult: true,
      pendingRound: null,
      resolvedMarker: {
        referencePrice,
        outcome,
        timestamp: Date.now(),
      },
    })
  },
  
  clearResult: () => set({ showResult: false, lastOutcome: null, lastPayout: null }),
  
  // Simulate other players betting (for prototype)
  simulateOtherBets: () => {
    const { currentPools } = get()
    const upBet = Math.random() * 50 + 10
    const downBet = Math.random() * 50 + 10
    set({
      currentPools: {
        up: currentPools.up + upBet,
        down: currentPools.down + downBet,
      },
    })
  },
}))

