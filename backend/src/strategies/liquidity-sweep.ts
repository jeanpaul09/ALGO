import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

type LiquidityZones = {
  zones: Array<{ level: number; type: 'high' | 'low'; strength: number }>;
  nearLiquidity: boolean;
  nearestLevel: number | null;
  distance: number;
};

/**
 * Liquidity Sweep Strategy
 * Detects stop-loss hunts and liquidity grabs by smart money
 */
export class LiquiditySweep extends BaseStrategy {
  constructor() {
    super(
      'Liquidity Sweep',
      'Institutional',
      'Identifies stop-loss hunts and liquidity sweeps for counter-trend entries'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    // Find obvious liquidity zones (recent highs/lows where stops sit)
    const liquidityZones = this.findLiquidityZones(priceHistory);

    // Detect sweep patterns (wick through level + immediate reversal)
    const sweep = this.detectSweep(priceHistory, liquidityZones, currentPrice);

    // Volume confirmation
    const volumeProfile = volumeHistory && volumeHistory.length >= 10
      ? this.analyzeVolume(volumeHistory)
      : { spike: false, ratio: 1 };

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Bullish liquidity sweep (swept lows, now reversing)
    if (
      sweep.type === 'bullish' &&
      sweep.reversed &&
      volumeProfile.spike
    ) {
      action = 'BUY';
      strength = Math.min(90, sweep.strength + 20);
      confidence = Math.min(85, 58 + strength * 0.27);
      reasoning = `Bullish liquidity sweep at $${sweep.level?.toFixed(2)}. Stop-loss hunt complete, ${(sweep.reversalStrength * 100).toFixed(0)}% reversal. Smart money accumulation`;
    }
    // Bearish liquidity sweep (swept highs, now reversing)
    else if (
      sweep.type === 'bearish' &&
      sweep.reversed &&
      volumeProfile.spike
    ) {
      action = 'SELL';
      strength = Math.min(90, sweep.strength + 20);
      confidence = Math.min(85, 58 + strength * 0.27);
      reasoning = `Bearish liquidity sweep at $${sweep.level?.toFixed(2)}. Stop-loss hunt complete, ${(sweep.reversalStrength * 100).toFixed(0)}% reversal. Smart money distribution`;
    }
    // Potential sweep setup (approaching liquidity)
    else if (liquidityZones.nearLiquidity && liquidityZones.distance < 1 && liquidityZones.nearestLevel !== null) {
      const direction = currentPrice < liquidityZones.nearestLevel ? 'down' : 'up';
      action = direction === 'down' ? 'BUY' : 'SELL';
      strength = Math.min(70, 55);
      confidence = Math.min(70, 56);
      reasoning = `Approaching liquidity zone at $${liquidityZones.nearestLevel.toFixed(2)}. Potential sweep setup. Wait for reversal`;
    }
    // Failed sweep (swept but no volume)
    else if (sweep.type !== 'none' && !sweep.reversed) {
      action = sweep.type === 'bullish' ? 'SELL' : 'BUY';
      strength = Math.min(60, 45);
      confidence = Math.min(65, 53);
      reasoning = `Failed liquidity sweep at $${sweep.level?.toFixed(2)}. No reversal. Genuine breakout likely`;
    }
    else {
      const nearest = liquidityZones.nearestLevel;
      reasoning = `No liquidity sweep detected. Nearest liquidity: ${nearest !== null ? '$' + nearest.toFixed(2) : 'N/A'}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        sweepType: sweep.type,
        sweepLevel: sweep.level,
        reversed: sweep.reversed,
        liquidityZones: liquidityZones.zones,
        volumeSpike: volumeProfile.spike,
      },
    };
  }

  private findLiquidityZones(prices: number[]): LiquidityZones {
    if (prices.length < 50) {
      return {
        zones: [],
        nearLiquidity: false,
        nearestLevel: null,
        distance: 100,
      };
    }

    const currentPrice = prices[prices.length - 1];
    const zones: { level: number; type: 'high' | 'low'; strength: number }[] = [];

    // Find recent highs and lows (where stops typically sit)
    const window = 10;
    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const price = prices[i];

      if (price === Math.max(...slice)) {
        zones.push({ level: price, type: 'high', strength: 70 });
      } else if (price === Math.min(...slice)) {
        zones.push({ level: price, type: 'low', strength: 70 });
      }
    }

    // Also add round numbers (psychological levels)
    const roundLevel = Math.round(currentPrice / 100) * 100;
    zones.push({ level: roundLevel, type: currentPrice > roundLevel ? 'low' : 'high', strength: 60 });

    // Find nearest zone
    let nearestLevel: number | null = null;
    let minDistance = 100;

    zones.forEach(zone => {
      const distance = Math.abs((currentPrice - zone.level) / zone.level) * 100;
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = zone.level;
      }
    });

    return {
      zones: zones.slice(-10), // Keep last 10 zones
      nearLiquidity: minDistance < 2,
      nearestLevel,
      distance: minDistance,
    };
  }

  private detectSweep(
    prices: number[],
    liquidityZones: LiquidityZones,
    currentPrice: number
  ) {
    if (prices.length < 10) {
      return { type: 'none' as const, level: null, reversed: false, strength: 0, reversalStrength: 0 };
    }

    const recentPrices = prices.slice(-10);
    const recentHigh = Math.max(...recentPrices);
    const recentLow = Math.min(...recentPrices);

    // Check if we recently swept a liquidity zone
    for (const zone of liquidityZones.zones) {
      // Bullish sweep: price went below liquidity low then reversed up
      if (zone.type === 'low') {
        const sweptBelow = recentLow < zone.level * 0.998; // Wicked below
        const reversedAbove = currentPrice > zone.level * 1.002; // Now above

        if (sweptBelow) {
          const reversalStrength = (currentPrice - recentLow) / recentLow;
          return {
            type: 'bullish' as const,
            level: zone.level,
            reversed: reversedAbove,
            strength: zone.strength,
            reversalStrength,
          };
        }
      }

      // Bearish sweep: price went above liquidity high then reversed down
      if (zone.type === 'high') {
        const sweptAbove = recentHigh > zone.level * 1.002; // Wicked above
        const reversedBelow = currentPrice < zone.level * 0.998; // Now below

        if (sweptAbove) {
          const reversalStrength = (recentHigh - currentPrice) / recentHigh;
          return {
            type: 'bearish' as const,
            level: zone.level,
            reversed: reversedBelow,
            strength: zone.strength,
            reversalStrength,
          };
        }
      }
    }

    return { type: 'none' as const, level: null, reversed: false, strength: 0, reversalStrength: 0 };
  }

  private analyzeVolume(volumes: number[]) {
    const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const currentVolume = volumes[volumes.length - 1];
    const ratio = currentVolume / avgVolume;

    return {
      spike: ratio > 1.5,
      ratio,
    };
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
