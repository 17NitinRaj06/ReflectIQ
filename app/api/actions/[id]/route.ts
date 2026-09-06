// API: /api/actions/[id] (PATCH, DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getActions, saveAction, deleteAction } from '@/lib/server/firestore-db';
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
    if (!isValidId(id)) return errorResponse('Invalid action ID', 400);

    const actions = await getActions(auth.uid);
    const existing = actions.find((a) => a.id === id);
    if (!existing) return errorResponse('Action not found', 404);

    const body = await parseJsonSafely(req);
    const updated = await saveAction(auth.uid, {
      ...existing,
      title: body.title !== undefined ? sanitizeInputString(body.title, 300) : existing.title,
      status: ['suggested', 'accepted', 'completed', 'dismissed'].includes(body.status)
        ? body.status
        : existing.status,
      dueSuggestion:
        body.dueSuggestion !== undefined ? sanitizeInputString(body.dueSuggestion, 100) : existing.dueSuggestion,
    });

    return NextResponse.json({ action: updated });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update action', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid action ID', 400);

    await deleteAction(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete action', 500);
  }
}
