# HTS


# 🚀 HTS – Home Trading System

HTS is a modern **Home Trading System** built with Next.js and TypeScript.
It simulates a proprietary trading environment including a trading engine, risk engine, order management system (OMS), and Web3 integration.

---

## 🏗 Technology Stack

- **Framework:** Next.js 14+
- **Language:** TypeScript
- **UI Library:** Mantine
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Web3 Integration:** Wagmi + Viem
- **Deployment:** Docker
- **Architecture:** Frontend-based institutional trading simulator (mock feed)

---

## 📂 Project Structure

```
frontend/
│
├── components/
│   ├── TradingChart.tsx
│   ├── OrderPanel.tsx
│   ├── PositionsTable.tsx
│   ├── DOMLadder.tsx
│   ├── FloatingPanel.tsx
│   ├── FootprintMock.tsx
│   └── ...
│
├── lib/
│   ├── tradeStore.ts
│   ├── useTradeEngine.ts
│   ├── useFeed.ts
│   ├── riskRules.ts
│   ├── symbolSpecs.ts
│   ├── i18n.ts
│   └── web3/
│
├── pages/
│   ├── trading.tsx
│   ├── dashboard.tsx
│   ├── portfolio.tsx
│   ├── settings.tsx
│   ├── login.tsx
│   └── index.tsx
│
├── public/
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

# ⚙️ Requirements

## 🖥 Local Development

- Node.js >= 18
- npm >= 9 (or yarn / pnpm)
- Git

Check versions:

```bash
node -v
npm -v
```

---

## 🐳 Docker (Optional)

- Docker >= 24

---

# 🔧 Installation

Clone repository:

```bash
git clone https://github.com/YOUR_USERNAME/HTS.git
cd HTS
```

Install dependencies:

```bash
npm install
```

---

# 🚀 Development Mode

Start development server:

```bash
npm run dev
```

Open in browser:

```
http://localhost:3000
```

---

# 🌐 Run on Local Network (LAN)

```bash
npm run dev -- -H 0.0.0.0
```

Access from other devices:

```
http://YOUR_LOCAL_IP:3000
```

Example:

```
http://192.168.1.15:3000
```

---

# 🏭 Production Build

```bash
npm run build
npm start
```

---

# 🐳 Docker Deployment

Build Docker image:

```bash
docker build -t hts .
```

Run container:

```bash
docker run -p 3000:3000 hts
```

Open:

```
http://localhost:3000
```

---

# 📈 Trading Features

- Market Orders
- Limit Orders
- Stop Loss / Take Profit
- Risk % per trade
- Exposure calculation
- Drawdown monitoring
- Order history tracking
- Position aggregation
- DOM Ladder
- Order Book
- Footprint visualization (mock)
- Institutional-style UI design

---

# 🧠 Risk Engine

Located in:

```
lib/riskRules.ts
```

Includes:

- Daily Loss Limit
- Maximum Drawdown
- Exposure Cap
- Auto Trade Blocking
- Risk Status Indicator (Compliant / At Risk / Violation)

---

# 🔄 Trading Engine (OMS)

Core logic in:

```
lib/useTradeEngine.ts
lib/tradeStore.ts
```

Handles:

- Order validation
- Position management
- SL/TP calculation
- Fill simulation
- Trade lifecycle management
- Risk enforcement

---

# 📡 Market Data Feed

Mock feed located in:

```
lib/useFeed.ts
```

Simulates:

- Real-time tick updates
- Spread changes
- Candlestick data
- Order book depth

---

# 🌍 Internationalization (i18n)

Supported languages:

- English
- Korean
- Japanese

Change language in:

```
Settings → Language
```

---

# 🔗 Web3 Integration

- MetaMask wallet connection
- Chain switching
- ERC20 balance reading
- Demo transaction sending
- Network detection

---

# 🔐 Environment Variables (Optional)

Create `.env.local`:

```
NEXT_PUBLIC_APP_NAME=HTS
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

# 📦 Available Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| npm run dev   | Start development server |
| npm run build | Build production version |
| npm start     | Start production server  |
| npm run lint  | Run ESLint               |

---

# 🧱 Architecture Overview

HTS is a frontend-only institutional trading simulator.

Flow:

Market Feed → Trading Engine → Risk Engine → Zustand Store → UI Components

All trade logic runs client-side using a mock execution engine.

---

# ⚠️ Disclaimer

This project is a **paper trading simulator only**.

It does NOT:

- Connect to real brokers
- Execute real financial trades
- Handle real funds

For educational and simulation purposes only.

---

# 👨‍💻 Author

Sang Le
Institutional Trading Simulator – HTS

---

# 📜 License

MIT License
