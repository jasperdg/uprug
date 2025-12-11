const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 8080;
const PYTH_WS_URL = 'wss://hermes.pyth.network/ws';
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';

// State
let pythWs = null;
let currentPrice = null;
let lastPriceUpdate = null;
let reconnectTimeout = null;

// Create WebSocket server for clients
const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server started on port ${PORT}`);

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Connect to Pyth Hermes
function connectToPyth() {
  if (pythWs && pythWs.readyState === WebSocket.OPEN) {
    return;
  }

  console.log('Connecting to Pyth Hermes...');
  
  pythWs = new WebSocket(PYTH_WS_URL);

  pythWs.on('open', () => {
    console.log('Connected to Pyth Hermes');
    
    // Subscribe to SOL/USD price feed
    pythWs.send(JSON.stringify({
      type: 'subscribe',
      ids: [SOL_USD_FEED_ID]
    }));
  });

  pythWs.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      
      // Handle price update messages
      if (data.type === 'price_update' && data.price_feed) {
        const priceFeed = data.price_feed;
        
        if (priceFeed.price && priceFeed.price.price && priceFeed.price.expo !== undefined) {
          const rawPrice = parseInt(priceFeed.price.price);
          const expo = parseInt(priceFeed.price.expo);
          const price = rawPrice * Math.pow(10, expo);
          
          if (!isNaN(price) && price > 0) {
            currentPrice = price;
            lastPriceUpdate = Date.now();
            
            // Broadcast to all clients
            broadcast({
              type: 'price',
              price: price,
              timestamp: priceFeed.price.publish_time 
                ? priceFeed.price.publish_time * 1000 
                : Date.now()
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing Pyth data:', e);
    }
  });

  pythWs.on('close', () => {
    console.log('Disconnected from Pyth Hermes');
    pythWs = null;
    
    // Reconnect after delay
    reconnectTimeout = setTimeout(connectToPyth, 3000);
  });

  pythWs.on('error', (err) => {
    console.error('Pyth WebSocket error:', err.message);
    pythWs.close();
  });
}

// Handle client connections
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected: ${clientIp} (Total: ${wss.clients.size})`);
  
  // Send current price immediately if available
  if (currentPrice !== null) {
    ws.send(JSON.stringify({
      type: 'price',
      price: currentPrice,
      timestamp: lastPriceUpdate
    }));
  }
  
  // Send connection status
  ws.send(JSON.stringify({
    type: 'status',
    connected: pythWs && pythWs.readyState === WebSocket.OPEN,
    clients: wss.clients.size
  }));

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientIp} (Total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`Client error: ${err.message}`);
  });
});

// Start Pyth connection
connectToPyth();

// Heartbeat to keep connections alive
setInterval(() => {
  broadcast({
    type: 'heartbeat',
    timestamp: Date.now(),
    clients: wss.clients.size
  });
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  if (pythWs) {
    pythWs.close();
  }
  
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Price relay server ready');

