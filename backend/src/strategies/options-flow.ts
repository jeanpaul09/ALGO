import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Options Flow Strategy
 * Tracks large options trades to predict directional moves
 */
export class OptionsFlow extends BaseStrategy {
  constructor() {
    super(
      'Options Flow',
      'Derivatives',
      'Analyzes large options trades and positioning for directional bias and volatility expectations'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { optionsData, priceHistory } = context;

    if (!optionsData) {
      return this.holdSignal('No options data available');
    }

    // Analyze large options trades (unusual activity)
    const unusualActivity = this.detectUnusualActivity(optionsData);

    // Calculate put/call ratio
    const putCallRatio = this.calculatePutCallRatio(optionsData);

    // Analyze options positioning (max pain, gamma exposure)
    const positioning = this.analyzePositioning(optionsData, currentPrice);

    // Implied volatility analysis
    const ivAnalysis = this.analyzeIV(optionsData);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Large call buying (bullish)
    if (
      unusualActivity.type === 'calls' &&
      unusualActivity.sentiment === 'bullish' &&
      putCallRatio.value < 0.7
    ) {
      action = 'BUY';
      strength = Math.min(88, unusualActivity.size / 100000 + (1 - putCallRatio.value) * 40);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Large call buying detected. ${(unusualActivity.size / 1000).toFixed(0)}K contracts, strike $${unusualActivity.strike}. P/C ratio ${putCallRatio.value.toFixed(2)}. Bullish positioning`;
    }
    // Large put buying (bearish)
    else if (
      unusualActivity.type === 'puts' &&
      unusualActivity.sentiment === 'bearish' &&
      putCallRatio.value > 1.3
    ) {
      action = 'SELL';
      strength = Math.min(88, unusualActivity.size / 100000 + (putCallRatio.value - 1) * 40);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Large put buying detected. ${(unusualActivity.size / 1000).toFixed(0)}K contracts, strike $${unusualActivity.strike}. P/C ratio ${putCallRatio.value.toFixed(2)}. Bearish positioning`;
    }
    // Price approaching max pain (gravitational pull)
    else if (
      positioning.maxPain &&
      positioning.distanceToMaxPain > 2 &&
      positioning.distanceToMaxPain < 5
    ) {
      action = currentPrice > positioning.maxPain ? 'SELL' : 'BUY';
      strength = Math.min(75, (5 - positioning.distanceToMaxPain) * 15);
      confidence = Math.min(75, 56 + strength * 0.22);
      reasoning = `Price ${positioning.distanceToMaxPain.toFixed(1)}% from max pain ($${positioning.maxPain.toFixed(0)}). Options dealers hedging will push toward max pain`;
    }
    // Extreme gamma exposure (volatility expected)
    else if (
      positioning.gamma === 'high' &&
      ivAnalysis.increasing
    ) {
      // Direction based on gamma positioning
      action = positioning.gammaDirection === 'positive' ? 'BUY' : 'SELL';
      strength = Math.min(80, 60);
      confidence = Math.min(78, 60);
      reasoning = `High gamma exposure with rising IV. ${positioning.gammaDirection} gamma. Expect ${positioning.gammaDirection === 'positive' ? 'upward' : 'downward'} volatility expansion`;
    }
    // IV crush expected (options sellers winning)
    else if (
      ivAnalysis.elevated &&
      unusualActivity.type === 'selling' &&
      unusualActivity.size > 50000
    ) {
      action = 'HOLD';
      reasoning = `Large options selling. IV at ${ivAnalysis.currentIV.toFixed(0)}%. IV crush expected. Range-bound likely`;
    }
    // Contrarian put/call extreme
    else if (putCallRatio.extreme === 'high') {
      action = 'BUY'; // Extreme fear, contrarian long
      strength = Math.min(70, (putCallRatio.value - 1.5) * 30);
      confidence = Math.min(72, 56 + strength * 0.2);
      reasoning = `Extreme P/C ratio (${putCallRatio.value.toFixed(2)}). Market overly bearish. Contrarian buy signal`;
    }
    else if (putCallRatio.extreme === 'low') {
      action = 'SELL'; // Extreme greed, contrarian short
      strength = Math.min(70, (1 - putCallRatio.value) * 30);
      confidence = Math.min(72, 56 + strength * 0.2);
      reasoning = `Extreme P/C ratio (${putCallRatio.value.toFixed(2)}). Market overly bullish. Contrarian sell signal`;
    }
    else {
      reasoning = `P/C ratio: ${putCallRatio.value.toFixed(2)}, IV: ${ivAnalysis.currentIV.toFixed(0)}%. No strong options signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        unusualActivity: unusualActivity.type,
        putCallRatio: putCallRatio.value,
        maxPain: positioning.maxPain,
        impliedVolatility: ivAnalysis.currentIV,
        gammaExposure: positioning.gamma,
      },
    };
  }

  private detectUnusualActivity(optionsData: any): {
    type: 'calls' | 'puts' | 'selling' | 'none';
    sentiment: 'bullish' | 'bearish' | 'neutral';
    size: number;
    strike: number;
  } {
    // Simulated - would use real options flow data
    const randomType = Math.random();
    const size = Math.floor(Math.random() * 200000);

    if (randomType < 0.25) {
      return { type: 'calls', sentiment: 'bullish', size, strike: 45000 };
    } else if (randomType < 0.5) {
      return { type: 'puts', sentiment: 'bearish', size, strike: 38000 };
    } else if (randomType < 0.75) {
      return { type: 'selling', sentiment: 'neutral', size, strike: 42000 };
    }

    return { type: 'none', sentiment: 'neutral', size: 0, strike: 0 };
  }

  private calculatePutCallRatio(optionsData: any): {
    value: number;
    extreme: 'high' | 'low' | 'normal';
  } {
    // Simulated - would calculate from real options data
    const ratio = 0.5 + Math.random() * 2; // 0.5 to 2.5

    let extreme: 'high' | 'low' | 'normal' = 'normal';
    if (ratio > 2) extreme = 'high'; // Too many puts = bearish extreme
    if (ratio < 0.6) extreme = 'low'; // Too many calls = bullish extreme

    return { value: ratio, extreme };
  }

  private analyzePositioning(optionsData: any, currentPrice: number): {
    maxPain: number | null;
    distanceToMaxPain: number;
    gamma: 'high' | 'low' | 'neutral';
    gammaDirection: 'positive' | 'negative';
  } {
    // Simulated max pain calculation
    const maxPain = currentPrice * (0.95 + Math.random() * 0.1); // Within 5% of current
    const distanceToMaxPain = Math.abs((currentPrice - maxPain) / maxPain) * 100;

    // Simulated gamma analysis
    const gamma: 'high' | 'low' | 'neutral' = Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'neutral' : 'low';
    const gammaDirection: 'positive' | 'negative' = Math.random() > 0.5 ? 'positive' : 'negative';

    return {
      maxPain,
      distanceToMaxPain,
      gamma,
      gammaDirection,
    };
  }

  private analyzeIV(optionsData: any): {
    currentIV: number;
    historical: number;
    increasing: boolean;
    elevated: boolean;
  } {
    // Simulated IV analysis
    const currentIV = 40 + Math.random() * 80; // 40-120%
    const historical = 50 + Math.random() * 40; // 50-90%

    return {
      currentIV,
      historical,
      increasing: currentIV > historical * 1.1,
      elevated: currentIV > 80,
    };
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
