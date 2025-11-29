'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { strategiesApi, sessionsApi, backtestsApi } from '@/lib/api';
import { Play, BarChart3, Sparkles, TrendingUp, Brain, Zap } from 'lucide-react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingStrategy, setDeployingStrategy] = useState<string | null>(null);
  const [backtestingStrategy, setBacktestingStrategy] = useState<string | null>(null);

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

  const handleRunBacktest = async (strategyId: string, strategyName: string) => {
    setBacktestingStrategy(strategyId);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      await backtestsApi.run({
        strategyId,
        symbol: 'BTC',
        venue: 'hyperliquid',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      alert(`Backtest started for ${strategyName}! Check the Backtests page for results.`);
    } catch (error) {
      console.error('Failed to start backtest:', error);
      alert('Failed to start backtest. Make sure the backend is running.');
    } finally {
      setBacktestingStrategy(null);
    }
  };

  const handleStartDemo = async (strategyId: string, strategyName: string) => {
    setDeployingStrategy(strategyId);
    try {
      await sessionsApi.start({
        strategyId,
        mode: 'DEMO',
        venue: 'hyperliquid',
        symbol: 'BTC',
      });

      alert(`Demo session started for ${strategyName}! Check the Live Trading page.`);
    } catch (error) {
      console.error('Failed to start demo session:', error);
      alert('Failed to start demo session. Make sure the backend is running.');
    } finally {
      setDeployingStrategy(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      MOMENTUM: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      MEAN_REVERSION: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      VOLATILITY: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      MARKET_STRUCTURE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      VOLUME_PROFILE: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      SENTIMENT: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Strategy Arsenal</h1>
                  <p className="text-lg text-muted-foreground">
                    Deploy institutional-grade trading strategies powered by advanced algorithms
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{strategies.length} Strategies</span>
                </div>
              </div>

              {/* Info Card */}
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">AI-Enhanced Strategy Execution</h3>
                      <p className="text-sm text-muted-foreground">
                        Each strategy is enhanced with Claude AI for real-time market analysis and intelligent decision-making.
                        Start with a demo session to test risk-free, then deploy live when ready.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strategies Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading strategies...</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {strategies.map((strategy) => {
                  const isDeploying = deployingStrategy === strategy.id;
                  const isBacktesting = backtestingStrategy === strategy.id;
                  const params = JSON.parse(strategy.parameters);
                  const markets = JSON.parse(strategy.markets);

                  return (
                    <Card
                      key={strategy.id}
                      className="border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 hover:border-border transition-all hover:shadow-lg group"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {strategy.name}
                            </CardTitle>
                            <CardDescription className="text-sm leading-relaxed">
                              {strategy.description}
                            </CardDescription>
                          </div>
                          <Badge
                            className={`${getCategoryColor(strategy.category)} border font-medium`}
                            variant="outline"
                          >
                            {strategy.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Parameters */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Configuration
                          </h4>
                          <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-1.5">
                            {Object.entries(params).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-mono font-medium">{String(value)}</span>
                              </div>
                            ))}
                            {Object.keys(params).length > 3 && (
                              <div className="text-xs text-muted-foreground text-center pt-1 border-t border-border/50">
                                +{Object.keys(params).length - 3} more parameters
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Markets */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Supported Markets
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {markets.slice(0, 4).map((market: string) => (
                              <Badge
                                key={market}
                                variant="secondary"
                                className="text-xs font-medium"
                              >
                                {market}
                              </Badge>
                            ))}
                            {markets.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{markets.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRunBacktest(strategy.id, strategy.name)}
                            disabled={isBacktesting || isDeploying}
                          >
                            {isBacktesting ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Backtest
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleStartDemo(strategy.id, strategy.name)}
                            disabled={isDeploying || isBacktesting}
                          >
                            {isDeploying ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Demo
                              </>
                            )}
                          </Button>
                        </div>
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
