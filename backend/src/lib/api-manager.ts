/**
 * API Configuration & Abstraction Layer
 * Allows easy switching between free and premium data sources
 */

export interface DataSourceConfig {
  name: string;
  type: 'free' | 'premium';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
}

export class APIManager {
  private sources: Map<string, DataSourceConfig> = new Map();

  constructor() {
    this.initializeSources();
  }

  private initializeSources() {
    // Market Data
    this.sources.set('coingecko', {
      name: 'CoinGecko',
      type: 'free',
      enabled: true,
      apiKey: process.env.COINGECKO_API_KEY || 'demo',
      baseUrl: 'https://api.coingecko.com/api/v3',
    });

    this.sources.set('binance', {
      name: 'Binance',
      type: 'free',
      enabled: !!process.env.BINANCE_API_KEY,
      apiKey: process.env.BINANCE_API_KEY,
      baseUrl: 'https://api.binance.com/api/v3',
    });

    // Sentiment (Free)
    this.sources.set('feargreed', {
      name: 'Fear & Greed Index',
      type: 'free',
      enabled: true,
      baseUrl: 'https://api.alternative.me/fng/',
    });

    this.sources.set('cryptopanic', {
      name: 'CryptoPanic News',
      type: 'free',
      enabled: true,
      apiKey: process.env.CRYPTOPANIC_API_KEY || 'free',
      baseUrl: 'https://cryptopanic.com/api/v1',
    });

    // Sentiment (Premium - Optional)
    this.sources.set('lunarcrush', {
      name: 'LunarCrush',
      type: 'premium',
      enabled: !!process.env.LUNARCRUSH_API_KEY,
      apiKey: process.env.LUNARCRUSH_API_KEY,
      baseUrl: 'https://api.lunarcrush.com/v2',
    });

    this.sources.set('santiment', {
      name: 'Santiment',
      type: 'premium',
      enabled: !!process.env.SANTIMENT_API_KEY,
      apiKey: process.env.SANTIMENT_API_KEY,
      baseUrl: 'https://api.santiment.net/graphql',
    });

    // AI
    this.sources.set('claude', {
      name: 'Claude AI',
      type: 'premium',
      enabled: !!process.env.ANTHROPIC_API_KEY,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Get data source configuration
   */
  getSource(name: string): DataSourceConfig | undefined {
    return this.sources.get(name);
  }

  /**
   * Check if premium features are available
   */
  hasPremium(category: 'sentiment' | 'onchain' | 'ai'): boolean {
    switch (category) {
      case 'sentiment':
        return this.sources.get('lunarcrush')?.enabled || this.sources.get('santiment')?.enabled || false;
      case 'onchain':
        return this.sources.get('santiment')?.enabled || false;
      case 'ai':
        return this.sources.get('claude')?.enabled || false;
      default:
        return false;
    }
  }

  /**
   * Get all enabled sources for a type
   */
  getEnabledSources(type?: 'free' | 'premium'): DataSourceConfig[] {
    return Array.from(this.sources.values()).filter(
      (source) => source.enabled && (!type || source.type === type)
    );
  }

  /**
   * Get feature availability summary
   */
  getFeatureAvailability() {
    return {
      marketData: {
        free: ['CoinGecko', 'Binance', 'Hyperliquid'],
        premium: [],
      },
      sentiment: {
        free: this.sources.get('feargreed')?.enabled ? ['Fear & Greed Index', 'CryptoPanic'] : [],
        premium: [
          ...(this.sources.get('lunarcrush')?.enabled ? ['LunarCrush'] : []),
          ...(this.sources.get('santiment')?.enabled ? ['Santiment'] : []),
        ],
      },
      ai: {
        enabled: this.sources.get('claude')?.enabled || false,
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      },
    };
  }
}

export const apiManager = new APIManager();
