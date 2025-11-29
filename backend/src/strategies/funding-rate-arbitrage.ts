import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Funding Rate Arbitrage
 * Exploits funding rate imbalances in perpetual futures
 */
export class FundingRateArbitrage extends BaseStrategy {
  constructor() {
    super(
      'Funding Rate Arbitrage',
      'Derivatives',
      'Identifies opportunities from extreme funding rates in perpetual futures markets'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { fundingRate, openInterest, priceHistory } = context;

    // Get funding rate (simulated - would use real exchange APIs)
    const funding = fundingRate || this.estimateFundingRate(priceHistory, currentPrice);

    // Analyze open interest trends
    const oiTrend = this.analyzeOpenInterest(openInterest);

    // Detect extreme funding conditions
    const extremeFunding = this.detectExtremeFunding(funding);

    // Check price divergence from spot
    const basisSpread = this.calculateBasisSpread(currentPrice, priceHistory);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Extremely negative funding (shorts paying longs) + increasing OI
    if (
      extremeFunding.type === 'extremely_negative' &&
      oiTrend.increasing &&
      basisSpread < -0.5
    ) {
      action = 'BUY';
      strength = Math.min(90, Math.abs(funding * 1000) + oiTrend.changePercent * 10);
      confidence = Math.min(85, 60 + strength * 0.25);
      reasoning = `Extreme negative funding (${(funding * 100).toFixed(3)}%). Shorts paying ${Math.abs(funding * 365 * 100).toFixed(1)}% APR. OI up ${oiTrend.changePercent.toFixed(0)}%. Short squeeze risk high`;
    }
    // Extremely positive funding (longs paying shorts) + increasing OI
    else if (
      extremeFunding.type === 'extremely_positive' &&
      oiTrend.increasing &&
      basisSpread > 0.5
    ) {
      action = 'SELL';
      strength = Math.min(90, Math.abs(funding * 1000) + oiTrend.changePercent * 10);
      confidence = Math.min(85, 60 + strength * 0.25);
      reasoning = `Extreme positive funding (${(funding * 100).toFixed(3)}%). Longs paying ${(funding * 365 * 100).toFixed(1)}% APR. OI up ${oiTrend.changePercent.toFixed(0)}%. Long liquidation risk high`;
    }
    // High negative funding (contrarian long)
    else if (extremeFunding.type === 'negative' && Math.abs(funding) > 0.01) {
      action = 'BUY';
      strength = Math.min(75, Math.abs(funding * 800));
      confidence = Math.min(75, 58 + strength * 0.22);
      reasoning = `High negative funding (${(funding * 100).toFixed(3)}%). Market overly bearish. Mean reversion likely`;
    }
    // High positive funding (contrarian short)
    else if (extremeFunding.type === 'positive' && funding > 0.01) {
      action = 'SELL';
      strength = Math.min(75, funding * 800);
      confidence = Math.min(75, 58 + strength * 0.22);
      reasoning = `High positive funding (${(funding * 100).toFixed(3)}%). Market overly bullish. Mean reversion likely`;
    }
    // Funding reset opportunity (going from extreme to normal)
    else if (
      extremeFunding.type === 'neutral' &&
      extremeFunding.recentlyExtreme &&
      !oiTrend.increasing
    ) {
      action = extremeFunding.previousExtreme === 'positive' ? 'BUY' : 'SELL';
      strength = Math.min(65, 50);
      confidence = Math.min(68, 56);
      reasoning = `Funding normalizing from extreme. OI declining. Reversal from ${extremeFunding.previousExtreme} funding pressure`;
    }
    else {
      const annualizedRate = funding * 365 * 100;
      reasoning = `Funding rate: ${(funding * 100).toFixed(3)}% (${annualizedRate.toFixed(1)}% APR). Not extreme enough for signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        fundingRate: funding,
        annualizedFunding: funding * 365 * 100,
        fundingType: extremeFunding.type,
        openInterestTrend: oiTrend.increasing ? 'increasing' : 'decreasing',
        openInterestChange: oiTrend.changePercent,
        basisSpread,
      },
    };
  }

  private estimateFundingRate(prices: number[], currentPrice: number): number {
    // Simulate funding rate based on recent price momentum
    // In reality, would fetch from exchange API
    if (prices.length < 10) return 0;

    const momentum = (currentPrice - prices[prices.length - 8]) / prices[prices.length - 8];
    // Funding typically correlates with momentum
    // Positive momentum -> positive funding (longs pay shorts)
    return momentum * 0.1; // Simplified estimation
  }

  private analyzeOpenInterest(openInterest?: number[]) {
    if (!openInterest || openInterest.length < 10) {
      return { increasing: false, changePercent: 0 };
    }

    const recent = openInterest.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const previous = openInterest.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    const changePercent = ((recent - previous) / previous) * 100;

    return {
      increasing: changePercent > 5,
      changePercent,
    };
  }

  private detectExtremeFunding(funding: number) {
    const hourlyRate = Math.abs(funding);

    // Funding rates context:
    // Normal: 0.01% to -0.01% (3.65% to -3.65% APR)
    // High: > 0.03% or < -0.03% (>10% APR)
    // Extreme: > 0.1% or < -0.1% (>36% APR)

    let type: 'extremely_positive' | 'extremely_negative' | 'positive' | 'negative' | 'neutral' = 'neutral';

    if (funding > 0.1) {
      type = 'extremely_positive';
    } else if (funding < -0.1) {
      type = 'extremely_negative';
    } else if (funding > 0.03) {
      type = 'positive';
    } else if (funding < -0.03) {
      type = 'negative';
    }

    return {
      type,
      recentlyExtreme: hourlyRate > 0.05 && hourlyRate < 0.08, // Was extreme, normalizing
      previousExtreme: funding > 0 ? 'positive' as const : 'negative' as const,
    };
  }

  private calculateBasisSpread(futuresPrice: number, spotPrices: number[]): number {
    // Basis = (Futures - Spot) / Spot * 100
    // Positive basis: futures premium (contango)
    // Negative basis: futures discount (backwardation)

    if (spotPrices.length === 0) return 0;

    const spotPrice = spotPrices[spotPrices.length - 1];
    return ((futuresPrice - spotPrice) / spotPrice) * 100;
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
