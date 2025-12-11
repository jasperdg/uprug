import { useEffect, useRef, useCallback } from 'react'
import { usePriceStore } from '../stores/priceStore'
import { useGameStore } from '../stores/gameStore'

// Connect to our relay server
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
const RECONNECT_DELAY = 3000

export function useBinanceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  
  const { addPricePoint, setConnected, initializeHistory } = usePriceStore()
  const { 
    setTimeRemaining, 
    setRound, 
    setReferencePrice,
    addEpochResult,
    initializeEpochHistory
  } = useGameStore()
  
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
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'init':
              // Initialize with server state
              if (data.priceHistory) {
                initializeHistory(data.priceHistory)
              }
              if (data.epochHistory) {
                initializeEpochHistory(data.epochHistory)
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
              // Regular price update
              addPricePoint({
                price: data.price,
                timestamp: data.timestamp,
                epoch: data.epoch
              })
              if (data.timeRemaining !== undefined) {
                setTimeRemaining(data.timeRemaining)
              }
              break
              
            case 'time':
              // Time sync update
              setTimeRemaining(data.timeRemaining)
              if (data.epoch) {
                setRound(data.epoch)
              }
              break
              
            case 'epoch_start':
              // New epoch started
              setRound(data.epoch)
              setReferencePrice(data.referencePrice)
              setTimeRemaining(data.timeRemaining)
              break
              
            case 'epoch_end':
              // Epoch ended with result
              addEpochResult({
                epoch: data.epoch,
                endPrice: data.endPrice,
                referencePrice: data.referencePrice,
                referenceIndex: data.referenceIndex,
                outcome: data.outcome,
                timestamp: data.timestamp
              })
              break
              
            case 'status':
              setConnected(data.connected)
              break
              
            case 'heartbeat':
              // Keep alive
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
    addPricePoint, 
    setConnected, 
    initializeHistory,
    setTimeRemaining,
    setRound,
    setReferencePrice,
    addEpochResult,
    initializeEpochHistory
  ])
  
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
