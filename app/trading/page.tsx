'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TradingChart } from '@/components/trading/TradingChart';
import { TradeAnalysisPanel } from '@/components/trading/TradeAnalysisPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square, TrendingUp } from 'lucide-react';
import { CandlestickData } from 'lightweight-charts';

export default function TradingPage() {
  const [symbol] = useState('BTC/USDT');
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [isTrading, setIsTrading] = useState(false);

  // Generate initial candle data (in production, this comes from backend/market data API)
  useEffect(() => {
    const generateCandles = () => {
      const now = Math.floor(Date.now() / 1000);
      const candles: CandlestickData[] = [];
      let price = 42000;

      for (let i = 100; i >= 0; i--) {
        const time = (now - i * 300) as any; // 5-min candles
        const open = price;
        const change = (Math.random() - 0.5) * 200;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 100;
        const low = Math.min(open, close) - Math.random() * 100;

        candles.push({
          time,
          open,
          high,
          low,
          close,
        });

        price = close;
      }

      setCandleData(candles);
      setCurrentPrice(price);
    };

    generateCandles();

    // Simulate real-time price updates
    const interval = setInterval(() => {
      setCandleData(prev => {
        if (prev.length === 0) return prev;
        const lastCandle = prev[prev.length - 1];
        const newPrice = lastCandle.close + (Math.random() - 0.5) * 50;
        setCurrentPrice(newPrice);
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Mock trade analysis
  const mockAnalysis = {
    signal: {
      type: 'LONG' as const,
      strength: 85,
      confidence: 78,
    },
    entry: {
      price: 42150.50,
      reason: 'Strong bullish momentum detected. RSI showing oversold conditions with price breaking above 20-day SMA. MACD histogram turned positive with increasing volume.',
      indicators: [
        { name: 'RSI (14)', value: '45.2 (Oversold recovery)', signal: 'bullish' as const },
        { name: 'MACD', value: 'Bullish crossover', signal: 'bullish' as const },
        { name: 'Volume', value: '+35% above average', signal: 'bullish' as const },
        { name: 'SMA 20/50', value: 'Golden cross forming', signal: 'bullish' as const },
      ],
    },
    riskManagement: {
      takeProfit: 43500.00,
      stopLoss: 41500.00,
      riskRewardRatio: 2.5,
      positionSize: 0.5,
    },
    marketConditions: {
      trend: 'uptrend' as const,
      volatility: 'medium' as const,
      volume: 'high' as const,
    },
  };

  const mockTrades = activeTrade ? [{
    time: Math.floor(Date.now() / 1000) - 3600,
    type: 'LONG' as const,
    entry: 42150.50,
    takeProfit: 43500.00,
    stopLoss: 41500.00,
    reason: 'Bullish momentum',
    status: 'open' as const,
  }] : [];

  const calculateUnrealizedPnL = () => {
    if (!activeTrade || !currentPrice) return 0;
    const diff = currentPrice - mockAnalysis.entry.price;
    return diff * mockAnalysis.riskManagement.positionSize;
  };

  const startDemo = () => {
    setIsTrading(true);
    setActiveTrade({
      id: Date.now(),
      entryPrice: mockAnalysis.entry.price,
      entryTime: new Date(),
    });
  };

  const stopDemo = () => {
    setIsTrading(false);
    setActiveTrade(null);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
              <p className="text-muted-foreground mt-1">Institutional-grade market analysis and execution</p>
            </div>
            <div className="flex gap-3">
              {!isTrading ? (
                <Button onClick={startDemo} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Demo Trading
                </Button>
              ) : (
                <Button onClick={stopDemo} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  Stop Trading
                </Button>
              )}
            </div>
          </div>

          {/* Trading Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/40 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <TradingChart
                    symbol={symbol}
                    data={candleData}
                    trades={mockTrades}
                    currentPrice={currentPrice}
                  />
                </CardContent>
              </Card>

              {/* Position Summary */}
              {activeTrade && currentPrice && (
                <Card className="border-border/40 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Active Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Entry Price</div>
                        <div className="text-lg font-bold">${mockAnalysis.entry.price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Current Price</div>
                        <div className="text-lg font-bold text-primary">${currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Unrealized P&L</div>
                        <div className={`text-lg font-bold ${calculateUnrealizedPnL() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {calculateUnrealizedPnL() >= 0 ? '+' : ''}${calculateUnrealizedPnL().toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge variant="default" className="text-sm">OPEN</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Analysis Panel - 1 column */}
            <div className="lg:col-span-1">
              <TradeAnalysisPanel
                analysis={mockAnalysis}
                currentPrice={currentPrice}
                unrealizedPnL={activeTrade ? calculateUnrealizedPnL() : undefined}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
