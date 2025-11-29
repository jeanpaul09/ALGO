import { MarketDataService } from './market-data';
import { WebSocketManager } from './websocket';
import { StrategyArsenal } from '../strategies/strategy-arsenal';
import { StrategyContext } from '../strategies/base-strategy';
import Anthropic from '@anthropic-ai/sdk';

export interface AISignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  indicators: {
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  zones?: {
    type: 'support' | 'resistance' | 'liquidity';
    price: number;
    strength: number;
  }[];
  sentiment?: {
    overall: 'bullish' | 'bearish' | 'neutral';
    score: number;
    sources: string[];
  };
}

export class AIAnalysisEngine {
  private marketData: MarketDataService;
  private wsManager: WebSocketManager;
  private strategyArsenal: StrategyArsenal;
  private anthropic: Anthropic | null = null;
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.marketData = new MarketDataService();
    this.strategyArsenal = new StrategyArsenal();

    // Initialize Claude AI if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✓ Claude AI initialized for natural language reasoning');
    } else {
      console.log('⚠ Claude AI not initialized (no API key). Using strategy reasoning only.');
    }

    console.log('✓ AI Analysis Engine initialized with Strategy Arsenal');
  }

  /**
   * Start AI analysis for a symbol
   */
  async startAnalysis(venue: string, symbol: string, intervalMs: number = 5000) {
    const key = `${venue}:${symbol}`;

    if (this.analysisIntervals.has(key)) {
      console.log(`Already analyzing ${key}`);
      return;
    }

    console.log(`Starting AI analysis for ${key}`);

    // Run analysis immediately
    await this.runAnalysis(venue, symbol);

    // Then set up interval
    const interval = setInterval(async () => {
      await this.runAnalysis(venue, symbol);
    }, intervalMs);

    this.analysisIntervals.set(key, interval);
  }

  /**
   * Stop AI analysis for a symbol
   */
  stopAnalysis(venue: string, symbol: string) {
    const key = `${venue}:${symbol}`;
    const interval = this.analysisIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.analysisIntervals.delete(key);
      this.priceHistory.delete(key);
      console.log(`Stopped AI analysis for ${key}`);
    }
  }

  /**
   * Run comprehensive AI analysis using Strategy Arsenal
   */
  private async runAnalysis(venue: string, symbol: string) {
    try {
      const key = `${venue}:${symbol}`;

      // Fetch current price
      const currentPrice = await this.marketData.getCurrentPrice(venue, symbol);

      // Update price history
      if (!this.priceHistory.has(key)) {
        this.priceHistory.set(key, []);
      }
      const history = this.priceHistory.get(key)!;
      history.push(currentPrice);
      if (history.length > 200) {
        history.shift(); // Keep last 200 prices
      }

      // Update volume history (simulated for now)
      if (!this.volumeHistory.has(key)) {
        this.volumeHistory.set(key, []);
      }
      const volumeHist = this.volumeHistory.get(key)!;
      const estimatedVolume = Math.random() * 100000 + 50000; // Would fetch real volume
      volumeHist.push(estimatedVolume);
      if (volumeHist.length > 200) {
        volumeHist.shift();
      }

      // Build strategy context
      const context: StrategyContext = {
        priceHistory: history,
        volumeHistory: volumeHist,
        // Add more context as needed
      };

      // Run all strategies through the arsenal
      const strategySignals = await this.strategyArsenal.analyzeAll(currentPrice, context);

      // Get ensemble decision
      const ensemble = this.strategyArsenal.getEnsembleDecision(strategySignals);

      // Generate Claude AI natural language synthesis
      let claudeInsight: string | null = null;
      if (this.anthropic && ensemble.action !== 'HOLD') {
        try {
          claudeInsight = await this.generateClaudeInsight(
            symbol,
            currentPrice,
            ensemble,
            Array.from(strategySignals.entries())
          );
        } catch (error) {
          console.error('Claude AI synthesis failed:', error);
        }
      }

      // Format for broadcast (convert to AISignal format)
      const signal: AISignal = {
        action: ensemble.action,
        confidence: ensemble.confidence,
        reasoning: claudeInsight ? [claudeInsight, ...ensemble.reasoning.slice(0, 3)] : ensemble.reasoning,
        indicators: ensemble.strategyBreakdown.map(s => ({
          name: s.name,
          value: s.strength,
          signal: s.action === 'BUY' ? 'bullish' as const : s.action === 'SELL' ? 'bearish' as const : 'neutral' as const,
        })),
      };

      // Broadcast AI signal with strategy breakdown
      this.wsManager.broadcast({
        type: 'ai_signal',
        data: {
          symbol,
          venue,
          signal,
          strategySignals: Array.from(strategySignals.entries()).map(([name, sig]) => ({
            name,
            action: sig.action,
            confidence: sig.confidence,
            strength: sig.strength,
            reasoning: sig.reasoning,
          })),
          ensemble: {
            action: ensemble.action,
            confidence: ensemble.confidence,
            activeStrategies: ensemble.strategyBreakdown.filter(s => s.action !== 'HOLD').length,
            totalStrategies: ensemble.strategyBreakdown.length,
          },
          timestamp: Date.now(),
        },
      });

    } catch (error) {
      console.error(`Error running AI analysis for ${venue}:${symbol}:`, error);
    }
  }

  /**
   * Generate natural language insight using Claude AI
   */
  private async generateClaudeInsight(
    symbol: string,
    currentPrice: number,
    ensemble: any,
    strategySignals: Array<[string, any]>
  ): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude AI not initialized');
    }

    // Prepare strategy summary for Claude
    const activeStrategies = strategySignals
      .filter(([_, sig]) => sig.action !== 'HOLD')
      .map(([name, sig]) => `${name} (${sig.action}, ${sig.confidence}% confidence): ${sig.reasoning}`)
      .join('\n');

    const prompt = `You are an expert institutional crypto trader analyzing ${symbol} at $${currentPrice.toFixed(2)}.

${strategySignals.length} trading strategies have been analyzed:
${activeStrategies || 'All strategies recommend HOLD'}

Ensemble Decision: ${ensemble.action} with ${ensemble.confidence}% confidence

Synthesize this into a single, concise professional insight (2-3 sentences max). Focus on:
1. The strongest signals driving the decision
2. Key risk factors or confirmations
3. Actionable takeaway

Be direct and professional. No fluff.`;

    try {
      const message = await this.anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }

      return ensemble.reasoning[0] || 'Analysis in progress...';
    } catch (error) {
      console.error('Claude API error:', error);
      return ensemble.reasoning[0] || 'Analysis in progress...';
    }
  }
}
