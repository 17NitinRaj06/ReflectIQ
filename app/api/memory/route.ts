// API: /api/memory (GET, POST, DELETE all)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import {
  getMemories,
  saveMemory,
  clearAllMemories,
} from '@/lib/server/firestore-db';
import {
  parseJsonSafely,
  sanitizeInputString,
  errorResponse,
} from '@/lib/server/security';
import { MemoryItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const memories = await getMemories(auth.uid);
    return NextResponse.json({ memories });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await parseJsonSafely(req);

    const content = sanitizeInputString(body.content, 500);
    const category = ['goal', 'project', 'preference', 'challenge'].includes(body.category)
      ? body.category
      : 'preference';
    const status = ['pending', 'approved', 'dismissed'].includes(body.status)
      ? body.status
      : 'pending';
    const sourceJournalId = body.sourceJournalId ? sanitizeInputString(body.sourceJournalId, 64) : undefined;

    if (!content) return errorResponse('Memory content is required', 400);

    const memoryId = 'mem_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const memory: MemoryItem = {
      id: memoryId,
      uid: auth.uid,
      category,
      content,
      status,
      sourceJournalId,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveMemory(auth.uid, memory);
    return NextResponse.json({ memory: saved });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to record memory', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const url = new URL(req.url);
    if (url.searchParams.get('clearAll') === 'true') {
      await clearAllMemories(auth.uid);
      return NextResponse.json({ success: true, cleared: true });
    }
    return errorResponse('Specify clearAll=true to clear memory collection', 400);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to clear memories', 500);
  }
}
