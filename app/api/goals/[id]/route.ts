// API: /api/goals/[id] (PATCH, DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getGoals, saveGoal, deleteGoal } from '@/lib/server/firestore-db';
import {
  parseJsonSafely,
  sanitizeInputString,
  isValidId,
  errorResponse,
} from '@/lib/server/security';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid goal ID', 400);

    const goals = await getGoals(auth.uid);
    const existing = goals.find((g) => g.id === id);
    if (!existing) return errorResponse('Goal not found', 404);

    const body = await parseJsonSafely(req);
    const updated = await saveGoal(auth.uid, {
      ...existing,
      title: body.title !== undefined ? sanitizeInputString(body.title, 200) : existing.title,
      description: body.description !== undefined ? sanitizeInputString(body.description, 1000) : existing.description,
      status: ['active', 'completed', 'paused'].includes(body.status) ? body.status : existing.status,
      progress: body.progress !== undefined ? Math.min(100, Math.max(0, Number(body.progress))) : existing.progress,
      targetDate: body.targetDate !== undefined ? sanitizeInputString(body.targetDate, 50) : existing.targetDate,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ goal: updated });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update goal', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid goal ID', 400);

    await deleteGoal(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete goal', 500);
  }
}
