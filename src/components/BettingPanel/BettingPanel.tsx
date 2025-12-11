import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BetButton } from './BetButton'
import { StakeSelector } from './StakeSelector'
import { BetHistory } from './BetHistory'
import { useGameStore } from '../../stores/gameStore'
import { useUserStore } from '../../stores/userStore'
import { useHaptics } from '../../hooks/useHaptics'
import { calculateOdds, calculatePotentialPayout } from '../../utils/parimutuel'
import { formatCurrency } from '../../utils/formatters'

export function BettingPanel() {
  const { currentPools, roundPhase, pendingRound, addToPool } = useGameStore()
  const { currentBet, selectedStake, placeBet, balance } = useUserStore()
  const { vibrateOnBet } = useHaptics()
  
  const isDisabled = roundPhase !== 'betting'
  
  const { upOdds, downOdds, potentialPayout } = useMemo(() => {
    const upPool = currentPools.up + (currentBet?.direction === 'up' ? 0 : selectedStake)
    const downPool = currentPools.down + (currentBet?.direction === 'down' ? 0 : selectedStake)
    
    return {
      upOdds: calculateOdds(upPool, currentPools.down),
      downOdds: calculateOdds(downPool, currentPools.up),
      potentialPayout: currentBet
        ? calculatePotentialPayout(
            currentBet.amount,
            currentPools[currentBet.direction] + currentBet.amount,
            currentPools[currentBet.direction === 'up' ? 'down' : 'up']
          )
        : 0,
    }
  }, [currentPools, currentBet, selectedStake])
  
  const handleBet = (direction: 'up' | 'down') => {
    if (isDisabled) return
    
    const success = placeBet(direction, selectedStake)
    if (success) {
      addToPool(direction, selectedStake)
      vibrateOnBet()
    }
  }
  
  return (
    <div className="flex flex-col">
      {/* Bet buttons */}
      <div className="flex gap-3 px-4">
        <BetButton
          direction="up"
          odds={upOdds}
          isSelected={currentBet?.direction === 'up'}
          isDisabled={isDisabled || selectedStake > balance + (currentBet?.amount ?? 0)}
          onClick={() => handleBet('up')}
        />
        <BetButton
          direction="down"
          odds={downOdds}
          isSelected={currentBet?.direction === 'down'}
          isDisabled={isDisabled || selectedStake > balance + (currentBet?.amount ?? 0)}
          onClick={() => handleBet('down')}
        />
      </div>
      
      {/* Stake selector */}
      <StakeSelector />
      
      {/* Current bet info */}
      <AnimatePresence>
        {currentBet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 p-3 rounded-lg bg-bg-tertiary border border-border"
          >
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Your bet:</span>
              <span className={`font-bold ${currentBet.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}`}>
                {currentBet.direction.toUpperCase()} {formatCurrency(currentBet.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-text-secondary">Potential win:</span>
              <span className="font-mono font-bold text-accent-up">
                {formatCurrency(potentialPayout)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Pending bet display */}
      <AnimatePresence>
        {pendingRound?.userBet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 p-3 rounded-lg bg-text-secondary/10 border border-text-secondary/20"
          >
            <div className="text-xs text-text-primary font-medium mb-2 uppercase tracking-wide">
              Waiting for outcome...
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Locked bet:</span>
              <span className={`font-bold ${pendingRound.userBet.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}`}>
                {pendingRound.userBet.direction.toUpperCase()} {formatCurrency(pendingRound.userBet.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-text-secondary">Reference price:</span>
              <span className="font-mono text-text-primary">
                ${pendingRound.referencePrice.toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Bet history */}
      <BetHistory />
    </div>
  )
}

