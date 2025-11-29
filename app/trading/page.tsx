'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AdvancedTradingChart } from '@/components/trading/advanced/AdvancedTradingChart';
import { AIReasoningPanel } from '@/components/trading/advanced/AIReasoningPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square, Activity, DollarSign, TrendingUp, Zap, Brain } from 'lucide-react';
import { CandlestickData } from 'lightweight-charts';
import { marketDataApi, sessionsApi, strategiesApi } from '@/lib/api';
import { useWebSocket, AISignal, MarketUpdate } from '@/lib/hooks/useWebSocket';
import { cn } from '@/lib/utils';

export default function InstitutionalTradingTerminal() {
  const [symbol] = useState('BTC');
  const [venue] = useState('hyperliquid');
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [aiSignal, setAiSignal] = useState<AISignal | null>(null);

  // WebSocket for real-time updates (only when trading is active)
  const { isConnected, lastUpdate, lastSignal, sendMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    symbol,
    onMarketUpdate: useCallback((update: MarketUpdate) => {
      setCurrentPrice(update.price);

      // Update chart with new price
      if (candleData.length > 0) {
        const newCandles = [...candleData];
        const lastCandle = newCandles[newCandles.length - 1];
        const updatedCandle = {
          ...lastCandle,
          close: update.price,
          high: Math.max(lastCandle.high, update.price),
          low: Math.min(lastCandle.low, update.price),
        };
        newCandles[newCandles.length - 1] = updatedCandle;
        setCandleData(newCandles);
      }
    }, [candleData]),
    onAISignal: useCallback((signal: AISignal) => {
      setAiSignal(signal);
    }, []),
  });

  // Subscribe to WebSocket channels when trading starts
  useEffect(() => {
    if (isTrading && sendMessage) {
      // Subscribe to market data
      sendMessage({
        type: 'subscribe',
        channel: 'market',
        symbol,
        venue,
      });

      // Subscribe to AI signals
      sendMessage({
        type: 'subscribe',
        channel: 'ai_signals',
        symbol,
        venue,
      });
    }

    return () => {
      if (sendMessage) {
        // Unsubscribe when stopping
        sendMessage({
          type: 'unsubscribe',
          channel: 'market',
          symbol,
          venue,
        });
        sendMessage({
          type: 'unsubscribe',
          channel: 'ai_signals',
          symbol,
          venue,
        });
      }
    };
  }, [isTrading, sendMessage, symbol, venue]);

  // Initial data fetch
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const response = await marketDataApi.history(
          venue,
          symbol,
          startDate.toISOString(),
          endDate.toISOString(),
          selectedTimeframe
        );

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
        setError('Backend unavailable. Using demo mode with simulated AI analysis.');
        generateMockData();
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, [venue, symbol, selectedTimeframe]);

  // Fetch sessions
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
        // Silent fail, will work in demo mode
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mock data generator for demo
  const generateMockData = () => {
    const now = Math.floor(Date.now() / 1000);
    const candles: CandlestickData[] = [];
    let price = 42000;

    for (let i = 200; i >= 0; i--) {
      const time = (now - i * 3600) as any;
      const open = price;
      const change = (Math.random() - 0.5) * 500;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 200;
      const low = Math.min(open, close) - Math.random() * 200;

      candles.push({ time, open, high, low, close });
      price = close;
    }

    setCandleData(candles);
    setCurrentPrice(price);

    // Generate mock AI signal
    setAiSignal({
      action: price > 42000 ? 'BUY' : 'SELL',
      confidence: 75 + Math.random() * 20,
      reasoning: [
        'Strong momentum detected on multiple timeframes',
        'RSI showing oversold conditions with bullish divergence',
        'Price breaking above key resistance at $41,850',
        'Volume profile indicates institutional accumulation',
        'MACD golden cross on 4H timeframe',
      ],
      indicators: [
        { name: 'RSI (14)', value: 58.4, signal: 'bullish' },
        { name: 'MACD', value: 125.8, signal: 'bullish' },
        { name: 'SMA 50/200', value: 1.05, signal: 'bullish' },
        { name: 'Volume', value: 1.24, signal: 'bullish' },
        { name: 'ATR', value: 420.5, signal: 'neutral' },
      ],
      zones: [
        { type: 'support', price: 41200, strength: 85 },
        { type: 'resistance', price: 43500, strength: 72 },
        { type: 'liquidity', price: 42800, strength: 90 },
      ],
    });
  };

  const startDemo = async () => {
    try {
      setError(null);
      setIsTrading(true); // Enable trading immediately to activate WebSocket

      // Try to create backend session
      try {
        const strategiesResponse = await strategiesApi.list();
        let strategyId = strategiesResponse.data[0]?.id;

        if (!strategyId) {
          const createResponse = await strategiesApi.create({
            name: 'AI Momentum Strategy',
            description: 'Institutional-grade AI momentum trading',
            code: 'class AIStrategy { analyze() { return { action: "HOLD", reason: "AI Analysis" }; } }',
            parameters: {},
          });
          strategyId = createResponse.data.id;
        }

        const response = await sessionsApi.start({
          strategyId,
          mode: 'DEMO',
          venue,
          symbol,
          parameters: {},
        });

        setActiveSession({ id: response.data.id, status: 'RUNNING', mode: 'DEMO' });
        console.log('✅ Backend session started:', response.data.id);
      } catch (backendErr) {
        console.warn('Backend unavailable, running in demo mode with live market data');
        setError('Backend unavailable. Using live market data in demo mode.');
      }

      // Generate initial data if needed
      if (candleData.length === 0) {
        generateMockData();
      }
    } catch (err: any) {
      console.error('Failed to start demo:', err);
      setError(err.message || 'Failed to start trading');
      setIsTrading(false);
    }
  };

  const stopDemo = async () => {
    try {
      if (activeSession?.id) {
        await sessionsApi.stop(activeSession.id);
      }
      setIsTrading(false);
      setActiveSession(null);
      setAiSignal(null);
    } catch (err: any) {
      setIsTrading(false);
      setActiveSession(null);
      setAiSignal(null);
    }
  };

  const calculatePnL = () => {
    if (!activeSession?.positions || activeSession.positions.length === 0 || !currentPrice) return 0;
    return activeSession.positions[0].unrealizedPnl || 0;
  };

  const pnl = calculatePnL();

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-background/95">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-hidden p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                AI Trading Terminal
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                {isLoading ? (
                  'Loading market data...'
                ) : (
                  <>
                    <Brain className="h-4 w-4 text-primary" />
                    Institutional-grade AI analysis & execution
                    {isConnected && (
                      <>
                        <span className="mx-1">•</span>
                        <Zap className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-green-500 text-sm">Live</span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              {!isTrading ? (
                <Button
                  onClick={startDemo}
                  className="gap-2 shadow-lg shadow-primary/20"
                  size="lg"
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4" />
                  Start AI Trading
                </Button>
              ) : (
                <Button
                  onClick={stopDemo}
                  variant="destructive"
                  className="gap-2"
                  size="lg"
                >
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
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <Activity className="h-4 w-4" />
                  {error}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                    <div className="text-2xl font-bold font-mono text-primary">
                      ${currentPrice?.toFixed(2) || '---'}
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Unrealized P&L</div>
                    <div className={cn(
                      "text-2xl font-bold font-mono",
                      pnl >= 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </div>
                  </div>
                  <TrendingUp className={cn(
                    "h-8 w-8",
                    pnl >= 0 ? 'text-green-500/20' : 'text-red-500/20'
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
                    <div className="text-2xl font-bold font-mono">
                      {aiSignal?.confidence.toFixed(0) || '---'}%
                    </div>
                  </div>
                  <Brain className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge
                      variant={isTrading ? 'default' : 'secondary'}
                      className="text-sm font-medium"
                    >
                      {isTrading ? 'ACTIVE' : 'IDLE'}
                    </Badge>
                  </div>
                  <Activity className={cn(
                    "h-8 w-8",
                    isTrading ? 'text-green-500/20' : 'text-muted-foreground/20'
                  )} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Trading Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-20rem)] overflow-hidden">
            {/* Chart - 2 columns */}
            <div className="lg:col-span-2">
              <AdvancedTradingChart
                symbol={symbol}
                data={candleData}
                currentPrice={currentPrice}
                aiSignal={aiSignal}
                onTimeframeChange={setSelectedTimeframe}
                isLive={isConnected}
              />
            </div>

            {/* AI Analysis - 1 column */}
            <div className="lg:col-span-1">
              <AIReasoningPanel
                signal={aiSignal}
                isLive={isConnected}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
