// Use JSON-based database for persistence without Prisma engine dependencies
// This provides real data storage that persists across restarts
import { jsonDb } from './json-db';

let prismaInstance: any;

try {
  const { PrismaClient } = require('@prisma/client');
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  console.log('✅ Using Prisma database');
} catch (error) {
  console.log('📦 Using JSON file database for persistence');
  prismaInstance = jsonDb;
}

export const prisma = prismaInstance;
