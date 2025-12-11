# uprug.fun

Fast-paced Solana price betting game. Predict whether SOL will go UP or get RUGGED every 10 seconds.

## Features

- **Real-time price feed** from Binance WebSocket (SOL/USDT)
- **10-second betting rounds** aligned to clock time
- **Parimutuel betting** - dynamic odds based on pool distribution
- **Mobile-first design** with haptic feedback
- **Win/loss animations** with confetti and sound effects
- **PWA support** - installable on mobile devices

## Game Mechanics

1. **Bet during Round N** on whether the price will go UP or DOWN
2. **Reference price** is captured at the end of Round N
3. **Outcome** is determined at the end of Round N+1
4. **Winners split the pool** (minus 5% rake) proportionally

## Tech Stack

- React 18 + Vite
- Tailwind CSS v4
- Zustand (state management)
- Recharts (price chart)
- Framer Motion (animations)
- Howler.js (sounds)
- canvas-confetti

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
├── stores/         # Zustand state stores
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
└── assets/         # Static assets
```

## License

MIT
