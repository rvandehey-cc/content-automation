import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/client.js';

/**
 * GET /api/site-profiles/[id]/runs
 * Get runs for a specific site profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const where: any = { siteProfileId: id };
    if (status) {
      where.status = status;
    }

    const runs = await prisma.run.findMany({
      where,
      include: {
        metrics: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(runs, { status: 200 });
  } catch (error) {
    console.error('Error fetching runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}
