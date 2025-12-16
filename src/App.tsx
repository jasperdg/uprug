import { useEffect } from 'react'
import { GameLayout } from './components/Layout/GameLayout'
import { PriceChart } from './components/PriceChart/PriceChart'
import { EpochPositionCards } from './components/EpochCards/EpochPositionCards'
import { TradeHistory } from './components/TradeHistory/TradeHistory'
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket'
import { useGameLoop } from './hooks/useGameLoop'
import { useSoundEffects } from './hooks/useSoundEffects'

function App() {
  // Initialize WebSocket connection
  useBinanceWebSocket()
  
  // Initialize game loop
  useGameLoop()
  
  // Preload sounds on first interaction - use ref to avoid re-registering
  const { loadSounds } = useSoundEffects()
  
  useEffect(() => {
    let mounted = true
    
    const handleInteraction = () => {
      if (!mounted) return
      loadSounds()
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
    
    document.addEventListener('click', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)
    
    return () => {
      mounted = false
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, []) // Empty deps - loadSounds is stable via useCallback
  
  return (
    <GameLayout>
      {/* Price Chart - takes available space, minimum height on mobile */}
      <div className="flex-1 min-h-[40vh] md:min-h-0">
        <PriceChart />
      </div>
      
      {/* Epoch Position Cards */}
      <div className="flex-shrink-0 overflow-y-auto max-h-[35vh] md:max-h-[50vh]">
        <EpochPositionCards />
      </div>
      
      {/* Trade History - Expandable */}
      <div className="flex-shrink-0">
        <TradeHistory />
      </div>
    </GameLayout>
  )
}

export default App
