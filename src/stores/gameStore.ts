import { create } from 'zustand'

export type BetDirection = 'up' | 'down'
export type RoundPhase = 'betting' | 'locked' | 'resolving'

export interface UserBet {
  direction: BetDirection
  amount: number
  timestamp: number
  spread?: number
}

export interface EpochResult {
  epoch: number
  endPrice: number
  referencePrice: number | null
  referenceIndex: number
  outcome: BetDirection | null
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
  referenceIndex: number
  outcome: BetDirection
  timestamp: number
}

interface GameState {
  // Current epoch (server-managed)
  currentRound: number
  roundPhase: RoundPhase
  timeRemaining: number
  referencePrice: number | null
  
  // Epoch timestamps from server (for chart vertical lines)
  epochTimestamps: number[]
  
  // Epoch history from server
  epochHistory: EpochResult[]
  
  // Pools for current betting window
  currentPools: { up: number; down: number }
  
  // Pending resolution (bet waiting for outcome)
  pendingRound: PendingRound | null
  
  // Last resolved outcome
  lastOutcome: BetDirection | null
  lastPayout: number | null
  lastBetAmount: number | null // Track bet amount for loss display
  showResult: boolean
  
  // Marker for chart
  resolvedMarker: ResolvedMarker | null
  
  // Actions
  setRound: (round: number) => void
  setPhase: (phase: RoundPhase) => void
  setTimeRemaining: (time: number) => void
  setReferencePrice: (price: number | null) => void
  setEpochTimestamps: (timestamps: number[]) => void
  addToPool: (direction: BetDirection, amount: number) => void
  resetPools: () => void
  setPendingRound: (pending: PendingRound | null) => void
  addEpochResult: (result: EpochResult) => void
  initializeEpochHistory: (history: EpochResult[]) => void
  resolveRound: (outcome: BetDirection, payout: number | null, referencePrice: number, referenceIndex: number) => void
  clearResult: () => void
  simulateOtherBets: () => void
  handleEpochTransition: (params: {
    epochEnd?: {
      epoch: number
      endPrice: number
      referencePrice: number | null
      referenceIndex: number
      outcome: 'up' | 'down' | null
      timestamp: number
      epochTimestamps?: number[]
    } | null
    epochStart?: {
      epoch: number
      referencePrice: number
      timeRemaining: number
      epochTimestamps?: number[]
    } | null
    // Current bet info passed directly to avoid race condition
    currentBet?: { direction: BetDirection; amount: number; spread?: number } | null
    currentPools?: { up: number; down: number }
  }) => void
}

// Derived selector for seconds - only updates when second changes (reduces re-renders 10x)
export const useSeconds = () => useGameStore((s) => Math.ceil(s.timeRemaining / 1000))

export const useGameStore = create<GameState>((set, get) => ({
  currentRound: 0,
  roundPhase: 'betting',
  timeRemaining: 10000,
  referencePrice: null,
  epochTimestamps: [],
  epochHistory: [],
  currentPools: { up: 0, down: 0 },
  pendingRound: null,
  lastOutcome: null,
  lastPayout: null,
  lastBetAmount: null,
  showResult: false,
  resolvedMarker: null,
  
  setRound: (round: number) => set({ currentRound: round }),
  
  setPhase: (phase: RoundPhase) => set({ roundPhase: phase }),
  
  setTimeRemaining: (time: number) => {
    // No betting lock - always allow betting until epoch ends
    set({ timeRemaining: Math.max(0, time), roundPhase: 'betting' })
  },
  
  setReferencePrice: (price: number | null) => set({ referencePrice: price }),
  
  setEpochTimestamps: (timestamps: number[]) => set({ epochTimestamps: timestamps }),
  
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
  
  addEpochResult: (result: EpochResult) => {
    const { epochHistory, pendingRound } = get()
    const newHistory = [...epochHistory, result].slice(-20)
    
    // Update resolved marker for chart using server-provided data
    let resolvedMarker: ResolvedMarker | null = null
    if (result.outcome && result.referencePrice !== null) {
      resolvedMarker = {
        referencePrice: result.referencePrice,
        referenceIndex: result.referenceIndex,
        outcome: result.outcome,
        timestamp: result.timestamp,
      }
    }
    
    // Check if user had a bet on this epoch
    // pendingRound.roundNumber is the epoch the bet is FOR
    let lastOutcome: BetDirection | null = null
    let lastPayout: number | null = null
    let showResult = false
    
    if (pendingRound && pendingRound.roundNumber === result.epoch && pendingRound.userBet) {
      lastOutcome = result.outcome
      showResult = true
      
      if (pendingRound.userBet.direction === result.outcome) {
        // Winner - fixed spread payout: stake * (2 - spread)
        const spread = pendingRound.userBet.spread || 0.025
        lastPayout = pendingRound.userBet.amount * (2 - spread)
      } else {
        lastPayout = 0
      }
    }
    
    set({ 
      epochHistory: newHistory,
      resolvedMarker,
      lastOutcome,
      lastPayout,
      showResult,
      pendingRound: showResult ? null : pendingRound,
    })
  },
  
  initializeEpochHistory: (history: EpochResult[]) => {
    const lastResult = history[history.length - 1]
    let resolvedMarker: ResolvedMarker | null = null
    
    if (lastResult?.outcome && lastResult?.referencePrice !== null) {
      resolvedMarker = {
        referencePrice: lastResult.referencePrice,
        referenceIndex: lastResult.referenceIndex,
        outcome: lastResult.outcome,
        timestamp: lastResult.timestamp,
      }
    }
    
    set({ 
      epochHistory: history,
      resolvedMarker,
    })
  },
  
  resolveRound: (outcome: BetDirection, payout: number | null, referencePrice: number, referenceIndex: number) => {
    set({
      lastOutcome: outcome,
      lastPayout: payout,
      showResult: true,
      pendingRound: null,
      resolvedMarker: {
        referencePrice,
        referenceIndex,
        outcome,
        timestamp: Date.now(),
      },
    })
  },
  
  clearResult: () => set({ showResult: false, lastOutcome: null, lastPayout: null, lastBetAmount: null }),
  
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
  
  // Batched epoch transition to avoid cascading re-renders
  handleEpochTransition: ({ epochEnd, epochStart, currentBet, currentPools }) => {
    const { epochHistory, pendingRound } = get()
    
    // Build the entire state update in one object
    const stateUpdate: Partial<GameState> = {}
    
    // Process epoch end
    if (epochEnd) {
      const newHistory = [...epochHistory, {
        epoch: epochEnd.epoch,
        endPrice: epochEnd.endPrice,
        referencePrice: epochEnd.referencePrice,
        referenceIndex: epochEnd.referenceIndex,
        outcome: epochEnd.outcome,
        timestamp: epochEnd.timestamp,
      }].slice(-20)
      
      stateUpdate.epochHistory = newHistory
      
      // Update resolved marker for chart
      if (epochEnd.outcome && epochEnd.referencePrice !== null) {
        stateUpdate.resolvedMarker = {
          referencePrice: epochEnd.referencePrice,
          referenceIndex: epochEnd.referenceIndex,
          outcome: epochEnd.outcome,
          timestamp: epochEnd.timestamp,
        }
      }
      
      // FIRST: Resolve any existing pendingRound IF it's for THIS epoch
      // pendingRound.roundNumber is the epoch the bet is FOR
      const userBet = pendingRound?.userBet
      const shouldResolve = pendingRound && 
        userBet && 
        pendingRound.roundNumber === epochEnd.epoch && 
        epochEnd.outcome
      
      if (shouldResolve && userBet) {
        stateUpdate.lastOutcome = epochEnd.outcome
        stateUpdate.showResult = true
        stateUpdate.lastBetAmount = userBet.amount
        
        if (userBet.direction === epochEnd.outcome) {
          // Fixed spread payout: stake * (2 - spread)
          const spread = userBet.spread || 0.025
          const payout = userBet.amount * (2 - spread)
          stateUpdate.lastPayout = payout
        } else {
          stateUpdate.lastPayout = 0
        }
        // Clear the resolved pendingRound
        stateUpdate.pendingRound = null
      }
      
      // SECOND: Move currentBet to pendingRound for resolution at END of NEXT epoch
      // This bet was placed during epoch N, for epoch N+1
      if (currentBet) {
        stateUpdate.pendingRound = {
          roundNumber: epochEnd.epoch + 1, // This bet is FOR the next epoch
          referencePrice: epochStart?.referencePrice || epochEnd.endPrice, // Reference is start of next epoch
          userBet: {
            direction: currentBet.direction,
            amount: currentBet.amount,
            timestamp: epochEnd.timestamp,
            spread: currentBet.spread
          },
          pools: currentPools ? { ...currentPools } : { up: 0, down: 0 }
        }
      }
      
      if (epochEnd.epochTimestamps) {
        stateUpdate.epochTimestamps = epochEnd.epochTimestamps
      }
    }
    
    // Process epoch start
    if (epochStart) {
      stateUpdate.currentRound = epochStart.epoch
      stateUpdate.referencePrice = epochStart.referencePrice
      stateUpdate.timeRemaining = epochStart.timeRemaining
      
      // No betting lock - always betting phase
      stateUpdate.roundPhase = 'betting'
      
      if (epochStart.epochTimestamps) {
        stateUpdate.epochTimestamps = epochStart.epochTimestamps
      }
    }
    
    // Single atomic set() call
    set(stateUpdate)
  },
}))
