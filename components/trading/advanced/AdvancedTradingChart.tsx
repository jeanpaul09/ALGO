'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from 'lightweight-charts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AISignal } from '@/lib/hooks/useWebSocket';
import { MinimizableControls } from './MinimizableControls';

interface AdvancedTradingChartProps {
  symbol: string;
  data: CandlestickData[];
  currentPrice?: number;
  aiSignal?: AISignal | null;
  onTimeframeChange?: (timeframe: string) => void;
  isLive?: boolean;
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export function AdvancedTradingChart({
  symbol,
  data,
  currentPrice,
  aiSignal,
  onTimeframeChange,
  isLive = false,
}: AdvancedTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with institutional dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgb(156, 163, 175)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 100 : 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(42, 46, 57, 0.3)',
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.3)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(99, 102, 241, 0.5)',
          width: 1,
          style: 3,
          labelBackgroundColor: 'rgb(99, 102, 241)',
        },
        horzLine: {
          color: 'rgba(99, 102, 241, 0.5)',
          width: 1,
          style: 3,
          labelBackgroundColor: 'rgb(99, 102, 241)',
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series with modern colors
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: 'rgb(34, 197, 94)',
      downColor: 'rgb(239, 68, 68)',
      borderUpColor: 'rgb(34, 197, 94)',
      borderDownColor: 'rgb(239, 68, 68)',
      wickUpColor: 'rgba(34, 197, 94, 0.8)',
      wickDownColor: 'rgba(239, 68, 68, 0.8)',
    });

    candlestickSeriesRef.current = candlestickSeries;
    candlestickSeries.setData(data);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 100 : 600,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, isFullscreen]);

  // Update with AI signal overlays
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !aiSignal) return;

    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;

    // Add AI signal zones
    if (aiSignal.zones) {
      aiSignal.zones.forEach((zone) => {
        const color = zone.type === 'support' ? 'rgba(34, 197, 94, 0.2)' :
                      zone.type === 'resistance' ? 'rgba(239, 68, 68, 0.2)' :
                      'rgba(59, 130, 246, 0.2)';

        const lineColor = zone.type === 'support' ? 'rgb(34, 197, 94)' :
                         zone.type === 'resistance' ? 'rgb(239, 68, 68)' :
                         'rgb(59, 130, 246)';

        // Add zone line
        const zoneLine = chart.addLineSeries({
          color: lineColor,
          lineWidth: 2,
          lineStyle: 2, // Dashed
          title: zone.type.toUpperCase(),
        });

        if (data.length > 0) {
          zoneLine.setData(data.map(d => ({ time: d.time, value: zone.price })));
        }
      });
    }

    // Add entry signal marker if BUY/SELL
    if (aiSignal.action !== 'HOLD' && data.length > 0 && currentPrice) {
      const lastTime = data[data.length - 1].time;
      const marker = {
        time: lastTime as any,
        position: (aiSignal.action === 'BUY' ? 'belowBar' : 'aboveBar') as any,
        color: aiSignal.action === 'BUY' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        shape: (aiSignal.action === 'BUY' ? 'arrowUp' : 'arrowDown') as any,
        text: `${aiSignal.action} @ $${currentPrice.toFixed(2)} (${aiSignal.confidence}%)`,
      };

      series.setMarkers([marker]);
    }
  }, [aiSignal, data, currentPrice]);

  // Real-time price update
  useEffect(() => {
    if (currentPrice && candlestickSeriesRef.current && data.length > 0) {
      const lastCandle = data[data.length - 1];
      candlestickSeriesRef.current.update({
        ...lastCandle,
        close: currentPrice,
        high: Math.max(lastCandle.high, currentPrice),
        low: Math.min(lastCandle.low, currentPrice),
      });
    }
  }, [currentPrice, data]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    onTimeframeChange?.(timeframe);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="relative">
      {/* Minimizable Controls */}
      <MinimizableControls
        symbol={symbol}
        currentPrice={currentPrice}
        selectedTimeframe={selectedTimeframe}
        timeframes={TIMEFRAMES}
        onTimeframeChange={handleTimeframeChange}
        onFullscreen={toggleFullscreen}
        isLive={isLive}
      />

      {/* AI Signal Badge */}
      {aiSignal && aiSignal.action !== 'HOLD' && (
        <div className="absolute top-20 left-4 z-20">
          <Badge
            variant={aiSignal.action === 'BUY' ? 'default' : 'destructive'}
            className="px-3 py-1.5 text-sm font-medium shadow-lg backdrop-blur-xl"
          >
            <TrendingUp className="h-4 w-4 mr-1.5" />
            AI: {aiSignal.action} • {aiSignal.confidence}% Confidence
          </Badge>
        </div>
      )}

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className={cn(
          'rounded-lg overflow-hidden bg-card/20 backdrop-blur-sm border border-border/40',
          isFullscreen && 'fixed inset-0 z-50 rounded-none'
        )}
      />
    </div>
  );
}
