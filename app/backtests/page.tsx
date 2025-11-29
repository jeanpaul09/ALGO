'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { backtestsApi } from '@/lib/api';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export default function BacktestsPage() {
  const [backtests, setBacktests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBacktest, setSelectedBacktest] = useState<any>(null);

  useEffect(() => {
    loadBacktests();
    const interval = setInterval(loadBacktests, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadBacktests = async () => {
    try {
      const res = await backtestsApi.list();
      setBacktests(res.data);
    } catch (error) {
      console.error('Failed to load backtests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBacktestDetails = async (id: string) => {
    try {
      const res = await backtestsApi.get(id);
      setSelectedBacktest(res.data);
    } catch (error) {
      console.error('Failed to load backtest details:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Backtests</h1>
            <p className="text-muted-foreground">Historical strategy performance simulations</p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : backtests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No backtests yet. Run your first backtest from the Strategies page.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {backtests.map((backtest) => (
                <Card
                  key={backtest.id}
                  className="cursor-pointer hover:border-primary"
                  onClick={() => loadBacktestDetails(backtest.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{backtest.strategy.name}</CardTitle>
                        <CardDescription>
                          {backtest.symbol} • {formatDate(backtest.startDate)} - {formatDate(backtest.endDate)}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          backtest.status === 'COMPLETED'
                            ? 'success'
                            : backtest.status === 'RUNNING'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {backtest.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {backtest.status === 'COMPLETED' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Total Return</span>
                            {backtest.totalReturn >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div
                            className={`text-xl font-bold ${
                              backtest.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {formatPercent(backtest.totalReturn)}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                          <div className="text-xl font-bold">
                            {backtest.sharpeRatio?.toFixed(2) || 'N/A'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Max Drawdown</div>
                          <div className="text-xl font-bold text-red-500">
                            {formatPercent(backtest.maxDrawdown)}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                          <div className="text-xl font-bold">{formatPercent(backtest.winRate)}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Total Trades</div>
                          <div className="text-xl font-bold">{backtest.totalTrades}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Profitable</div>
                          <div className="text-xl font-bold text-green-500">
                            {backtest.profitableTrades}
                          </div>
                        </div>
                      </div>
                    )}

                    {backtest.status === 'RUNNING' && (
                      <div className="text-center text-muted-foreground">
                        Backtest in progress...
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedBacktest && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
              <div className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Backtest Details</h2>
                    <p className="text-muted-foreground">
                      {selectedBacktest.trades.length} trades executed
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBacktest(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Trade List */}
                  <div>
                    <h3 className="mb-2 font-semibold">Recent Trades</h3>
                    <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border p-4">
                      {selectedBacktest.trades.slice(-20).reverse().map((trade: any, i: number) => (
                        <div key={i} className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={trade.side === 'BUY' ? 'success' : 'destructive'}>
                              {trade.side}
                            </Badge>
                            <span className="text-sm">{trade.symbol}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {trade.size.toFixed(4)} @ {formatCurrency(trade.price)}
                            </div>
                            <div
                              className={`text-xs ${
                                trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}
                            >
                              PnL: {formatCurrency(trade.pnl)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
