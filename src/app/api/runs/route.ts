import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server.js';
import { prisma } from '../../../lib/db/client.js';
import { RunExecutor } from '../../../services/run-executor.js';

/**
 * GET /api/runs
 * List all runs (with optional filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const siteProfileId = searchParams.get('siteProfileId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (siteProfileId) where.siteProfileId = siteProfileId;

    const runs = await prisma.run.findMany({
      where,
      include: {
        siteProfile: true,
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

/**
 * POST /api/runs
 * Create and start a new automation run
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      siteProfileId,
      urls,
      contentType,
      bypassImages,
      blogPostSelectors,
      customRemoveSelectors,
      wordPressSettings,
      skipScraping,
      skipImageProcessing,
      skipContentProcessing,
      skipCSVGeneration,
    } = body;

    // Validate contentType
    if (!contentType || (contentType !== 'post' && contentType !== 'page')) {
      return NextResponse.json(
        { error: 'contentType is required and must be either "post" or "page"' },
        { status: 400 }
      );
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Get site profile if provided
    let siteProfile = null;
    if (siteProfileId) {
      siteProfile = await prisma.siteProfile.findUnique({
        where: { id: siteProfileId },
      });
    }

    // Create run record
    const run = await prisma.run.create({
      data: {
        siteProfileId: siteProfileId || null,
        status: 'pending',
        urls: urls,
        createdBy: user.email,
        configSnapshot: {
          contentType,
          bypassImages,
          blogPostSelectors,
          customRemoveSelectors,
          wordPressSettings,
          skipScraping,
          skipImageProcessing,
          skipContentProcessing,
          skipCSVGeneration,
        },
      },
    });

    // Start execution asynchronously (don't await to avoid blocking response)
    // Fire and forget - run will execute in background
    executeRun(run.id, {
      urls,
      siteProfile,
      contentType,
      bypassImages: bypassImages || false,
      blogPostSelectors: blogPostSelectors || null,
      customRemoveSelectors: customRemoveSelectors || [],
      wordPressSettings: wordPressSettings || {},
      skipScraping: skipScraping || false,
      skipImageProcessing: skipImageProcessing || false,
      skipContentProcessing: skipContentProcessing || false,
      skipCSVGeneration: skipCSVGeneration || false,
    }).catch(error => {
      console.error(`Run ${run.id} execution error:`, error);
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error('Error creating run:', error);
    return NextResponse.json(
      { error: 'Failed to create run' },
      { status: 500 }
    );
  }
}

/**
 * Execute run asynchronously
 * @private
 */
async function executeRun(runId, options) {
  const executor = new RunExecutor(runId);
  await executor.execute(options);
}
