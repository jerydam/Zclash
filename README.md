# ⚡ ZClash — 1v1 Quiz Duels Powered by Zcash

**ZClash** is a peer-to-peer quiz dueling platform where players stake ZEC, answer fast, and winner takes the pool. No house edge. No middleman. Just skill, speed, and Zcash.

---

## ⚡ Why ZClash?

Traditional crypto games rely on smart contracts on EVM chains. ZClash is different:

* ✅ **Stake ZEC** — Use real Zcash (ZEC) to back your knowledge
* ✅ **1v1 Quiz Duels** — Challenge anyone on any topic
* ✅ **AI-Generated Questions** — Fresh, unique questions every match
* ✅ **Winner Takes All** — Full pool goes to the highest scorer
* ✅ **Private by Default** — Built on Zcash's privacy-first philosophy
* ✅ **No Smart Contract Risk** — Escrow managed server-side, no ABI exploits
* ✅ **Real-Time Gameplay** — WebSocket-powered live duels

---

## 🧩 Core Features

### ⚔️ Duel System
The heart of ZClash — competitive 1v1 quiz matches.

- **Public Lobby** — Browse and join open challenges from any player
- **Private Invite** — Challenge a specific wallet address directly
- **Stake Negotiation** — Propose and counter-offer stake amounts before the game starts
- **Escrow Address** — Each duel gets a unique Zcash t-address to hold both players' stakes
- **Auto-Settlement** — Winner receives the full pool automatically at game end
- **Tie Refund** — Both players get their stakes back if scores are equal

### 🧠 Quiz Engine
AI-powered questions tailored to every topic imaginable.

- **3 Rounds** — Easy → Medium → Hard progression
- **Speed Scoring** — Faster correct answers earn more points (up to 1000 pts/question)
- **Any Topic** — Crypto, history, science, sports, pop culture — you name it
- **AI Providers** — Kimi K2 (primary) → Gemini → Groq (fallbacks)

### 🏆 Rankings & Tiers
A competitive ladder to keep players hungry.

| Tier | Wins Required | Badge |
|------|--------------|-------|
| Droplet  | 0–100   | 💧 |
| Drizzle  | 101–200 | 🌧️ |
| Downpour | 201–300 | ⛈️ |
| Torrent  | 301–400 | 🌊 |
| Flood    | 401+    | 🏆 |

- **Live Leaderboard** — See who's online and challenge them directly
- **Rank Delta** — Track position changes day over day
- **Win Rate Bar** — Visual win percentage for every player

### 👤 Player Profiles
Your on-chain identity on ZClash.

- **Zcash t-address** as your primary identifier
- **Custom Username & Avatar** — Generate or upload
- **Match History** — Full record of wins, losses, topics, and earnings
- **Stats** — Total duels, wins, losses, ZEC earned

---

## 🎮 How a Duel Works

```
1. Creator sets topic + stake amount
   ↓
2. Fresh escrow t-address generated for the duel
   ↓
3. Challenger joins and sees the escrow address
   ↓
4. Both players send ZEC to the escrow address
   ↓
5. Stakes verified on-chain via zcashd / zebrad
   ↓
6. Game starts — 3 rounds, AI questions, live scoring
   ↓
7. Game ends — winner auto-receives full pool
   (tie → both get refunded)
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              ZClash Platform                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │    Zcash Engine                      │   │
│  │  • Escrow address generation         │   │
│  │  • Balance verification (RPC)        │   │
│  │  • Winner settlement                 │   │
│  │  • Emergency refunds                 │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │    Quiz Engine                       │   │
│  │  • AI question generation            │   │
│  │  • Real-time game loop (WebSocket)   │   │
│  │  • Speed-based scoring               │   │
│  │  • Round management                  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │    Challenge System                  │   │
│  │  • Public lobby                      │   │
│  │  • Private invites                   │   │
│  │  • Stake negotiation                 │   │
│  │  • Rematch flow                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │    Player & Rankings                 │   │
│  │  • Profiles & avatars                │   │
│  │  • Tier progression                  │   │
│  │  • Daily rank snapshots              │   │
│  │  • Presence tracking (online/offline)│   │
│  └──────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Backend** | FastAPI, Python, asyncpg |
| **Database** | Supabase (PostgreSQL) |
| **Real-Time** | WebSockets (FastAPI native) |
| **AI** | Kimi K2 via OpenRouter → Gemini → Groq |
| **Blockchain** | Zcash (t-addresses, zcashd / zebrad RPC) |
| **Deployment** | Render (backend), Vercel (frontend) |

---

## 🔒 Security

* **No Private Key Custody** — Players send ZEC directly to escrow addresses
* **Transparent Escrow** — Every escrow address is visible to both players before staking
* **Emergency Refunds** — If a game expires without starting, stakes are returned
* **Forfeit Logic** — Disconnected players lose after a 60-second grace period
* **No EVM Risk** — No Solidity, no ABI exploits, no reentrancy attacks

---

## 🚀 Getting Started

### For Players
1. **Get a Zcash Wallet** — Install [Zashi](https://electriccoin.co/zashi/) (mobile) or [YWallet](https://ywallet.app)
2. **Connect** — Paste your t-address (starts with `t1...`) into ZClash
3. **Set Username** — Claim your identity on the leaderboard
4. **Find a Duel** — Browse the public lobby or challenge a friend
5. **Stake & Play** — Send ZEC to the escrow, answer fast, win more

### For Developers

```bash
# Clone the repo
git clone https://github.com/your-org/zclash
cd zclash

# Backend
cd backend
cp .env.example .env   # fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**Required environment variables:**
```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
ZCASH_RPC_URL=
ZCASH_RPC_USER=
ZCASH_RPC_PASSWORD=
ZCASH_FEE_RECIPIENT=
KIMI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

---

## 📊 Scoring System

Each correct answer scores between **500–1000 points** depending on speed:

```
points = 500 (base) + 500 × (time_remaining / time_limit)
```

| Round | Time Limit | Max Points |
|-------|-----------|-----------|
| Easy   | 7s  | 1000 |
| Medium | 10s | 1000 |
| Hard   | 13s | 1000 |

Total questions: 15 (5 per round) → Max score: **15,000 points**

---

## 🗺️ Roadmap

- [x] 1v1 staked duels with ZEC escrow
- [x] AI question generation (Kimi, Gemini, Groq)
- [x] Real-time WebSocket gameplay
- [x] Public lobby + private invites
- [x] Rankings, tiers, and leaderboard
- [x] Stake negotiation flow
- [ ] Shielded ZEC support (z-addresses)
- [ ] Tournament mode (bracket-style)
- [ ] Mobile app (React Native)
- [ ] Zebrad migration (zcashd deprecation)
- [ ] Spectator mode

---

## 📞 Support & Community

* **Twitter/X** — [@ZClash](https://x.com/ZClash)
* **Telegram** — [t.me/ZClashChat](https://t.me/ZClashChat)
* **Email** — drops.faucet@gmail.com

---

## 🙏 Built With

ZClash is built by the same team behind FaucetDrops, powered by:
- [Zcash](https://z.cash) — Privacy-preserving digital currency
- [Electric Coin Company](https://electriccoin.co) — Zcash core development
- [Supabase](https://supabase.com) — Open source Firebase alternative
- The Zcash community ⚡

---

**Ready to stake your knowledge?**  
[Play Now](https://app.zclash.io) · [Leaderboard](https://app.zclash.io/ranks) · [Join Community](https://t.me/ZClashChat)