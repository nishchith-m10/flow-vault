/**
 * Backup history API
 * GET /api/backups/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllUserBackups } from '@/lib/database';

let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available
}
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflow_id');

    let backups = await getAllUserBackups(userId);

    // Filter by workflow_id if provided
    if (workflowId) {
      backups = backups.filter(b => b.workflow_id === workflowId);
    }

    return NextResponse.json({
      success: true,
      data: backups,
      count: backups.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
