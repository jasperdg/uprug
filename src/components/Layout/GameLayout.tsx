import type { ReactNode } from 'react'
import { BalanceDisplay } from '../Balance/BalanceDisplay'
import { WinEffect } from '../Feedback/WinEffect'
import { ResultToast } from '../Feedback/ResultToast'
import { ConnectionStatus } from '../Feedback/ConnectionStatus'
import { usePriceStore } from '../../stores/priceStore'
import { useUserStore } from '../../stores/userStore'

interface GameLayoutProps {
  children: ReactNode
}

export function GameLayout({ children }: GameLayoutProps) {
  const isConnected = usePriceStore((state) => state.isConnected)
  const { soundEnabled, toggleSound } = useUserStore()
  
  return (
    <div className="h-full flex flex-col bg-bg-primary safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border">
        <div className="flex items-center">
          <span className="text-xl">⬆️⬇️</span>
          <span className="text-xl font-bold text-accent-highlight">.fun</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-up' : 'bg-accent-down animate-pulse'}`} />
          
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors touch-manipulation"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>
      
      {/* Balance */}
      <BalanceDisplay />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
      
      {/* Effects overlays */}
      <WinEffect />
      <ResultToast />
      <ConnectionStatus />
    </div>
  )
}

