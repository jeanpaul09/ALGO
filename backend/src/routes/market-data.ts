import { Router } from 'express';
import { MarketDataService } from '../services/market-data';

export function marketDataRoutes() {
  const router = Router();
  const marketDataService = new MarketDataService();

  // Get current price
  router.get('/price/:venue/:symbol', async (req, res) => {
    try {
      const { venue, symbol } = req.params;
      const price = await marketDataService.getCurrentPrice(venue, symbol);
      res.json({ venue, symbol, price, timestamp: new Date() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch price' });
    }
  });

  // Get historical data
  router.get('/history/:venue/:symbol', async (req, res) => {
    try {
      const { venue, symbol } = req.params;
      const { startDate, endDate, interval } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const data = await marketDataService.getHistoricalData(
        venue,
        symbol,
        new Date(startDate as string),
        new Date(endDate as string),
        interval as string || '1h'
      );

      res.json({ venue, symbol, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch historical data' });
    }
  });

  // Get funding rate (for perps)
  router.get('/funding/:venue/:symbol', async (req, res) => {
    try {
      const { venue, symbol } = req.params;
      const fundingRate = await marketDataService.getFundingRate(venue, symbol);
      res.json({ venue, symbol, fundingRate, timestamp: new Date() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch funding rate' });
    }
  });

  return router;
}
