import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'
import { usePriceStore } from '../stores/priceStore'
import { calculatePayout } from '../utils/parimutuel'

const ROUND_DURATION = 10000 // 10 seconds

/**
 * Get the start time of the current 10-second interval
 * Rounds are aligned to clock (:00, :10, :20, :30, :40, :50)
 */
function getRoundStartTime(): number {
  const now = Date.now()
  return now - (now % ROUND_DURATION)
}

/**
 * Get time remaining in current round
 */
function getTimeRemaining(): number {
  const now = Date.now()
  const elapsed = now % ROUND_DURATION
  return ROUND_DURATION - elapsed
}

/**
 * Get current round number (based on epoch time)
 */
function getRoundNumber(): number {
  return Math.floor(Date.now() / ROUND_DURATION)
}

export function useGameLoop() {
  const animationFrameRef = useRef<number | null>(null)
  const lastRoundRef = useRef<number>(0)
  
  const {
    currentRound,
    pendingRound,
    setRound,
    setPhase,
    setTimeRemaining,
    setRoundStartTime,
    setPendingRound,
    resetPools,
    resolveRound,
    simulateOtherBets,
  } = useGameStore()
  
  const { clearCurrentBet, adjustBalance, addBetRecord } = useUserStore()
  
  // Resolve pending round when we have a new price after round end
  const resolvePendingRound = useCallback(() => {
    const pending = useGameStore.getState().pendingRound
    const price = usePriceStore.getState().currentPrice
    
    if (!pending || price === 0) return
    
    // Determine outcome
    const outcome = price > pending.referencePrice ? 'up' : 'down'
    
    // Calculate payout if user had a bet
    let payout: number | null = null
    if (pending.userBet) {
      payout = calculatePayout(
        pending.userBet.amount,
        pending.userBet.direction,
        outcome,
        pending.pools
      )
      
      // Add winnings to balance
      if (payout > 0) {
        adjustBalance(payout)
      }
      
      // Record the bet
      addBetRecord({
        roundNumber: pending.roundNumber,
        direction: pending.userBet.direction,
        amount: pending.userBet.amount,
        outcome,
        payout: payout > 0 ? payout : 0,
        timestamp: Date.now(),
      })
    }
    
    resolveRound(outcome, payout)
  }, [adjustBalance, addBetRecord, resolveRound])
  
  // Main game loop
  const tick = useCallback(() => {
    const now = Date.now()
    const roundNumber = getRoundNumber()
    const timeRemaining = getTimeRemaining()
    
    setTimeRemaining(timeRemaining)
    
    // Check for round transition
    if (roundNumber !== lastRoundRef.current) {
      const prevRound = lastRoundRef.current
      lastRoundRef.current = roundNumber
      
      // Only process if this isn't the initial load
      if (prevRound > 0) {
        const gameState = useGameStore.getState()
        const userState = useUserStore.getState()
        const priceState = usePriceStore.getState()
        
        // If there was a pending round, resolve it now
        if (gameState.pendingRound) {
          resolvePendingRound()
        }
        
        // Move current bets to pending for resolution next round
        if (userState.currentBet || gameState.currentPools.up > 0 || gameState.currentPools.down > 0) {
          setPendingRound({
            roundNumber: prevRound,
            referencePrice: priceState.currentPrice,
            userBet: userState.currentBet ? {
              direction: userState.currentBet.direction,
              amount: userState.currentBet.amount,
              timestamp: now,
            } : null,
            pools: { ...gameState.currentPools },
          })
          
          clearCurrentBet()
        }
        
        // Reset for new round
        resetPools()
        setRound(roundNumber)
        setRoundStartTime(getRoundStartTime())
        setPhase('betting')
        
        // Simulate other players betting
        simulateOtherBets()
      } else {
        // Initial load
        setRound(roundNumber)
        setRoundStartTime(getRoundStartTime())
        simulateOtherBets()
      }
    }
    
    // Update phase based on time remaining
    if (timeRemaining < 500) {
      setPhase('resolving')
    } else if (timeRemaining < 2000) {
      setPhase('locked')
    } else {
      setPhase('betting')
    }
    
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [
    setTimeRemaining,
    setRound,
    setPhase,
    setRoundStartTime,
    setPendingRound,
    resetPools,
    clearCurrentBet,
    simulateOtherBets,
    resolvePendingRound,
  ])
  
  useEffect(() => {
    // Initialize
    lastRoundRef.current = getRoundNumber()
    setRound(lastRoundRef.current)
    setRoundStartTime(getRoundStartTime())
    simulateOtherBets()
    
    // Start the loop
    animationFrameRef.current = requestAnimationFrame(tick)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [tick, setRound, setRoundStartTime, simulateOtherBets])
  
  return {
    currentRound,
    pendingRound,
    timeRemaining: useGameStore((state) => state.timeRemaining),
    phase: useGameStore((state) => state.roundPhase),
  }
}

