# AI Trading Lab MVP

A production-grade AI Trading Lab that enables AI agents to backtest, simulate, and execute trading strategies on real markets while humans monitor and control everything through a live dashboard.

## 🎯 Features

### For AI Agents
- **Backtest strategies** on real historical market data
- **Run simulations** (demo trading) with real-time prices
- **Execute live trades** on real markets (crypto perps via Hyperliquid)
- **Manage strategies** - start, stop, edit parameters
- Clean programmatic API - no direct access to secrets or exchanges

### For Humans
- **Lab-style dashboard** for real-time monitoring
- **Performance tracking** - PnL, positions, trades, risk metrics
- **Mode switching** - easily toggle between DEMO and LIVE
- **Safe wallet connection** - secrets never leave the backend
- **Emergency controls** - kill switch, manual overrides

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │Dashboard │  │Strategies│  │Backtests │  │  Live  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                         │ WebSocket + REST API
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Express + TypeScript)         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Trading Orchestrator                     │  │
│  │  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Backtesting│  │  Demo    │  │Live Trading  │  │  │
│  │  │   Engine   │  │ Trading  │  │   Engine     │  │  │
│  │  └────────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Market Data Service                      │  │
│  │  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │Hyperliquid │  │  Cache   │  │  Historical  │  │  │
│  │  │   Client   │  │          │  │    Data      │  │  │
│  │  └────────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Strategy Executor + Risk Manager                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Database (SQLite / PostgreSQL)             │  │
│  │  • Strategies  • Sessions  • Positions  • Trades  │  │
│  │  • Backtests   • Logs      • Market Data         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
     ┌────────▼────────┐   ┌────────▼────────┐
     │   Hyperliquid   │   │  Other Venues   │
     │   (Crypto Perps)│   │   (Future)      │
     └─────────────────┘   └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ALGO
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Frontend:
   ```bash
   cd ../frontend
   cp .env.local.example .env.local
   ```

4. **Initialize the database**
   ```bash
   cd ../backend
   npm run db:generate
   npm run db:push
   ```

5. **Start the development servers**

   From the root directory:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend on http://localhost:3001
   - Frontend on http://localhost:3000

6. **Open the dashboard**

   Navigate to http://localhost:3000

## 📁 Project Structure

```
ALGO/
├── backend/                # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/        # API routes
│   │   ├── services/      # Core business logic
│   │   │   ├── backtesting-engine.ts
│   │   │   ├── trading-engine.ts
│   │   │   ├── strategy-executor.ts
│   │   │   ├── risk-manager.ts
│   │   │   ├── market-data/
│   │   │   └── trading-orchestrator.ts
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── frontend/              # Next.js + shadcn/ui frontend
│   ├── app/              # Next.js app directory
│   │   ├── page.tsx      # Dashboard
│   │   ├── strategies/   # Strategy management
│   │   ├── backtests/    # Backtest explorer
│   │   ├── live/         # Live trading console
│   │   └── settings/     # Settings
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utilities and API client
│   └── package.json
│
├── AI_AGENT_TOOLS.md     # Tool definitions for AI agents
└── README.md
```

## 🤖 AI Agent Integration

AI agents (like Claude) can control the trading lab through the REST API. See [AI_AGENT_TOOLS.md](./AI_AGENT_TOOLS.md) for complete tool definitions.

### Example: Running a Backtest

```typescript
// 1. List available strategies
const strategies = await fetch('http://localhost:3001/api/strategies').then(r => r.json());

// 2. Run a backtest
const backtest = await fetch('http://localhost:3001/api/backtests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategyId: strategies[0].id,
    symbol: 'BTC',
    venue: 'hyperliquid',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-02-01T00:00:00Z'
  })
}).then(r => r.json());

// 3. Get results
const results = await fetch(`http://localhost:3001/api/backtests/${backtest.id}`).then(r => r.json());
console.log(`Total Return: ${results.totalReturn}%`);
```

## 🎮 Usage Guide

### Dashboard
Monitor all trading activity:
- Active sessions count
- Total PnL across all sessions
- Backtest history
- Available strategies

### Strategies
- View all available strategies
- See strategy parameters and supported markets
- Run backtests with one click
- Start demo trading sessions

### Backtests
- View all backtest results
- Analyze performance metrics (Sharpe ratio, max drawdown, win rate)
- Review trade-by-trade execution
- Compare different parameter sets

### Live Trading
- Monitor active trading sessions
- View real-time positions and PnL
- Clear DEMO vs LIVE indicators
- Emergency stop button

## ⚙️ Configuration

### Backend Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:./trading-lab.db"

# Hyperliquid (Crypto Perps)
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_TESTNET_URL=https://api.hyperliquid-testnet.xyz
HYPERLIQUID_WALLET_ADDRESS=
HYPERLIQUID_PRIVATE_KEY=

# Safety Limits
MAX_POSITION_SIZE_USD=10000
MAX_DAILY_LOSS_USD=1000
ENABLE_LIVE_TRADING=false  # Set to true to enable real trading
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 🛡️ Safety Features

1. **Mode Separation**: Clear distinction between DEMO and LIVE modes
2. **Risk Limits**: Automatic enforcement of position size and loss limits
3. **Kill Switch**: Emergency stop for all sessions
4. **Secrets Protection**: API keys never exposed to frontend or AI agent
5. **Audit Logging**: All decisions and trades are logged
6. **Confirmation Required**: LIVE mode requires explicit configuration

## 📊 Included Strategies

1. **SMA Crossover** (Trend Following)
   - Uses fast and slow moving averages
   - Parameters: `fastPeriod` (10), `slowPeriod` (30)

2. **RSI Mean Reversion**
   - Trades oversold/overbought conditions
   - Parameters: `rsiPeriod` (14), `oversold` (30), `overbought` (70)

3. **Momentum**
   - Follows price momentum trends
   - Parameters: `lookback` (20), `threshold` (0.02)

## 🔧 Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Open Prisma Studio (GUI)
npm run db:studio
```

## 🚢 Deployment

The system is designed to run locally first, but can be deployed to:
- VPS (DigitalOcean, Linode, etc.)
- Cloud platforms (AWS, GCP, Azure)
- Container platforms (Docker, Kubernetes)

For production:
1. Use PostgreSQL instead of SQLite
2. Set up proper environment secrets management
3. Enable HTTPS for all connections
4. Configure WebSocket with authentication
5. Set up monitoring and alerting

## 📝 API Documentation

See [AI_AGENT_TOOLS.md](./AI_AGENT_TOOLS.md) for complete API documentation.

## 🤝 Contributing

This is a production-grade MVP. To add new features:

1. **New Strategy**: Add to `backend/src/services/strategy-executor.ts`
2. **New Venue**: Add client to `backend/src/services/market-data/`
3. **New UI Page**: Add to `frontend/app/`

## ⚠️ Disclaimer

This software is for educational and research purposes. Trading involves risk of loss. Always test thoroughly in DEMO mode before enabling LIVE trading. Never trade with more than you can afford to lose.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built with:
- Next.js + shadcn/ui (Frontend)
- Express + TypeScript (Backend)
- Prisma (Database ORM)
- Hyperliquid (Crypto Perps)
- WebSocket (Real-time updates)

---

**Ready to start trading? Run `npm run dev` and open http://localhost:3000**
