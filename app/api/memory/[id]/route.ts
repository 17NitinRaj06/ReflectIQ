// API: /api/memory/[id] (PATCH, DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getMemories, saveMemory, deleteMemory } from '@/lib/server/firestore-db';
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
    if (!isValidId(id)) return errorResponse('Invalid memory ID', 400);

    const memories = await getMemories(auth.uid);
    const existing = memories.find((m) => m.id === id);
    if (!existing) return errorResponse('Memory not found', 404);

    const body = await parseJsonSafely(req);
    const updated = await saveMemory(auth.uid, {
      ...existing,
      content: body.content !== undefined ? sanitizeInputString(body.content, 500) : existing.content,
      status: ['pending', 'approved', 'dismissed'].includes(body.status)
        ? body.status
        : existing.status,
      category: ['goal', 'project', 'preference', 'challenge'].includes(body.category)
        ? body.category
        : existing.category,
    });

    return NextResponse.json({ memory: updated });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update memory', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid memory ID', 400);

    await deleteMemory(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete memory', 500);
  }
}
