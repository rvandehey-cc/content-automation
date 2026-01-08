import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server.js';
import { exists } from '../../../../utils/filesystem.js';
import fs from 'fs-extra';
import config from '../../../../config/index.js';

/**
 * GET /api/downloads/csv
 * Download the WordPress CSV file
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvPath = config.resolvePath('output/wp-ready/wordpress-import.csv');
    
    if (!await exists(csvPath)) {
      return NextResponse.json(
        { error: 'CSV file not found' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(csvPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="wordpress-import.csv"',
      },
    });
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return NextResponse.json(
      { error: 'Failed to download CSV' },
      { status: 500 }
    );
  }
}

