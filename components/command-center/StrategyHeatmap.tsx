'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrategySignal {
  name: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  strength: number;
  weight: number;
}

interface StrategyHeatmapProps {
  strategies: StrategySignal[];
  isActive: boolean;
}

export function StrategyHeatmap({ strategies, isActive }: StrategyHeatmapProps) {
  if (!isActive || strategies.length === 0) {
    return (
      <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Strategy Arsenal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Activate AI Agent to see strategy analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          Strategy Arsenal
          <Badge variant="outline" className="ml-auto text-xs">
            {strategies.filter(s => s.action !== 'HOLD').length}/{strategies.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {strategies.map((strategy, idx) => {
          const isFiring = strategy.action !== 'HOLD';
          const strengthColor =
            strategy.strength > 70 ? 'bg-green-500' :
            strategy.strength > 40 ? 'bg-yellow-500' : 'bg-red-500';

          return (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-lg border transition-all duration-500",
                isFiring
                  ? "bg-muted/50 border-primary/50 shadow-lg shadow-primary/10"
                  : "bg-muted/20 border-border/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {strategy.action === 'BUY' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {strategy.action === 'SELL' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {strategy.action === 'HOLD' && <Minus className="h-4 w-4 text-muted-foreground" />}

                  <span className={cn(
                    "text-sm font-medium",
                    isFiring ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {strategy.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isFiring && (
                    <Badge
                      variant={strategy.action === 'BUY' ? 'default' : 'destructive'}
                      className="text-xs font-bold"
                    >
                      {strategy.action}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {strategy.confidence.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Strength bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    isFiring ? strengthColor : "bg-muted-foreground/20"
                  )}
                  style={{
                    width: `${strategy.strength}%`,
                    boxShadow: isFiring ? '0 0 10px currentColor' : 'none'
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
