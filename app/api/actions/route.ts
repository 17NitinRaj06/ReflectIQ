// API: /api/actions (GET, POST)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getActions, saveAction } from '@/lib/server/firestore-db';
import {
  parseJsonSafely,
  sanitizeInputString,
  errorResponse,
} from '@/lib/server/security';
import { ActionItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const actions = await getActions(auth.uid);
    return NextResponse.json({ actions });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await parseJsonSafely(req);

    const title = sanitizeInputString(body.title, 300);
    const journalId = body.journalId ? sanitizeInputString(body.journalId, 64) : undefined;
    const dueSuggestion = body.dueSuggestion ? sanitizeInputString(body.dueSuggestion, 100) : undefined;
    const status = ['suggested', 'accepted', 'completed', 'dismissed'].includes(body.status)
      ? body.status
      : 'accepted';

    if (!title) return errorResponse('Action title is required', 400);

    const actionId = 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const action: ActionItem = {
      id: actionId,
      uid: auth.uid,
      journalId,
      title,
      status,
      dueSuggestion,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveAction(auth.uid, action);
    return NextResponse.json({ action: saved });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create action', 500);
  }
}
