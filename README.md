# ⬆️⬇️.fun

Fast-paced Solana price betting game. Predict whether SOL will go UP or get RUGGED every 10 seconds.

## Features

- **Real-time price feed** from Pyth Network (SOL/USD)
- **10-second betting rounds** aligned to clock time
- **Parimutuel betting** - dynamic odds based on pool distribution
- **Mobile-first design** with haptic feedback
- **Win/loss animations** with confetti and sound effects
- **PWA support** - installable on mobile devices

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Pyth Network   │ ──── │  Relay Server   │ ──── │    Frontend     │
│    (Hermes)     │      │   (WebSocket)   │      │    (React)      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                              Port 8080              Port 5173
```

The relay server connects once to Pyth and broadcasts to all frontend clients.

## Game Mechanics

1. **Bet during Round N** on whether the price will go UP or DOWN
2. **Reference price** is captured at the end of Round N
3. **Outcome** is determined at the end of Round N+1
4. **Winners split the pool** (minus 5% rake) proportionally

## Development

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start relay server (Terminal 1)
npm run server

# Start frontend dev server (Terminal 2)
npm run dev

# Or run both together
npm run dev:all
```

The frontend connects to `ws://localhost:8080` by default. Set `VITE_WS_URL` env var to change.

## Production

For production deployment:

1. Deploy the relay server to a cloud provider (e.g., Railway, Fly.io, Render)
2. Set `VITE_WS_URL` to your server URL when building:
   ```bash
   VITE_WS_URL=wss://your-server.com npm run build
   ```

## Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS v4
- Zustand (state management)
- Recharts (price chart)
- Framer Motion (animations)
- Web Audio API (sounds)
- canvas-confetti

**Server:**
- Node.js
- ws (WebSocket)

## Project Structure

```
├── server/              # Price relay server
│   └── index.js
├── src/
│   ├── components/      # React components
│   ├── stores/          # Zustand state stores
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
└── public/              # Static assets
```

## License

MIT
