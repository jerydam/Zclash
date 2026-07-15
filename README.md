# ⚡ ZClash — Quiz Battles Powered by Zcash

**ZClash** is a quiz gaming platform where knowledge earns real ZEC. Play fast-paced quizzes, stake Zcash, and win the pool — no smart contracts, no house edge, no middleman.

There are two ways to play:

| | ⚔️ **Duel** | 🏆 **Tournament** |
|---|---|---|
| Players | 1 vs 1 | Host + unlimited players |
| Money | Both players stake equal ZEC | Host funds a ZEC prize pool |
| Who wins | Winner takes both stakes | Top N players split the pool |
| Questions | AI-generated, 3 rounds | Manual, AI, or from a PDF |
| Extras | Stake negotiation, rematch | Live leaderboard, host controls, chat |

🎮 **[Play Now](https://zclash.vercel.app)** · 📊 [Leaderboard](https://zclash.vercel.app/ranks) · 🎥 [Demo Video](https://www.loom.com/share/55b9ec7ef835498cbf35aff7f8760324)

---

## ⚔️ Duel Mode — 1v1 Staked Battles

Challenge anyone, on any topic, with real ZEC on the line.

### How it works

```
1. Creator picks a topic and an opening stake (min $1 in ZEC)
   ↓
2. AI generates 15 unique questions — 3 rounds: Easy → Medium → Hard
   ↓
3. Challengers arrive in the Pre-Lobby and negotiate the stake
   (offer → counter-offer → accept, in real time)
   ↓
4. Deal locked — each player gets their own escrow t-address
   ↓
5. Both players send their stake and verify the transaction ID
   ↓
6. Ready up → live duel begins
   ↓
7. Winner automatically receives the full pool
   (tie → both players refunded)
```

### Duel features

- **Public Lobby** — browse open challenges; online players get notified of new ones
- **Private Invites** — challenge a specific wallet directly
- **Stake Negotiation** — don't like the opening stake? Counter it. The creator picks which challenger to lock in
- **Per-Player Escrow** — each side sends to their own fresh t-address, so contributions are verified individually on-chain
- **Rematch** — one tap to run it back with a fresh set of questions
- **Forfeit Protection** — a disconnected player has 60 seconds to return before forfeiting

### Rounds & scoring

| Round | Questions | Time per question |
|-------|-----------|-------------------|
| Easy   | 5 | 7s  |
| Medium | 5 | 10s |
| Hard   | 5 | 13s |

Correct answers score **500–1000 points** — the faster you answer, the more you earn:

```
points = 500 + 500 × (time_remaining / time_limit)
```

Max possible score: **15,000 points**.

---

## 🏆 Tournament Mode — One Host, Many Players

Kahoot-style live quizzes with a real ZEC prize pool.

### How it works

```
1. Host creates a quiz:
   • ✏️ Build questions manually
   • ✨ Let AI generate them from any topic
   • 📄 Upload a PDF and generate questions from it
   ↓
2. Host sets the prize pool (min $5 in ZEC) and how it's split
   ↓
3. A unique deposit t-address is generated for the quiz
   ↓
4. Host sends the pool (+5% platform fee) and verifies the tx
   ↓
5. Players join with the quiz code or QR, ready up, chat in the lobby
   ↓
6. Host hits START — everyone answers the same questions live
   ↓
7. Game ends — winners are paid out automatically by rank
```

### Prize distribution

The host chooses how the pool is split among up to **10 winners**:

- **⚖️ Equal Split** — every winner gets the same share
- **🎯 Custom Tiers** — set a % per rank (e.g. 🥇 50% / 🥈 30% / 🥉 20%)

### Tournament features

- **Live Leaderboard** — rankings update after every question, with rank-change animations
- **Streak Bonuses** — consecutive correct answers earn 🔥 multipliers
- **Host Controls** — kick players, start when ready, spectate the game
- **Lobby Chat** — trash talk before and during the match
- **Cover Images & Scheduling** — brand your quiz and set a start time

---

## 🧠 Quiz Engine

Every question set is generated fresh — no recycled trivia banks.

- **AI Fallback Chain** — Kimi K2 (primary) → Gemini → Groq, so generation never blocks on one provider
- **Any Topic** — crypto, history, science, sports, pop culture, your class notes (via PDF)
- **Speed Scoring** — rewards fast, confident answers over slow guessing

## 🛡️ Zcash Escrow — How Funds Stay Safe

ZClash doesn't use smart contracts. Instead, every game gets its own freshly generated Zcash **t-address**:

- **No wallet custody** — players send ZEC directly from their own wallet (Zashi, YWallet, or any Zcash wallet)
- **On-chain verification** — the backend decodes and verifies every stake transaction itself; it never trusts a client-reported amount
- **Automatic settlement** — payouts are built, signed, and broadcast as raw Zcash transactions the moment a game ends. No claim step
- **Tie & emergency refunds** — tied duels refund both players; expired games return all stakes
- **No EVM risk** — no Solidity, no ABI exploits, no reentrancy attacks

## 👤 Profiles, Rankings & Tiers

Your Zcash t-address is your identity. Add a username and avatar, then climb the ladder:

| Tier | Wins | Badge |
|------|------|-------|
| Droplet  | 0–100   | 💧 |
| Drizzle  | 101–200 | 🌧️ |
| Downpour | 201–300 | ⛈️ |
| Torrent  | 301–400 | 🌊 |
| Flood    | 401+    | 🏆 |

Full match history, win rate, ZEC earned, daily rank deltas, and a live leaderboard of who's online — so you can challenge them on the spot.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────┐
│                 ZClash Backend                 │
├────────────────────────────────────────────────┤
│  Zcash Engine                                  │
│   • Escrow t-address generation (per game)     │
│   • Raw v5 transaction builder & signer        │
│   • Stake verification · payouts · refunds     │
├────────────────────────────────────────────────┤
│  Quiz Engine                                   │
│   • AI generation (Kimi → Gemini → Groq)       │
│   • Real-time game loops over WebSockets       │
│   • Speed scoring · rounds · streaks           │
├────────────────────────────────────────────────┤
│  Game Modes                                    │
│   • Duels: negotiation, escrow, rematch        │
│   • Tournaments: pool funding, distributions   │
├────────────────────────────────────────────────┤
│  Players                                       │
│   • Profiles · tiers · leaderboards            │
│   • Presence tracking · notifications          │
└────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python), asyncpg, WebSockets |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Kimi K2 → Gemini → Groq fallback chain |
| **Blockchain** | Zcash — self-managed t-addresses, raw tx signing, node RPC |
| **Deployment** | Render (backend) · Vercel (frontend) |

---

## 🚀 Getting Started

### For Players

1. **Get a Zcash wallet** — [Zashi](https://electriccoin.co/zashi/) (mobile) or [YWallet](https://ywallet.app)
2. **Connect** — paste your t-address (`t1...`) into ZClash
3. **Pick your mode** — join a duel from the public lobby, or hop into a tournament with a quiz code
4. **Stake & play** — send ZEC to the escrow, answer fast, win the pool

### For Developers

```bash
# Clone the repo
git clone https://github.com/jerydam/Zclash-backend
cd zclash

# Backend
cd backend
cp .env.example .env      # fill in your keys
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
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ZCASH_RPC_URL=
ZCASH_RPC_USER=
ZCASH_RPC_PASSWORD=
ZCASH_FEE_RECIPIENT=
ESCROW_MASTER_KEY=        # Fernet key encrypting escrow private keys — never commit
KIMI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

---

## 💰 Fees & Minimums

| | Duel | Tournament |
|---|---|---|
| Minimum | $1.00 USD in ZEC per player | $5.00 USD in ZEC pool |
| Platform fee | ~$0.25 in ZEC (locked at creation) | 5% of the pool |
| Payout | Automatic at game end | Automatic at game end |

## 🗺️ Roadmap

- [x] 1v1 staked duels with per-player ZEC escrow
- [x] Stake negotiation (offer / counter / accept)
- [x] Tournament mode with ZEC prize pools & custom distributions
- [x] AI question generation (Kimi, Gemini, Groq) + PDF import
- [x] Real-time WebSocket gameplay, chat, and rematch
- [x] Rankings, tiers, and live leaderboard
- [ ] Shielded ZEC support (z-addresses)
- [ ] Bracket-style tournaments
- [ ] Mobile app (React Native)
- [ ] Zebrad migration (zcashd deprecation)
- [ ] Spectator mode

## 📞 Support & Community

- **Twitter/X** — [@ZClash](https://x.com/jerydam00)
- **Telegram** — [t.me/ZClashChat](https://t.me/jerydam)
- **Email** — jerydan148@gmail.com

## 🙏 Built With

ZClash is built by the team behind **FaucetDrops**, powered by:

- [Zcash](https://z.cash) — privacy-preserving digital currency
- [Electric Coin Company](https://electriccoin.co) — Zcash core development
- [Supabase](https://supabase.com) — open-source Firebase alternative
- The Zcash community ⚡

---

**Ready to stake your knowledge?** [Play Now](https://zclash.vercel.app) ⚡