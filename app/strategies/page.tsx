'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { strategiesApi, sessionsApi, backtestsApi } from '@/lib/api';
import { Play, BarChart3, Info } from 'lucide-react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const res = await strategiesApi.list();
      setStrategies(res.data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBacktest = async (strategyId: string) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      await backtestsApi.run({
        strategyId,
        symbol: 'BTC',
        venue: 'hyperliquid',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      alert('Backtest started! Check the Backtests page for results.');
    } catch (error) {
      console.error('Failed to start backtest:', error);
      alert('Failed to start backtest');
    }
  };

  const handleStartDemo = async (strategyId: string) => {
    try {
      await sessionsApi.start({
        strategyId,
        mode: 'DEMO',
        venue: 'hyperliquid',
        symbol: 'BTC',
      });

      alert('Demo session started! Check the Live Trading page.');
    } catch (error) {
      console.error('Failed to start demo session:', error);
      alert('Failed to start demo session');
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Trading Strategies</h1>
            <p className="text-muted-foreground">Manage and deploy AI trading strategies</p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy) => (
                <Card key={strategy.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{strategy.name}</CardTitle>
                        <CardDescription className="mt-1">{strategy.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{strategy.category.replace('_', ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold">Parameters</h4>
                      <div className="space-y-1 rounded-lg bg-muted p-3 text-xs">
                        {Object.entries(JSON.parse(strategy.parameters)).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold">Markets</h4>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(strategy.markets).map((market: string) => (
                          <Badge key={market} variant="outline">
                            {market}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRunBacktest(strategy.id)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Backtest
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStartDemo(strategy.id)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Demo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
