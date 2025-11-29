import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Sentiment Fusion Strategy
 * Combines market sentiment, Fear & Greed Index, and news sentiment
 */
export class SentimentFusion extends BaseStrategy {
  constructor() {
    super(
      'Sentiment Fusion',
      'Sentiment',
      'Analyzes market psychology using Fear & Greed Index, news sentiment, and crowd behavior'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { sentiment, fearGreedIndex, news, priceHistory } = context;

    // Default values if data not available
    const marketSentiment = sentiment || 0; // -100 to 100
    const fearGreed = fearGreedIndex || 50; // 0-100
    const newsAnalysis = this.analyzeNews(news || []);

    // Price momentum to confirm sentiment
    const priceMomentum = this.calculateMomentum(priceHistory, 10);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Extreme fear + positive news = contrarian buy
    if (fearGreed < 25 && newsAnalysis.score > 0 && priceMomentum < 0) {
      action = 'BUY';
      strength = Math.min(100, (25 - fearGreed) * 2 + newsAnalysis.score * 50);
      confidence = Math.min(85, 55 + strength * 0.25);
      reasoning = `Extreme fear (${fearGreed}) with ${newsAnalysis.positiveCount} positive news. Contrarian buy opportunity`;
    }
    // Extreme greed + negative news = contrarian sell
    else if (fearGreed > 75 && newsAnalysis.score < 0 && priceMomentum > 0) {
      action = 'SELL';
      strength = Math.min(100, (fearGreed - 75) * 2 + Math.abs(newsAnalysis.score) * 50);
      confidence = Math.min(85, 55 + strength * 0.25);
      reasoning = `Extreme greed (${fearGreed}) with ${newsAnalysis.negativeCount} negative news. Contrarian sell opportunity`;
    }
    // Bullish sentiment alignment
    else if (marketSentiment > 40 && fearGreed > 55 && newsAnalysis.score > 0.3) {
      action = 'BUY';
      strength = Math.min(80, marketSentiment + fearGreed / 2 + newsAnalysis.score * 30);
      confidence = Math.min(75, 50 + strength * 0.25);
      reasoning = `Bullish sentiment across all metrics. Fear & Greed: ${fearGreed}, positive news flow`;
    }
    // Bearish sentiment alignment
    else if (marketSentiment < -40 && fearGreed < 45 && newsAnalysis.score < -0.3) {
      action = 'SELL';
      strength = Math.min(80, Math.abs(marketSentiment) + (50 - fearGreed) / 2 + Math.abs(newsAnalysis.score) * 30);
      confidence = Math.min(75, 50 + strength * 0.25);
      reasoning = `Bearish sentiment across all metrics. Fear & Greed: ${fearGreed}, negative news flow`;
    }
    // Mixed signals
    else {
      reasoning = `Mixed sentiment. Fear & Greed: ${fearGreed}, Market sentiment: ${marketSentiment.toFixed(0)}, News: ${newsAnalysis.score > 0 ? 'positive' : 'negative'}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        fearGreedIndex: fearGreed,
        marketSentiment,
        newsScore: newsAnalysis.score,
        newsCount: newsAnalysis.totalCount,
      },
    };
  }

  private analyzeNews(news: Array<{ title: string; sentiment: number }>) {
    if (news.length === 0) {
      return { score: 0, positiveCount: 0, negativeCount: 0, totalCount: 0 };
    }

    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    news.forEach((item) => {
      score += item.sentiment;
      if (item.sentiment > 0) positiveCount++;
      if (item.sentiment < 0) negativeCount++;
    });

    return {
      score: score / news.length, // Average sentiment
      positiveCount,
      negativeCount,
      totalCount: news.length,
    };
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const oldPrice = prices[prices.length - period];
    const newPrice = prices[prices.length - 1];
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  protected getMinHistoryLength(): number {
    return 10;
  }
}
