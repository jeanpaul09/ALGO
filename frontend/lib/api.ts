import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Strategies
export const strategiesApi = {
  list: () => api.get('/strategies'),
  get: (id: string) => api.get(`/strategies/${id}`),
  create: (data: any) => api.post('/strategies', data),
};

// Backtests
export const backtestsApi = {
  list: (strategyId?: string) => api.get('/backtests', { params: { strategyId } }),
  get: (id: string) => api.get(`/backtests/${id}`),
  run: (data: any) => api.post('/backtests', data),
};

// Sessions
export const sessionsApi = {
  list: (includeHistory: boolean = false) => api.get('/sessions', { params: { history: includeHistory } }),
  get: (id: string) => api.get(`/sessions/${id}`),
  start: (data: any) => api.post('/sessions', data),
  stop: (id: string) => api.post(`/sessions/${id}/stop`),
  logs: (id: string, limit: number = 100) => api.get(`/sessions/${id}/logs`, { params: { limit } }),
};

// Market Data
export const marketDataApi = {
  price: (venue: string, symbol: string) => api.get(`/market-data/price/${venue}/${symbol}`),
  history: (venue: string, symbol: string, startDate: string, endDate: string, interval?: string) =>
    api.get(`/market-data/history/${venue}/${symbol}`, { params: { startDate, endDate, interval } }),
  funding: (venue: string, symbol: string) => api.get(`/market-data/funding/${venue}/${symbol}`),
};

// System
export const systemApi = {
  info: () => api.get('/system/info'),
};
