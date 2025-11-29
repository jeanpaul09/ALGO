// Use JSON-based database for persistence without Prisma engine dependencies
// This provides real data storage that persists across restarts
import { jsonDb } from './json-db';

let prismaInstance: any;

// Use JSON database in production (Render free tier has read-only filesystem)
// or when DATABASE_URL points to a file
const useJsonDb = process.env.NODE_ENV === 'production' ||
                  process.env.DATABASE_URL?.startsWith('file:');

if (useJsonDb) {
  console.log('📦 Using JSON file database for persistence');
  prismaInstance = jsonDb;
} else {
  try {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    console.log('✅ Using Prisma database');
  } catch (error) {
    console.log('📦 Using JSON file database for persistence (fallback)');
    prismaInstance = jsonDb;
  }
}

export const prisma = prismaInstance;
