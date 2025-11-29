import { Router } from 'express';
import { TradingOrchestrator } from '../services/trading-orchestrator';

export function sessionRoutes(orchestrator: TradingOrchestrator) {
  const router = Router();

  // List all sessions
  router.get('/', async (req, res) => {
    try {
      const includeHistory = req.query.history === 'true';
      const sessions = await orchestrator.listSessions(includeHistory);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // Get session info
  router.get('/:id', async (req, res) => {
    try {
      const info = await orchestrator.getSessionInfo(req.params.id);
      if (!info) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(info);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch session info' });
    }
  });

  // Get session logs
  router.get('/:id/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await orchestrator.getSessionLogs(req.params.id, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch session logs' });
    }
  });

  // Start a new session
  router.post('/', async (req, res) => {
    try {
      const { strategyId, mode, venue, symbol, parameters } = req.body;

      if (!strategyId || !mode || !venue || !symbol) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (mode !== 'DEMO' && mode !== 'LIVE') {
        return res.status(400).json({ error: 'Invalid mode. Must be DEMO or LIVE' });
      }

      const sessionId = await orchestrator.startSession({
        strategyId,
        mode,
        venue,
        symbol,
        parameters,
      });

      res.status(201).json({
        id: sessionId,
        status: 'RUNNING',
        mode,
        message: `${mode} trading session started`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to start session' });
    }
  });

  // Stop a session
  router.post('/:id/stop', async (req, res) => {
    try {
      await orchestrator.stopSession(req.params.id);
      res.json({ message: 'Session stopped' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to stop session' });
    }
  });

  return router;
}
