import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server.js';
import { prisma } from '../../../lib/db/client.js';

/**
 * GET /api/metrics
 * Get aggregated metrics across all runs/users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed runs with metrics
    const completedRuns = await prisma.run.findMany({
      where: {
        status: 'completed',
        metrics: { isNot: null },
      },
      include: {
        metrics: true,
        siteProfile: true,
      },
    });

    // Aggregate metrics
    const totalRuns = completedRuns.length;
    const totalUrlsScraped = completedRuns.reduce(
      (sum, run) => sum + (run.metrics?.urlsScraped || 0),
      0
    );
    const totalPostsDetected = completedRuns.reduce(
      (sum, run) => sum + (run.metrics?.postsDetected || 0),
      0
    );
    const totalPagesDetected = completedRuns.reduce(
      (sum, run) => sum + (run.metrics?.pagesDetected || 0),
      0
    );
    const totalPagesProcessed = totalPostsDetected + totalPagesDetected;
    const totalTimeSavedMinutes = totalPagesProcessed * 15; // 15 minutes per page
    const totalTimeSavedHours = totalTimeSavedMinutes / 60;

    // Get unique sites scraped
    const uniqueSites = new Set(
      completedRuns
        .map((run) => run.siteProfile?.name || run.createdBy)
        .filter(Boolean)
    );

    // Get runs per user
    const runsPerUser = await prisma.run.groupBy({
      by: ['createdBy'],
      _count: { id: true },
      where: { status: 'completed' },
    });

    // Get sites per user
    const sitesPerUser = await prisma.run.findMany({
      where: { status: 'completed' },
      select: {
        createdBy: true,
        siteProfile: { select: { name: true } },
      },
      distinct: ['siteProfileId', 'createdBy'],
    });

    const sitesPerUserMap = new Map<string, Set<string>>();
    sitesPerUser.forEach((run) => {
      if (!sitesPerUserMap.has(run.createdBy)) {
        sitesPerUserMap.set(run.createdBy, new Set());
      }
      if (run.siteProfile?.name) {
        sitesPerUserMap.get(run.createdBy)!.add(run.siteProfile.name);
      }
    });

    const sitesPerUserData = Array.from(sitesPerUserMap.entries()).map(
      ([user, sites]) => ({
        user,
        siteCount: sites.size,
      })
    );

    return NextResponse.json(
      {
        totals: {
          runs: totalRuns,
          urlsScraped: totalUrlsScraped,
          postsDetected: totalPostsDetected,
          pagesDetected: totalPagesDetected,
          pagesProcessed: totalPagesProcessed,
          timeSavedMinutes: totalTimeSavedMinutes,
          timeSavedHours: parseFloat(totalTimeSavedHours.toFixed(2)),
          uniqueSites: uniqueSites.size,
        },
        perUser: {
          runs: runsPerUser.map((r) => ({
            user: r.createdBy,
            count: r._count.id,
          })),
          sites: sitesPerUserData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
