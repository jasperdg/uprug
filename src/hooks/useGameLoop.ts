import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'

/**
 * Game loop hook - simplified since epochs are server-managed
 * This hook handles:
 * - Simulating other player bets (for prototype)
 * - Processing win/loss results and updating balance
 * - Recording bet history
 * 
 * Note: Bet resolution is now handled in handleEpochTransition to avoid race conditions
 */
export function useGameLoop() {
  const lastEpochRef = useRef<number>(0)
  
  // Use selectors to minimize re-renders
  const currentRound = useGameStore((s) => s.currentRound)
  const referencePrice = useGameStore((s) => s.referencePrice)
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const roundPhase = useGameStore((s) => s.roundPhase)
  const epochHistory = useGameStore((s) => s.epochHistory)
  const showResult = useGameStore((s) => s.showResult)
  const lastOutcome = useGameStore((s) => s.lastOutcome)
  const lastPayout = useGameStore((s) => s.lastPayout)
  const pendingRound = useGameStore((s) => s.pendingRound)
  const clearResult = useGameStore((s) => s.clearResult)
  const simulateOtherBets = useGameStore((s) => s.simulateOtherBets)
  
  const adjustBalance = useUserStore((s) => s.adjustBalance)
  const addBetRecord = useUserStore((s) => s.addBetRecord)
  
  // Watch for epoch changes - simulate other bets
  useEffect(() => {
    if (currentRound > 0 && currentRound !== lastEpochRef.current) {
      const previousEpoch = lastEpochRef.current
      lastEpochRef.current = currentRound
      
      // Simulate other players betting on new epoch
      if (previousEpoch > 0 || currentRound > 0) {
        simulateOtherBets()
      }
    }
  }, [currentRound, simulateOtherBets])
  
  // Process win/loss results
  useEffect(() => {
    if (showResult && lastOutcome !== null && pendingRound?.userBet) {
      // Record the bet in history
      const lastResult = epochHistory[epochHistory.length - 1]
      if (lastResult) {
        addBetRecord({
          roundNumber: lastResult.epoch,
          direction: pendingRound.userBet.direction,
          amount: pendingRound.userBet.amount,
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
  }, [showResult, lastOutcome, lastPayout, pendingRound, epochHistory, addBetRecord, adjustBalance, clearResult])
  
  return {
    currentRound,
    timeRemaining,
    phase: roundPhase,
    referencePrice,
  }
}
