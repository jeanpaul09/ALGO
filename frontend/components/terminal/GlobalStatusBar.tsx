'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Power,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  Shield,
  Zap,
  Brain
} from 'lucide-react';

type AIMode = 'OFF' | 'DEMO' | 'LIVE';

interface GlobalStatusBarProps {
  aiMode: AIMode;
  onModeChange: (mode: AIMode) => void;
  onEmergencyStop: () => void;
  totalPnL: number;
  accountBalance: number;
  walletAddress?: string;
  isConnected: boolean;
  environment: 'testnet' | 'mainnet';
}

export function GlobalStatusBar({
  aiMode,
  onModeChange,
  onEmergencyStop,
  totalPnL,
  accountBalance,
  walletAddress,
  isConnected,
  environment
}: GlobalStatusBarProps) {
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  const handleEmergencyStop = () => {
    if (showEmergencyConfirm) {
      onEmergencyStop();
      setShowEmergencyConfirm(false);
    } else {
      setShowEmergencyConfirm(true);
      setTimeout(() => setShowEmergencyConfirm(false), 3000);
    }
  };

  const getModeColor = (mode: AIMode) => {
    switch (mode) {
      case 'OFF': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'DEMO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LIVE': return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const getEnvColor = (env: 'testnet' | 'mainnet') => {
    return env === 'testnet'
      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand & AI Status */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold">AI Trading Lab</h1>
                <p className="text-xs text-muted-foreground">Terminal v1.0</p>
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* AI Mode Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">AI Mode:</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={aiMode === 'OFF' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => onModeChange('OFF')}
                >
                  <Power className="h-3 w-3 mr-1" />
                  OFF
                </Button>
                <Button
                  size="sm"
                  variant={aiMode === 'DEMO' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => onModeChange('DEMO')}
                >
                  <Activity className="h-3 w-3 mr-1" />
                  DEMO
                </Button>
                <Button
                  size="sm"
                  variant={aiMode === 'LIVE' ? 'destructive' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => onModeChange('LIVE')}
                  disabled={environment === 'testnet'}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Button>
              </div>
              <Badge
                className={`${getModeColor(aiMode)} border font-mono text-xs`}
                variant="outline"
              >
                {aiMode}
              </Badge>
            </div>
          </div>

          {/* Center: Performance Metrics */}
          <div className="flex items-center gap-6">
            {/* PnL */}
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                totalPnL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total PnL</div>
                <div className={`text-sm font-bold ${
                  totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDC
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* Account Balance */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="text-sm font-bold">{accountBalance.toFixed(2)} USDC</div>
              </div>
            </div>
          </div>

          {/* Right: Connection Status & Controls */}
          <div className="flex items-center gap-4">
            {/* Environment Badge */}
            <Badge
              className={`${getEnvColor(environment)} border font-mono text-xs`}
              variant="outline"
            >
              {environment.toUpperCase()}
            </Badge>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Wallet Address */}
            {walletAddress && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border/50">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}

            {/* Emergency Stop */}
            <Button
              size="sm"
              variant={showEmergencyConfirm ? 'destructive' : 'outline'}
              className={`h-8 px-4 text-xs font-bold ${
                showEmergencyConfirm ? 'animate-pulse' : ''
              }`}
              onClick={handleEmergencyStop}
            >
              <AlertTriangle className="h-3 w-3 mr-2" />
              {showEmergencyConfirm ? 'CONFIRM STOP' : 'EMERGENCY STOP'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
