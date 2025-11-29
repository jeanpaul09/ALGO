'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';

interface Trade {
  time: number;
  type: 'LONG' | 'SHORT';
  entry: number;
  exit?: number;
  takeProfit: number;
  stopLoss: number;
  reason: string;
  status: 'open' | 'closed';
  pnl?: number;
}

interface TradingChartProps {
  symbol: string;
  data: CandlestickData[];
  trades: Trade[];
  currentPrice?: number;
}

export function TradingChart({ symbol, data, trades, currentPrice }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'rgb(17, 24, 39)' },
        textColor: 'rgb(209, 213, 219)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: 'rgb(34, 197, 94)',
      downColor: 'rgb(239, 68, 68)',
      borderUpColor: 'rgb(34, 197, 94)',
      borderDownColor: 'rgb(239, 68, 68)',
      wickUpColor: 'rgb(34, 197, 94)',
      wickDownColor: 'rgb(239, 68, 68)',
    });

    candlestickSeriesRef.current = candlestickSeries;
    candlestickSeries.setData(data);

    // Add trade markers
    const markers = trades.map(trade => ({
      time: trade.time,
      position: trade.type === 'LONG' ? 'belowBar' : 'aboveBar' as const,
      color: trade.type === 'LONG' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
      shape: 'arrowUp' as const,
      text: `${trade.type} @ ${trade.entry.toFixed(2)}`,
    }));

    candlestickSeries.setMarkers(markers);

    // Add TP/SL lines for open trades
    const openTrades = trades.filter(t => t.status === 'open');
    openTrades.forEach(trade => {
      // Take Profit line
      const tpLine = chart.addLineSeries({
        color: 'rgb(34, 197, 94)',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: 'TP',
      });
      tpLine.setData(data.map(d => ({ time: d.time, value: trade.takeProfit })));

      // Stop Loss line
      const slLine = chart.addLineSeries({
        color: 'rgb(239, 68, 68)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'SL',
      });
      slLine.setData(data.map(d => ({ time: d.time, value: trade.stopLoss })));

      // Entry line
      const entryLine = chart.addLineSeries({
        color: 'rgb(59, 130, 246)',
        lineWidth: 2,
        title: 'Entry',
      });
      entryLine.setData(data.map(d => ({ time: d.time, value: trade.entry })));
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, trades]);

  // Update current price
  useEffect(() => {
    if (currentPrice && candlestickSeriesRef.current && data.length > 0) {
      const lastCandle = data[data.length - 1];
      candlestickSeriesRef.current.update({
        ...lastCandle,
        close: currentPrice,
      });
    }
  }, [currentPrice, data]);

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur rounded-lg p-3 border border-border">
        <div className="text-sm font-medium">{symbol}</div>
        {currentPrice && (
          <div className="text-2xl font-bold text-primary">
            ${currentPrice.toFixed(2)}
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
