'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TradeSignal {
  id: string;
  type: 'entry' | 'tp' | 'sl' | 'target';
  price: number;
  label: string;
  color: string;
}

interface AdvancedChartProps {
  symbol: string;
  onSignalsUpdate?: (signals: TradeSignal[]) => void;
}

export function AdvancedChart({ symbol, onSignalsUpdate }: AdvancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [selectedInterval, setSelectedInterval] = useState('15m');
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<TradeSignal[]>([]);

  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2a2e39',
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      crosshair: {
        mode: 1,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch and update data
  useEffect(() => {
    fetchCandles();
    const intervalId = setInterval(fetchCandles, 5000);
    return () => clearInterval(intervalId);
  }, [symbol, selectedInterval]);

  const fetchCandles = async () => {
    try {
      setLoading(true);

      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: symbol,
            interval: selectedInterval,
            startTime: Date.now() - 24 * 60 * 60 * 1000,
            endTime: Date.now()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch candles');

      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        const candleData: CandlestickData[] = data.map((c: any) => ({
          time: c.t / 1000, // Convert to seconds
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
        }));

        const volumeData: LineData[] = data.map((c: any) => ({
          time: c.t / 1000,
          value: parseFloat(c.v || '0'),
          color: parseFloat(c.c) >= parseFloat(c.o) ? '#26a69a' : '#ef5350',
        }));

        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(candleData);
        }

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData as any);
        }

        const latest = candleData[candleData.length - 1];
        const previous = candleData[candleData.length - 2];

        if (latest && previous) {
          setCurrentPrice(latest.close);
          setPriceChange(((latest.close - previous.close) / previous.close) * 100);
        }

        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching candles:', error);
      setLoading(false);
    }
  };

  // Draw signal lines on chart
  const drawSignals = (newSignals: TradeSignal[]) => {
    if (!chartRef.current) return;

    // Remove old price lines (would need to track refs in production)
    setSignals(newSignals);

    newSignals.forEach(signal => {
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.createPriceLine({
          price: signal.price,
          color: signal.color,
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: signal.label,
        });
      }
    });

    if (onSignalsUpdate) {
      onSignalsUpdate(newSignals);
    }
  };

  // Expose method for parent to add signals
  useEffect(() => {
    // This will be called by AI via WebSocket
    (window as any).addChartSignals = drawSignals;
  }, []);

  return (
    <div className="h-full flex flex-col bg-card/5">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">{symbol}/USDC</h2>
          <Badge variant="outline" className="h-5 text-xs">Hyperliquid</Badge>
          {!loading && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">${currentPrice.toFixed(2)}</span>
              <span className={`text-xs font-semibold ${
                priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          )}
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

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="flex-1 relative"
        style={{ minHeight: '500px' }}
      />

      {/* Active Signals Display */}
      {signals.length > 0 && (
        <div className="px-4 py-2 border-t border-border/30 bg-card/10">
          <div className="flex gap-2 flex-wrap">
            {signals.map(signal => (
              <Badge
                key={signal.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: signal.color, color: signal.color }}
              >
                {signal.label}: ${signal.price.toFixed(2)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      )}
    </div>
  );
}
