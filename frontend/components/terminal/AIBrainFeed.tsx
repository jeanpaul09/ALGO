'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/card';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Shield,
  Zap
} from 'lucide-react';

export interface BrainEntry {
  id: string;
  timestamp: number;
  type: 'analysis' | 'decision' | 'trade' | 'risk' | 'signal';
  category: string;
  title: string;
  content: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  strategy?: string;
  symbol?: string;
}

interface AIBrainFeedProps {
  entries: BrainEntry[];
  maxEntries?: number;
}

export function AIBrainFeed({ entries, maxEntries = 50 }: AIBrainFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getIcon = (type: BrainEntry['type']) => {
    switch (type) {
      case 'analysis': return Brain;
      case 'decision': return Target;
      case 'trade': return Activity;
      case 'risk': return Shield;
      case 'signal': return Zap;
      default: return Activity;
    }
  };

  const getTypeColor = (type: BrainEntry['type']) => {
    switch (type) {
      case 'analysis': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'decision': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'trade': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'risk': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'signal': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getSentimentIcon = (sentiment?: 'bullish' | 'bearish' | 'neutral') => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="h-3 w-3 text-emerald-500" />;
      case 'bearish': return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'neutral': return <Activity className="h-3 w-3 text-muted-foreground" />;
      default: return null;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const displayEntries = entries.slice(-maxEntries);

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm">AI Brain Feed</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {entries.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="h-[calc(100vh-200px)] overflow-y-auto px-4 py-3 space-y-3"
        >
          {displayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Brain className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for AI agent activity...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Analysis and decisions will appear here in real-time
              </p>
            </div>
          ) : (
            displayEntries.map((entry) => {
              const Icon = getIcon(entry.type);
              return (
                <div
                  key={entry.id}
                  className="group p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`h-6 w-6 rounded flex items-center justify-center ${getTypeColor(entry.type).split(' ')[0]}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{entry.title}</span>
                          {entry.sentiment && getSentimentIcon(entry.sentiment)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTime(entry.timestamp)}
                          </span>
                          {entry.strategy && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-xs h-4 px-1">
                                {entry.strategy}
                              </Badge>
                            </>
                          )}
                          {entry.symbol && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs font-mono font-medium">{entry.symbol}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={`${getTypeColor(entry.type)} border text-xs`}
                      variant="outline"
                    >
                      {entry.type}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="text-xs text-muted-foreground leading-relaxed ml-8">
                    {entry.content}
                  </div>

                  {/* Confidence */}
                  {entry.confidence !== undefined && (
                    <div className="flex items-center gap-2 ml-8 mt-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            entry.confidence >= 75 ? 'bg-emerald-500' :
                            entry.confidence >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${entry.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.confidence}% confidence
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
