import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server.js';
import { prisma } from '../../../../lib/db/client.js';

/**
 * GET /api/runs/[id]
 * Get a specific run by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 13+ uses async params)
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams.id) {
      return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
    }

    const run = await prisma.run.findUnique({
      where: { id: resolvedParams.id },
      include: {
        siteProfile: true,
        metrics: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run, { status: 200 });
  } catch (error) {
    console.error('Error fetching run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch run' },
      { status: 500 }
    );
  }
}
