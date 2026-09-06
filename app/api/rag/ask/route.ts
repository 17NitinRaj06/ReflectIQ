// API: /api/rag/ask ("Ask My Journal" Grounded Semantic Search & Retrieval)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getVectorDocuments } from '@/lib/server/firestore-db';
import {
  generateTextEmbedding,
  computeCosineSimilarity,
  generateContentWithFallback,
  getSystemInstructionForMode,
} from '@/lib/server/gemini';
import {
  checkRateLimit,
  parseJsonSafely,
  sanitizeInputString,
  errorResponse,
  rateLimitResponse,
} from '@/lib/server/security';
import { AskJournalResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rateCheck = checkRateLimit(auth.uid);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter);
    }

    const body = await parseJsonSafely(req);
    const query = sanitizeInputString(body.query, 1000);

    if (!query) {
      return errorResponse('Search question cannot be empty', 400);
    }

    // 1. Generate embedding for user question
    const queryEmbedding = await generateTextEmbedding(query);

    // 2. Fetch all vector documents for this user
    const userVectors = await getVectorDocuments(auth.uid);

    if (userVectors.length === 0) {
      const emptyResult: AskJournalResult = {
        answer: 'You have not written any journal entries yet. Once you write reflections, Ask My Journal will be able to search and answer questions based on your thoughts.',
        citations: [],
        confidence: 'insufficient',
        insufficientContext: true,
      };
      return NextResponse.json(emptyResult);
    }

    // 3. Score documents by cosine similarity
    const scoredDocs = userVectors
      .map((doc) => {
        const similarity = computeCosineSimilarity(queryEmbedding, doc.embedding);
        return {
          ...doc,
          similarity,
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    // Top-k threshold filter (take top 4)
    const topK = scoredDocs.slice(0, 4);
    const highestScore = topK[0]?.similarity ?? 0;

    // Check if confidence is insufficient
    if (highestScore < 0.25) {
      const lowConfidenceResult: AskJournalResult = {
        answer: `I searched across your ${userVectors.length} journal reflections, but none of them contain sufficient context or mention of "${query}". I cannot answer this without making assumptions, so I am stating this limitation explicitly.`,
        citations: [],
        confidence: 'insufficient',
        insufficientContext: true,
      };
      return NextResponse.json(lowConfidenceResult);
    }

    // 4. Build grounded RAG prompt
    const citations = topK.map((item) => ({
      journalId: item.journalId,
      title: item.title,
      date: item.date,
      snippet: item.textSnippet,
      similarity: Math.round(item.similarity * 100) / 100,
    }));

    const formattedSnippets = citations
      .map(
        (c, idx) => `
[SOURCE ${idx + 1}] Title: "${c.title}" | Date: ${c.date} (Relevance: ${c.similarity})
<entry_snippet>
${c.snippet}
</entry_snippet>
`
      )
      .join('\n');

    const prompt = `
USER'S QUESTION:
<question>${query}</question>

GROUNDED HISTORICAL ENTRIES RETRIEVED VIA VECTOR SEARCH:
<historical_entries>
${formattedSnippets}
</historical_entries>

INSTRUCTIONS:
1. Answer the question relying ONLY on the facts, thoughts, and feelings expressed in the provided sources above.
2. In your response, explicitly reference which entries you are drawing from by Title and Date.
3. If the provided sources do not directly address the question or provide only partial context, state clearly what is known from the entries and what is missing. Never fabricate facts.
4. NO emojis anywhere. Maintain a calm, thoughtful tone.
`;

    const systemInstruction = getSystemInstructionForMode('ask_journal');
    const { text: answerText } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
      config: { temperature: 0.3 },
    });

    const result: AskJournalResult = {
      answer: answerText,
      citations,
      confidence: highestScore > 0.6 ? 'high' : 'moderate',
      insufficientContext: false,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in Ask My Journal RAG:', err);
    return errorResponse(err, 500);
  }
}
