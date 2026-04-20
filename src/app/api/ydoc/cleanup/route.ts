import { NextRequest, NextResponse } from 'next/server';
import { cleanupCorruptedSnapshots } from '@/lib/ydoc-persistence';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting bulk cleanup of corrupted Yjs snapshots...');
    const result = await cleanupCorruptedSnapshots();
    console.log(`[API] Cleaned ${result.cleaned} corrupted documents`);

    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      message: `Cleaned ${result.cleaned} corrupted documents`
    });
  } catch (error) {
    console.error('[API] Error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}