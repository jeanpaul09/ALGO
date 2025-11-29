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
import { Play, Square, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function LiveTradingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useWebSocket((message: WSMessage) => {
    // Handle real-time updates
    if (message.type === 'position_update' || message.type === 'pnl_update' || message.type === 'trade_executed') {
      loadSessions();
    }
  });

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await sessionsApi.list();
      const runningSessions = res.data.filter((s: any) => s.status === 'RUNNING');
      setSessions(runningSessions);

      // Load details for each session
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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Live Trading Console</h1>
            <p className="text-muted-foreground">Monitor and control active trading sessions</p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No active sessions. Start a demo or live session from the Strategies page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sessions.map((session) => {
                const details = sessionDetails.get(session.id);
                const totalPnL = details?.totalPnl || 0;

                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{session.strategy.name}</CardTitle>
                            <Badge variant={session.mode === 'LIVE' ? 'destructive' : 'secondary'}>
                              {session.mode}
                            </Badge>
                            <Badge variant="success">{session.status}</Badge>
                          </div>
                          <CardDescription className="mt-1">
                            {session.venue} • {session.symbol} • Started {formatDate(session.startedAt)}
                          </CardDescription>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStopSession(session.id)}
                        >
                          <Square className="mr-2 h-4 w-4" />
                          Stop
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* PnL Card */}
                        <div className="rounded-lg border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Total PnL</span>
                            {totalPnL >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div
                            className={`text-3xl font-bold ${
                              totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {formatCurrency(totalPnL)}
                          </div>
                        </div>

                        {/* Positions */}
                        <div className="rounded-lg border p-4">
                          <div className="mb-2 text-sm font-medium text-muted-foreground">
                            Open Positions
                          </div>
                          {details?.positions && details.positions.length > 0 ? (
                            <div className="space-y-2">
                              {details.positions.map((pos: any) => (
                                <div key={pos.id} className="flex items-center justify-between">
                                  <div>
                                    <Badge variant={pos.side === 'LONG' ? 'success' : 'destructive'}>
                                      {pos.side}
                                    </Badge>
                                    <span className="ml-2 text-sm">{pos.symbol}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      {pos.size.toFixed(4)} @ {formatCurrency(pos.entryPrice)}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        pos.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
                                      }`}
                                    >
                                      Unrealized: {formatCurrency(pos.unrealizedPnl)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No open positions</div>
                          )}
                        </div>
                      </div>

                      {/* Warning for LIVE mode */}
                      {session.mode === 'LIVE' && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <span className="text-sm text-red-500">
                            This session is trading with real funds. Monitor closely.
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
