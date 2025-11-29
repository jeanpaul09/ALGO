'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Activity, Target, AlertCircle } from 'lucide-react';
import { AISignal } from '@/lib/hooks/useWebSocket';

interface AIReasoningPanelProps {
  signal: AISignal | null;
  isLive?: boolean;
}

export function AIReasoningPanel({ signal, isLive = false }: AIReasoningPanelProps) {
  if (!signal) {
    return (
      <Card className="border-border/40 bg-card/30 backdrop-blur-xl h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Agent Analysis
            {isLive && (
              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Waiting for data...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start trading to see live AI analysis and decision-making process
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-500';
      case 'SELL': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="h-4 w-4" />;
      case 'SELL': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const confidenceColor = signal.confidence >= 80 ? 'bg-green-500' :
                          signal.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-xl h-full overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Agent Analysis
          {isLive && (
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500">LIVE</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {/* Decision Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getActionColor(signal.action)} bg-opacity-10`}>
                {getActionIcon(signal.action)}
              </div>
              <div>
                <div className={`font-bold text-lg ${getActionColor(signal.action)}`}>
                  {signal.action}
                </div>
                <div className="text-xs text-muted-foreground">Recommended Action</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-lg">{signal.confidence}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${confidenceColor} transition-all duration-500`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-primary" />
            Reasoning
          </div>
          <div className="space-y-1.5">
            {signal.reasoning.map((reason, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Technical Indicators
          </div>
          <div className="grid gap-2">
            {signal.indicators.map((indicator, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    indicator.signal === 'bullish' ? 'bg-green-500' :
                    indicator.signal === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm font-medium">{indicator.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {indicator.value.toFixed(2)}
                  </span>
                  <Badge
                    variant={indicator.signal === 'bullish' ? 'default' : 'destructive'}
                    className="text-xs capitalize"
                  >
                    {indicator.signal}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Zones */}
        {signal.zones && signal.zones.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-primary" />
              Key Zones Detected
            </div>
            <div className="grid gap-2">
              {signal.zones.map((zone, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      zone.type === 'support' ? 'bg-green-500' :
                      zone.type === 'resistance' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm font-medium capitalize">{zone.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">${zone.price.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1 w-1 rounded-full ${
                            idx < Math.floor(zone.strength / 20) ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
