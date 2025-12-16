import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../stores/gameStore'
import { useUserStore } from '../../stores/userStore'
import { useHaptics } from '../../hooks/useHaptics'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { calculatePotentialPayout, calculateOdds } from '../../utils/parimutuel'
import { formatCurrency, formatOdds } from '../../utils/formatters'
import confetti from 'canvas-confetti'

const PRESET_AMOUNTS = [1, 5, 10, 25]

export function EpochPositionCards() {
  const {
    currentRound,
    timeRemaining,
    roundPhase,
    currentPools,
    pendingRound,
    showResult,
    lastPayout,
    addToPool,
  } = useGameStore()
  
  const { currentBet, selectedStake, setSelectedStake, placeBet, balance } = useUserStore()
  const { vibrateOnBet } = useHaptics()
  const { playWin, playLoss, playBet } = useSoundEffects()
  
  // Track explosion animation - only for users with bets
  const [explosionState, setExplosionState] = useState<'none' | 'win' | 'loss'>('none')
  const hasTriggeredExplosion = useRef(false)
  
  // Calculate potential payouts for current bet
  const currentBetPayouts = useMemo(() => {
    if (!currentBet) return null
    
    const upPool = currentPools.up + (currentBet.direction === 'up' ? 0 : 0)
    const downPool = currentPools.down + (currentBet.direction === 'down' ? 0 : 0)
    
    const winPayout = calculatePotentialPayout(
      currentBet.amount,
      currentBet.direction === 'up' ? upPool : downPool,
      currentBet.direction === 'up' ? downPool : upPool
    )
    
    return {
      ifWin: winPayout,
      ifLose: 0,
      direction: currentBet.direction,
      amount: currentBet.amount,
    }
  }, [currentBet, currentPools])
  
  // Calculate potential payouts for pending bet (awaiting resolution)
  const pendingBetPayouts = useMemo(() => {
    if (!pendingRound?.userBet) return null
    
    const bet = pendingRound.userBet
    const pools = pendingRound.pools
    
    const winPayout = calculatePotentialPayout(
      bet.amount,
      bet.direction === 'up' ? pools.up : pools.down,
      bet.direction === 'up' ? pools.down : pools.up
    )
    
    return {
      ifWin: winPayout,
      ifLose: 0,
      direction: bet.direction,
      amount: bet.amount,
      referencePrice: pendingRound.referencePrice,
    }
  }, [pendingRound])
  
  // Calculate odds for betting
  const { upOdds, downOdds } = useMemo(() => {
    const stake = selectedStake
    return {
      upOdds: calculateOdds(
        currentPools.up + (currentBet?.direction !== 'up' ? stake : 0),
        currentPools.down
      ),
      downOdds: calculateOdds(
        currentPools.down + (currentBet?.direction !== 'down' ? stake : 0),
        currentPools.up
      ),
    }
  }, [currentPools, selectedStake, currentBet])
  
  // Handle explosion on result - showResult is only true when user had a bet
  useEffect(() => {
    if (showResult && !hasTriggeredExplosion.current) {
      hasTriggeredExplosion.current = true
      
      if (lastPayout && lastPayout > 0 && isFinite(lastPayout)) {
        // Delay state change to avoid render issues
        setTimeout(() => {
          setExplosionState('win')
        }, 0)
        try {
          playWin()
        } catch (e) {
          console.error('Win sound error:', e)
        }
        // Confetti burst
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
      } else if (lastPayout === 0) {
        setExplosionState('loss')
        playLoss()
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
  
  const handleBet = (direction: 'up' | 'down') => {
    if (roundPhase !== 'betting') return
    
    const success = placeBet(direction, selectedStake)
    if (success) {
      addToPool(direction, selectedStake)
      vibrateOnBet()
      playBet()
    }
  }
  
  const seconds = Math.ceil(timeRemaining / 1000)
  const isLocked = roundPhase === 'locked' || roundPhase === 'resolving'
  
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Current Epoch Card - Resolving */}
      <motion.div
        key={`current-${currentRound - 1}`}
        initial={false}
        animate={{ 
          boxShadow: explosionState === 'win' 
            ? '0 0 40px rgba(0, 210, 106, 0.8)' 
            : explosionState === 'loss'
              ? '0 0 40px rgba(255, 68, 68, 0.8)'
              : '0 0 0px transparent'
        }}
        transition={{ duration: 0.3 }}
        className={`
          relative rounded-xl p-4 overflow-hidden
          ${explosionState === 'win' 
            ? 'bg-accent-up/20 border-2 border-accent-up' 
            : explosionState === 'loss'
              ? 'bg-accent-down/20 border-2 border-accent-down'
              : 'bg-bg-secondary border border-border'
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
                Resolving
              </span>
              <span className="text-xs font-mono text-text-secondary">
                #{currentRound - 1}
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
                <span>RUGGED</span>
              ) : (
                <span>⏳ {seconds}s</span>
              )}
            </div>
          </div>
          
          {/* Position Info - Always show structured data */}
          <div className="relative z-10">
            {pendingBetPayouts ? (
              <>
                <div className="flex items-center gap-2 mb-3">
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
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">If UP wins</div>
                    <div className={`font-mono font-bold ${pendingBetPayouts.direction === 'up' ? 'text-accent-up' : 'text-text-secondary'}`}>
                      {pendingBetPayouts.direction === 'up' 
                        ? `+${formatCurrency(pendingBetPayouts.ifWin)}` 
                        : '-' + formatCurrency(pendingBetPayouts.amount)
                      }
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">If RUG wins</div>
                    <div className={`font-mono font-bold ${pendingBetPayouts.direction === 'down' ? 'text-accent-up' : 'text-text-secondary'}`}>
                      {pendingBetPayouts.direction === 'down' 
                        ? `+${formatCurrency(pendingBetPayouts.ifWin)}` 
                        : '-' + formatCurrency(pendingBetPayouts.amount)
                      }
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-text-secondary">
                  Entry: ${pendingBetPayouts.referencePrice?.toFixed(2)}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-text-secondary">
                    No Position
                  </span>
                  <span className="text-sm font-mono text-text-secondary">
                    $0.00
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">If UP wins</div>
                    <div className="font-mono font-bold text-text-secondary">
                      $0.00
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-2">
                    <div className="text-xs text-text-secondary mb-1">If RUG wins</div>
                    <div className="font-mono font-bold text-text-secondary">
                      $0.00
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      
      {/* Next Epoch Card - Betting */}
      <motion.div
        layout
        className="rounded-xl p-4 bg-bg-secondary border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-accent-up uppercase tracking-wide">
              Betting Open
            </span>
            <span className="text-xs font-mono text-text-secondary">
              #{currentRound}
            </span>
          </div>
          <div className={`
            px-2 py-1 rounded text-xs font-mono font-bold
            ${isLocked 
              ? 'bg-accent-highlight/20 text-accent-highlight' 
              : seconds <= 3 
                ? 'bg-accent-down/20 text-accent-down'
                : 'bg-accent-up/20 text-accent-up'
            }
          `}>
            {isLocked ? '🔒 Locked' : `${seconds}s left`}
          </div>
        </div>
        
        {/* Current bet display - always show */}
        <div className="mb-3 p-3 rounded-lg bg-bg-tertiary border border-border">
          {currentBetPayouts ? (
            <>
              <div className="flex items-center gap-2 mb-2">
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
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary">If UP: </span>
                  <span className={`font-mono ${currentBetPayouts.direction === 'up' ? 'text-accent-up' : 'text-accent-down'}`}>
                    {currentBetPayouts.direction === 'up' 
                      ? `+${formatCurrency(currentBetPayouts.ifWin)}` 
                      : `-${formatCurrency(currentBetPayouts.amount)}`
                    }
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">If RUG: </span>
                  <span className={`font-mono ${currentBetPayouts.direction === 'down' ? 'text-accent-up' : 'text-accent-down'}`}>
                    {currentBetPayouts.direction === 'down' 
                      ? `+${formatCurrency(currentBetPayouts.ifWin)}` 
                      : `-${formatCurrency(currentBetPayouts.amount)}`
                    }
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-text-secondary">
                  No Position
                </span>
                <span className="text-sm font-mono text-text-secondary">
                  $0.00
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary">If UP: </span>
                  <span className="font-mono text-text-secondary">$0.00</span>
                </div>
                <div>
                  <span className="text-text-secondary">If RUG: </span>
                  <span className="font-mono text-text-secondary">$0.00</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Stake selector */}
        <div className="flex gap-2 mb-3">
          {PRESET_AMOUNTS.map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedStake(amount)}
              disabled={amount > balance || isLocked}
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
        
        {/* Pool display */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>⬆️ {formatCurrency(currentPools.up)} ({formatOdds(upOdds)})</span>
            <span>({formatOdds(downOdds)}) {formatCurrency(currentPools.down)} ⬇️</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-accent-up transition-all duration-300"
              style={{ 
                width: `${currentPools.up + currentPools.down > 0 
                  ? (currentPools.up / (currentPools.up + currentPools.down)) * 100 
                  : 50}%` 
              }}
            />
            <div
              className="h-full bg-accent-down transition-all duration-300"
              style={{ 
                width: `${currentPools.up + currentPools.down > 0 
                  ? (currentPools.down / (currentPools.up + currentPools.down)) * 100 
                  : 50}%` 
              }}
            />
          </div>
        </div>
        
        {/* Bet buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleBet('up')}
            disabled={isLocked || selectedStake > balance + (currentBet?.amount ?? 0)}
            className={`
              flex-1 py-4 rounded-xl font-bold text-lg
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              ${currentBet?.direction === 'up'
                ? 'bg-accent-up text-bg-primary ring-2 ring-accent-up ring-offset-2 ring-offset-bg-secondary'
                : 'bg-accent-up/20 text-accent-up hover:bg-accent-up/30'
              }
            `}
          >
            ⬆️ UP
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleBet('down')}
            disabled={isLocked || selectedStake > balance + (currentBet?.amount ?? 0)}
            className={`
              flex-1 py-4 rounded-xl font-bold text-lg
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              ${currentBet?.direction === 'down'
                ? 'bg-accent-down text-white ring-2 ring-accent-down ring-offset-2 ring-offset-bg-secondary'
                : 'bg-accent-down/20 text-accent-down hover:bg-accent-down/30'
              }
            `}
          >
            ⬇️ RUG
          </motion.button>
        </div>
        
        {/* Balance */}
        <div className="mt-3 text-center text-xs text-text-secondary">
          Balance: <span className="font-mono font-bold text-text-primary">{formatCurrency(balance)}</span>
        </div>
      </motion.div>
    </div>
  )
}
