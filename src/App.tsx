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
      {/* Price Chart - takes available space */}
      <div className="flex-1 min-h-0">
        <PriceChart />
      </div>
      
      {/* Epoch Position Cards */}
      <div className="flex-shrink-0 overflow-y-auto max-h-[50vh]">
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
