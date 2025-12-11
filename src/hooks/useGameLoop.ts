import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'
import { usePriceStore } from '../stores/priceStore'

/**
 * Game loop hook - now simplified since epochs are server-managed
 * This hook handles:
 * - Watching for epoch changes and processing user bets
 * - Simulating other player bets (for prototype)
 * - Triggering win/loss effects
 */
export function useGameLoop() {
  const lastEpochRef = useRef<number>(0)
  
  const {
    currentRound,
    referencePrice,
    timeRemaining,
    roundPhase,
    epochHistory,
    showResult,
    lastOutcome,
    lastPayout,
    clearResult,
    simulateOtherBets,
    setPendingRound,
    currentPools,
  } = useGameStore()
  
  const { currentBet, clearCurrentBet, adjustBalance, addBetRecord } = useUserStore()
  const { currentPrice } = usePriceStore()
  
  // Watch for epoch changes
  useEffect(() => {
    if (currentRound > 0 && currentRound !== lastEpochRef.current) {
      const previousEpoch = lastEpochRef.current
      lastEpochRef.current = currentRound
      
      // Only process if not initial load
      if (previousEpoch > 0) {
        // Move current bet to pending for next epoch resolution
        if (currentBet) {
          setPendingRound({
            roundNumber: previousEpoch,
            referencePrice: referencePrice || currentPrice,
            userBet: {
              direction: currentBet.direction,
              amount: currentBet.amount,
              timestamp: Date.now(),
            },
            pools: { ...currentPools },
          })
          clearCurrentBet()
        }
        
        // Simulate other players betting on new epoch
        simulateOtherBets()
      } else {
        // Initial load - just simulate some bets
        simulateOtherBets()
      }
    }
  }, [currentRound, currentBet, currentPrice, referencePrice, currentPools, clearCurrentBet, setPendingRound, simulateOtherBets])
  
  // Process win/loss results
  useEffect(() => {
    if (showResult && lastOutcome !== null) {
      // Record the bet in history
      const lastResult = epochHistory[epochHistory.length - 1]
      if (lastResult) {
        addBetRecord({
          roundNumber: lastResult.epoch,
          direction: lastOutcome,
          amount: lastPayout === 0 ? 0 : (lastPayout || 0) / 1.9, // Approximate original bet
          outcome: lastOutcome,
          payout: lastPayout || 0,
          timestamp: Date.now(),
        })
        
        // Add winnings to balance
        if (lastPayout && lastPayout > 0) {
          adjustBalance(lastPayout)
        }
      }
      
      // Clear result after delay
      const timer = setTimeout(clearResult, 2500)
      return () => clearTimeout(timer)
    }
  }, [showResult, lastOutcome, lastPayout, epochHistory, addBetRecord, adjustBalance, clearResult])
  
  return {
    currentRound,
    timeRemaining,
    phase: roundPhase,
    referencePrice,
  }
}
