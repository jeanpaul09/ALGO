import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import { setupRoutes } from './routes';
import { WebSocketManager } from './services/websocket';
import { TradingOrchestrator } from './services/trading-orchestrator';
import { MarketStreamingService } from './services/market-streaming';
import { IntelligentAIEngine } from './services/intelligent-ai-engine';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function main() {
  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize WebSocket
  const wss = new WebSocketServer({ server });
  const wsManager = new WebSocketManager(wss);

  // Initialize Market Streaming
  const marketStreaming = new MarketStreamingService(wsManager);

  // Initialize Intelligent AI Engine with demo trading
  const aiEngine = new IntelligentAIEngine(wsManager);

  // Handle WebSocket subscriptions
  wsManager.onMessage('subscribe', (ws, data) => {
    const { channel, symbol, venue = 'hyperliquid' } = data;

    console.log(`📡 WebSocket subscription received:`, { channel, symbol, venue });

    if (channel === 'market') {
      console.log(`📊 Client subscribed to market data: ${venue}:${symbol}`);
      marketStreaming.startStreaming(venue, symbol, 1000); // 1 second updates
    } else if (channel === 'ai_signals') {
      console.log(`🧠 Client subscribed to AI signals: ${venue}:${symbol}`);
      console.log(`🤖 Starting intelligent analysis with demo trading...`);

      // Start analysis and catch errors
      aiEngine.startAnalysis(venue, symbol, 10000).catch((error: any) => {
        console.error('❌ Error starting AI analysis:', error);
        wsManager.broadcast({
          type: 'ai_signal',
          data: {
            type: 'risk',
            category: 'Error',
            title: 'AI Failed to Start',
            content: `Error: ${error.message}`,
            timestamp: Date.now(),
          }
        });
      });
    } else {
      console.log(`⚠️  Unknown channel subscription: ${channel}`);
    }
  });

  wsManager.onMessage('unsubscribe', (ws, data) => {
    const { channel, symbol, venue = 'hyperliquid' } = data;

    if (channel === 'market') {
      marketStreaming.stopStreaming(venue, symbol);
    } else if (channel === 'ai_signals') {
      aiEngine.stopAnalysis(venue, symbol);
    }
  });

  // Initialize Trading Orchestrator
  const orchestrator = new TradingOrchestrator(wsManager);
  await orchestrator.initialize();

  // Setup routes
  setupRoutes(app, orchestrator);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Debug endpoint to manually trigger AI analysis
  app.post('/debug/trigger-ai', async (req, res) => {
    try {
      console.log('🔧 Manual AI trigger requested');
      const { venue = 'hyperliquid', symbol = 'BTC' } = req.body;

      // Start analysis
      await aiEngine.startAnalysis(venue, symbol, 10000);

      res.json({
        success: true,
        message: `AI analysis started for ${venue}:${symbol}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error triggering AI:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 AI Trading Lab Backend running on port ${PORT}`);
    console.log(`📊 WebSocket server ready`);
    console.log(`🔒 Live trading: ${process.env.ENABLE_LIVE_TRADING === 'true' ? 'ENABLED' : 'DISABLED'}`);

    // Keep-alive ping to prevent Render spin-down (free tier workaround)
    if (process.env.NODE_ENV === 'production') {
      const keepAliveInterval = setInterval(() => {
        fetch(`http://localhost:${PORT}/health`)
          .then(() => console.log('⏰ Keep-alive ping successful'))
          .catch((err) => console.error('⚠️  Keep-alive ping failed:', err));
      }, 5 * 60 * 1000); // Ping every 5 minutes

      console.log('⏰ Keep-alive enabled (prevents Render spin-down)');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await orchestrator.shutdown();
    await prisma.$disconnect();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
