'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlobalStatusBar } from '@/components/terminal/GlobalStatusBar';
import { AIBrainFeed, BrainEntry } from '@/components/terminal/AIBrainFeed';
import { StrategyControlCard, Strategy } from '@/components/terminal/StrategyControlCard';
import { SimpleCandlestickChart } from '@/components/terminal/SimpleCandlestickChart';
import { Badge } from '@/components/ui/badge';
import { strategiesApi } from '@/lib/api';
import { useWebSocket, WSMessage } from '@/lib/websocket';

type AIMode = 'OFF' | 'DEMO' | 'LIVE';

export default function Terminal() {
  const [aiMode, setAIMode] = useState<AIMode>('OFF');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brainEntries, setBrainEntries] = useState<BrainEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // WebSocket message handler
  const handleWSMessage = useCallback((message: WSMessage) => {
    console.log('WS Message:', message.type, message.data);

    switch (message.type) {
      case 'ai_signal':
        // AI analysis signals
        const signal = message.data;
        const validType = ['analysis', 'decision', 'trade', 'risk', 'signal'].includes(signal.type)
          ? signal.type as 'analysis' | 'decision' | 'trade' | 'risk' | 'signal'
          : 'analysis';
        setBrainEntries(prev => [{
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: validType,
          category: signal.category || 'Market',
          title: signal.title || 'AI Analysis',
          content: signal.content || signal.message,
          sentiment: signal.sentiment as 'bullish' | 'bearish' | 'neutral' | undefined,
          confidence: signal.confidence,
          strategy: signal.strategy,
          symbol: signal.symbol
        }, ...prev].slice(0, 100)); // Keep last 100 entries
        break;

      case 'trade_executed':
        // Trade execution notification
        const tradeSentiment: 'bullish' | 'bearish' = message.data.side === 'BUY' ? 'bullish' : 'bearish';
        setBrainEntries(prev => [{
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'trade' as const,
          category: 'Execution',
          title: `Trade Executed: ${message.data.side} ${message.data.symbol}`,
          content: `Size: ${message.data.size} @ $${message.data.price}`,
          sentiment: tradeSentiment,
          confidence: 100
        }, ...prev].slice(0, 100));
        break;

      case 'position_update':
        // Position update
        console.log('Position update:', message.data);
        break;

      case 'session_status':
        // Session status change
        console.log('Session status:', message.data);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, []);

  // Initialize WebSocket
  const { connected, subscribe, unsubscribe } = useWebSocket(handleWSMessage);

  useEffect(() => {
    loadStrategies();
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

  // Removed simulateBrainFeed - using real WebSocket data now

  const handleModeChange = (mode: AIMode) => {
    setAIMode(mode);

    // Update all strategies when global mode changes
    if (mode === 'OFF') {
      setStrategies(prev => prev.map(s => ({
        ...s,
        mode: 'OFF' as const,
        status: 'idle' as const
      })));
      // Unsubscribe from AI signals
      unsubscribe('ai_signals', 'BTC');
    } else {
      // Subscribe to AI signals when activating
      subscribe('ai_signals', 'BTC');

      setBrainEntries(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'decision' as const,
        category: 'AI',
        title: `🧠 AI Brain Activated`,
        content: `Subscribing to real-time AI analysis for BTC. The AI will now analyze market conditions and provide trading insights.`,
        sentiment: 'bullish' as const,
        confidence: 100
      }, ...prev]);
    }

    setBrainEntries(prev => [{
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'decision' as const,
      category: 'System',
      title: `AI Mode: ${mode}`,
      content: `Global AI mode changed to ${mode}. ${
        mode === 'OFF' ? 'All strategies stopped.' :
        mode === 'DEMO' ? 'Running in simulation mode.' :
        'LIVE trading enabled.'
      }`,
    }, ...prev]);
  };

  const handleEmergencyStop = () => {
    setAIMode('OFF');
    setStrategies(prev => prev.map(s => ({
      ...s,
      mode: 'OFF' as const,
      status: 'idle' as const
    })));

    setBrainEntries(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'risk' as const,
      category: 'Emergency',
      title: 'EMERGENCY STOP ACTIVATED',
      content: 'All strategies immediately stopped. All positions will be closed at market.',
      confidence: 100
    }]);
  };

  const handleStrategyModeChange = (strategyId: string, mode: 'OFF' | 'DEMO' | 'LIVE') => {
    setStrategies(prev => prev.map(s =>
      s.id === strategyId ? {
        ...s,
        mode,
        status: mode === 'OFF' ? 'idle' as const : 'scanning' as const
      } : s
    ));

    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setBrainEntries(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'decision' as const,
        category: 'Strategy',
        title: `${strategy.name}: ${mode}`,
        content: `Strategy mode changed to ${mode}. ${
          mode === 'OFF' ? 'Strategy stopped.' :
          mode === 'DEMO' ? 'Running simulation.' :
          'Trading live with real funds.'
        }`,
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
        type: 'analysis' as const,
        category: 'Backtest',
        title: `Backtest: ${strategy.name}`,
        content: `Running 30-day historical backtest on BTC/USDC. Results will appear shortly.`,
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
          <SimpleCandlestickChart symbol="BTC" />
        </div>

        {/* AI Brain Feed */}
        <div className="w-72 border-l border-border/30 bg-card/5">
          <AIBrainFeed entries={brainEntries} />
        </div>
      </div>
    </div>
  );
}
