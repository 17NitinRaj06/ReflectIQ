// API: /api/goals (GET, POST)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getGoals, saveGoal } from '@/lib/server/firestore-db';
import {
  parseJsonSafely,
  sanitizeInputString,
  errorResponse,
} from '@/lib/server/security';
import { Goal } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const goals = await getGoals(auth.uid);
    return NextResponse.json({ goals });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await parseJsonSafely(req);

    const title = sanitizeInputString(body.title, 200);
    const description = sanitizeInputString(body.description, 1000);
    const progress = Math.min(100, Math.max(0, Number(body.progress) || 0));
    const targetDate = body.targetDate ? sanitizeInputString(body.targetDate, 50) : undefined;
    const sourceJournalId = body.sourceJournalId ? sanitizeInputString(body.sourceJournalId, 64) : undefined;

    if (!title) return errorResponse('Goal title is required', 400);

    const goalId = 'goal_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const goal: Goal = {
      id: goalId,
      uid: auth.uid,
      title,
      description,
      status: 'active',
      targetDate,
      progress,
      createdAt: now,
      updatedAt: now,
      sourceJournalId,
    };

    const saved = await saveGoal(auth.uid, goal);
    return NextResponse.json({ goal: saved });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create goal', 500);
  }
}
