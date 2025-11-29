'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp, Maximize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeframeOption {
  label: string;
  value: string;
}

interface MinimizableControlsProps {
  symbol: string;
  currentPrice?: number;
  selectedTimeframe: string;
  timeframes: TimeframeOption[];
  onTimeframeChange: (timeframe: string) => void;
  onFullscreen?: () => void;
  isLive?: boolean;
}

export function MinimizableControls({
  symbol,
  currentPrice,
  selectedTimeframe,
  timeframes,
  onTimeframeChange,
  onFullscreen,
  isLive = false,
}: MinimizableControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-4">
      {/* Left: Symbol & Price - Always visible */}
      <div className="flex items-center gap-3 bg-background/95 backdrop-blur-xl rounded-xl p-3 border border-border/40 shadow-2xl">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Symbol</div>
          <div className="text-base font-bold tracking-tight">{symbol}</div>
        </div>
        {currentPrice && (
          <>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Last Price</div>
              <div className="text-base font-bold font-mono text-primary tabular-nums">
                ${currentPrice.toFixed(2)}
              </div>
            </div>
          </>
        )}
        {isLive && (
          <>
            <div className="h-8 w-px bg-border/60" />
            <div className="flex items-center gap-1.5 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Collapsible Controls */}
      <div className="bg-background/95 backdrop-blur-xl rounded-xl border border-border/40 shadow-2xl overflow-hidden transition-all duration-300">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {isExpanded ? 'Timeframes' : selectedTimeframe}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Expanded Controls */}
        {isExpanded && (
          <div className="border-t border-border/40 p-1.5">
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={selectedTimeframe === tf.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 text-xs font-medium transition-all',
                    selectedTimeframe === tf.value && 'shadow-md'
                  )}
                  onClick={() => onTimeframeChange(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}

              <div className="h-5 w-px bg-border/60 mx-1" />

              {onFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={onFullscreen}
                  title="Fullscreen"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
