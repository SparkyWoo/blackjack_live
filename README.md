# 🃏 Blackjack Live

A real-time multiplayer blackjack game with stunning casino aesthetics. Play with up to 6 players, powered by edge-deployed WebSocket infrastructure.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![PartyKit](https://img.shields.io/badge/PartyKit-Realtime-ff6b6b?logo=websocket)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <img src="https://raw.githubusercontent.com/SparkyWoo/blackjack_live/main/public/dealer-avatar.png" alt="Blackjack Live" width="120" />
</p>

## ✨ Features

### 🎮 Gameplay
- **6-Player Multiplayer** — Real-time synchronized gameplay
- **Full Blackjack Rules** — Hit, Stand, Double Down, Split, Surrender, Insurance
- **Auto-Bet Persistence** — Your last bet carries over between rounds
- **Spectator Mode** — Watch games in progress

### 🎨 Premium UI/UX
- **Casino-Grade Visuals** — Emerald felt, wooden rails, gold accents
- **Smooth Animations** — Card dealing, chip stacking, payout effects
- **Sound Effects** — Immersive audio for all game actions
- **Mobile Responsive** — Play on any device

### ⚡ Technical
- **Edge-Deployed** — Sub-50ms latency via PartyKit's global edge network
- **Persistent Balances** — Chip balances survive server restarts
- **Reconnection Handling** — Seamless recovery from network interruptions
- **TypeScript** — Full type safety throughout

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

```bash
# Deploy PartyKit server to edge
npx partykit deploy

# Deploy frontend to Vercel (or your preferred platform)
vercel
```

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
| `party/blackjack.ts` | Game server — state machine, rules engine, timer logic |
| `src/components/Table.tsx` | Main game UI — seats, dealer, action buttons |
| `src/components/Seat.tsx` | Player seat — cards, chips, join flow |
| `src/hooks/usePartySocket.ts` | WebSocket hook — connection, reconnection, actions |
| `src/lib/gameTypes.ts` | Shared types — cards, hands, game state |

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
│   │   └── Timer.tsx      # Countdown timer
│   ├── hooks/
│   │   └── usePartySocket.ts  # WebSocket connection
│   └── lib/
│       ├── gameTypes.ts   # Type definitions
│       └── sounds.ts      # Audio manager
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

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PartyKit](https://partykit.io) for the incredible real-time infrastructure
- [Framer Motion](https://framer.com/motion) for buttery-smooth animations
- Casino sound effects generated with AI

---

<p align="center">
  Made with ♠️ ♥️ ♣️ ♦️ by <a href="https://github.com/SparkyWoo">SparkyWoo</a>
</p>
