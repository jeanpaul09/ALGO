import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Volume Profile Strategy
 * Analyzes volume distribution at different price levels
 */
export class VolumeProfile extends BaseStrategy {
  constructor() {
    super(
      'Volume Profile',
      'Technical',
      'Uses volume distribution across price levels to identify high-volume nodes and value areas'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    if (!volumeHistory || volumeHistory.length < 50) {
      return this.holdSignal('Insufficient data for volume profile analysis');
    }

    // Build volume profile (volume at each price level)
    const profile = this.buildVolumeProfile(priceHistory, volumeHistory);

    // Find Point of Control (POC) - price level with highest volume
    const poc = profile.pointOfControl;

    // Identify Value Area (70% of volume)
    const valueArea = profile.valueArea;

    // Detect volume nodes
    const highVolumeNodes = profile.highVolumeNodes;
    const lowVolumeNodes = profile.lowVolumeNodes;

    // Current price position relative to profile
    const position = this.analyzePricePosition(currentPrice, poc, valueArea, highVolumeNodes, lowVolumeNodes);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Price below POC with low volume (likely to move up to POC)
    if (position.belowPOC && position.inLowVolumeNode && position.distanceToPOC > 1) {
      action = 'BUY';
      strength = Math.min(90, position.distanceToPOC * 20 + 40);
      confidence = Math.min(85, 55 + strength * 0.3);
      reasoning = `Price in low volume node below POC. ${position.distanceToPOC.toFixed(1)}% below POC at $${poc.toFixed(2)}. Likely to fill gap`;
    }
    // Price above POC with low volume (likely to move down to POC)
    else if (position.abovePOC && position.inLowVolumeNode && position.distanceToPOC > 1) {
      action = 'SELL';
      strength = Math.min(90, position.distanceToPOC * 20 + 40);
      confidence = Math.min(85, 55 + strength * 0.3);
      reasoning = `Price in low volume node above POC. ${position.distanceToPOC.toFixed(1)}% above POC at $${poc.toFixed(2)}. Likely to fill gap`;
    }
    // Price near high volume node at bottom of value area (support)
    else if (position.nearValueAreaLow && position.inHighVolumeNode) {
      action = 'BUY';
      strength = Math.min(80, 60);
      confidence = Math.min(80, 60 + strength * 0.25);
      reasoning = `Price at high volume support node. Value area low: $${valueArea.low.toFixed(2)}. Strong support zone`;
    }
    // Price near high volume node at top of value area (resistance)
    else if (position.nearValueAreaHigh && position.inHighVolumeNode) {
      action = 'SELL';
      strength = Math.min(80, 60);
      confidence = Math.min(80, 60 + strength * 0.25);
      reasoning = `Price at high volume resistance node. Value area high: $${valueArea.high.toFixed(2)}. Strong resistance zone`;
    }
    // Price breaking out of value area with volume
    else if (position.aboveValueArea && volumeHistory[volumeHistory.length - 1] > profile.avgVolume * 1.5) {
      action = 'BUY';
      strength = Math.min(75, 55);
      confidence = Math.min(75, 58);
      reasoning = `Breakout above value area ($${valueArea.high.toFixed(2)}) with volume. Continuation likely`;
    }
    else if (position.belowValueArea && volumeHistory[volumeHistory.length - 1] > profile.avgVolume * 1.5) {
      action = 'SELL';
      strength = Math.min(75, 55);
      confidence = Math.min(75, 58);
      reasoning = `Breakdown below value area ($${valueArea.low.toFixed(2)}) with volume. Continuation likely`;
    }
    else {
      reasoning = `Price in value area. POC: $${poc.toFixed(2)}, Value area: $${valueArea.low.toFixed(2)}-$${valueArea.high.toFixed(2)}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        pointOfControl: poc,
        valueAreaHigh: valueArea.high,
        valueAreaLow: valueArea.low,
        currentPricePosition: position,
      },
    };
  }

  private buildVolumeProfile(prices: number[], volumes: number[]) {
    // Simplified volume profile calculation
    const priceVolumePairs: { price: number; volume: number }[] = [];

    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      priceVolumePairs.push({ price: prices[i], volume: volumes[i] });
    }

    // Group by price levels (bucket into ranges)
    const bucketSize = 0.005; // 0.5% price buckets
    const buckets = new Map<number, number>();

    priceVolumePairs.forEach(({ price, volume }) => {
      const bucket = Math.floor(price / (price * bucketSize)) * (price * bucketSize);
      buckets.set(bucket, (buckets.get(bucket) || 0) + volume);
    });

    // Find POC (highest volume bucket)
    let maxVolume = 0;
    let poc = prices[prices.length - 1];

    buckets.forEach((volume, price) => {
      if (volume > maxVolume) {
        maxVolume = volume;
        poc = price;
      }
    });

    // Calculate value area (70% of total volume)
    const totalVolume = Array.from(buckets.values()).reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.7;

    const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);

    let accumulatedVolume = 0;
    let valueLow = Infinity;
    let valueHigh = 0;

    for (const [price, volume] of sortedBuckets) {
      accumulatedVolume += volume;
      if (price < valueLow) valueLow = price;
      if (price > valueHigh) valueHigh = price;

      if (accumulatedVolume >= targetVolume) break;
    }

    // Identify high and low volume nodes
    const avgVolume = totalVolume / buckets.size;
    const highVolumeNodes = Array.from(buckets.entries())
      .filter(([_, vol]) => vol > avgVolume * 1.5)
      .map(([price, _]) => price);

    const lowVolumeNodes = Array.from(buckets.entries())
      .filter(([_, vol]) => vol < avgVolume * 0.5)
      .map(([price, _]) => price);

    return {
      pointOfControl: poc,
      valueArea: { low: valueLow, high: valueHigh },
      highVolumeNodes,
      lowVolumeNodes,
      avgVolume,
    };
  }

  private analyzePricePosition(
    currentPrice: number,
    poc: number,
    valueArea: { low: number; high: number },
    highVolNodes: number[],
    lowVolNodes: number[]
  ) {
    const distanceToPOC = Math.abs((currentPrice - poc) / poc) * 100;
    const distanceToVALow = Math.abs((currentPrice - valueArea.low) / valueArea.low) * 100;
    const distanceToVAHigh = Math.abs((currentPrice - valueArea.high) / valueArea.high) * 100;

    const inHighVolumeNode = highVolNodes.some(node => Math.abs(currentPrice - node) / node < 0.01);
    const inLowVolumeNode = lowVolNodes.some(node => Math.abs(currentPrice - node) / node < 0.01);

    return {
      belowPOC: currentPrice < poc,
      abovePOC: currentPrice > poc,
      inValueArea: currentPrice >= valueArea.low && currentPrice <= valueArea.high,
      belowValueArea: currentPrice < valueArea.low,
      aboveValueArea: currentPrice > valueArea.high,
      nearValueAreaLow: distanceToVALow < 1,
      nearValueAreaHigh: distanceToVAHigh < 1,
      distanceToPOC,
      inHighVolumeNode,
      inLowVolumeNode,
    };
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
