# AI Agent Tool Definitions

This document provides tool definitions for AI agents (like Claude) to interact with the AI Trading Lab backend API programmatically.

## Base URL

```
http://localhost:3001/api
```

## Tool Definitions

### 1. List Strategies

**Purpose**: Get all available trading strategies

```json
{
  "name": "list_strategies",
  "description": "Lists all available trading strategies with their parameters and supported markets",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Usage**:
```bash
GET /api/strategies
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "SMA Crossover",
    "description": "Simple Moving Average crossover strategy",
    "category": "trend_following",
    "code": "sma_crossover",
    "parameters": "{\"fastPeriod\":10,\"slowPeriod\":30}",
    "markets": "[\"BTC\",\"ETH\"]"
  }
]
```

---

### 2. Run Backtest

**Purpose**: Execute a backtest for a strategy on historical data

```json
{
  "name": "run_backtest",
  "description": "Runs a backtest for a trading strategy on historical market data and returns performance metrics",
  "input_schema": {
    "type": "object",
    "properties": {
      "strategyId": {
        "type": "string",
        "description": "The UUID of the strategy to backtest"
      },
      "symbol": {
        "type": "string",
        "description": "The market symbol (e.g., 'BTC', 'ETH')"
      },
      "venue": {
        "type": "string",
        "description": "The trading venue (e.g., 'hyperliquid')"
      },
      "startDate": {
        "type": "string",
        "description": "Start date in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')"
      },
      "endDate": {
        "type": "string",
        "description": "End date in ISO 8601 format"
      },
      "parameters": {
        "type": "object",
        "description": "Optional strategy parameters to override defaults"
      }
    },
    "required": ["strategyId", "symbol", "venue", "startDate", "endDate"]
  }
}
```

**Usage**:
```bash
POST /api/backtests
Content-Type: application/json

{
  "strategyId": "uuid",
  "symbol": "BTC",
  "venue": "hyperliquid",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  "parameters": {
    "fastPeriod": 10,
    "slowPeriod": 30
  }
}
```

**Response**:
```json
{
  "id": "backtest-uuid",
  "status": "RUNNING",
  "message": "Backtest started"
}
```

---

### 3. Get Backtest Results

**Purpose**: Retrieve results from a completed backtest

```json
{
  "name": "get_backtest_results",
  "description": "Retrieves the results and metrics from a completed backtest",
  "input_schema": {
    "type": "object",
    "properties": {
      "backtestId": {
        "type": "string",
        "description": "The UUID of the backtest"
      }
    },
    "required": ["backtestId"]
  }
}
```

**Usage**:
```bash
GET /api/backtests/{backtestId}
```

**Response**:
```json
{
  "id": "uuid",
  "totalReturn": 15.5,
  "sharpeRatio": 1.8,
  "sortinoRatio": 2.1,
  "maxDrawdown": 8.3,
  "winRate": 62.5,
  "totalTrades": 48,
  "profitableTrades": 30,
  "averageWin": 125.50,
  "averageLoss": -85.30,
  "equityCurve": [...],
  "drawdownCurve": [...],
  "trades": [...]
}
```

---

### 4. Start Trading Session

**Purpose**: Start a demo or live trading session

```json
{
  "name": "start_trading_session",
  "description": "Starts a trading session for a strategy in either DEMO (paper trading) or LIVE mode",
  "input_schema": {
    "type": "object",
    "properties": {
      "strategyId": {
        "type": "string",
        "description": "The UUID of the strategy to run"
      },
      "mode": {
        "type": "string",
        "enum": ["DEMO", "LIVE"],
        "description": "Trading mode - DEMO for paper trading, LIVE for real trading"
      },
      "venue": {
        "type": "string",
        "description": "The trading venue (e.g., 'hyperliquid')"
      },
      "symbol": {
        "type": "string",
        "description": "The market symbol (e.g., 'BTC', 'ETH')"
      },
      "parameters": {
        "type": "object",
        "description": "Optional strategy parameters to override defaults"
      }
    },
    "required": ["strategyId", "mode", "venue", "symbol"]
  }
}
```

**Usage**:
```bash
POST /api/sessions
Content-Type: application/json

{
  "strategyId": "uuid",
  "mode": "DEMO",
  "venue": "hyperliquid",
  "symbol": "BTC"
}
```

**Response**:
```json
{
  "id": "session-uuid",
  "status": "RUNNING",
  "mode": "DEMO",
  "message": "DEMO trading session started"
}
```

---

### 5. Stop Trading Session

**Purpose**: Stop an active trading session

```json
{
  "name": "stop_trading_session",
  "description": "Stops an active trading session and closes all open positions",
  "input_schema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string",
        "description": "The UUID of the session to stop"
      }
    },
    "required": ["sessionId"]
  }
}
```

**Usage**:
```bash
POST /api/sessions/{sessionId}/stop
```

**Response**:
```json
{
  "message": "Session stopped"
}
```

---

### 6. Get Session Info

**Purpose**: Get current status and performance of a trading session

```json
{
  "name": "get_session_info",
  "description": "Retrieves current status, positions, and PnL for an active trading session",
  "input_schema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string",
        "description": "The UUID of the session"
      }
    },
    "required": ["sessionId"]
  }
}
```

**Usage**:
```bash
GET /api/sessions/{sessionId}
```

**Response**:
```json
{
  "id": "uuid",
  "strategyName": "SMA Crossover",
  "mode": "DEMO",
  "status": "RUNNING",
  "venue": "hyperliquid",
  "symbol": "BTC",
  "positions": [
    {
      "id": "pos-uuid",
      "symbol": "BTC",
      "side": "LONG",
      "size": 0.5,
      "entryPrice": 45000,
      "currentPrice": 46000,
      "unrealizedPnl": 500,
      "realizedPnl": 0,
      "openedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalPnl": 500,
  "startedAt": "2024-01-15T10:00:00Z"
}
```

---

### 7. List Active Sessions

**Purpose**: Get all active trading sessions

```json
{
  "name": "list_active_sessions",
  "description": "Lists all currently active trading sessions across all strategies",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Usage**:
```bash
GET /api/sessions
```

---

### 8. Get Market Price

**Purpose**: Get current market price for a symbol

```json
{
  "name": "get_market_price",
  "description": "Retrieves the current market price for a symbol on a specific venue",
  "input_schema": {
    "type": "object",
    "properties": {
      "venue": {
        "type": "string",
        "description": "The trading venue (e.g., 'hyperliquid')"
      },
      "symbol": {
        "type": "string",
        "description": "The market symbol (e.g., 'BTC', 'ETH')"
      }
    },
    "required": ["venue", "symbol"]
  }
}
```

**Usage**:
```bash
GET /api/market-data/price/{venue}/{symbol}
```

**Response**:
```json
{
  "venue": "hyperliquid",
  "symbol": "BTC",
  "price": 46250.50,
  "timestamp": "2024-01-15T15:30:00Z"
}
```

---

## Example Agent Workflow

Here's a typical workflow for an AI agent:

1. **List available strategies**
   ```bash
   GET /api/strategies
   ```

2. **Run a backtest on a strategy**
   ```bash
   POST /api/backtests
   {
     "strategyId": "strategy-uuid",
     "symbol": "BTC",
     "venue": "hyperliquid",
     "startDate": "2024-01-01T00:00:00Z",
     "endDate": "2024-02-01T00:00:00Z"
   }
   ```

3. **Check backtest results**
   ```bash
   GET /api/backtests/{backtestId}
   ```

4. **If backtest is good, start demo trading**
   ```bash
   POST /api/sessions
   {
     "strategyId": "strategy-uuid",
     "mode": "DEMO",
     "venue": "hyperliquid",
     "symbol": "BTC"
   }
   ```

5. **Monitor the session**
   ```bash
   GET /api/sessions/{sessionId}
   ```

6. **Stop when needed**
   ```bash
   POST /api/sessions/{sessionId}/stop
   ```

## Safety Notes

- All trading sessions start in DEMO mode by default
- LIVE trading requires `ENABLE_LIVE_TRADING=true` in backend environment
- Risk limits are enforced automatically (max position size, max daily loss)
- All API keys and secrets are stored securely on the backend
- The AI agent never has direct access to exchange APIs or wallet keys
