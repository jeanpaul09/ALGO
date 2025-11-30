import { MarketDataService } from './market-data';
import { WebSocketManager } from './websocket';
import { DemoTradingEngine } from './demo-trading-engine';
import Anthropic from '@anthropic-ai/sdk';

interface MarketAnalysis {
  price: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatility: number;
  support: number[];
  resistance: number[];
  rsi?: number;
  macd?: { value: number; signal: number };
}

export class IntelligentAIEngine {
  private marketData: MarketDataService;
  private wsManager: WebSocketManager;
  private demoTrading: DemoTradingEngine;
  private anthropic: Anthropic | null = null;
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private lastAction: Map<string, 'BUY' | 'SELL' | 'HOLD'> = new Map();
  private cooldown: Map<string, number> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.marketData = new MarketDataService();
    this.demoTrading = new DemoTradingEngine(wsManager);

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('🧠 Intelligent AI Engine initialized with Claude');
    } else {
      console.log('⚠️  No Claude API key - using basic strategies only');
    }

    console.log('✅ Demo Trading Engine ready with $10,000 balance');
  }

  async startAnalysis(venue: string, symbol: string, intervalMs: number = 10000) {
    const key = `${venue}:${symbol}`;

    if (this.analysisIntervals.has(key)) {
      console.log(`Already analyzing ${key}`);
      return;
    }

    console.log(`🔍 Starting intelligent analysis for ${symbol}`);

    // Run immediately
    await this.analyzeAndTrade(venue, symbol);

    // Then set interval
    const interval = setInterval(async () => {
      await this.analyzeAndTrade(venue, symbol);
    }, intervalMs);

    this.analysisIntervals.set(key, interval);
  }

  stopAnalysis(venue: string, symbol: string) {
    const key = `${venue}:${symbol}`;
    const interval = this.analysisIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.analysisIntervals.delete(key);
      this.priceHistory.delete(key);
      console.log(`Stopped analysis for ${key}`);
    }
  }

  private async analyzeAndTrade(venue: string, symbol: string) {
    try {
      const key = `${venue}:${symbol}`;

      // Get current price
      const currentPrice = await this.marketData.getCurrentPrice(venue, symbol);

      // Update price history
      if (!this.priceHistory.has(key)) {
        this.priceHistory.set(key, []);
      }
      const history = this.priceHistory.get(key)!;
      history.push(currentPrice);
      if (history.length > 200) history.shift();

      // Need at least 10 candles for basic analysis
      if (history.length < 10) {
        console.log(`📊 Building price history... (${history.length}/10)`);
        this.wsManager.broadcast({
          type: 'ai_signal',
          data: {
            type: 'analysis',
            category: 'System',
            title: 'Building Price History',
            content: `Collecting market data... (${history.length}/10 candles)`,
            symbol,
            timestamp: Date.now(),
          }
        });
        return;
      }

      // Update open positions
      await this.demoTrading.updatePositions(symbol, currentPrice);

      // Perform market analysis
      const analysis = this.analyzeMarket(history, currentPrice);

      // Get AI trading decision
      const decision = await this.makeIntelligentDecision(
        symbol,
        currentPrice,
        analysis,
        history
      );

      // Broadcast analysis to frontend
      this.broadcastAnalysis(symbol, currentPrice, analysis, decision);

      // Broadcast AI decision
      console.log(`🤖 AI Decision for ${symbol}: ${decision.action} (Confidence: ${decision.confidence}%)`);
      this.wsManager.broadcast({
        type: 'ai_signal',
        data: {
          type: 'decision',
          category: 'AI Decision',
          title: `AI: ${decision.action} ${symbol}`,
          content: decision.reasoning,
          sentiment: decision.action === 'BUY' ? 'bullish' : decision.action === 'SELL' ? 'bearish' : 'neutral',
          confidence: decision.confidence,
          symbol,
          timestamp: Date.now(),
        }
      });

      // Execute trade if decision is BUY or SELL
      if (decision.action !== 'HOLD') {
        console.log(`💰 Executing ${decision.action} trade for ${symbol} at $${currentPrice}`);
        await this.executeTrade(symbol, currentPrice, decision, analysis);
      }

    } catch (error) {
      console.error(`Error in analysis for ${venue}:${symbol}:`, error);
    }
  }

  private analyzeMarket(history: number[], currentPrice: number): MarketAnalysis {
    // Calculate support and resistance
    const recent = history.slice(-100);
    const sorted = [...recent].sort((a, b) => a - b);
    const support = [
      sorted[Math.floor(sorted.length * 0.25)],
      sorted[Math.floor(sorted.length * 0.1)],
    ];
    const resistance = [
      sorted[Math.floor(sorted.length * 0.75)],
      sorted[Math.floor(sorted.length * 0.9)],
    ];

    // Calculate RSI
    const rsi = this.calculateRSI(history.slice(-14));

    // Calculate trend
    const sma20 = this.calculateSMA(history, 20);
    const sma50 = this.calculateSMA(history, 50);
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    if (currentPrice > sma20 && sma20 > sma50) {
      trend = 'BULLISH';
    } else if (currentPrice < sma20 && sma20 < sma50) {
      trend = 'BEARISH';
    }

    // Calculate volatility (standard deviation)
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recent.length;
    const volatility = Math.sqrt(variance) / mean;

    return {
      price: currentPrice,
      trend,
      volatility,
      support,
      resistance,
      rsi,
    };
  }

  private async makeIntelligentDecision(
    symbol: string,
    currentPrice: number,
    analysis: MarketAnalysis,
    history: number[]
  ): Promise<{
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
    signals: {
      takeProfit: number;
      stopLoss: number;
      target: number;
    };
  }> {
    const key = `hyperliquid:${symbol}`;

    // Check cooldown (prevent overtrading)
    const lastTradeTime = this.cooldown.get(key) || 0;
    if (Date.now() - lastTradeTime < 60000) { // 1 minute cooldown
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'Cooling down after recent trade',
        signals: { takeProfit: 0, stopLoss: 0, target: 0 },
      };
    }

    // Check if we already have open positions
    const openPositions = this.demoTrading.getOpenPositions();
    const hasPosition = openPositions.some(p => p.symbol === symbol);

    if (hasPosition) {
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'Position already open - managing existing trade',
        signals: { takeProfit: 0, stopLoss: 0, target: 0 },
      };
    }

    // Use Claude AI for intelligent decision if available
    if (this.anthropic) {
      return await this.claudeDecision(symbol, currentPrice, analysis, history);
    }

    // Fallback to rule-based strategy
    return this.ruleBasedDecision(currentPrice, analysis);
  }

  private async claudeDecision(
    symbol: string,
    currentPrice: number,
    analysis: MarketAnalysis,
    history: number[]
  ): Promise<any> {
    try {
      const recent5 = history.slice(-5);
      const recent20 = history.slice(-20);

      const prompt = `You are an expert crypto trader analyzing ${symbol} at $${currentPrice.toFixed(2)}.

MARKET DATA:
- Current Price: $${currentPrice.toFixed(2)}
- Trend: ${analysis.trend}
- RSI: ${analysis.rsi?.toFixed(2) || 'N/A'}
- Support Levels: ${analysis.support.map(s => '$' + s.toFixed(2)).join(', ')}
- Resistance Levels: ${analysis.resistance.map(r => '$' + r.toFixed(2)).join(', ')}
- Volatility: ${(analysis.volatility * 100).toFixed(2)}%
- Recent 5 prices: ${recent5.map(p => '$' + p.toFixed(2)).join(', ')}
- 20-period average: $${recent20.reduce((a,b) => a+b, 0) / recent20.length}

RISK MANAGEMENT RULES:
- Take Profit: 2-3% for low volatility, 3-5% for high volatility
- Stop Loss: 1-1.5% maximum risk
- Only trade if confidence > 70%

Analyze this data and make a trading decision. Consider:
1. Is this a high-probability setup?
2. Risk/reward ratio (minimum 2:1)
3. Market structure and momentum
4. Entry timing

Respond in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "takeProfit": price_number,
  "stopLoss": price_number,
  "target": price_number
}`;

      if (!this.anthropic) {
        throw new Error('Claude AI not initialized');
      }

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        // Parse JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const decision = JSON.parse(jsonMatch[0]);
          return {
            action: decision.action,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            signals: {
              takeProfit: decision.takeProfit,
              stopLoss: decision.stopLoss,
              target: decision.target,
            },
          };
        }
      }
    } catch (error) {
      console.error('Claude decision error:', error);
    }

    // Fallback
    return this.ruleBasedDecision(currentPrice, analysis);
  }

  private ruleBasedDecision(currentPrice: number, analysis: MarketAnalysis): any {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reasoning = '';

    // RSI-based signals
    if (analysis.rsi && analysis.rsi < 30 && analysis.trend !== 'BEARISH') {
      action = 'BUY';
      confidence = 75;
      reasoning = 'Oversold RSI + Neutral/Bullish trend';
    } else if (analysis.rsi && analysis.rsi > 70 && analysis.trend !== 'BULLISH') {
      action = 'SELL';
      confidence = 75;
      reasoning = 'Overbought RSI + Neutral/Bearish trend';
    }

    // Calculate TP/SL
    const riskPercent = 0.015; // 1.5%
    const rewardPercent = 0.03; // 3% (2:1 R/R)

    const stopLoss = action === 'BUY'
      ? currentPrice * (1 - riskPercent)
      : currentPrice * (1 + riskPercent);

    const takeProfit = action === 'BUY'
      ? currentPrice * (1 + rewardPercent)
      : currentPrice * (1 - rewardPercent);

    const target = action === 'BUY'
      ? analysis.resistance[0]
      : analysis.support[0];

    return {
      action,
      confidence,
      reasoning: reasoning || 'Waiting for clear setup',
      signals: {
        takeProfit,
        stopLoss,
        target,
      },
    };
  }

  private async executeTrade(
    symbol: string,
    currentPrice: number,
    decision: any,
    analysis: MarketAnalysis
  ) {
    const key = `hyperliquid:${symbol}`;

    // Execute via demo trading engine
    const result = await this.demoTrading.executeTrade(
      symbol,
      decision.action,
      currentPrice,
      decision.confidence,
      decision.reasoning,
      decision.signals
    );

    if (result.success) {
      // Update cooldown
      this.cooldown.set(key, Date.now());
      this.lastAction.set(key, decision.action);

      console.log(`✅ Trade executed: ${decision.action} ${symbol} @ $${currentPrice.toFixed(2)}`);
      console.log(`   Confidence: ${decision.confidence}% | Reasoning: ${decision.reasoning}`);
    } else {
      console.log(`❌ Trade failed: ${result.error}`);
    }
  }

  private broadcastAnalysis(
    symbol: string,
    currentPrice: number,
    analysis: MarketAnalysis,
    decision: any
  ) {
    this.wsManager.broadcast({
      type: 'ai_signal',
      data: {
        symbol,
        type: 'analysis',
        title: `Market Analysis: ${analysis.trend}`,
        content: `Price: $${currentPrice.toFixed(2)} | RSI: ${analysis.rsi?.toFixed(0) || 'N/A'} | ${decision.reasoning}`,
        sentiment: analysis.trend === 'BULLISH' ? 'bullish' : analysis.trend === 'BEARISH' ? 'bearish' : 'neutral',
        confidence: decision.confidence,
        category: 'Market',
        timestamp: Date.now(),
      },
    });

    // Broadcast trading stats
    const stats = this.demoTrading.getStats();
    this.wsManager.broadcast({
      type: 'trading_stats',
      data: stats,
    });
  }

  // Technical indicators
  private calculateSMA(data: number[], period: number): number {
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }

  private calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period) return undefined;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  getStats() {
    return this.demoTrading.getStats();
  }
}
