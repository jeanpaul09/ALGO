// Temporary mock for Prisma until database is fully initialized
// This allows the server to start for demonstration
const mockPrisma: any = {
  strategy: {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    update: async (data: any) => ({ id: 'mock-id', ...data.data }),
  },
  backtest: {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    update: async (data: any) => ({ id: 'mock-id', ...data.data }),
  },
  session: {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    update: async (data: any) => ({ id: 'mock-id', ...data.data }),
    count: async () => 0,
  },
  position: {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    update: async (data: any) => ({ id: 'mock-id', ...data.data }),
    count: async () => 0,
  },
  trade: {
    findMany: async () => [],
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
  },
  sessionLog: {
    findMany: async () => [],
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
  },
  marketData: {
    findMany: async () => [],
    createMany: async () => ({ count: 0 }),
  },
  $disconnect: async () => {},
};

let prismaInstance: any;

try {
  const { PrismaClient } = require('@prisma/client');
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (error) {
  console.warn('⚠️  Prisma client not available, using mock database for demonstration');
  prismaInstance = mockPrisma;
}

export const prisma = prismaInstance;
