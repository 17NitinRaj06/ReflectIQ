// API: /api/insights/patterns/[id] (Acknowledge or Dismiss pattern)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getInsights, saveInsight } from '@/lib/server/firestore-db';
import { parseJsonSafely, isValidId, errorResponse } from '@/lib/server/security';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid pattern ID', 400);

    const body = await parseJsonSafely(req);
    const status = body.status;
    if (!['acknowledged', 'dismissed', 'detected'].includes(status)) {
      return errorResponse('Invalid status value', 400);
    }

    const insights = await getInsights(auth.uid);
    const pattern = insights.find((p) => p.id === id);
    if (!pattern) return errorResponse('Insight pattern not found', 404);

    const updated = await saveInsight(auth.uid, {
      ...pattern,
      status,
    });

    return NextResponse.json({ pattern: updated });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update pattern', 500);
  }
}
