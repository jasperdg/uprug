import { useEffect, useRef, useCallback } from 'react'
import { usePriceStore } from '../stores/priceStore'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'

// Connect to our relay server
function getWebSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    console.error('No VITE_WS_URL configured for production. WebSocket will fail.')
    return 'wss://your-server.railway.app'
  }
  
  return 'ws://localhost:8080'
}

const WS_URL = getWebSocketUrl()
const RECONNECT_DELAY = 3000
const FRAME_INTERVAL = 33 // ~30 FPS - smoother and more efficient
const TIME_UPDATE_INTERVAL = 100 // Time updates at 10 FPS

export function useBinanceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  
  // Throttling refs
  const pendingPriceRef = useRef<{ price: number; timestamp: number; epoch: number } | null>(null)
  const pendingTimeRef = useRef<{ timeRemaining: number; epoch?: number } | null>(null)
  const pendingEpochEndRef = useRef<{
    epoch: number
    endPrice: number
    referencePrice: number | null
    referenceIndex: number
    outcome: 'up' | 'down' | null
    timestamp: number
    epochTimestamps?: number[]
    boundaryPoint?: {
      price: number
      timestamp: number
      epoch: number
      isEpochEnd: boolean
    }
  } | null>(null)
  const pendingEpochStartRef = useRef<{
    epoch: number
    referencePrice: number
    timeRemaining: number
    epochTimestamps?: number[]
  } | null>(null)
  const lastFrameRef = useRef<number>(0)
  const lastTimeUpdateRef = useRef<number>(0)
  const frameIntervalRef = useRef<number | null>(null)
  
  const { addPricePoint, addExtrapolatedPoint, setConnected, initializeHistory, markLastPointAsEpochEnd } = usePriceStore()
  const { 
    setTimeRemaining, 
    setRound, 
    setReferencePrice,
    setEpochTimestamps,
    addEpochResult,
    initializeEpochHistory,
    handleEpochTransition,
    currentPools
  } = useGameStore()
  
  // Get current bet directly to pass to handleEpochTransition
  const currentBet = useUserStore((s) => s.currentBet)
  const clearCurrentBet = useUserStore((s) => s.clearCurrentBet)
  
  // Run at ~70fps - flush all pending updates in batched manner
  const tick = useCallback(() => {
    const now = Date.now()
    
    // Check if it's time for a new frame
    if (now - lastFrameRef.current < FRAME_INTERVAL) return
    lastFrameRef.current = now
    
    // Process epoch events in next animation frame to avoid blocking chart
    if (pendingEpochEndRef.current || pendingEpochStartRef.current) {
      const epochEndData = pendingEpochEndRef.current
      const epochStartData = pendingEpochStartRef.current
      pendingEpochEndRef.current = null
      pendingEpochStartRef.current = null
      
      // Capture current bet before clearing (to pass to epoch transition)
      const betToResolve = currentBet
      const poolsSnapshot = { ...currentPools }
      
      // Clear the bet immediately when epoch ends
      if (epochEndData && betToResolve) {
        clearCurrentBet()
      }
      
      // Defer epoch state updates to next frame
      requestAnimationFrame(() => {
        if (epochEndData) {
          // Add the boundary point from server to ensure chart aligns with epoch marker
          if (epochEndData.boundaryPoint) {
            addPricePoint({
              price: epochEndData.boundaryPoint.price,
              timestamp: epochEndData.boundaryPoint.timestamp,
              epoch: epochEndData.boundaryPoint.epoch,
              isEpochEnd: true
            })
          } else {
            // Fallback: mark the last point as epoch end
            markLastPointAsEpochEnd()
          }
        }
        
        // Single batched call handles all game state updates
        // Pass current bet directly to avoid race condition
        handleEpochTransition({
          epochEnd: epochEndData,
          epochStart: epochStartData,
          currentBet: betToResolve,
          currentPools: poolsSnapshot
        })
      })
    }
    
    // If we have pending price data, use it
    if (pendingPriceRef.current) {
      addPricePoint(pendingPriceRef.current)
      pendingPriceRef.current = null
    } else {
      // No new data - extrapolate horizontal line at current price
      addExtrapolatedPoint()
    }
    
    // Flush time update at lower frequency
    if (pendingTimeRef.current && now - lastTimeUpdateRef.current >= TIME_UPDATE_INTERVAL) {
      setTimeRemaining(pendingTimeRef.current.timeRemaining)
      if (pendingTimeRef.current.epoch) {
        setRound(pendingTimeRef.current.epoch)
      }
      lastTimeUpdateRef.current = now
      pendingTimeRef.current = null
    }
  }, [addPricePoint, addExtrapolatedPoint, setTimeRemaining, setRound, markLastPointAsEpochEnd, handleEpochTransition, currentBet, currentPools, clearCurrentBet])
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    
    // Start frame loop at ~70fps
    if (!frameIntervalRef.current) {
      frameIntervalRef.current = window.setInterval(tick, FRAME_INTERVAL)
    }
    
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('Connected to price server')
        setConnected(true)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'init':
              // Initialize immediately
              if (data.priceHistory) {
                initializeHistory(data.priceHistory)
              }
              if (data.epochHistory) {
                initializeEpochHistory(data.epochHistory)
              }
              if (data.epochTimestamps) {
                setEpochTimestamps(data.epochTimestamps)
              }
              if (data.currentEpoch) {
                setRound(data.currentEpoch)
              }
              if (data.referencePrice) {
                setReferencePrice(data.referencePrice)
              }
              if (data.timeRemaining) {
                setTimeRemaining(data.timeRemaining)
              }
              setConnected(data.pythConnected)
              break
              
            case 'price':
              // Queue price update
              pendingPriceRef.current = {
                price: data.price,
                timestamp: data.timestamp,
                epoch: data.epoch
              }
              if (data.timeRemaining !== undefined) {
                pendingTimeRef.current = { 
                  timeRemaining: data.timeRemaining,
                  epoch: data.epoch
                }
              }
              break
              
            case 'time':
              pendingTimeRef.current = {
                timeRemaining: data.timeRemaining,
                epoch: data.epoch
              }
              break
              
            case 'epoch_start':
              // Queue for next frame tick to avoid sync render blocking
              pendingEpochStartRef.current = {
                epoch: data.epoch,
                referencePrice: data.referencePrice,
                timeRemaining: data.timeRemaining,
                epochTimestamps: data.epochTimestamps
              }
              break
              
            case 'epoch_end':
              // Queue for next frame tick to avoid sync render blocking
              pendingEpochEndRef.current = {
                epoch: data.epoch,
                endPrice: data.endPrice,
                referencePrice: data.referencePrice,
                referenceIndex: data.referenceIndex,
                outcome: data.outcome,
                timestamp: data.timestamp,
                epochTimestamps: data.epochTimestamps,
                boundaryPoint: data.boundaryPoint
              }
              break
              
            case 'status':
              setConnected(data.connected)
              break
              
            case 'heartbeat':
              break
          }
        } catch (e) {
          console.error('Error parsing server data:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('Disconnected from price server')
        setConnected(false)
        wsRef.current = null
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        ws.close()
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnected(false)
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }, [
    tick,
    setConnected, 
    initializeHistory,
    markLastPointAsEpochEnd,
    setTimeRemaining,
    setRound,
    setReferencePrice,
    setEpochTimestamps,
    addEpochResult,
    initializeEpochHistory
  ])
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnected(false)
  }, [setConnected])
  
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])
  
  return {
    isConnected: usePriceStore((state) => state.isConnected),
    reconnect: connect,
  }
}
