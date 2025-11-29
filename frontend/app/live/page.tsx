'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sessionsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useWebSocket, WSMessage } from '@/lib/websocket';
import { Play, Square, TrendingUp, TrendingDown, AlertTriangle, Activity, Target, DollarSign, Clock } from 'lucide-react';

export default function LiveTradingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useWebSocket((message: WSMessage) => {
    if (message.type === 'position_update' || message.type === 'pnl_update' || message.type === 'trade_executed') {
      loadSessions();
    }
  });

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await sessionsApi.list();
      const runningSessions = res.data.filter((s: any) => s.status === 'RUNNING');
      setSessions(runningSessions);

      const detailsMap = new Map();
      for (const session of runningSessions) {
        const details = await sessionsApi.get(session.id);
        detailsMap.set(session.id, details.data);
      }
      setSessionDetails(detailsMap);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to stop this session?')) return;

    try {
      await sessionsApi.stop(sessionId);
      loadSessions();
    } catch (error) {
      console.error('Failed to stop session:', error);
      alert('Failed to stop session');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Live Trading Console</h1>
                  <p className="text-lg text-muted-foreground">
                    Monitor and control active trading sessions in real-time
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-500">{sessions.length} Active</span>
                </div>
              </div>
            </div>

            {/* Sessions */}
            {loading ? (
              <Card className="border-border/50">
                <CardContent className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading sessions...</p>
                  </div>
                </CardContent>
              </Card>
            ) : sessions.length === 0 ? (
              <Card className="border-border/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Start a demo or live session from the Strategies page to begin trading
                  </p>
                  <Button variant="outline" size="sm">
                    <Play className="mr-2 h-4 w-4" />
                    Browse Strategies
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {sessions.map((session) => {
                  const details = sessionDetails.get(session.id);
                  const totalPnL = details?.totalPnl || 0;
                  const positions = details?.positions || [];

                  return (
                    <Card
                      key={session.id}
                      className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-2xl">{session.strategy.name}</CardTitle>
                              <Badge
                                variant={session.mode === 'LIVE' ? 'destructive' : 'secondary'}
                                className="h-6"
                              >
                                {session.mode}
                              </Badge>
                              <Badge variant="outline" className="h-6 border-emerald-500/50 text-emerald-500">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4" />
                                {session.venue}
                              </span>
                              <span>•</span>
                              <span className="font-medium">{session.symbol}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                Started {formatDate(session.startedAt)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleStopSession(session.id)}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Stop Session
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* PnL and Positions Grid */}
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* PnL Card */}
                          <div className="rounded-lg border border-border/50 bg-card p-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Total PnL</span>
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                totalPnL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                              }`}>
                                {totalPnL >= 0 ? (
                                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                            <div
                              className={`text-3xl font-bold ${
                                totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {formatCurrency(totalPnL)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {totalPnL >= 0 ? '+' : ''}{((totalPnL / 10000) * 100).toFixed(2)}% of capital
                            </p>
                          </div>

                          {/* Positions Card */}
                          <div className="rounded-lg border border-border/50 bg-card p-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Open Positions</span>
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Target className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            {positions.length > 0 ? (
                              <div className="space-y-3">
                                {positions.map((pos: any) => (
                                  <div key={pos.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={pos.side === 'LONG' ? 'default' : 'destructive'}
                                        className="h-5 text-xs"
                                      >
                                        {pos.side}
                                      </Badge>
                                      <span className="text-sm font-medium">{pos.symbol}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">
                                        {pos.size.toFixed(4)} @ {formatCurrency(pos.entryPrice)}
                                      </div>
                                      <div
                                        className={`text-xs ${
                                          pos.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                                        }`}
                                      >
                                        {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-6">
                                <div className="text-3xl font-bold text-muted-foreground/20 mb-1">0</div>
                                <p className="text-xs text-muted-foreground">No open positions</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Warning for LIVE mode */}
                        {session.mode === 'LIVE' && (
                          <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-red-500 mb-1">Live Trading Active</h4>
                                <p className="text-sm text-muted-foreground">
                                  This session is trading with real funds on Hyperliquid. Monitor closely and ensure risk parameters are appropriate.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
