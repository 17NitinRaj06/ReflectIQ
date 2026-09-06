// API: /api/journal (GET all journals, POST create new journal)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import {
  getJournals,
  saveJournal,
  saveVectorDocument,
} from '@/lib/server/firestore-db';
import {
  generateTextEmbedding,
  extractStructuredInsights,
} from '@/lib/server/gemini';
import {
  checkRateLimit,
  parseJsonSafely,
  sanitizeInputString,
  errorResponse,
  rateLimitResponse,
} from '@/lib/server/security';
import { JournalEntry } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const journals = await getJournals(auth.uid);
    return NextResponse.json({ journals });
  } catch (err: any) {
    return errorResponse(err.message || 'Authentication required', 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rateCheck = checkRateLimit(auth.uid);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter);
    }

    const body = await parseJsonSafely(req);
    const rawTitle = sanitizeInputString(body.title, 200);
    const rawContent = sanitizeInputString(body.content, 20000);

    if (!rawContent && !rawTitle) {
      return errorResponse('Content or title is required to create a reflection', 400);
    }

    const journalId = body.id && /^[a-zA-Z0-9_-]{4,64}$/.test(body.id)
      ? body.id
      : 'jrnl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const title = rawTitle || (rawContent.slice(0, 40) + '...').replace(/\n/g, ' ') || 'Untitled Reflection';
    const now = new Date().toISOString();

    // Parallelize embedding generation and structured insight extraction
    const [embedding, structured] = await Promise.all([
      rawContent ? generateTextEmbedding(`${title}\n${rawContent}`) : Promise.resolve([]),
      rawContent ? extractStructuredInsights(rawContent) : Promise.resolve({ summary: '', themes: ['reflection'] }),
    ]);

    const journal: JournalEntry = {
      id: journalId,
      uid: auth.uid,
      title,
      content: rawContent,
      summary: structured.summary,
      themes: structured.themes,
      embedding: embedding.length > 0 ? embedding : undefined,
      createdAt: now,
      updatedAt: now,
      messagesCount: 0,
    };

    const saved = await saveJournal(auth.uid, journal);

    // Save vector document for semantic search
    if (embedding.length > 0) {
      await saveVectorDocument(auth.uid, {
        id: `vec_${journalId}`,
        uid: auth.uid,
        journalId,
        title,
        date: now.split('T')[0] || now,
        textSnippet: rawContent.slice(0, 400),
        embedding,
      });
    }

    return NextResponse.json({
      journal: saved,
      extracted: structured,
    });
  } catch (err: any) {
    console.error('Error creating journal:', err);
    return errorResponse(err, 500);
  }
}
