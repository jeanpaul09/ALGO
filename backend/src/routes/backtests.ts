import { Router } from 'express';
import { TradingOrchestrator } from '../services/trading-orchestrator';

export function backtestRoutes(orchestrator: TradingOrchestrator) {
  const router = Router();

  // List all backtests
  router.get('/', async (req, res) => {
    try {
      const strategyId = req.query.strategyId as string | undefined;
      const backtests = await orchestrator.listBacktests(strategyId);
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch backtests' });
    }
  });

  // Get a single backtest result
  router.get('/:id', async (req, res) => {
    try {
      const result = await orchestrator.getBacktestResult(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Backtest not found' });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch backtest result' });
    }
  });

  // Run a new backtest
  router.post('/', async (req, res) => {
    try {
      const { strategyId, symbol, venue, startDate, endDate, parameters } = req.body;

      if (!strategyId || !symbol || !venue || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const backtestId = await orchestrator.runBacktest({
        strategyId,
        symbol,
        venue,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        parameters,
      });

      res.status(202).json({
        id: backtestId,
        status: 'RUNNING',
        message: 'Backtest started',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to start backtest' });
    }
  });

  return router;
}
