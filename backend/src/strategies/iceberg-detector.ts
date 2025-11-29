import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Iceberg Order Detector
 * Identifies hidden large orders being executed incrementally
 */
export class IcebergDetector extends BaseStrategy {
  constructor() {
    super(
      'Iceberg Detector',
      'Institutional',
      'Detects hidden institutional orders through repeated fills at specific price levels'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory, orderbook } = context;

    if (!volumeHistory || volumeHistory.length < 30) {
      return this.holdSignal('Insufficient data for iceberg detection');
    }

    // Detect repeated large fills at same price level
    const icebergActivity = this.detectIcebergOrders(priceHistory, volumeHistory);

    // Analyze orderbook wall behavior
    const wallAnalysis = this.analyzeOrderbookWalls(orderbook, currentPrice);

    // Volume clustering at specific levels
    const clustering = this.detectVolumeClustering(priceHistory, volumeHistory);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Strong iceberg buy detected
    if (
      icebergActivity.type === 'buy' &&
      icebergActivity.strength > 70 &&
      wallAnalysis.bidWall
    ) {
      action = 'BUY';
      strength = Math.min(90, icebergActivity.strength + 15);
      confidence = Math.min(85, 60 + strength * 0.25);
      reasoning = `Iceberg buy order detected at $${icebergActivity.level?.toFixed(2)}. ${icebergActivity.fillCount} repeated fills, ${(icebergActivity.totalVolume / 1000).toFixed(0)}K volume. Large bid wall support. Institution accumulating`;
    }
    // Strong iceberg sell detected
    else if (
      icebergActivity.type === 'sell' &&
      icebergActivity.strength > 70 &&
      wallAnalysis.askWall
    ) {
      action = 'SELL';
      strength = Math.min(90, icebergActivity.strength + 15);
      confidence = Math.min(85, 60 + strength * 0.25);
      reasoning = `Iceberg sell order detected at $${icebergActivity.level?.toFixed(2)}. ${icebergActivity.fillCount} repeated fills, ${(icebergActivity.totalVolume / 1000).toFixed(0)}K volume. Large ask wall resistance. Institution distributing`;
    }
    // Volume clustering suggests hidden order
    else if (
      clustering.detected &&
      clustering.strength > 60
    ) {
      action = clustering.side === 'buy' ? 'BUY' : 'SELL';
      strength = Math.min(75, clustering.strength);
      confidence = Math.min(75, 58 + strength * 0.22);
      reasoning = `Volume clustering at $${clustering.level?.toFixed(2)}. ${clustering.percentage.toFixed(0)}% of volume at this level. Hidden ${clustering.side} order likely`;
    }
    // Orderbook wall appeared (potential iceberg)
    else if (
      (wallAnalysis.bidWall || wallAnalysis.askWall) &&
      wallAnalysis.size > wallAnalysis.averageSize * 5
    ) {
      action = wallAnalysis.bidWall ? 'BUY' : 'SELL';
      strength = Math.min(70, 55);
      confidence = Math.min(72, 58);
      reasoning = `Large ${wallAnalysis.bidWall ? 'bid' : 'ask'} wall at $${wallAnalysis.level?.toFixed(2)}. ${(wallAnalysis.size / wallAnalysis.averageSize).toFixed(1)}x average size. Potential iceberg support/resistance`;
    }
    // Iceberg completed (order filled, wall removed)
    else if (
      icebergActivity.type !== 'none' &&
      icebergActivity.completed
    ) {
      action = icebergActivity.type === 'buy' ? 'SELL' : 'BUY';
      strength = Math.min(65, 50);
      confidence = Math.min(68, 56);
      reasoning = `Iceberg ${icebergActivity.type} order completed at $${icebergActivity.level?.toFixed(2)}. Institution filled. Potential reversal`;
    }
    else {
      reasoning = `No significant iceberg activity detected. Volume clustering: ${clustering.percentage.toFixed(0)}%`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        icebergType: icebergActivity.type,
        icebergLevel: icebergActivity.level,
        fillCount: icebergActivity.fillCount,
        totalVolume: icebergActivity.totalVolume,
        orderbookWall: wallAnalysis.bidWall ? 'bid' : wallAnalysis.askWall ? 'ask' : 'none',
        clusteringDetected: clustering.detected,
      },
    };
  }

  private detectIcebergOrders(prices: number[], volumes: number[]): {
    type: 'buy' | 'sell' | 'none';
    level: number | null;
    fillCount: number;
    totalVolume: number;
    strength: number;
    completed: boolean;
  } {
    if (prices.length < 30 || volumes.length < 30) {
      return { type: 'none', level: null, fillCount: 0, totalVolume: 0, strength: 0, completed: false };
    }

    // Look for repeated large volumes at similar price levels
    const priceVolumeMap = new Map<number, { count: number; totalVolume: number; indices: number[] }>();

    const bucketSize = 0.001; // 0.1% price buckets

    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      const bucket = Math.floor(prices[i] / (prices[i] * bucketSize)) * (prices[i] * bucketSize);

      if (!priceVolumeMap.has(bucket)) {
        priceVolumeMap.set(bucket, { count: 0, totalVolume: 0, indices: [] });
      }

      const entry = priceVolumeMap.get(bucket)!;
      entry.count++;
      entry.totalVolume += volumes[i];
      entry.indices.push(i);
    }

    // Find bucket with most fills
    let maxFills = 0;
    let icebergLevel: number | null = null;
    let icebergData = { count: 0, totalVolume: 0, indices: [] as number[] };

    priceVolumeMap.forEach((data, price) => {
      if (data.count > maxFills && data.count >= 5) {
        maxFills = data.count;
        icebergLevel = price;
        icebergData = data;
      }
    });

    if (!icebergLevel || maxFills < 5) {
      return { type: 'none', level: null, fillCount: 0, totalVolume: 0, strength: 0, completed: false };
    }

    // Determine if buy or sell iceberg based on price action
    const avgPrice = icebergData.indices.reduce((sum, idx) => sum + prices[idx], 0) / icebergData.indices.length;
    const currentPrice = prices[prices.length - 1];

    const type: 'buy' | 'sell' = currentPrice > avgPrice ? 'sell' : 'buy';

    // Check if completed (no recent activity at this level)
    const recentIndices = icebergData.indices.filter(idx => idx > prices.length - 10);
    const completed = recentIndices.length === 0 && icebergData.count > 0;

    return {
      type,
      level: icebergLevel,
      fillCount: icebergData.count,
      totalVolume: icebergData.totalVolume,
      strength: Math.min(100, icebergData.count * 10 + (icebergData.totalVolume / 100)),
      completed,
    };
  }

  private analyzeOrderbookWalls(orderbook: any, currentPrice: number): {
    bidWall: boolean;
    askWall: boolean;
    level: number | null;
    size: number;
    averageSize: number;
  } {
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
      return { bidWall: false, askWall: false, level: null, size: 0, averageSize: 1 };
    }

    const bids = orderbook.bids as [number, number][]; // [price, size]
    const asks = orderbook.asks as [number, number][];

    // Calculate average order size
    const allSizes = [...bids.map(([_, size]) => size), ...asks.map(([_, size]) => size)];
    const averageSize = allSizes.reduce((a, b) => a + b, 0) / allSizes.length;

    // Find walls (orders significantly larger than average)
    const bidWalls = bids.filter(([_, size]) => size > averageSize * 5);
    const askWalls = asks.filter(([_, size]) => size > averageSize * 5);

    if (bidWalls.length > 0) {
      const [price, size] = bidWalls[0];
      return { bidWall: true, askWall: false, level: price, size, averageSize };
    }

    if (askWalls.length > 0) {
      const [price, size] = askWalls[0];
      return { bidWall: false, askWall: true, level: price, size, averageSize };
    }

    return { bidWall: false, askWall: false, level: null, size: 0, averageSize };
  }

  private detectVolumeClustering(prices: number[], volumes: number[]): {
    detected: boolean;
    level: number | null;
    percentage: number;
    strength: number;
    side: 'buy' | 'sell';
  } {
    if (prices.length < 20 || volumes.length < 20) {
      return { detected: false, level: null, percentage: 0, strength: 0, side: 'buy' };
    }

    const totalVolume = volumes.reduce((a, b) => a + b, 0);

    // Group volumes by price level
    const priceVolumeMap = new Map<number, number>();
    const bucketSize = 0.002; // 0.2% buckets

    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      const bucket = Math.floor(prices[i] / (prices[i] * bucketSize)) * (prices[i] * bucketSize);
      priceVolumeMap.set(bucket, (priceVolumeMap.get(bucket) || 0) + volumes[i]);
    }

    // Find level with highest volume concentration
    let maxVolume = 0;
    let maxLevel: number | null = null;

    priceVolumeMap.forEach((vol, price) => {
      if (vol > maxVolume) {
        maxVolume = vol;
        maxLevel = price;
      }
    });

    const percentage = (maxVolume / totalVolume) * 100;
    const detected = percentage > 15; // More than 15% of volume at one level

    const currentPrice = prices[prices.length - 1];
    const side: 'buy' | 'sell' = maxLevel && currentPrice < maxLevel ? 'sell' : 'buy';

    return {
      detected,
      level: maxLevel,
      percentage,
      strength: Math.min(100, percentage * 5),
      side,
    };
  }

  protected getMinHistoryLength(): number {
    return 30;
  }
}
