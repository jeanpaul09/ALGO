import { Router } from 'express';
import { TradingOrchestrator } from '../services/trading-orchestrator';

export function strategyRoutes(orchestrator: TradingOrchestrator) {
  const router = Router();

  // List all strategies
  router.get('/', async (req, res) => {
    try {
      const strategies = await orchestrator.listStrategies();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategies' });
    }
  });

  // Get a single strategy
  router.get('/:id', async (req, res) => {
    try {
      const strategy = await orchestrator.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategy' });
    }
  });

  // Create a new strategy
  router.post('/', async (req, res) => {
    try {
      const { name, description, category, code, parameters, markets } = req.body;

      if (!name || !description || !category || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const strategy = await orchestrator.createStrategy({
        name,
        description,
        category,
        code,
        parameters: parameters || {},
        markets: markets || [],
      });

      res.status(201).json(strategy);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create strategy' });
    }
  });

  return router;
}
