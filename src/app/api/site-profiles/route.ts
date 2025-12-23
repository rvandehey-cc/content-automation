import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/client.js';

/**
 * GET /api/site-profiles
 * List all site profiles
 */
export async function GET() {
  try {
    const profiles = await prisma.siteProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(profiles, { status: 200 });
  } catch (error) {
    console.error('Error fetching site profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site profiles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/site-profiles
 * Create a new site profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, config, createdBy } = body;

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      );
    }

    const profile = await prisma.siteProfile.create({
      data: {
        name,
        description: description || null,
        config,
        createdBy: createdBy || null,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error creating site profile:', error);
    return NextResponse.json(
      { error: 'Failed to create site profile' },
      { status: 500 }
    );
  }
}
