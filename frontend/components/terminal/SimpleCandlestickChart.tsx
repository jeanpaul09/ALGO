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
}

export function SimpleCandlestickChart({ symbol }: SimpleCandlestickChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('1h');

  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  useEffect(() => {
    fetchCandles();
    const intervalId = setInterval(fetchCandles, 5000); // Update every 5 seconds
    return () => clearInterval(intervalId);
  }, [symbol, selectedInterval]);

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
            interval: selectedInterval,
            startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
            endTime: Date.now()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        const candleData: Candle[] = data.map((c: any) => ({
          time: c.t,
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
          volume: parseFloat(c.v || '0')
        }));

        setCandles(candleData.slice(-80)); // Last 80 candles

        const latest = candleData[candleData.length - 1];
        const previous = candleData[candleData.length - 2];

        if (latest && previous) {
          setCurrentPrice(latest.close);
          setPriceChange(((latest.close - previous.close) / previous.close) * 100);
        }
        setLoading(false);
      } else {
        throw new Error('No data received');
      }
    } catch (err: any) {
      console.error('Error fetching candles:', err);
      setError(err.message || 'Failed to load chart');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border/30 bg-card/5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{symbol}/USDC</h2>
            <Badge variant="outline" className="h-5 text-xs">Hyperliquid</Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border/30 bg-card/5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{symbol}/USDC</h2>
            <Badge variant="outline" className="h-5 text-xs">Hyperliquid</Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchCandles}>
              Retry
            </Button>
          </div>
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
      <div className="px-4 py-2.5 border-b border-border/30 bg-card/5">
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
          {/* Timeframe Selector */}
          <div className="flex gap-1">
            {intervals.map((interval) => (
              <Button
                key={interval}
                variant={selectedInterval === interval ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2.5 text-xs"
                onClick={() => {
                  setSelectedInterval(interval);
                  setLoading(true);
                }}
              >
                {interval}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 p-4 bg-card/10">
        <div className="h-full flex items-end gap-px">
          {candles.map((candle, i) => {
            const isGreen = candle.close >= candle.open;
            const bodyTop = Math.max(candle.open, candle.close);
            const bodyBottom = Math.min(candle.open, candle.close);

            const bodyTopPercent = ((bodyTop - minPrice) / priceRange) * 100;
            const bodyBottomPercent = ((bodyBottom - minPrice) / priceRange) * 100;
            const bodyHeight = bodyTopPercent - bodyBottomPercent;

            const wickTopPercent = ((candle.high - minPrice) / priceRange) * 100;
            const wickBottomPercent = ((candle.low - minPrice) / priceRange) * 100;

            return (
              <div key={i} className="flex-1 relative h-full min-w-[2px]">
                {/* Wick */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-px ${
                    isGreen ? 'bg-emerald-500/40' : 'bg-red-500/40'
                  }`}
                  style={{
                    bottom: `${wickBottomPercent}%`,
                    height: `${wickTopPercent - wickBottomPercent}%`
                  }}
                />
                {/* Body */}
                <div
                  className={`absolute left-0 right-0 ${
                    isGreen ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{
                    bottom: `${bodyBottomPercent}%`,
                    height: `${Math.max(bodyHeight, 0.5)}%`
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume */}
      <div className="h-16 px-4 pb-3 bg-card/5 border-t border-border/30">
        <div className="h-full flex items-end gap-px">
          {candles.map((candle, i) => {
            const maxVolume = Math.max(...candles.map(c => c.volume));
            const volumeHeight = (candle.volume / maxVolume) * 100;
            const isGreen = candle.close >= candle.open;

            return (
              <div
                key={i}
                className={`flex-1 min-w-[2px] ${isGreen ? 'bg-emerald-500/40' : 'bg-red-500/40'}`}
                style={{ height: `${volumeHeight}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
