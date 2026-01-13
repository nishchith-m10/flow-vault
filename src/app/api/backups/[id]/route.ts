/**
 * Individual backup details API
 * GET /api/backups/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackupById } from '@/lib/database';

let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available
}
import { handleApiError, NotFoundError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const backup = await getBackupById(resolvedParams.id);

    // Verify backup belongs to user
    if (backup.clerk_user_id !== userId) {
      throw new NotFoundError('Backup');
    }

    return NextResponse.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
