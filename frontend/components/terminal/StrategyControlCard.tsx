'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Power,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type StrategyMode = 'OFF' | 'DEMO' | 'LIVE';
type StrategyStatus = 'idle' | 'scanning' | 'in-position' | 'cooling-down';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  category: string;
  mode: StrategyMode;
  status: StrategyStatus;
  parameters: Record<string, any>;
  performance: {
    pnl: number;
    sharpe?: number;
    winRate?: number;
    maxDrawdown?: number;
  };
  exposure?: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
  };
}

interface StrategyControlCardProps {
  strategy: Strategy;
  onModeChange: (strategyId: string, mode: StrategyMode) => void;
  onBacktest: (strategyId: string) => void;
  onEditParameters: (strategyId: string) => void;
}

export function StrategyControlCard({
  strategy,
  onModeChange,
  onBacktest,
  onEditParameters
}: StrategyControlCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getModeColor = (mode: StrategyMode) => {
    switch (mode) {
      case 'OFF': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'DEMO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LIVE': return 'bg-red-500/10 text-red-400 border-red-500/20 font-bold';
    }
  };

  const getStatusColor = (status: StrategyStatus) => {
    switch (status) {
      case 'idle': return 'bg-gray-500/10 text-gray-400';
      case 'scanning': return 'bg-yellow-500/10 text-yellow-400';
      case 'in-position': return 'bg-emerald-500/10 text-emerald-400';
      case 'cooling-down': return 'bg-blue-500/10 text-blue-400';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      MOMENTUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      MEAN_REVERSION: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      VOLATILITY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      MARKET_STRUCTURE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      VOLUME_PROFILE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      SENTIMENT: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const isActive = strategy.mode !== 'OFF';

  return (
    <Card className={`border-border/50 transition-all ${
      isActive ? 'bg-card/80 border-primary/20' : 'bg-card/50'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{strategy.name}</h3>
              <Badge
                className={`${getCategoryColor(strategy.category)} border text-xs`}
                variant="outline"
              >
                {strategy.category.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{strategy.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mode & Status */}
        <div className="flex items-center gap-2 mt-2">
          <Badge
            className={`${getModeColor(strategy.mode)} border text-xs font-mono`}
            variant="outline"
          >
            {strategy.mode}
          </Badge>
          <Badge className={`${getStatusColor(strategy.status)} text-xs`} variant="outline">
            {strategy.status.replace('-', ' ')}
          </Badge>
          {isActive && (
            <div className="flex items-center gap-1 ml-auto">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-500">Active</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Mode Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={strategy.mode === 'OFF' ? 'default' : 'ghost'}
            className="flex-1 h-8 text-xs"
            onClick={() => onModeChange(strategy.id, 'OFF')}
          >
            <Power className="h-3 w-3 mr-1" />
            OFF
          </Button>
          <Button
            size="sm"
            variant={strategy.mode === 'DEMO' ? 'default' : 'ghost'}
            className="flex-1 h-8 text-xs"
            onClick={() => onModeChange(strategy.id, 'DEMO')}
          >
            <Activity className="h-3 w-3 mr-1" />
            DEMO
          </Button>
          <Button
            size="sm"
            variant={strategy.mode === 'LIVE' ? 'destructive' : 'ghost'}
            className="flex-1 h-8 text-xs"
            onClick={() => onModeChange(strategy.id, 'LIVE')}
          >
            <Zap className="h-3 w-3 mr-1" />
            LIVE
          </Button>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-0.5">PnL</div>
            <div className={`text-sm font-bold ${
              strategy.performance.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {strategy.performance.pnl >= 0 ? '+' : ''}{strategy.performance.pnl.toFixed(2)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-0.5">Win Rate</div>
            <div className="text-sm font-bold">
              {strategy.performance.winRate ? `${strategy.performance.winRate}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Exposure (if in position) */}
        {strategy.exposure && (
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={strategy.exposure.side === 'LONG' ? 'default' : 'destructive'}
                  className="h-5 text-xs"
                >
                  {strategy.exposure.side}
                </Badge>
                <span className="text-xs font-mono font-medium">{strategy.exposure.symbol}</span>
              </div>
              <span className="text-xs font-mono">{strategy.exposure.size.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Expanded Section */}
        {expanded && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            {/* Parameters */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Parameters</div>
              <div className="space-y-1">
                {Object.entries(strategy.parameters).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="font-mono font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => onBacktest(strategy.id)}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Backtest
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => onEditParameters(strategy.id)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
