import { useEffect, useRef, useCallback } from 'react'
import { usePriceStore } from '../stores/priceStore'

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/solusdt@trade'
const RECONNECT_DELAY = 3000
const THROTTLE_MS = 200 // Update at most 5 times per second

export function useBinanceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  
  const { addPricePoint, setConnected } = usePriceStore()
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    
    try {
      const ws = new WebSocket(BINANCE_WS_URL)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('Binance WebSocket connected')
        setConnected(true)
      }
      
      ws.onmessage = (event) => {
        const now = Date.now()
        
        // Throttle updates
        if (now - lastUpdateRef.current < THROTTLE_MS) {
          return
        }
        lastUpdateRef.current = now
        
        try {
          const data = JSON.parse(event.data)
          const price = parseFloat(data.p)
          const timestamp = data.T || now
          
          if (!isNaN(price) && price > 0) {
            addPricePoint({ price, timestamp })
          }
        } catch (e) {
          console.error('Error parsing price data:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('Binance WebSocket disconnected')
        setConnected(false)
        wsRef.current = null
        
        // Attempt to reconnect
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }
      
      ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error)
        ws.close()
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnected(false)
      
      // Attempt to reconnect
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }, [addPricePoint, setConnected])
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
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

