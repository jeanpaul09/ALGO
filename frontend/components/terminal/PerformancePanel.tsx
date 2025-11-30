'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

interface TradingStats {
  balance: number;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  openPositions: Position[];
  closedPositions: any[];
}

interface PerformancePanelProps {
  stats: TradingStats | null;
}

export function PerformancePanel({ stats }: PerformancePanelProps) {
  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No trading activity yet</p>
      </div>
    );
  }

  const { balance, totalPnL, totalTrades, winningTrades, losingTrades, winRate, openPositions } = stats;

  return (
    <div className="h-full flex flex-col p-3 space-y-3 overflow-y-auto">
      {/* Balance Card */}
      <Card className="p-3 bg-card/50 border-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</span>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
        <div className={`flex items-center gap-1 text-sm font-semibold mt-1 ${
          totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
        }`}>
          {totalPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} ({((totalPnL / (balance - totalPnL)) * 100).toFixed(2)}%)
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2 bg-card/50 border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Win Rate</span>
          </div>
          <div className="text-lg font-bold">{winRate.toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">{winningTrades}W / {losingTrades}L</div>
        </Card>

        <Card className="p-2 bg-card/50 border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Trades</span>
          </div>
          <div className="text-lg font-bold">{totalTrades}</div>
          <div className="text-xs text-muted-foreground">executed</div>
        </Card>
      </div>

      {/* Open Positions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open Positions
          </h3>
          <Badge variant="outline" className="h-5 text-xs">
            {openPositions.length}
          </Badge>
        </div>

        {openPositions.length === 0 ? (
          <Card className="p-3 bg-card/30 border-border/20 text-center">
            <p className="text-xs text-muted-foreground">No open positions</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {openPositions.map((position) => (
              <Card key={position.id} className="p-2.5 bg-card/50 border-border/30">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{position.symbol}</span>
                      <Badge
                        variant={position.side === 'LONG' ? 'default' : 'destructive'}
                        className="h-4 text-xs px-1.5"
                      >
                        {position.side}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Entry: ${position.entryPrice.toFixed(2)} | Size: {position.size.toFixed(4)}
                    </div>
                  </div>
                  {position.unrealizedPnL !== undefined && (
                    <div className={`text-sm font-bold ${
                      position.unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* TP/SL */}
                {position.takeProfitPrice && position.stopLossPrice && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/20">
                    <div>
                      <div className="text-xs text-muted-foreground">Take Profit</div>
                      <div className="text-xs font-semibold text-emerald-500">
                        ${position.takeProfitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Stop Loss</div>
                      <div className="text-xs font-semibold text-red-500">
                        ${position.stopLossPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      {stats.closedPositions && stats.closedPositions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Recent Trades
          </h3>
          <div className="space-y-1.5">
            {stats.closedPositions.slice(0, 5).map((trade: any, idx: number) => (
              <Card key={idx} className="p-2 bg-card/30 border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">{trade.symbol} {trade.side}</div>
                    <div className="text-xs text-muted-foreground">
                      ${trade.entryPrice?.toFixed(2)} → ${trade.exitPrice?.toFixed(2)}
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${
                    trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
