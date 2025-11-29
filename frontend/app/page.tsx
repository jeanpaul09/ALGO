'use client';

import { useState, useEffect } from 'react';
import { GlobalStatusBar } from '@/components/terminal/GlobalStatusBar';
import { AIBrainFeed, BrainEntry } from '@/components/terminal/AIBrainFeed';
import { StrategyControlCard, Strategy } from '@/components/terminal/StrategyControlCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { strategiesApi } from '@/lib/api';
import { TrendingUp, Activity } from 'lucide-react';

type AIMode = 'OFF' | 'DEMO' | 'LIVE';

export default function Terminal() {
  const [aiMode, setAIMode] = useState<AIMode>('OFF');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brainEntries, setBrainEntries] = useState<BrainEntry[]>([]);
  const [totalPnL] = useState(0);
  const [accountBalance] = useState(10000);
  const [walletAddress] = useState('0x04397203F6163F6C510bAd691eC55257479A72E2');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategies();
    simulateBrainFeed();
    checkConnection();
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
      console.error('Failed to load strategies:', error);
      setStrategies([
        {
          id: '1',
          name: 'Trend Following BTC',
          description: 'Momentum-based trend detection',
          category: 'MOMENTUM',
          mode: 'DEMO',
          status: 'scanning',
          parameters: { lookback: 20, threshold: 0.02 },
          performance: { pnl: 234.56, sharpe: 2.1, winRate: 68, maxDrawdown: 5.2 }
        },
        {
          id: '2',
          name: 'Mean Reversion ETH',
          description: 'Statistical arbitrage on ETH',
          category: 'MEAN_REVERSION',
          mode: 'OFF',
          status: 'idle',
          parameters: { period: 14, stdDev: 2 },
          performance: { pnl: -12.34, sharpe: 1.5, winRate: 72, maxDrawdown: 3.8 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const simulateBrainFeed = () => {
    const sampleEntries: BrainEntry[] = [
      {
        id: '1',
        timestamp: Date.now() - 30000,
        type: 'analysis',
        category: 'Market Context',
        title: 'BTC Trend Analysis',
        content: 'Price broke above 20-period EMA with increasing volume. RSI at 62 indicates room for upside.',
        sentiment: 'bullish',
        confidence: 78,
        strategy: 'Trend Following BTC',
        symbol: 'BTC'
      },
      {
        id: '2',
        timestamp: Date.now() - 15000,
        type: 'decision',
        category: 'Trade Decision',
        title: 'Entry Signal Generated',
        content: 'Multiple indicators aligned for LONG entry. Entering 0.5 BTC long position.',
        sentiment: 'bullish',
        confidence: 82,
        strategy: 'Trend Following BTC',
        symbol: 'BTC'
      }
    ];
    setBrainEntries(sampleEntries);
  };

  const checkConnection = async () => {
    try {
      await strategiesApi.list();
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleModeChange = (mode: AIMode) => {
    setAIMode(mode);
    const entry: BrainEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'decision',
      category: 'System',
      title: `AI Mode: ${mode}`,
      content: `Global AI mode changed to ${mode}. ${mode === 'OFF' ? 'All trading disabled.' : mode === 'DEMO' ? 'Running in simulation mode.' : 'LIVE trading enabled.'}`,
    };
    setBrainEntries(prev => [...prev, entry]);
  };

  const handleEmergencyStop = () => {
    setAIMode('OFF');
    setStrategies(prev => prev.map(s => ({ ...s, mode: 'OFF' as const, status: 'idle' as const })));
    const entry: BrainEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'risk',
      category: 'Emergency',
      title: 'EMERGENCY STOP',
      content: 'All strategies stopped. Positions will be closed at market.',
      confidence: 100
    };
    setBrainEntries(prev => [...prev, entry]);
  };

  const handleStrategyModeChange = (strategyId: string, mode: 'OFF' | 'DEMO' | 'LIVE') => {
    setStrategies(prev => prev.map(s =>
      s.id === strategyId ? { ...s, mode, status: mode === 'OFF' ? 'idle' as const : 'scanning' as const } : s
    ));
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      const entry: BrainEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'decision',
        category: 'Strategy Control',
        title: `${strategy.name}: ${mode}`,
        content: `Strategy mode changed to ${mode}.`,
        strategy: strategy.name
      };
      setBrainEntries(prev => [...prev, entry]);
    }
  };

  const handleBacktest = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      const entry: BrainEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'analysis',
        category: 'Backtest',
        title: `Backtest Started: ${strategy.name}`,
        content: `Running 30-day backtest on BTC/USDC. Results will appear shortly.`,
        strategy: strategy.name
      };
      setBrainEntries(prev => [...prev, entry]);
    }
  };

  const handleEditParameters = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      alert(`Parameter editor for ${strategy.name} - Coming soon`);
    }
  };

  const activeStrategies = strategies.filter(s => s.mode !== 'OFF');
  const demoStrategies = strategies.filter(s => s.mode === 'DEMO');
  const liveStrategies = strategies.filter(s => s.mode === 'LIVE');

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <GlobalStatusBar
        aiMode={aiMode}
        onModeChange={handleModeChange}
        onEmergencyStop={handleEmergencyStop}
        totalPnL={totalPnL}
        accountBalance={accountBalance}
        walletAddress={walletAddress}
        isConnected={isConnected}
        environment="testnet"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Strategies Sidebar */}
        <div className="w-72 border-r border-border/40 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/40 bg-card/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wide">Strategies</h2>
              <Badge variant="outline" className="text-xs h-5">{strategies.length}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="p-1.5 rounded bg-emerald-500/10 text-center">
                <div className="text-emerald-400 font-bold text-sm">{activeStrategies.length}</div>
                <div className="text-[10px] text-muted-foreground">Active</div>
              </div>
              <div className="p-1.5 rounded bg-blue-500/10 text-center">
                <div className="text-blue-400 font-bold text-sm">{demoStrategies.length}</div>
                <div className="text-[10px] text-muted-foreground">Demo</div>
              </div>
              <div className="p-1.5 rounded bg-red-500/10 text-center">
                <div className="text-red-400 font-bold text-sm">{liveStrategies.length}</div>
                <div className="text-[10px] text-muted-foreground">Live</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

        {/* Chart Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/40 bg-card/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold">BTC/USDC</h2>
                <Badge variant="outline" className="text-xs h-5">Hyperliquid</Badge>
                <span className="text-xl font-bold">$96,234.50</span>
                <div className="flex items-center gap-1 text-emerald-500 text-sm">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="font-semibold">+2.34%</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {['1m', '5m', '1h', '4h', '1d'].map((tf) => (
                  <Button
                    key={tf}
                    variant={tf === '1h' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <Card className="h-full border-border/40 bg-card/30 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">TradingView Chart</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Advanced chart with AI overlays will display here
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* AI Brain Feed */}
        <div className="w-80 border-l border-border/40">
          <AIBrainFeed entries={brainEntries} />
        </div>
      </div>
    </div>
  );
}
