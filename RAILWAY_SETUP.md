# Railway Deployment Setup

## Quick Deploy (3 Steps)

### 1. Connect GitHub to Railway

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select **`jeanpaul09/ALGO`** repository
4. Railway will auto-detect Node.js and use the config files

### 2. Set Environment Variables

In Railway dashboard, add these variables:

```bash
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=file:./trading-lab.db

# Hyperliquid API
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_TESTNET_URL=https://api.hyperliquid-testnet.xyz
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
HYPERLIQUID_PRIVATE_KEY=your_private_key_here

# Claude AI - CRITICAL!
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Safety Limits
MAX_POSITION_SIZE_USD=10000
MAX_DAILY_LOSS_USD=1000
ENABLE_LIVE_TRADING=false
```

### 3. Deploy & Get URL

1. Railway will automatically deploy
2. Copy your Railway URL (e.g., `https://algo-production.up.railway.app`)
3. Update Vercel frontend env vars:
   - `NEXT_PUBLIC_API_URL=https://your-railway-url`
   - `NEXT_PUBLIC_WS_URL=wss://your-railway-url`
4. Redeploy frontend on Vercel

## What's Included

✅ **railway.json** - Railway service configuration
✅ **nixpacks.toml** - Build configuration (Node.js 20)
✅ **.railwayignore** - Excludes unnecessary files
✅ **Auto-restart on failure** - Max 10 retries
✅ **Optimized for backend only** - Frontend stays on Vercel

## Expected Build Process

```
1. Railway detects Node.js 20
2. Runs: cd backend && npm ci
3. Runs: cd backend && npm run build
4. Starts: cd backend && npm start
5. Backend available at https://your-app.railway.app
```

## Verify Deployment

Check Railway logs for:
```
🚀 AI Trading Lab Backend running on port 3001
📊 WebSocket server ready
🧠 Intelligent AI Engine initialized with Claude ← MUST SEE THIS!
✅ Demo Trading Engine ready with $10,000 balance
⏰ Keep-alive enabled (prevents Render spin-down)
```

## Troubleshooting

**Build fails?**
- Check Railway logs for error messages
- Verify all environment variables are set
- Ensure ANTHROPIC_API_KEY is correct

**WebSocket won't connect?**
- Verify Vercel env vars point to Railway URL
- Use `wss://` not `ws://` for WebSocket URL
- Redeploy frontend after changing env vars

## Cost Estimate

- Free trial: $5 credits for 30 days
- After trial: ~$2-5/month for this backend
- No spin-down, always-on service
