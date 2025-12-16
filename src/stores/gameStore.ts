import { create } from 'zustand'

export type BetDirection = 'up' | 'down'
export type RoundPhase = 'betting' | 'locked' | 'resolving'

export interface UserBet {
  direction: BetDirection
  amount: number
  timestamp: number
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
    currentBet?: { direction: BetDirection; amount: number } | null
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
  showResult: false,
  resolvedMarker: null,
  
  setRound: (round: number) => set({ currentRound: round }),
  
  setPhase: (phase: RoundPhase) => set({ roundPhase: phase }),
  
  setTimeRemaining: (time: number) => {
    const phase: RoundPhase = time < 500 ? 'resolving' : time < 2000 ? 'locked' : 'betting'
    set({ timeRemaining: Math.max(0, time), roundPhase: phase })
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
    let lastOutcome: BetDirection | null = null
    let lastPayout: number | null = null
    let showResult = false
    
    if (pendingRound && pendingRound.roundNumber === result.epoch - 1 && pendingRound.userBet) {
      lastOutcome = result.outcome
      showResult = true
      
      if (pendingRound.userBet.direction === result.outcome) {
        // Winner - calculate payout (simplified for prototype)
        const totalPool = pendingRound.pools.up + pendingRound.pools.down
        const winningPool = pendingRound.pools[result.outcome!]
        const rake = 0.05
        // Prevent division by zero - if winningPool is 0, return the bet amount
        if (winningPool > 0 && totalPool > 0) {
          const calculated = (pendingRound.userBet.amount / winningPool) * totalPool * (1 - rake)
          // Extra safety: ensure result is a valid finite number
          lastPayout = isFinite(calculated) && !isNaN(calculated) ? calculated : pendingRound.userBet.amount
        } else {
          lastPayout = pendingRound.userBet.amount // Return original bet if pool is empty
        }
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
  
  clearResult: () => set({ showResult: false, lastOutcome: null, lastPayout: null }),
  
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
      
      // Check if user had a bet - use currentBet passed directly to avoid race condition
      // currentBet is the bet placed during the epoch that just ended
      if (currentBet && currentPools && epochEnd.outcome) {
        // Store in pendingRound for UI display during next epoch
        stateUpdate.pendingRound = {
          roundNumber: epochEnd.epoch,
          referencePrice: epochEnd.referencePrice || 0,
          userBet: {
            direction: currentBet.direction,
            amount: currentBet.amount,
            timestamp: epochEnd.timestamp
          },
          pools: { ...currentPools }
        }
        
        // Calculate win/loss immediately
        stateUpdate.lastOutcome = epochEnd.outcome
        stateUpdate.showResult = true
        
        if (currentBet.direction === epochEnd.outcome) {
          const totalPool = currentPools.up + currentPools.down
          const winningPool = currentPools[epochEnd.outcome]
          const rake = 0.05
          if (winningPool > 0 && totalPool > 0) {
            const calculated = (currentBet.amount / winningPool) * totalPool * (1 - rake)
            stateUpdate.lastPayout = isFinite(calculated) && !isNaN(calculated) ? calculated : currentBet.amount
          } else {
            stateUpdate.lastPayout = currentBet.amount
          }
        } else {
          stateUpdate.lastPayout = 0
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
      
      // Determine phase based on time remaining
      const phase: RoundPhase = epochStart.timeRemaining < 500 ? 'resolving' 
        : epochStart.timeRemaining < 2000 ? 'locked' 
        : 'betting'
      stateUpdate.roundPhase = phase
      
      if (epochStart.epochTimestamps) {
        stateUpdate.epochTimestamps = epochStart.epochTimestamps
      }
    }
    
    // Single atomic set() call
    set(stateUpdate)
  },
}))
