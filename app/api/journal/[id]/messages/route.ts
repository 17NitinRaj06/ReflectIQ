// API: /api/journal/[id]/messages (GET and POST multi-turn reflection dialogue)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import {
  getJournalById,
  saveJournal,
  getJournalMessages,
  saveJournalMessage,
  getMemories,
} from '@/lib/server/firestore-db';
import {
  generateContentWithFallback,
  getSystemInstructionForMode,
  extractStructuredInsights,
} from '@/lib/server/gemini';
import {
  checkRateLimit,
  parseJsonSafely,
  sanitizeInputString,
  isValidId,
  errorResponse,
  rateLimitResponse,
} from '@/lib/server/security';
import { GeminiMode, JournalMessage } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid journal ID', 400);

    const messages = await getJournalMessages(auth.uid, id);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const rateCheck = checkRateLimit(auth.uid);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter);
    }

    const { id } = await params;
    if (!isValidId(id)) return errorResponse('Invalid journal ID', 400);

    let journal = await getJournalById(auth.uid, id);
    if (!journal) {
      // Auto-provision reflection session so dialogue is never blocked
      const now = new Date().toISOString();
      journal = await saveJournal(auth.uid, {
        id,
        uid: auth.uid,
        title: 'Active Reflection Session',
        content: '',
        createdAt: now,
        updatedAt: now,
        messagesCount: 0,
      });
    }

    const body = await parseJsonSafely(req);
    const rawContent = sanitizeInputString(body.content, 10000);
    const mode: GeminiMode = [
      'reflect',
      'brainstorm',
      'plan',
      'review',
      'problem_solve',
      'ask_journal',
    ].includes(body.mode)
      ? body.mode
      : 'reflect';

    if (!rawContent) {
      return errorResponse('Message content is required', 400);
    }

    const now = new Date().toISOString();
    const userMsgId = 'msg_' + Date.now().toString(36) + 'u';

    // 1. Save User Message
    const userMessage: JournalMessage = {
      id: userMsgId,
      journalId: id,
      role: 'user',
      content: rawContent,
      mode,
      createdAt: now,
    };
    await saveJournalMessage(auth.uid, id, userMessage);

    // 2. Fetch past approved memories as subtle context
    const allMemories = await getMemories(auth.uid);
    const approvedMemories = allMemories.filter((m) => m.status === 'approved');
    const memoryContext = approvedMemories
      .map((m) => `- [${m.category.toUpperCase()}]: ${m.content}`)
      .join('\n');

    // 3. Fetch past conversation turns for this journal (recent detail)
    const existingMessages = await getJournalMessages(auth.uid, id);
    const recentTurns = existingMessages.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 4. Construct prompt bounded with anti-prompt-injection delimiters
    const systemInstruction = getSystemInstructionForMode(mode, memoryContext);

    const contextualPrompt = `
PRIMARY JOURNAL WRITING SURFACE CONTEXT:
<journal_title>${journal.title}</journal_title>
<journal_entry_body>
${journal.content}
</journal_entry_body>

USER'S CURRENT REFLECTIVE INPUT:
<user_input>
${rawContent}
</user_input>

Respond thoughtfully adhering to the mode (${mode.toUpperCase()}) and the non-clinical guardrails. Remember: NO EMOJIS anywhere.
`;

    // 5. Invoke Gemini with fallback ladder
    const aiResponse = await generateContentWithFallback({
      contents: [
        ...recentTurns,
        {
          role: 'user',
          parts: [{ text: contextualPrompt }],
        },
      ],
      systemInstruction,
      config: {
        temperature: mode === 'brainstorm' ? 0.8 : 0.4,
      },
    });

    // 6. Extract structured suggestions in background (actions, memory candidates, goal updates)
    const structuredAnalysis = await extractStructuredInsights(
      `${rawContent}\n\nReflection Response:\n${aiResponse.text}`
    );

    const assistantMsgId = 'msg_' + Date.now().toString(36) + 'a';
    const assistantMessage: JournalMessage = {
      id: assistantMsgId,
      journalId: id,
      role: 'assistant',
      content: aiResponse.text,
      mode,
      createdAt: new Date().toISOString(),
      metadata: {
        proposedMemories: structuredAnalysis.proposedMemories,
        suggestedActions: structuredAnalysis.suggestedActions,
        suggestedGoalUpdate: structuredAnalysis.suggestedGoalUpdate,
        detectedPatternNotice: structuredAnalysis.detectedPatternNotice,
      },
    };

    // 7. Save Assistant Message
    await saveJournalMessage(auth.uid, id, assistantMessage);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      extracted: structuredAnalysis,
    });
  } catch (err: any) {
    console.error('Error handling journal message dialogue:', err);
    return errorResponse(err, 500);
  }
}
