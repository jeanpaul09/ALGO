'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sessionsApi, backtestsApi, strategiesApi } from '@/lib/api';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Activity, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalPnL: 0,
    totalBacktests: 0,
    totalStrategies: 0,
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Set loading to false immediately so UI shows
    setLoading(false);

    try {
      const [sessionsRes, backtestsRes, strategiesRes] = await Promise.all([
        sessionsApi.list().catch(() => ({ data: [] })),
        backtestsApi.list().catch(() => ({ data: [] })),
        strategiesApi.list().catch(() => ({ data: [] })),
      ]);

      const activeSessions = sessionsRes.data.filter((s: any) => s.status === 'RUNNING');

      // Calculate total PnL from active sessions
      let totalPnL = 0;
      for (const session of activeSessions) {
        try {
          const sessionInfo = await sessionsApi.get(session.id);
          totalPnL += sessionInfo.data.totalPnl || 0;
        } catch (e) {
          // Skip failed session
        }
      }

      setStats({
        activeSessions: activeSessions.length,
        totalPnL,
        totalBacktests: backtestsRes.data.length,
        totalStrategies: strategiesRes.data.length,
      });

      setSessions(activeSessions);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Data will remain at defaults (all zeros)
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your AI trading operations</p>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeSessions}</div>
                <p className="text-xs text-muted-foreground">Trading strategies running</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
                {stats.totalPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(stats.totalPnL)}
                </div>
                <p className="text-xs text-muted-foreground">Across all sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Backtests</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBacktests}</div>
                <p className="text-xs text-muted-foreground">Total simulations run</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Strategies</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStrategies}</div>
                <p className="text-xs text-muted-foreground">Available to deploy</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Real-time trading sessions currently running</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground">No active sessions</div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{session.strategy.name}</h3>
                          <Badge variant={session.mode === 'LIVE' ? 'destructive' : 'secondary'}>
                            {session.mode}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.venue} • {session.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{session.status}</div>
                        <div className="text-xs text-muted-foreground">
                          Started {formatDate(session.startedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
