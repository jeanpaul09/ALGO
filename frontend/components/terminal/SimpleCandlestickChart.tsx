'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimpleCandlestickChartProps {
  symbol: string;
  interval: string;
}

export function SimpleCandlestickChart({ symbol, interval }: SimpleCandlestickChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandles();
    const intervalId = setInterval(fetchCandles, 10000); // Update every 10 seconds
    return () => clearInterval(intervalId);
  }, [symbol, interval]);

  const fetchCandles = async () => {
    try {
      setError(null);

      // Hyperliquid public API endpoint for candles
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: symbol,
            interval: interval,
            startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
            endTime: Date.now()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();

      if (data && data.length > 0) {
        const candleData: Candle[] = data.map((c: any) => ({
          time: c.t,
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
          volume: parseFloat(c.v)
        }));

        setCandles(candleData.slice(-50)); // Last 50 candles

        const latest = candleData[candleData.length - 1];
        const previous = candleData[candleData.length - 2];

        setCurrentPrice(latest.close);
        setPriceChange(((latest.close - previous.close) / previous.close) * 100);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching candles:', err);
      setError('Unable to load chart data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchCandles}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Calculate min/max for scaling
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  return (
    <div className="h-full flex flex-col">
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-card/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold">{symbol}/USDC</h2>
            <Badge variant="outline" className="h-5 text-xs">Hyperliquid</Badge>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">${currentPrice.toFixed(2)}</span>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 p-4 bg-card/5">
        <div className="h-full flex items-end gap-0.5">
          {candles.map((candle, i) => {
            const isGreen = candle.close >= candle.open;
            const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * 100;
            const wickTopHeight = (Math.max(candle.open, candle.close) - candle.high) / priceRange * -100;
            const wickBottomHeight = (candle.low - Math.min(candle.open, candle.close)) / priceRange * 100;
            const bodyBottom = (Math.min(candle.open, candle.close) - minPrice) / priceRange * 100;

            return (
              <div key={i} className="flex-1 relative" style={{ height: '100%' }}>
                {/* Wick */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${
                    isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'
                  }`}
                  style={{
                    bottom: `${bodyBottom}%`,
                    height: `${Math.abs(wickTopHeight) + bodyHeight + wickBottomHeight}%`
                  }}
                />
                {/* Body */}
                <div
                  className={`absolute left-0 right-0 ${
                    isGreen ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{
                    bottom: `${bodyBottom}%`,
                    height: `${Math.max(bodyHeight, 1)}%`
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume */}
      <div className="h-16 px-4 pb-2 bg-card/5">
        <div className="h-full flex items-end gap-0.5">
          {candles.map((candle, i) => {
            const maxVolume = Math.max(...candles.map(c => c.volume));
            const volumeHeight = (candle.volume / maxVolume) * 100;
            const isGreen = candle.close >= candle.open;

            return (
              <div
                key={i}
                className={`flex-1 ${isGreen ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}
                style={{ height: `${volumeHeight}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
