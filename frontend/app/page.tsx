'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sessionsApi, backtestsApi, strategiesApi } from '@/lib/api';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Activity, TrendingUp, TrendingDown, BarChart3, Zap, Brain, DollarSign, Target } from 'lucide-react';

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
    setLoading(false);

    try {
      const [sessionsRes, backtestsRes, strategiesRes] = await Promise.all([
        sessionsApi.list().catch(() => ({ data: [] })),
        backtestsApi.list().catch(() => ({ data: [] })),
        strategiesApi.list().catch(() => ({ data: [] })),
      ]);

      const activeSessions = sessionsRes.data.filter((s: any) => s.status === 'RUNNING');

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
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 space-y-8">
            {/* Header Section */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">AI Trading Lab</h1>
              <p className="text-lg text-muted-foreground">
                Institutional-grade algorithmic trading powered by Claude AI
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Active Sessions Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Sessions
                  </CardTitle>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeSessions}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Strategies running live
                  </p>
                </CardContent>
              </Card>

              {/* Total PnL Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total PnL
                  </CardTitle>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    stats.totalPnL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {stats.totalPnL >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${
                    stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {formatCurrency(stats.totalPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all sessions
                  </p>
                </CardContent>
              </Card>

              {/* Backtests Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Backtests
                  </CardTitle>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalBacktests}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Simulations completed
                  </p>
                </CardContent>
              </Card>

              {/* Strategies Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Strategy Arsenal
                  </CardTitle>
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalStrategies}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Institutional strategies
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Sessions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Active Sessions</h2>
                  <p className="text-sm text-muted-foreground">
                    Real-time trading sessions currently running
                  </p>
                </div>
                <Badge variant="secondary" className="h-7">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>

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
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Deploy a strategy from the Strategies page to start trading with AI-powered analysis
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sessions.map((session: any) => (
                    <Card
                      key={session.id}
                      className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 hover:border-border transition-colors"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{session.strategy.name}</h3>
                              <Badge
                                variant={session.mode === 'LIVE' ? 'destructive' : 'secondary'}
                                className="h-6"
                              >
                                {session.mode}
                              </Badge>
                              <Badge variant="outline" className="h-6">
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {session.venue}
                              </span>
                              <span>•</span>
                              <span>{session.symbol}</span>
                              <span>•</span>
                              <span>Started {formatDate(session.startedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Powered by Claude AI</h3>
                      <p className="text-sm text-muted-foreground">
                        Advanced market analysis and decision synthesis
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">20</div>
                    <p className="text-xs text-muted-foreground">Institutional Strategies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
