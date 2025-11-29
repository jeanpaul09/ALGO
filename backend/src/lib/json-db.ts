import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(__dirname, '../../data/db.json');

interface Database {
  strategies: any[];
  backtests: any[];
  sessions: any[];
  positions: any[];
  trades: any[];
  sessionLogs: any[];
  marketData: any[];
}

class JsonDatabase {
  private data: Database;
  private dbPath: string;

  constructor(dbPath: string = DB_PATH) {
    this.dbPath = dbPath;
    this.data = this.load();
  }

  private load(): Database {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load database, creating new one');
    }

    return {
      strategies: [],
      backtests: [],
      sessions: [],
      positions: [],
      trades: [],
      sessionLogs: [],
      marketData: [],
    };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  // Strategy operations
  strategy = {
    findMany: async (filter?: any) => {
      return this.data.strategies;
    },
    findUnique: async (params: any) => {
      return this.data.strategies.find(s => s.id === params.where.id) || null;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, createdAt: new Date(), updatedAt: new Date() };
      this.data.strategies.push(item);
      this.save();
      return item;
    },
    update: async (params: any) => {
      const index = this.data.strategies.findIndex(s => s.id === params.where.id);
      if (index !== -1) {
        this.data.strategies[index] = { ...this.data.strategies[index], ...params.data, updatedAt: new Date() };
        this.save();
        return this.data.strategies[index];
      }
      return null;
    },
  };

  // Backtest operations
  backtest = {
    findMany: async (params?: any) => {
      let results = this.data.backtests;
      if (params?.where?.strategyId) {
        results = results.filter(b => b.strategyId === params.where.strategyId);
      }
      if (params?.include?.strategy) {
        results = results.map(b => ({
          ...b,
          strategy: this.data.strategies.find(s => s.id === b.strategyId),
        }));
      }
      return results;
    },
    findUnique: async (params: any) => {
      const backtest = this.data.backtests.find(b => b.id === params.where.id);
      if (!backtest) return null;
      if (params?.include?.strategy) {
        return {
          ...backtest,
          strategy: this.data.strategies.find(s => s.id === backtest.strategyId),
        };
      }
      return backtest;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, createdAt: new Date() };
      this.data.backtests.push(item);
      this.save();
      return item;
    },
    update: async (params: any) => {
      const index = this.data.backtests.findIndex(b => b.id === params.where.id);
      if (index !== -1) {
        this.data.backtests[index] = { ...this.data.backtests[index], ...params.data };
        this.save();
        return this.data.backtests[index];
      }
      return null;
    },
  };

  // Session operations
  session = {
    findMany: async (params?: any) => {
      let results = this.data.sessions;
      if (params?.where?.status?.in) {
        results = results.filter(s => params.where.status.in.includes(s.status));
      }
      if (params?.include?.strategy) {
        results = results.map(s => ({
          ...s,
          strategy: this.data.strategies.find(st => st.id === s.strategyId),
        }));
      }
      return results;
    },
    findUnique: async (params: any) => {
      const session = this.data.sessions.find(s => s.id === params.where.id);
      if (!session) return null;

      let result: any = { ...session };

      if (params?.include) {
        if (params.include.strategy) {
          result.strategy = this.data.strategies.find(st => st.id === session.strategyId);
        }
        if (params.include.positions) {
          result.positions = this.data.positions.filter(
            p => p.sessionId === session.id && (!params.include.positions.where || p.status === params.include.positions.where.status)
          );
        }
        if (params.include.trades) {
          result.trades = this.data.trades.filter(t => t.sessionId === session.id);
        }
      }

      return result;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, startedAt: new Date() };
      this.data.sessions.push(item);
      this.save();
      return item;
    },
    update: async (params: any) => {
      const index = this.data.sessions.findIndex(s => s.id === params.where.id);
      if (index !== -1) {
        this.data.sessions[index] = { ...this.data.sessions[index], ...params.data };
        this.save();
        return this.data.sessions[index];
      }
      return null;
    },
    count: async (params?: any) => {
      let results = this.data.sessions;
      if (params?.where?.sessionId) {
        results = results.filter(s => s.sessionId === params.where.sessionId);
      }
      if (params?.where?.status) {
        results = results.filter(s => s.status === params.where.status);
      }
      return results.length;
    },
  };

  // Position operations
  position = {
    findMany: async (params?: any) => {
      let results = this.data.positions;
      if (params?.where?.sessionId) {
        results = results.filter(p => p.sessionId === params.where.sessionId);
      }
      if (params?.where?.status) {
        results = results.filter(p => p.status === params.where.status);
      }
      return results;
    },
    findFirst: async (params?: any) => {
      let results = this.data.positions;
      if (params?.where?.sessionId) {
        results = results.filter(p => p.sessionId === params.where.sessionId);
      }
      if (params?.where?.status) {
        results = results.filter(p => p.status === params.where.status);
      }
      return results[0] || null;
    },
    findUnique: async (params: any) => {
      return this.data.positions.find(p => p.id === params.where.id) || null;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, openedAt: new Date(), updatedAt: new Date() };
      this.data.positions.push(item);
      this.save();
      return item;
    },
    update: async (params: any) => {
      const index = this.data.positions.findIndex(p => p.id === params.where.id);
      if (index !== -1) {
        this.data.positions[index] = { ...this.data.positions[index], ...params.data, updatedAt: new Date() };
        this.save();
        return this.data.positions[index];
      }
      return null;
    },
    count: async (params?: any) => {
      let results = this.data.positions;
      if (params?.where?.sessionId) {
        results = results.filter(p => p.sessionId === params.where.sessionId);
      }
      if (params?.where?.status) {
        results = results.filter(p => p.status === params.where.status);
      }
      return results.length;
    },
  };

  // Trade operations
  trade = {
    findMany: async (params?: any) => {
      let results = this.data.trades;
      if (params?.where?.sessionId) {
        results = results.filter(t => t.sessionId === params.where.sessionId);
      }
      if (params?.where?.executedAt?.gte) {
        results = results.filter(t => new Date(t.executedAt) >= new Date(params.where.executedAt.gte));
      }
      return results;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, executedAt: new Date() };
      this.data.trades.push(item);
      this.save();
      return item;
    },
  };

  // SessionLog operations
  sessionLog = {
    findMany: async (params?: any) => {
      let results = this.data.sessionLogs;
      if (params?.where?.sessionId) {
        results = results.filter(l => l.sessionId === params.where.sessionId);
      }
      if (params?.take) {
        results = results.slice(-params.take);
      }
      return results;
    },
    create: async (params: any) => {
      const item = { id: uuidv4(), ...params.data, timestamp: new Date() };
      this.data.sessionLogs.push(item);
      this.save();
      return item;
    },
  };

  // MarketData operations
  marketData = {
    findMany: async (params?: any) => {
      let results = this.data.marketData;
      if (params?.where) {
        if (params.where.venue) results = results.filter(m => m.venue === params.where.venue);
        if (params.where.symbol) results = results.filter(m => m.symbol === params.where.symbol);
        if (params.where.timestamp?.gte) {
          results = results.filter(m => new Date(m.timestamp) >= new Date(params.where.timestamp.gte));
        }
        if (params.where.timestamp?.lte) {
          results = results.filter(m => new Date(m.timestamp) <= new Date(params.where.timestamp.lte));
        }
      }
      return results;
    },
    createMany: async (params: any) => {
      const items = params.data.map((d: any) => ({ id: uuidv4(), ...d }));
      this.data.marketData.push(...items);
      this.save();
      return { count: items.length };
    },
  };

  $disconnect = async () => {
    this.save();
  };
}

export const jsonDb = new JsonDatabase();
