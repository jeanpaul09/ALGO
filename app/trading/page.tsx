'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TradingChart } from '@/components/trading/TradingChart';
import { TradeAnalysisPanel } from '@/components/trading/TradeAnalysisPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square, TrendingUp, AlertCircle } from 'lucide-react';
import { CandlestickData } from 'lightweight-charts';
import { marketDataApi, sessionsApi, strategiesApi } from '@/lib/api';

export default function TradingPage() {
  const [symbol] = useState('BTC');
  const [venue] = useState('hyperliquid');
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real market data from backend
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Calculate date range (last 7 days)
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch historical data
        const response = await marketDataApi.history(
          venue,
          symbol,
          startDate.toISOString(),
          endDate.toISOString(),
          '1h'
        );

        // Convert to candlestick format
        const candles: CandlestickData[] = response.data.data.map((d: any) => ({
          time: Math.floor(new Date(d.timestamp).getTime() / 1000) as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        setCandleData(candles);
        if (candles.length > 0) {
          setCurrentPrice(candles[candles.length - 1].close);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch market data:', err);
        setError(err.response?.data?.error || 'Failed to load market data. Using demo mode.');

        // Fallback to mock data if backend unavailable
        generateMockCandles();
        setIsLoading(false);
      }
    };

    fetchMarketData();

    // Poll for price updates every 5 seconds
    const priceInterval = setInterval(async () => {
      try {
        const response = await marketDataApi.price(venue, symbol);
        const newPrice = response.data.price;
        setCurrentPrice(newPrice);
      } catch (err) {
        console.error('Failed to fetch current price:', err);
      }
    }, 5000);

    return () => clearInterval(priceInterval);
  }, [venue, symbol]);

  // Fetch active trading sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await sessionsApi.list(false);
        const runningSessions = response.data.filter((s: any) => s.status === 'RUNNING');
        if (runningSessions.length > 0) {
          setActiveSession(runningSessions[0]);
          setIsTrading(true);
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fallback mock data generator
  const generateMockCandles = () => {
    const now = Math.floor(Date.now() / 1000);
    const candles: CandlestickData[] = [];
    let price = 42000;

    for (let i = 100; i >= 0; i--) {
      const time = (now - i * 300) as any;
      const open = price;
      const change = (Math.random() - 0.5) * 200;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;

      candles.push({ time, open, high, low, close });
      price = close;
    }

    setCandleData(candles);
    setCurrentPrice(price);
  };

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

  const mockTrades = activeSession?.positions?.length > 0 ? [{
    time: Math.floor(new Date(activeSession.positions[0].openedAt).getTime() / 1000),
    type: activeSession.positions[0].side as 'LONG' | 'SHORT',
    entry: activeSession.positions[0].entryPrice,
    takeProfit: activeSession.positions[0].entryPrice * 1.03, // 3% profit target
    stopLoss: activeSession.positions[0].entryPrice * 0.985, // 1.5% stop
    reason: 'AI Strategy',
    status: 'open' as const,
  }] : [];

  const calculateUnrealizedPnL = () => {
    if (!activeSession?.positions || activeSession.positions.length === 0 || !currentPrice) return 0;
    return activeSession.positions[0].unrealizedPnl || 0;
  };

  const startDemo = async () => {
    try {
      setError(null);
      // First, get a strategy to use
      const strategiesResponse = await strategiesApi.list();
      let strategyId = strategiesResponse.data[0]?.id;

      // If no strategies exist, create a default one
      if (!strategyId) {
        const createResponse = await strategiesApi.create({
          name: 'Demo Momentum Strategy',
          description: 'AI-powered momentum trading for demo',
          code: 'class DemoStrategy { analyze() { return { action: "HOLD", reason: "Demo" }; } }',
          parameters: {},
        });
        strategyId = createResponse.data.id;
      }

      // Start demo session
      const response = await sessionsApi.start({
        strategyId,
        mode: 'DEMO',
        venue,
        symbol,
        parameters: {},
      });

      setActiveSession({ id: response.data.id, status: 'RUNNING', mode: 'DEMO' });
      setIsTrading(true);
    } catch (err: any) {
      console.error('Failed to start demo:', err);
      setError(err.response?.data?.error || 'Failed to start demo trading');
    }
  };

  const stopDemo = async () => {
    try {
      if (activeSession?.id) {
        await sessionsApi.stop(activeSession.id);
      }
      setIsTrading(false);
      setActiveSession(null);
    } catch (err: any) {
      console.error('Failed to stop demo:', err);
      setError(err.response?.data?.error || 'Failed to stop demo trading');
    }
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
              <p className="text-muted-foreground mt-1">
                {isLoading ? 'Loading market data...' : 'Institutional-grade market analysis and execution'}
              </p>
            </div>
            <div className="flex gap-3">
              {!isTrading ? (
                <Button onClick={startDemo} className="gap-2" disabled={isLoading}>
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

          {/* Error Banner */}
          {error && (
            <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

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
              {activeSession?.positions && activeSession.positions.length > 0 && currentPrice && (
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
                        <div className="text-lg font-bold">${activeSession.positions[0].entryPrice.toFixed(2)}</div>
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
                        <Badge variant={activeSession.positions[0].side === 'LONG' ? 'default' : 'destructive'} className="text-sm">
                          {activeSession.positions[0].side}
                        </Badge>
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
                unrealizedPnL={activeSession?.positions?.length > 0 ? calculateUnrealizedPnL() : undefined}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
