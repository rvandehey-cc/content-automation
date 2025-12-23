/**
 * @fileoverview Prisma database client singleton
 * @author Content Automation Team
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance
 * In development, use a global variable to prevent multiple instances
 */
const globalForPrisma = global;

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file.');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Disconnect Prisma client gracefully
 * Call this on application shutdown
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

/**
 * Connect to database and verify connection
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export default prisma;
