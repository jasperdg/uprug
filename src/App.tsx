import { useEffect } from 'react'
import { GameLayout } from './components/Layout/GameLayout'
import { PriceChart } from './components/PriceChart/PriceChart'
import { CountdownTimer } from './components/Timer/CountdownTimer'
import { PoolDisplay } from './components/PoolDisplay/PoolDisplay'
import { BettingPanel } from './components/BettingPanel/BettingPanel'
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket'
import { useGameLoop } from './hooks/useGameLoop'
import { useSoundEffects } from './hooks/useSoundEffects'

function App() {
  // Initialize WebSocket connection
  useBinanceWebSocket()
  
  // Initialize game loop
  useGameLoop()
  
  // Preload sounds on first interaction
  const { loadSounds } = useSoundEffects()
  
  useEffect(() => {
    const handleInteraction = () => {
      loadSounds()
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
    
    document.addEventListener('click', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)
    
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [loadSounds])
  
  return (
    <GameLayout>
      {/* Price Chart - 40% of available space */}
      <div className="flex-[4] min-h-0">
        <PriceChart />
      </div>
      
      {/* Timer */}
      <CountdownTimer />
      
      {/* Pool Display */}
      <PoolDisplay />
      
      {/* Betting Panel - takes remaining space */}
      <div className="flex-[6] min-h-0 overflow-y-auto">
        <BettingPanel />
      </div>
    </GameLayout>
  )
}

export default App
