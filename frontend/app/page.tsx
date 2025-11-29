'use client';

import { useState, useEffect } from 'react';
import { GlobalStatusBar } from '@/components/terminal/GlobalStatusBar';
import { AIBrainFeed, BrainEntry } from '@/components/terminal/AIBrainFeed';
import { StrategyControlCard, Strategy } from '@/components/terminal/StrategyControlCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { strategiesApi } from '@/lib/api';
import { TrendingUp, BarChart2 } from 'lucide-react';

type AIMode = 'OFF' | 'DEMO' | 'LIVE';

export default function Terminal() {
  const [aiMode, setAIMode] = useState<AIMode>('OFF');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brainEntries, setBrainEntries] = useState<BrainEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategies();
    simulateBrainFeed();
  }, []);

  const loadStrategies = async () => {
    try {
      const res = await strategiesApi.list();
      const strategiesData: Strategy[] = res.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        mode: 'OFF' as const,
        status: 'idle' as const,
        parameters: JSON.parse(s.parameters),
        performance: { pnl: 0, sharpe: 1.8, winRate: 65, maxDrawdown: 8.5 }
      }));
      setStrategies(strategiesData);
    } catch (error) {
      setStrategies([
        {
          id: '1',
          name: 'Trend Following BTC',
          description: 'Momentum-based trend detection',
          category: 'MOMENTUM',
          mode: 'DEMO',
          status: 'scanning',
          parameters: { lookback: 20 },
          performance: { pnl: 234.56, sharpe: 2.1, winRate: 68, maxDrawdown: 5.2 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const simulateBrainFeed = () => {
    setBrainEntries([
      {
        id: '1',
        timestamp: Date.now() - 30000,
        type: 'analysis',
        category: 'Market',
        title: 'BTC Trend Analysis',
        content: 'Price broke above 20-EMA with volume. RSI 62.',
        sentiment: 'bullish',
        confidence: 78,
        strategy: 'Trend Following BTC',
        symbol: 'BTC'
      },
      {
        id: '2',
        timestamp: Date.now() - 15000,
        type: 'decision',
        category: 'Trade',
        title: 'LONG Entry Signal',
        content: 'Entering 0.5 BTC long position.',
        sentiment: 'bullish',
        confidence: 82,
        strategy: 'Trend Following BTC',
        symbol: 'BTC'
      }
    ]);
  };

  const handleModeChange = (mode: AIMode) => {
    setAIMode(mode);
    setBrainEntries(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'decision',
      category: 'System',
      title: `AI Mode: ${mode}`,
      content: `Global mode changed to ${mode}`,
    }]);
  };

  const handleEmergencyStop = () => {
    setAIMode('OFF');
    setStrategies(prev => prev.map(s => ({ ...s, mode: 'OFF' as const, status: 'idle' as const })));
    setBrainEntries(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'risk',
      category: 'Emergency',
      title: 'EMERGENCY STOP',
      content: 'All strategies stopped',
      confidence: 100
    }]);
  };

  const handleStrategyModeChange = (strategyId: string, mode: 'OFF' | 'DEMO' | 'LIVE') => {
    setStrategies(prev => prev.map(s =>
      s.id === strategyId ? { ...s, mode, status: mode === 'OFF' ? 'idle' as const : 'scanning' as const } : s
    ));
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setBrainEntries(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'decision',
        category: 'Strategy',
        title: `${strategy.name}: ${mode}`,
        content: `Mode changed to ${mode}`,
        strategy: strategy.name
      }]);
    }
  };

  const handleBacktest = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setBrainEntries(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'analysis',
        category: 'Backtest',
        title: `Backtest: ${strategy.name}`,
        content: `Running 30-day backtest on BTC/USDC`,
        strategy: strategy.name
      }]);
    }
  };

  const handleEditParameters = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      alert(`Parameter editor for ${strategy.name} - Coming soon`);
    }
  };

  const activeStrategies = strategies.filter(s => s.mode !== 'OFF');

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Status Bar */}
      <GlobalStatusBar
        aiMode={aiMode}
        onModeChange={handleModeChange}
        onEmergencyStop={handleEmergencyStop}
        totalPnL={0}
        accountBalance={10000}
        walletAddress="0x04397203F6163F6C510bAd691eC55257479A72E2"
        isConnected={false}
        environment="testnet"
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Strategies Panel */}
        <div className="w-64 border-r border-border/30 flex flex-col bg-card/5">
          <div className="p-3 border-b border-border/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Strategies
              </h3>
              <Badge variant="outline" className="h-5 text-xs">
                {activeStrategies.length} Active
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              strategies.map(strategy => (
                <StrategyControlCard
                  key={strategy.id}
                  strategy={strategy}
                  onModeChange={handleStrategyModeChange}
                  onBacktest={handleBacktest}
                  onEditParameters={handleEditParameters}
                />
              ))
            )}
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart Header */}
          <div className="px-4 py-2 border-b border-border/30 bg-card/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold">BTC/USDC</h2>
                <Badge variant="outline" className="h-5 text-xs">Hyperliquid</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">$96,234.50</span>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-semibold">+2.34%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {['1m', '5m', '1h', '4h', '1d'].map((tf) => (
                  <Button
                    key={tf}
                    variant={tf === '1h' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 px-2.5 text-xs"
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="flex-1 bg-card/10 flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center text-center max-w-md">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BarChart2 className="h-10 w-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold mb-2">TradingView Chart</h3>
              <p className="text-sm text-muted-foreground">
                Advanced chart with AI overlays will integrate here
              </p>
            </div>
          </div>
        </div>

        {/* AI Brain Feed */}
        <div className="w-72 border-l border-border/30 bg-card/5">
          <AIBrainFeed entries={brainEntries} />
        </div>
      </div>
    </div>
  );
}
