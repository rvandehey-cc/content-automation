import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server.js';
import { prisma } from '../../../../lib/db/client.js';

/**
 * GET /api/site-profiles/[id]
 * Get a single site profile by ID
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
    const { id } = resolvedParams;

    const profile = await prisma.siteProfile.findUnique({
      where: { id },
      include: {
        runs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Site profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error('Error fetching site profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/site-profiles/[id]
 * Update a site profile
 */
export async function PUT(
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
    const { id } = resolvedParams;
    const body = await request.json();
    const { name, dealerSlug, description, config } = body;

    // Check if profile exists
    const existing = await prisma.siteProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Site profile not found' },
        { status: 404 }
      );
    }

    const profile = await prisma.siteProfile.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dealerSlug !== undefined && { dealerSlug }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
      },
    });

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error('Error updating site profile:', error);
    return NextResponse.json(
      { error: 'Failed to update site profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/site-profiles/[id]
 * Delete a site profile
 */
export async function DELETE(
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
    const { id } = resolvedParams;

    // Check if profile exists
    const existing = await prisma.siteProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Site profile not found' },
        { status: 404 }
      );
    }

    await prisma.siteProfile.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Site profile deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting site profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete site profile' },
      { status: 500 }
    );
  }
}
