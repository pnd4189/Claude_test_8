import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

function isAuthenticated(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return false;
  return match[1] === adminSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let cursor = 0;
    let deletedCount = 0;

    do {
      const result = await redis.scan(cursor, { match: 'translation:*', count: 100 });
      const resultArr = result as unknown as [number, string[]];
      const keys: string[] = resultArr[1] ?? [];

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }

      cursor = resultArr[0];
    } while (cursor !== 0);

    return NextResponse.json({
      success: true,
      message: `Cache cleared successfully. Deleted ${deletedCount} keys.`,
      deletedCount,
    });
  } catch (error) {
    logger.error('cache-clear', 'Error clearing cache', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
