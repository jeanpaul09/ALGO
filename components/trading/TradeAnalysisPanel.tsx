'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target, Shield, BarChart3 } from 'lucide-react';

interface TradeAnalysis {
  signal: {
    type: 'LONG' | 'SHORT';
    strength: number; // 0-100
    confidence: number; // 0-100
  };
  entry: {
    price: number;
    reason: string;
    indicators: {
      name: string;
      value: string;
      signal: 'bullish' | 'bearish' | 'neutral';
    }[];
  };
  riskManagement: {
    takeProfit: number;
    stopLoss: number;
    riskRewardRatio: number;
    positionSize: number;
  };
  marketConditions: {
    trend: 'uptrend' | 'downtrend' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume: 'low' | 'average' | 'high';
  };
}

interface TradeAnalysisPanelProps {
  analysis: TradeAnalysis;
  currentPrice?: number;
  unrealizedPnL?: number;
}

export function TradeAnalysisPanel({ analysis, currentPrice, unrealizedPnL }: TradeAnalysisPanelProps) {
  const { signal, entry, riskManagement, marketConditions } = analysis;

  return (
    <div className="space-y-4">
      {/* Signal Strength */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {signal.type === 'LONG' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                {signal.type} Signal
              </CardTitle>
              <CardDescription>AI-generated trade signal</CardDescription>
            </div>
            <Badge variant={signal.type === 'LONG' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {signal.strength}% Strong
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Signal Strength Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Signal Strength</span>
                <span className="font-medium">{signal.strength}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${signal.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${signal.strength}%` }}
                />
              </div>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Confidence Level</span>
                <span className="font-medium">{signal.confidence}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Analysis */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Entry Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Entry Price</div>
            <div className="text-2xl font-bold">${entry.price.toFixed(2)}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Entry Reason</div>
            <p className="text-sm">{entry.reason}</p>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Technical Indicators</div>
            <div className="space-y-2">
              {entry.indicators.map((indicator, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                  <div>
                    <div className="font-medium text-sm">{indicator.name}</div>
                    <div className="text-xs text-muted-foreground">{indicator.value}</div>
                  </div>
                  <Badge
                    variant={
                      indicator.signal === 'bullish'
                        ? 'default'
                        : indicator.signal === 'bearish'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {indicator.signal}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Take Profit</div>
              <div className="text-lg font-bold text-green-500">
                ${riskManagement.takeProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Stop Loss</div>
              <div className="text-lg font-bold text-red-500">
                ${riskManagement.stopLoss.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Risk/Reward Ratio</div>
              <div className="text-xl font-bold text-primary">
                1:{riskManagement.riskRewardRatio.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Position Size</div>
            <div className="text-lg font-medium">{riskManagement.positionSize} units</div>
          </div>

          {currentPrice && unrealizedPnL !== undefined && (
            <div className="pt-3 border-t border-border/40">
              <div className="text-sm text-muted-foreground mb-1">Current P&L</div>
              <div className={`text-2xl font-bold ${unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Current Price: ${currentPrice.toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Conditions */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded bg-secondary/50">
              <div className="text-xs text-muted-foreground mb-1">Trend</div>
              <Badge variant={marketConditions.trend === 'uptrend' ? 'default' : marketConditions.trend === 'downtrend' ? 'destructive' : 'secondary'}>
                {marketConditions.trend}
              </Badge>
            </div>
            <div className="text-center p-3 rounded bg-secondary/50">
              <div className="text-xs text-muted-foreground mb-1">Volatility</div>
              <Badge variant="outline">{marketConditions.volatility}</Badge>
            </div>
            <div className="text-center p-3 rounded bg-secondary/50">
              <div className="text-xs text-muted-foreground mb-1">Volume</div>
              <Badge variant="outline">{marketConditions.volume}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
