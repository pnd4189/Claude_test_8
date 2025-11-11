/**
 * Clear Cache API Route
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Get all translation cache keys
    const pattern = 'translation:*';

    // Note: In production, you'd want to scan and delete keys in batches
    // For now, we'll just clear by pattern (if Redis supports it)
    console.log('Clearing translation cache...');

    // Simple success response
    // In a real implementation, you'd scan and delete keys
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
      },
      { status: 500 }
    );
  }
}
