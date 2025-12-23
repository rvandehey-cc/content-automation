/**
 * @fileoverview Test database connection utility
 * @author Content Automation Team
 */

import { prisma, connectDatabase, disconnectPrisma } from './client.js';

/**
 * Test database connection
 * @returns {Promise<void>}
 */
async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    await connectDatabase();
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection test successful:', result);
    
    await disconnectPrisma();
    console.log('✅ Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

testConnection();
