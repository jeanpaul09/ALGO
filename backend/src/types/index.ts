export type TradingMode = 'DEMO' | 'LIVE';
export type SessionStatus = 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';
export type PositionSide = 'LONG' | 'SHORT';
export type OrderSide = 'BUY' | 'SELL';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataPoint extends OHLCV {
  venue: string;
  symbol: string;
  metadata?: {
    fundingRate?: number;
    markPrice?: number;
    openInterest?: number;
    [key: string]: any;
  };
}

export interface StrategyParameters {
  [key: string]: number | string | boolean;
}

export interface Signal {
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HOLD';
  size?: number;
  reason: string;
  confidence?: number;
}

export interface BacktestResult {
  id: string;
  totalReturn: number;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  averageWin: number;
  averageLoss: number;
  equityCurve: Array<{ timestamp: Date; equity: number }>;
  drawdownCurve: Array<{ timestamp: Date; drawdown: number }>;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  timestamp: Date;
  symbol: string;
  side: OrderSide;
  size: number;
  price: number;
  pnl: number;
  reason: string;
}

export interface PositionInfo {
  id: string;
  symbol: string;
  side: PositionSide;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openedAt: Date;
}

export interface SessionInfo {
  id: string;
  strategyName: string;
  mode: TradingMode;
  status: SessionStatus;
  venue: string;
  symbol: string;
  positions: PositionInfo[];
  totalPnl: number;
  startedAt: Date;
}

export interface RiskLimits {
  maxPositionSizeUsd: number;
  maxDailyLossUsd: number;
  maxOpenPositions: number;
}

export interface VenueConfig {
  name: string;
  type: 'crypto_perp' | 'crypto_spot' | 'equity' | 'prediction_market';
  enabled: boolean;
  apiUrl: string;
  testnetUrl?: string;
}
