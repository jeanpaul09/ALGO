'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActivateButton } from '@/components/command-center/ActivateButton';
import { StrategyHeatmap } from '@/components/command-center/StrategyHeatmap';
import { AIBrainPanel } from '@/components/command-center/AIBrainPanel';
import { AdvancedTradingChart } from '@/components/trading/advanced/AdvancedTradingChart';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, DollarSign, Brain, Zap } from 'lucide-react';
import { CandlestickData } from 'lightweight-charts';
import { marketDataApi, sessionsApi, strategiesApi } from '@/lib/api';
import { useWebSocket, AISignal, MarketUpdate } from '@/lib/hooks/useWebSocket';
import { cn } from '@/lib/utils';

export default function CommandCenter() {
  const [symbol] = useState('BTC');
  const [venue] = useState('hyperliquid');
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [aiDecision, setAiDecision] = useState<any>(null);
  const [strategySignals, setStrategySignals] = useState<any[]>([]);

  // WebSocket for real-time updates
  const { isConnected, sendMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    symbol,
    onMarketUpdate: useCallback((update: MarketUpdate) => {
      setCurrentPrice(update.price);

      // Update chart
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
      // Update AI decision
      setAiDecision({
        action: signal.action,
        confidence: signal.confidence,
        reasoning: signal.reasoning,
        timestamp: Date.now(),
      });

      // Update strategy breakdown
      if (signal.indicators) {
        const strategies = signal.indicators.map(ind => ({
          name: ind.name,
          action: ind.signal === 'bullish' ? 'BUY' : ind.signal === 'bearish' ? 'SELL' : 'HOLD',
          confidence: 75,
          strength: Math.abs(ind.value),
          weight: 1.0,
        }));
        setStrategySignals(strategies);
      }
    }, []),
  });

  // Load initial market data
  useEffect(() => {
    const loadData = async () => {
      try {
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
      } catch (err) {
        // Fallback to mock data
        generateMockData();
      }
    };

    loadData();
  }, [venue, symbol, selectedTimeframe]);

  // Generate mock data fallback
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
  };

  // Activate AI Agent
  const handleActivate = async () => {
    if (isAgentActive) {
      // Deactivate
      setIsAgentActive(false);
      setAiDecision(null);
      setStrategySignals([]);

      if (sendMessage) {
        sendMessage({ type: 'unsubscribe', channel: 'market', symbol, venue });
        sendMessage({ type: 'unsubscribe', channel: 'ai_signals', symbol, venue });
      }
    } else {
      // Activate
      setIsInitializing(true);

      // Subscribe to WebSocket
      if (sendMessage) {
        sendMessage({ type: 'subscribe', channel: 'market', symbol, venue });
        sendMessage({ type: 'subscribe', channel: 'ai_signals', symbol, venue });
      }

      // Simulate initialization
      setTimeout(() => {
        setIsAgentActive(true);
        setIsInitializing(false);
      }, 1500);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-background/95">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />

        <main className="flex-1 overflow-hidden p-6">
          {/* Header Section */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Command Center
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Institutional-grade AI trading terminal
                </p>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center gap-3">
                <Badge variant={isConnected ? "default" : "secondary"} className="text-sm">
                  <Activity className="h-3 w-3 mr-1.5" />
                  {isConnected ? 'Connected' : 'Offline'}
                </Badge>
                {isAgentActive && (
                  <Badge variant="default" className="text-sm animate-pulse">
                    <Zap className="h-3 w-3 mr-1.5" />
                    AI ACTIVE
                  </Badge>
                )}
              </div>
            </div>

            {/* Activate Button */}
            <div className="flex justify-center py-6">
              <ActivateButton
                isActive={isAgentActive}
                isLoading={isInitializing}
                onClick={handleActivate}
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Symbol</div>
                    <div className="text-lg font-bold">{symbol}/USDT</div>
                  </div>
                  <DollarSign className="h-6 w-6 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Price</div>
                    <div className="text-lg font-bold font-mono text-primary tabular-nums">
                      ${currentPrice?.toFixed(2) || '---'}
                    </div>
                  </div>
                  <Activity className="h-6 w-6 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {aiDecision?.confidence?.toFixed(0) || '--'}%
                    </div>
                  </div>
                  <Brain className="h-6 w-6 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Active Strategies</div>
                    <div className="text-lg font-bold">
                      {strategySignals.filter(s => s.action !== 'HOLD').length}/{strategySignals.length || 0}
                    </div>
                  </div>
                  <Zap className="h-6 w-6 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-28rem)] overflow-hidden">
            {/* Left: Chart */}
            <div className="lg:col-span-2">
              <AdvancedTradingChart
                symbol={symbol}
                data={candleData}
                currentPrice={currentPrice}
                aiSignal={null}
                onTimeframeChange={setSelectedTimeframe}
                isLive={isConnected && isAgentActive}
              />
            </div>

            {/* Right: Strategy Heatmap & AI Brain */}
            <div className="space-y-4 overflow-y-auto">
              <StrategyHeatmap
                strategies={strategySignals}
                isActive={isAgentActive}
              />

              <AIBrainPanel
                decision={aiDecision}
                isActive={isAgentActive}
                isLive={isConnected}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
