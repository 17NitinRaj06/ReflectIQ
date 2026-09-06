// API: /api/journal/[id] (GET, PUT/PATCH, DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { JournalEntry } from '@/types';
import {
  getJournalById,
  saveJournal,
  deleteJournal,
  saveVectorDocument,
} from '@/lib/server/firestore-db';
import { generateTextEmbedding, extractStructuredInsights } from '@/lib/server/gemini';
import {
  parseJsonSafely,
  sanitizeInputString,
  isValidId,
  errorResponse,
} from '@/lib/server/security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid journal ID', 400);

    const journal = await getJournalById(auth.uid, id);
    if (!journal) return errorResponse('Journal not found', 404);

    return NextResponse.json({ journal });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid journal ID', 400);

    const body = await parseJsonSafely(req);
    const existing = await getJournalById(auth.uid, id);
    const now = new Date().toISOString();

    const baseEntry: JournalEntry = existing || {
      id,
      uid: auth.uid,
      title: 'Untitled Reflection',
      content: '',
      createdAt: now,
      updatedAt: now,
      messagesCount: 0,
    };

    const newTitle = body.title !== undefined ? sanitizeInputString(body.title, 200) : baseEntry.title;
    const newContent = body.content !== undefined ? sanitizeInputString(body.content, 20000) : baseEntry.content;

    let embedding = baseEntry.embedding;
    let summary = baseEntry.summary;
    let themes = baseEntry.themes;

    if (newContent !== baseEntry.content || newTitle !== baseEntry.title) {
      const [newEmbed, structured] = await Promise.all([
        generateTextEmbedding(`${newTitle}\n${newContent}`),
        extractStructuredInsights(newContent),
      ]);
      embedding = newEmbed;
      summary = structured.summary;
      themes = structured.themes;

      if (newEmbed.length > 0) {
        await saveVectorDocument(auth.uid, {
          id: `vec_${id}`,
          uid: auth.uid,
          journalId: id,
          title: newTitle,
          date: baseEntry.createdAt.split('T')[0] || baseEntry.createdAt,
          textSnippet: newContent.slice(0, 400),
          embedding: newEmbed,
        });
      }
    }

    const updated = await saveJournal(auth.uid, {
      ...baseEntry,
      title: newTitle,
      content: newContent,
      summary,
      themes,
      embedding,
      updatedAt: now,
    });

    return NextResponse.json({ journal: updated });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update reflection', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid journal ID', 400);

    await deleteJournal(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete reflection', 500);
  }
}
