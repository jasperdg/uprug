import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, useSeconds } from '../../stores/gameStore'
import { useUserStore } from '../../stores/userStore'
import { usePriceStore } from '../../stores/priceStore'
import { useHaptics } from '../../hooks/useHaptics'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { formatCurrency } from '../../utils/formatters'
import confetti from 'canvas-confetti'

const PRESET_AMOUNTS = [1, 5, 10, 25]

// Fixed spread calculation based on time remaining
function getSpread(seconds: number): { spread: number; isLocked: boolean } {
  if (seconds <= 1) return { spread: 0, isLocked: true } // Locked in last second
  if (seconds <= 5) return { spread: 0.05, isLocked: false } // 5% for seconds 2-5
  return { spread: 0.025, isLocked: false } // 2.5% for seconds 6-10
}

// Calculate payout with fixed spread (win = stake + stake * (1 - spread))
function calculateFixedPayout(stake: number, spread: number): number {
  return stake * (2 - spread) // e.g., 2.5% spread = 1.975x, 5% spread = 1.95x
}

// Helper to get epoch color based on epoch number (odd = blue, even = purple)
function getEpochStyles(epochNumber: number) {
  const isOdd = epochNumber % 2 === 1
  return {
    background: isOdd
      ? 'linear-gradient(135deg, rgba(60, 140, 180, 0.12) 0%, rgba(40, 120, 160, 0.06) 100%)'
      : 'linear-gradient(135deg, rgba(120, 60, 180, 0.12) 0%, rgba(90, 40, 150, 0.06) 100%)',
    borderClass: isOdd ? 'border-cyan-500/20' : 'border-purple-500/20',
  }
}

export function EpochPositionCards() {
  // Use selectors to minimize re-renders
  const currentRound = useGameStore((s) => s.currentRound)
  const seconds = useSeconds() // Derived selector - only re-renders when second changes
  const pendingRound = useGameStore((s) => s.pendingRound)
  const showResult = useGameStore((s) => s.showResult)
  const lastPayout = useGameStore((s) => s.lastPayout)
  const clearResult = useGameStore((s) => s.clearResult)
  
  const currentPrice = usePriceStore((s) => s.currentPrice)
  
  const currentBet = useUserStore((s) => s.currentBet)
  const selectedStake = useUserStore((s) => s.selectedStake)
  const setSelectedStake = useUserStore((s) => s.setSelectedStake)
  const placeBet = useUserStore((s) => s.placeBet)
  const balance = useUserStore((s) => s.balance)
  const { vibrateOnBet } = useHaptics()
  const { playWin, playLoss, playBet } = useSoundEffects()
  
  // Get current spread based on time remaining for NEXT epoch betting
  const { spread, isLocked } = getSpread(seconds)
  const payoutMultiplier = (2 - spread).toFixed(3) // e.g., 1.975x or 1.950x
  
  // Track explosion animation - only for users with bets
  const [explosionState, setExplosionState] = useState<'none' | 'win' | 'loss'>('none')
  const hasTriggeredExplosion = useRef(false)
  
  // Calculate potential payouts for current bet (fixed spread)
  const currentBetPayouts = useMemo(() => {
    if (!currentBet) return null
    
    // Use the spread that was locked in when bet was placed
    const betSpread = currentBet.spread || 0.025
    const winPayout = calculateFixedPayout(currentBet.amount, betSpread)
    
    return {
      ifWin: winPayout,
      direction: currentBet.direction,
      amount: currentBet.amount,
      spread: betSpread,
    }
  }, [currentBet])
  
  // Calculate potential payouts for pending bet (awaiting resolution)
  const pendingBetPayouts = useMemo(() => {
    if (!pendingRound?.userBet) return null
    
    const bet = pendingRound.userBet
    const betSpread = bet.spread || 0.025
    const winPayout = calculateFixedPayout(bet.amount, betSpread)
    
    return {
      ifWin: winPayout,
      direction: bet.direction,
      amount: bet.amount,
      referencePrice: pendingRound.referencePrice,
      spread: betSpread,
    }
  }, [pendingRound])
  
  // Calculate ITM/OTM status for resolving position
  const moneyStatus = useMemo(() => {
    if (!pendingBetPayouts?.referencePrice || !currentPrice) return null
    
    const priceIsUp = currentPrice > pendingBetPayouts.referencePrice
    const isInTheMoney = pendingBetPayouts.direction === 'up' ? priceIsUp : !priceIsUp
    const priceDiff = currentPrice - pendingBetPayouts.referencePrice
    const priceDiffPercent = (priceDiff / pendingBetPayouts.referencePrice) * 100
    
    return {
      isInTheMoney,
      priceDiff,
      priceDiffPercent,
    }
  }, [currentPrice, pendingBetPayouts])
  
  // Handle explosion on result - showResult is only true when user had a bet
  useEffect(() => {
    if (showResult && !hasTriggeredExplosion.current) {
      hasTriggeredExplosion.current = true
      
      if (lastPayout && lastPayout > 0 && isFinite(lastPayout)) {
        // Use requestAnimationFrame to defer visual updates
        requestAnimationFrame(() => {
          setExplosionState('win')
          try {
            playWin()
          } catch (e) {
            console.error('Win sound error:', e)
          }
          // Defer confetti to next frame
          requestAnimationFrame(() => {
            try {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.4 },
                colors: ['#00d26a', '#ffffff', '#00ff88'],
              })
            } catch (e) {
              console.error('Confetti error:', e)
            }
          })
        })
      } else if (lastPayout === 0) {
        requestAnimationFrame(() => {
          setExplosionState('loss')
          playLoss()
        })
      }
      
      // Reset explosion state after animation
      setTimeout(() => {
        setExplosionState('none')
        hasTriggeredExplosion.current = false
      }, 1500)
    }
  }, [showResult, lastPayout, playWin, playLoss])
  
  // Reset explosion trigger when result clears
  useEffect(() => {
    if (!showResult) {
      hasTriggeredExplosion.current = false
    }
  }, [showResult])
  
  // Auto-hide result badge after 2 seconds
  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        clearResult()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showResult, clearResult])
  
  const handleBet = (direction: 'up' | 'down') => {
    if (isLocked) return
    const success = placeBet(direction, selectedStake, spread)
    if (success) {
      vibrateOnBet()
      playBet()
    }
  }
  
  
  // Get styles for both cards based on epoch numbers - memoized to prevent recalc
  // Resolving position = current epoch (bet placed during previous epoch, resolves now)
  // Betting = next epoch (bet placed now, resolves at end of next epoch)
  const resolvingEpoch = pendingRound?.roundNumber ?? currentRound
  const resolvingStyles = useMemo(() => getEpochStyles(resolvingEpoch), [resolvingEpoch])
  const bettingStyles = useMemo(() => getEpochStyles(currentRound + 1), [currentRound])
  
  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-52">
      {/* Resolving Position Card - bet from previous epoch, settles at end of current epoch */}
      <motion.div
        initial={false}
        animate={{ 
          boxShadow: explosionState === 'win' 
            ? '0 0 40px rgba(0, 210, 106, 0.8)' 
            : explosionState === 'loss'
              ? '0 0 40px rgba(255, 68, 68, 0.8)'
              : '0 0 0px transparent'
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: explosionState === 'win' 
            ? 'rgba(0, 210, 106, 0.15)'
            : explosionState === 'loss'
              ? 'rgba(255, 68, 68, 0.15)'
              : resolvingStyles.background
        }}
        className={`
          relative rounded-xl p-4 overflow-hidden min-h-[140px]
          ${explosionState === 'win' 
            ? 'border-2 border-accent-up' 
            : explosionState === 'loss'
              ? 'border-2 border-accent-down'
              : `border ${resolvingStyles.borderClass}`
          }
        `}
      >
          {/* Explosion overlay */}
          <AnimatePresence>
            {explosionState !== 'none' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 ${
                  explosionState === 'win' ? 'bg-accent-up/30' : 'bg-accent-down/30'
                }`}
              />
            )}
          </AnimatePresence>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {pendingBetPayouts ? 'Position' : 'Resolving'}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                #{pendingRound?.roundNumber || currentRound}
              </span>
            </div>
            <div className={`
              px-2 py-1 rounded text-xs font-mono font-bold
              ${explosionState === 'win' 
                ? 'bg-accent-up text-bg-primary' 
                : explosionState === 'loss'
                  ? 'bg-accent-down text-white'
                  : 'bg-accent-highlight/20 text-accent-highlight'
              }
            `}>
              {explosionState === 'win' ? (
                <span>+{formatCurrency(lastPayout!)}</span>
              ) : explosionState === 'loss' ? (
                <span>RUGGED 💀</span>
              ) : (
                <span>⏳ {seconds}s</span>
              )}
            </div>
          </div>
          
          {/* Position Info - Always show structured data */}
          <div className="relative z-10">
            {pendingBetPayouts ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-lg font-bold
                      ${pendingBetPayouts.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}
                    `}>
                      {pendingBetPayouts.direction === 'up' ? '⬆️ UP' : '⬇️ RUG'}
                    </span>
                    <span className="text-sm font-mono text-text-secondary">
                      {formatCurrency(pendingBetPayouts.amount)}
                    </span>
                  </div>
                  {moneyStatus && (
                    <span className={`
                      px-2 py-1 rounded text-xs font-bold
                      ${moneyStatus.isInTheMoney 
                        ? 'bg-accent-up/20 text-accent-up' 
                        : 'bg-accent-down/20 text-accent-down'
                      }
                    `}>
                      {moneyStatus.isInTheMoney ? 'ITM' : 'OTM'} {moneyStatus.priceDiffPercent >= 0 ? '+' : ''}{moneyStatus.priceDiffPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                
                {/* Price comparison */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">Entry Price</div>
                    <div className="font-mono font-bold text-text-primary">
                      ${pendingBetPayouts.referencePrice?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">Current Price</div>
                    <div className={`font-mono font-bold ${
                      moneyStatus?.isInTheMoney ? 'text-accent-up' : 'text-accent-down'
                    }`}>
                      ${currentPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Potential payout */}
                <div className="bg-bg-tertiary/50 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-secondary">If you win</span>
                    <span className="font-mono font-bold text-accent-up">
                      +{formatCurrency(pendingBetPayouts.ifWin - pendingBetPayouts.amount)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-text-secondary">
                    No Position
                  </span>
                </div>
                
                <div className="text-sm text-text-secondary">
                  You didn't bet on this epoch
                </div>
              </>
            )}
          </div>
        </motion.div>
      
      {/* Next Epoch Card - Betting for next epoch */}
      <div
        style={{
          background: bettingStyles.background
        }}
        className={`rounded-xl p-4 border ${bettingStyles.borderClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-accent-up uppercase tracking-wide">
              Betting Open
            </span>
            <span className="text-xs font-mono text-text-secondary">
              #{currentRound + 1}
            </span>
          </div>
          <div className={`
            px-2 py-1 rounded text-xs font-mono font-bold
            ${seconds <= 3 
              ? 'bg-accent-down/20 text-accent-down'
              : 'bg-accent-up/20 text-accent-up'
            }
          `}>
            {seconds}s left
          </div>
        </div>
        
        {/* Current bet display */}
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border">
          {currentBetPayouts ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`
                    font-bold
                    ${currentBetPayouts.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}
                  `}>
                    {currentBetPayouts.direction === 'up' ? '⬆️ UP' : '⬇️ RUG'}
                  </span>
                  <span className="text-sm font-mono text-text-secondary">
                    {formatCurrency(currentBetPayouts.amount)}
                  </span>
                </div>
                <span className="text-xs font-mono text-text-secondary">
                  {(2 - (currentBetPayouts.spread || 0.025)).toFixed(3)}x
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Potential win:</span>
                <span className="font-mono font-bold text-accent-up">
                  +{formatCurrency(currentBetPayouts.ifWin - currentBetPayouts.amount)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-text-secondary text-sm">
              No position yet - use buttons below
            </div>
          )}
        </div>
        
      </div>
      
      {/* Floating Bet Buttons - Fixed at bottom, above trade history bar */}
      <div className="fixed bottom-14 left-4 right-4 z-50 bg-bg-secondary/95 backdrop-blur-sm border border-border rounded-2xl px-4 py-3 shadow-lg">
        {/* Stake selector row */}
        <div className="flex gap-2 mb-3">
          {PRESET_AMOUNTS.map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedStake(amount)}
              disabled={amount > balance}
              className={`
                flex-1 py-2 rounded-lg font-mono text-sm font-bold
                transition-all duration-150
                disabled:opacity-30 disabled:cursor-not-allowed
                ${selectedStake === amount
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-bg-tertiary text-text-primary'
                }
              `}
            >
              ${amount}
            </motion.button>
          ))}
        </div>
        
        {/* Bet buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={isLocked ? undefined : { scale: 0.95 }}
            onClick={() => handleBet('up')}
            disabled={isLocked || selectedStake > balance + (currentBet?.amount ?? 0)}
            className={`
              flex-1 py-3 rounded-xl font-bold
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              ${currentBet?.direction === 'up'
                ? 'bg-accent-up text-bg-primary ring-2 ring-accent-up ring-offset-2 ring-offset-bg-secondary'
                : 'bg-accent-up/20 text-accent-up hover:bg-accent-up/30'
              }
            `}
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">⬆️ UP</span>
              {!isLocked && (
                <span className="text-xs opacity-75">{payoutMultiplier}x</span>
              )}
              {isLocked && (
                <span className="text-xs opacity-75">🔒</span>
              )}
            </div>
          </motion.button>
          <motion.button
            whileTap={isLocked ? undefined : { scale: 0.95 }}
            onClick={() => handleBet('down')}
            disabled={isLocked || selectedStake > balance + (currentBet?.amount ?? 0)}
            className={`
              flex-1 py-3 rounded-xl font-bold
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              ${currentBet?.direction === 'down'
                ? 'bg-accent-down text-white ring-2 ring-accent-down ring-offset-2 ring-offset-bg-secondary'
                : 'bg-accent-down/20 text-accent-down hover:bg-accent-down/30'
              }
            `}
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">⬇️ RUG</span>
              {!isLocked && (
                <span className="text-xs opacity-75">{payoutMultiplier}x</span>
              )}
              {isLocked && (
                <span className="text-xs opacity-75">🔒</span>
              )}
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
