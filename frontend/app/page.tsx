'use client';

import { useState, useEffect } from 'react';
import { GlobalStatusBar } from '@/components/terminal/GlobalStatusBar';
import { AIBrainFeed, BrainEntry } from '@/components/terminal/AIBrainFeed';
import { StrategyControlCard, Strategy } from '@/components/terminal/StrategyControlCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { strategiesApi } from '@/lib/api';
import {
  TrendingUp,
  Activity
} from 'lucide-react';

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
        performance: {
          pnl: 0,
          sharpe: 1.8,
          winRate: 65,
          maxDrawdown: 8.5
        }
      }));
      setStrategies(strategiesData);
    } catch (error) {
      console.error('Failed to load strategies:', error);
      setStrategies([
        {
          id: '1',
          name: 'Trend Following BTC',
          description: 'Momentum-based trend detection with adaptive position sizing',
          category: 'MOMENTUM',
          mode: 'DEMO',
          status: 'scanning',
          parameters: { lookback: 20, threshold: 0.02 },
          performance: { pnl: 234.56, sharpe: 2.1, winRate: 68, maxDrawdown: 5.2 }
        },
        {
          id: '2',
          name: 'Mean Reversion ETH',
          description: 'Statistical arbitrage on ETH using Bollinger Bands',
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
        content: 'Price broke above 20-period EMA with increasing volume. RSI at 62 indicates room for upside. Current trend: BULLISH with moderate strength.',
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
        content: 'Multiple indicators aligned for LONG entry: EMA crossover, volume surge, and support zone hold. Entering 0.5 BTC long position.',
        sentiment: 'bullish',
        confidence: 82,
        strategy: 'Trend Following BTC',
        symbol: 'BTC'
      },
      {
        id: '3',
        timestamp: Date.now() - 5000,
        type: 'risk',
        category: 'Risk Management',
        title: 'Stop Loss Positioned',
        content: 'Stop loss set at $94,250 (2% below entry). Take profit targets: TP1 at $97,500 (1:1.5 RR), TP2 at $98,800 (1:2.5 RR). Position size: 5% of capital.',
        confidence: 95,
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
    if (mode === 'OFF') {
      setStrategies(prev => prev.map(s => ({ ...s, mode: 'OFF' as const, status: 'idle' as const })));
    } else if (mode === 'DEMO') {
      setStrategies(prev => prev.map(s =>
        s.mode === 'LIVE' ? { ...s, mode: 'DEMO' as const } : s
      ));
    }
  };

  const handleEmergencyStop = () => {
    setAIMode('OFF');
    setStrategies(prev => prev.map(s => ({ ...s, mode: 'OFF' as const, status: 'idle' as const })));
    const stopEntry: BrainEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'risk',
      category: 'Emergency',
      title: 'EMERGENCY STOP ACTIVATED',
      content: 'All strategies stopped. All open positions will be closed at market. AI trading disabled.',
      confidence: 100
    };
    setBrainEntries(prev => [...prev, stopEntry]);
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
        title: `${strategy.name} ${mode}`,
        content: `Strategy mode changed to ${mode}. ${mode === 'LIVE' ? 'Now trading with real funds.' : mode === 'DEMO' ? 'Running in simulation mode.' : 'Strategy disabled.'}`,
        strategy: strategy.name
      };
      setBrainEntries(prev => [...prev, entry]);
    }
  };

  const handleBacktest = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      alert(`Starting backtest for ${strategy.name}. Results will appear in the Backtests tab.`);
    }
  };

  const handleEditParameters = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      alert(`Opening parameter editor for ${strategy.name}. This would show a modal with editable parameters.`);
    }
  };

  const activeStrategies = strategies.filter(s => s.mode !== 'OFF');
  const demoStrategies = strategies.filter(s => s.mode === 'DEMO');
  const liveStrategies = strategies.filter(s => s.mode === 'LIVE');

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        {/* Left: Strategies */}
        <div className="w-80 border-r border-border/50 bg-card/30 overflow-y-auto">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Strategy Arsenal</h2>
              <Badge variant="outline" className="text-xs">{strategies.length} total</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-emerald-500 font-bold">{activeStrategies.length}</div>
                <div className="text-muted-foreground">Active</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-blue-400 font-bold">{demoStrategies.length}</div>
                <div className="text-muted-foreground">Demo</div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-red-400 font-bold">{liveStrategies.length}</div>
                <div className="text-muted-foreground">Live</div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

        {/* Center: Chart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-card/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">BTC/USDC Perpetual</h2>
                <Badge variant="outline" className="text-xs">Hyperliquid</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">$96,234.50</span>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+2.34%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">1m</Button>
                <Button variant="outline" size="sm">5m</Button>
                <Button variant="default" size="sm">1h</Button>
                <Button variant="outline" size="sm">4h</Button>
                <Button variant="outline" size="sm">1d</Button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-card/20 flex items-center justify-center p-8">
            <Card className="w-full h-full border-border/50 bg-card/50">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Advanced TradingView Chart</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Professional trading chart with AI overlays: entry/exit markers, TP/SL zones, support/resistance, and annotated reasoning.
                  </p>
                  <Badge variant="outline">Chart integration next</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: AI Brain */}
        <div className="w-96 border-l border-border/50 bg-card/30">
          <AIBrainFeed entries={brainEntries} />
        </div>
      </div>
    </div>
  );
}
