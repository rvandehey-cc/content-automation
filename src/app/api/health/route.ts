import { NextResponse } from 'next/server';
import { connectDatabase, disconnectPrisma } from '../../../lib/db/client.js';

/**
 * Health check endpoint
 * Tests database connection
 */
export async function GET() {
  try {
    await connectDatabase();
    await disconnectPrisma();
    
    return NextResponse.json(
      { 
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
