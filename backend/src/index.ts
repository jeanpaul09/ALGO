import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import { setupRoutes } from './routes';
import { WebSocketManager } from './services/websocket';
import { TradingOrchestrator } from './services/trading-orchestrator';

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

  // Initialize Trading Orchestrator
  const orchestrator = new TradingOrchestrator(wsManager);
  await orchestrator.initialize();

  // Setup routes
  setupRoutes(app, orchestrator);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 AI Trading Lab Backend running on port ${PORT}`);
    console.log(`📊 WebSocket server ready`);
    console.log(`🔒 Live trading: ${process.env.ENABLE_LIVE_TRADING === 'true' ? 'ENABLED' : 'DISABLED'}`);
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
