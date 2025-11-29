'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface DecisionData {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  timestamp: number;
}

interface AIBrainPanelProps {
  decision: DecisionData | null;
  isActive: boolean;
  isLive: boolean;
}

export function AIBrainPanel({ decision, isActive, isLive }: AIBrainPanelProps) {
  const reasoningRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest reasoning
  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [decision]);

  if (!isActive) {
    return (
      <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Decision Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
            <Brain className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">
              AI Agent is offline
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Activate the AI Agent to see real-time decision-making process and strategic reasoning
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!decision) {
    return (
      <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary animate-pulse" />
            AI Decision Stream
            {isLive && (
              <Badge variant="outline" className="ml-auto text-xs">
                <Zap className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Analyzing market conditions...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const actionColor =
    decision.action === 'BUY' ? 'text-green-500' :
    decision.action === 'SELL' ? 'text-red-500' : 'text-yellow-500';

  const confidenceColor =
    decision.confidence >= 80 ? 'bg-green-500' :
    decision.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary animate-pulse" />
          AI Decision Stream
          {isLive && (
            <Badge variant="outline" className="ml-auto text-xs">
              <Zap className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Current Decision */}
        <div className="space-y-3">
          {/* Action & Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-lg bg-opacity-10",
                decision.action === 'BUY' && "bg-green-500",
                decision.action === 'SELL' && "bg-red-500",
                decision.action === 'HOLD' && "bg-yellow-500"
              )}>
                {decision.action === 'BUY' && <Target className="h-5 w-5 text-green-500" />}
                {decision.action === 'SELL' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                {decision.action === 'HOLD' && <Brain className="h-5 w-5 text-yellow-500" />}
              </div>
              <div>
                <div className={cn("text-xl font-bold", actionColor)}>
                  {decision.action}
                </div>
                <div className="text-xs text-muted-foreground">
                  Recommended Action
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono tabular-nums">
                {decision.confidence.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                confidenceColor
              )}
              style={{
                width: `${decision.confidence}%`,
                boxShadow: '0 0 20px currentColor'
              }}
            />
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Strategic Reasoning
          </div>

          <div
            ref={reasoningRef}
            className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar"
          >
            {decision.reasoning.map((reason, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50",
                  "transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(decision.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
