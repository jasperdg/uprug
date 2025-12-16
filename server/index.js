const http = require('http');
const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 8080;
const PYTH_WS_URL = 'wss://hermes.pyth.network/ws';
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
const EPOCH_DURATION = 10000; // 10 seconds

// State
let pythWs = null;
let reconnectTimeout = null;

// Price state - SETTLEMENT USES THE ABSOLUTE LAST TICK PRICE
let currentPrice = null;
let lastPriceTimestamp = null;
let lastTickPriceInEpoch = null; // Explicitly track the last tick in current epoch

// Epoch state
let currentEpoch = Math.floor(Date.now() / EPOCH_DURATION);
let epochStartPrice = null;
let lastEpochEndPrice = null; // This is the settlement price from the previous epoch
let epochHistory = []; // Store recent epoch results
const MAX_EPOCH_HISTORY = 20;

// Price history for chart (last ~60 seconds)
let priceHistory = [];
const MAX_PRICE_HISTORY = 600; // 10 updates/sec * 60 seconds

// Get current epoch number
function getEpochNumber() {
  return Math.floor(Date.now() / EPOCH_DURATION);
}

// Get time remaining in current epoch
function getTimeRemaining() {
  return EPOCH_DURATION - (Date.now() % EPOCH_DURATION);
}

// Get epoch timestamps for current + next N epochs
function getEpochTimestamps(count = 10) {
  const now = Date.now();
  const currentEpochStart = Math.floor(now / EPOCH_DURATION) * EPOCH_DURATION;
  const timestamps = [];
  
  // Add past epochs that are in our price history
  const oldestTimestamp = priceHistory.length > 0 ? priceHistory[0].timestamp : now;
  let pastEpochStart = currentEpochStart - EPOCH_DURATION;
  
  // Go back to find epochs in history
  while (pastEpochStart >= oldestTimestamp - EPOCH_DURATION) {
    timestamps.unshift(pastEpochStart + EPOCH_DURATION); // epoch END timestamp
    pastEpochStart -= EPOCH_DURATION;
  }
  
  // Add current epoch end and future epochs
  for (let i = 0; i <= count; i++) {
    timestamps.push(currentEpochStart + ((i + 1) * EPOCH_DURATION)); // epoch END timestamps
  }
  
  return timestamps;
}

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      pythConnected: pythWs && pythWs.readyState === WebSocket.OPEN,
      currentPrice,
      currentEpoch,
      timeRemaining: getTimeRemaining(),
      clients: wss.clients.size
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Process epoch end - SETTLEMENT USES THE ABSOLUTE LAST TICK
function processEpochEnd() {
  if (lastTickPriceInEpoch === null && currentPrice === null) return;
  
  const endedEpoch = currentEpoch;
  // Use the last tick price received in this epoch as the settlement price
  const epochEndPrice = lastTickPriceInEpoch || currentPrice;
  
  // Determine outcome (up or down from previous epoch's settlement price)
  let outcome = null;
  if (lastEpochEndPrice !== null) {
    outcome = epochEndPrice > lastEpochEndPrice ? 'up' : 'down';
  }
  
  console.log(`Settlement: Epoch ${endedEpoch} - Last tick: $${epochEndPrice.toFixed(4)}, Ref: $${lastEpochEndPrice?.toFixed(4) || 'N/A'}, Outcome: ${outcome || 'first epoch'}`);
  
  // Create epoch result
  const epochResult = {
    epoch: endedEpoch,
    startPrice: epochStartPrice,
    endPrice: epochEndPrice,
    outcome,
    timestamp: Date.now()
  };
  
  // Store in history
  epochHistory.push(epochResult);
  if (epochHistory.length > MAX_EPOCH_HISTORY) {
    epochHistory.shift();
  }
  
  // Mark epoch boundary in price history
  if (priceHistory.length > 0) {
    priceHistory[priceHistory.length - 1].isEpochEnd = true;
    priceHistory[priceHistory.length - 1].epochResult = epochResult;
  }
  
  // Find the index of the reference price point in history
  let referenceIndex = -1;
  for (let i = priceHistory.length - 1; i >= 0; i--) {
    if (priceHistory[i].epoch < endedEpoch) {
      referenceIndex = i;
      break;
    }
  }
  
  // Broadcast epoch end to all clients with reference price info
  broadcast({
    type: 'epoch_end',
    epoch: endedEpoch,
    endPrice: epochEndPrice,
    referencePrice: lastEpochEndPrice,
    referenceIndex: referenceIndex,
    outcome,
    timestamp: Date.now(),
    epochTimestamps: getEpochTimestamps()
  });
  
  // Update state for next epoch
  lastEpochEndPrice = epochEndPrice; // This becomes the reference price for next epoch
  currentEpoch = getEpochNumber();
  epochStartPrice = currentPrice;
  lastTickPriceInEpoch = null; // Reset for new epoch
  
  // Broadcast new epoch start
  broadcast({
    type: 'epoch_start',
    epoch: currentEpoch,
    referencePrice: lastEpochEndPrice,
    timeRemaining: getTimeRemaining(),
    timestamp: Date.now(),
    epochTimestamps: getEpochTimestamps()
  });
}

// Epoch timer - check every 50ms for precision
setInterval(() => {
  const nowEpoch = getEpochNumber();
  
  if (nowEpoch > currentEpoch) {
    processEpochEnd();
  }
  
  // Broadcast time update every 100ms
  if (Date.now() % 100 < 20) {
    broadcast({
      type: 'time',
      epoch: currentEpoch,
      timeRemaining: getTimeRemaining()
    });
  }
}, 50);

// Connect to Pyth Hermes
function connectToPyth() {
  if (pythWs && pythWs.readyState === WebSocket.OPEN) {
    return;
  }

  console.log('Connecting to Pyth Hermes...');
  
  pythWs = new WebSocket(PYTH_WS_URL);

  pythWs.on('open', () => {
    console.log('Connected to Pyth Hermes');
    
    pythWs.send(JSON.stringify({
      type: 'subscribe',
      ids: [SOL_USD_FEED_ID]
    }));
  });

  pythWs.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      
      if (data.type === 'price_update' && data.price_feed) {
        const priceFeed = data.price_feed;
        
        if (priceFeed.price && priceFeed.price.price && priceFeed.price.expo !== undefined) {
          const rawPrice = parseInt(priceFeed.price.price);
          const expo = parseInt(priceFeed.price.expo);
          const price = rawPrice * Math.pow(10, expo);
          
          if (!isNaN(price) && price > 0) {
            const timestamp = Date.now();
            
            // Update current price - this is the LAST TICK used for settlement
            currentPrice = price;
            lastPriceTimestamp = timestamp;
            lastTickPriceInEpoch = price; // Track the absolute last tick
            
            // Set epoch start price if not set
            if (epochStartPrice === null) {
              epochStartPrice = price;
            }
            
            // Add to price history
            const pricePoint = {
              price,
              timestamp,
              epoch: currentEpoch
            };
            priceHistory.push(pricePoint);
            if (priceHistory.length > MAX_PRICE_HISTORY) {
              priceHistory.shift();
            }
            
            // Broadcast price to all clients
            broadcast({
              type: 'price',
              price,
              timestamp,
              epoch: currentEpoch,
              timeRemaining: getTimeRemaining()
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
  
  // Send initial state with full price history and epoch timestamps
  ws.send(JSON.stringify({
    type: 'init',
    currentPrice,
    currentEpoch,
    timeRemaining: getTimeRemaining(),
    referencePrice: lastEpochEndPrice,
    priceHistory: priceHistory.slice(-400), // Last 400 points (~40 seconds)
    epochHistory: epochHistory.slice(-10), // Last 10 epochs
    epochTimestamps: getEpochTimestamps(), // Current + next epochs
    pythConnected: pythWs && pythWs.readyState === WebSocket.OPEN
  }));

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientIp} (Total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`Client error: ${err.message}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  connectToPyth();
});

// Heartbeat
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
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (pythWs) pythWs.close();
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

console.log('Price relay server initializing...');
