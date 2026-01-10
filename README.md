# 🃏 Blackjack Live

> **An open-source, real-time multiplayer blackjack game** with stunning casino aesthetics. Play with up to 6 players, powered by edge-deployed WebSocket infrastructure.

[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red)](https://github.com/SparkyWoo/blackjack_live)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![PartyKit](https://img.shields.io/badge/PartyKit-Realtime-ff6b6b?logo=websocket)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <img src="https://raw.githubusercontent.com/SparkyWoo/blackjack_live/main/public/dealer-avatar.png" alt="Blackjack Live" width="120" />
</p>

**🎯 Why Open Source?** This project is fully open source so you can learn from it, customize it, or host your own multiplayer blackjack table. Fork it, improve it, make it yours!

## ✨ Features

### 🎮 Gameplay
- **6-Player Multiplayer** - Real-time synchronized gameplay
- **Full Blackjack Rules** - Hit, Stand, Double Down, Split, Surrender, Insurance
- **Keyboard Shortcuts** - H/S/D/P/R keys for quick actions
- **Auto-Bet Persistence** - Your last bet carries over between rounds
- **Spectator Mode** - Watch games in progress

### 🎨 Premium UI/UX
- **Casino-Grade Visuals** - Emerald felt, wooden rails, gold accents
- **Smooth Animations** - Card dealing, chip stacking, payout celebrations
- **Sound Effects** - Immersive audio with mute toggle
- **Payout Animations** - Celebratory overlays for wins and blackjacks
- **Mobile Responsive** - Play on any device
- **Accessible** - ARIA labels for screen readers

### ⚡ Technical
- **Edge-Deployed** - Sub-50ms latency via PartyKit's global edge network
- **Persistent Balances** - Chip balances survive server restarts
- **Reconnection Handling** - Seamless recovery from network interruptions
- **Optimized Bundle** - LazyMotion for reduced JS bundle size
- **TypeScript** - Full type safety throughout
- **Error Boundary** - Graceful error handling with recovery UI

### 📱 Mobile
- **Haptic Feedback** - Tactile vibration on mobile devices
- **Responsive Layout** - Optimized buttons and chip selector for small screens
- **Touch Optimized** - Larger tap targets with proper spacing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Development

```bash
# Clone the repository
git clone https://github.com/SparkyWoo/blackjack_live.git
cd blackjack_live

# Install dependencies
npm install

# Start the Next.js dev server
npm run dev

# In a separate terminal, start PartyKit
npx partykit dev
```

Open [http://localhost:3000](http://localhost:3000) to play locally.

### Deployment

#### 1. Create a PartyKit Account

```bash
# Sign up / log in to PartyKit (opens browser)
npx partykit login
```

This will open your browser to authenticate with GitHub. PartyKit is free for hobby projects.

#### 2. Deploy PartyKit Server

```bash
# Deploy the game server to PartyKit's edge network
npx partykit deploy
```

You'll get a URL like: `https://blackjack-game.your-username.partykit.dev`

#### 3. Configure Environment

Create a `.env.local` file with your PartyKit URL:

```bash
NEXT_PUBLIC_PARTYKIT_HOST=blackjack-game.your-username.partykit.dev
```

#### 4. Deploy Frontend

```bash
# Deploy to Vercel (or your preferred platform)
npx vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 16 + React 19 + Framer Motion + Tailwind CSS       │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PartyKit Edge Server                       │
│  • Game state machine (betting → dealing → turns → payout)  │
│  • Timer management via Alarm API                           │
│  • Durable storage for chip balances                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Description |
|------|-------------|
| `party/blackjack.ts` | Game server - state machine, rules engine, timer logic |
| `src/components/Table.tsx` | Main game UI - seats, dealer, action buttons |
| `src/components/Seat.tsx` | Player seat - cards, chips, join flow |
| `src/components/Leaderboard.tsx` | Player rankings modal with trophy icons |
| `src/hooks/usePartySocket.ts` | WebSocket hook - connection, reconnection, actions |
| `src/lib/gameTypes.ts` | Shared types - cards, hands, game state |

## 🎰 Game Rules

| Rule | Implementation |
|------|----------------|
| **Blackjack Pays** | 3:2 |
| **Dealer Stands** | All 17s (including soft 17) |
| **Double Down** | Any two cards |
| **Split** | Same rank or 10-value cards (max 4 hands) |
| **Surrender** | Late surrender on first two cards |
| **Insurance** | Offered when dealer shows Ace |
| **Decks** | 2-deck shoe, reshuffled at 75% penetration |

## 🎨 Customization

### Adjust Timers
Edit constants in `party/blackjack.ts`:
```typescript
const BETTING_TIME = 5000;    // Betting phase duration
const TURN_TIME = 10000;      // Player turn timeout
const PAYOUT_TIME = 2000;     // Delay before next round
```

### Change Starting Chips
```typescript
const INITIAL_CHIPS = 10000;  // Default chip balance
```

### Add Chip Denominations
Edit the chip array in `src/components/Table.tsx`:
```typescript
{([10, 50, 100, 500, 1000] as ChipValue[]).map((value) => ...)}
```

## ⌨️ Keyboard Shortcuts

During your turn, use these keys for quick actions:

| Key | Action |
|-----|--------|
| `H` | Hit |
| `S` | Stand |
| `D` | Double Down |
| `P` | Split |
| `R` | Surrender |

Toggle keyboard hints visibility with the ⌨️ button in the header.

## 📁 Project Structure

```
blackjack_live/
├── party/
│   └── blackjack.ts       # PartyKit game server
├── src/
│   ├── app/
│   │   ├── page.tsx       # Main page
│   │   ├── layout.tsx     # Root layout + error boundary
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   ├── Table.tsx      # Game table UI
│   │   ├── Seat.tsx       # Player seat
│   │   ├── Dealer.tsx     # Dealer + shoe
│   │   ├── Card.tsx       # Playing card
│   │   ├── Chip.tsx       # Betting chip
│   │   ├── Timer.tsx      # Countdown timer
│   │   ├── Leaderboard.tsx # Player rankings modal
│   │   └── ErrorBoundary.tsx # Error handling
│   ├── hooks/
│   │   └── usePartySocket.ts  # WebSocket connection
│   └── lib/
│       ├── gameTypes.ts   # Type definitions
│       ├── sounds.ts      # Audio manager
│       └── haptics.ts     # Haptic feedback utility
├── public/
│   ├── sounds/            # Audio files
│   └── dealer-avatar.png  # Dealer image
└── partykit.json          # PartyKit config
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion 12 |
| **Audio** | Howler.js |
| **Real-time** | PartyKit (WebSockets) |
| **Deployment** | Vercel + PartyKit Cloud |

## 🤝 Contributing

Contributions are welcome! This is an open source project - fork it, improve it, make it yours.

### Running Your Own Instance

1. Fork the repository
2. Deploy your own PartyKit server (`npx partykit deploy`)
3. Deploy your frontend to Vercel (or similar)
4. Your instance is completely independent

### Submitting Improvements

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Test on your own deployment
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

> **Note:** Pull requests are reviewed before merging. Contributors should test on their own fork/deployment.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PartyKit](https://partykit.io) for the incredible real-time infrastructure
- [Framer Motion](https://framer.com/motion) for buttery-smooth animations
- Casino sound effects generated with AI

---

<p align="center">
  Made with ♠️ ♥️ ♣️ ♦️ by <a href="https://github.com/SparkyWoo">SparkyWoo</a>
</p>
