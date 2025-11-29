'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Zap } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { strategiesApi, backtestsApi, sessionsApi } from '@/lib/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    totalStrategies: 0,
  });
  const [strategies, setStrategies] = useState<any[]>([]);
  const [pnlData, setPnlData] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(false);

    try {
      const [strategiesRes, backtestsRes, sessionsRes] = await Promise.all([
        strategiesApi.list().catch(() => ({ data: [] })),
        backtestsApi.list().catch(() => ({ data: [] })),
        sessionsApi.list(false).catch(() => ({ data: [] })),
      ]);

      const strategiesData = strategiesRes.data || [];
      const backtestsData = backtestsRes.data || [];
      const sessionsData = sessionsRes.data || [];

      setStrategies(strategiesData);

      const activeSessions = sessionsData.filter((s: any) => s.status === 'running').length;
      const completedBacktests = backtestsData.filter((b: any) => b.status === 'completed');

      const totalPnL = completedBacktests.reduce((sum: number, b: any) => sum + (b.result?.totalPnL || 0), 0);
      const totalTrades = completedBacktests.reduce((sum: number, b: any) => sum + (b.result?.trades || 0), 0);
      const winningTrades = completedBacktests.reduce((sum: number, b: any) => sum + (b.result?.winningTrades || 0), 0);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      setStats({
        activeSessions,
        totalPnL,
        winRate,
        totalTrades,
        totalStrategies: strategiesData.length,
      });

      // Generate P&L chart data (in production, this comes from backend)
      const pnlChartData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: Math.random() * 2000 - 500 + i * 100,
        cumulative: i * 150 + Math.random() * 500,
      }));
      setPnlData(pnlChartData);

      // Generate market data (in production, this comes from backend)
      const marketChartData = Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        btc: 42000 + Math.random() * 2000,
        eth: 2200 + Math.random() * 100,
      }));
      setMarketData(marketChartData);

      // Mock recent trades (in production, this comes from sessions)
      const trades = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        symbol: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'][Math.floor(Math.random() * 3)],
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        size: (Math.random() * 0.5).toFixed(4),
        price: (40000 + Math.random() * 5000).toFixed(2),
        pnl: (Math.random() * 200 - 50).toFixed(2),
        time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      }));
      setRecentTrades(trades);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Trading Dashboard</h1>
              <p className="text-muted-foreground mt-2">Real-time market data and performance metrics</p>
            </div>
            <Badge variant="outline" className="gap-2 px-4 py-2">
              <Activity className="h-4 w-4 animate-pulse text-primary" />
              Live Market Data
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-border/40 bg-card/50 backdrop-blur hover:bg-card/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                    <p className={`text-3xl font-bold mt-2 ${stats.totalPnL >= 0 ? 'text-primary' : 'text-red-500'}`}>
                      {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stats.totalPnL >= 0 ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                    <DollarSign className={`h-6 w-6 ${stats.totalPnL >= 0 ? 'text-primary' : 'text-red-500'}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  {stats.totalPnL >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-primary" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span>All-time performance</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur hover:bg-card/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                    <p className="text-3xl font-bold mt-2">{stats.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-full p-3 bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {stats.totalTrades} total trades
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur hover:bg-card/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                    <p className="text-3xl font-bold mt-2">{stats.activeSessions}</p>
                  </div>
                  <div className="rounded-full p-3 bg-yellow-500/10">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <Activity className="mr-1 h-3 w-3 animate-pulse text-primary" />
                  <span>Live trading</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur hover:bg-card/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Strategies</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalStrategies}</p>
                  </div>
                  <div className="rounded-full p-3 bg-blue-500/10">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Active algorithms
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* P&L Chart */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Cumulative P&L</CardTitle>
                <CardDescription>30-day performance history</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={pnlData}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 34%, 17%)" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(215.4, 16.3%, 56.9%)"
                      fontSize={12}
                      tick={{ fill: 'hsl(215.4, 16.3%, 56.9%)' }}
                    />
                    <YAxis
                      stroke="hsl(215.4, 16.3%, 56.9%)"
                      fontSize={12}
                      tick={{ fill: 'hsl(215.4, 16.3%, 56.9%)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(224, 71%, 4%)',
                        border: '1px solid hsl(216, 34%, 17%)',
                        borderRadius: '8px',
                        color: 'hsl(213, 31%, 91%)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPnl)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Market Data Chart */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Market Prices</CardTitle>
                <CardDescription>24-hour price movement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={marketData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 34%, 17%)" />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(215.4, 16.3%, 56.9%)"
                      fontSize={12}
                      tick={{ fill: 'hsl(215.4, 16.3%, 56.9%)' }}
                    />
                    <YAxis
                      stroke="hsl(215.4, 16.3%, 56.9%)"
                      fontSize={12}
                      tick={{ fill: 'hsl(215.4, 16.3%, 56.9%)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(224, 71%, 4%)',
                        border: '1px solid hsl(216, 34%, 17%)',
                        borderRadius: '8px',
                        color: 'hsl(213, 31%, 91%)',
                      }}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(213, 31%, 91%)' }} />
                    <Line
                      type="monotone"
                      dataKey="btc"
                      stroke="hsl(30, 80%, 55%)"
                      strokeWidth={2}
                      name="BTC"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="eth"
                      stroke="hsl(280, 65%, 60%)"
                      strokeWidth={2}
                      name="ETH"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Trades & Strategy Performance */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Trades */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Latest trading activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                          className="w-16 justify-center"
                        >
                          {trade.side}
                        </Badge>
                        <div>
                          <p className="font-medium">{trade.symbol}</p>
                          <p className="text-sm text-muted-foreground">{trade.size} @ ${trade.price}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${parseFloat(trade.pnl) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                          {parseFloat(trade.pnl) >= 0 ? '+' : ''}${trade.pnl}
                        </p>
                        <p className="text-xs text-muted-foreground">{trade.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Strategies */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Active Strategies</CardTitle>
                <CardDescription>Trading algorithms overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategies.slice(0, 5).map((strategy) => (
                    <div key={strategy.id} className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <p className="font-medium">{strategy.name}</p>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                      <Badge variant="outline" className="gap-1 ml-4">
                        <Activity className="h-3 w-3" />
                        {strategy.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
