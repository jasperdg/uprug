import { useEffect, useRef, useCallback } from 'react'
import { usePriceStore } from '../stores/priceStore'

// Connect to our relay server instead of Pyth directly
// In production, this would be your deployed server URL
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
const RECONNECT_DELAY = 3000
const THROTTLE_MS = 100 // Update 10 times per second for smooth updates

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
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('Connected to price server')
        setConnected(true)
      }
      
      ws.onmessage = (event) => {
        const now = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          
          // Handle price updates from our server
          if (data.type === 'price') {
            // Throttle updates
            if (now - lastUpdateRef.current < THROTTLE_MS) {
              return
            }
            lastUpdateRef.current = now
            
            const price = data.price
            const timestamp = data.timestamp || now
            
            if (!isNaN(price) && price > 0) {
              addPricePoint({ price, timestamp })
            }
          }
          
          // Handle status updates
          if (data.type === 'status') {
            setConnected(data.connected)
          }
        } catch (e) {
          console.error('Error parsing server data:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('Disconnected from price server')
        setConnected(false)
        wsRef.current = null
        
        // Attempt to reconnect
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
