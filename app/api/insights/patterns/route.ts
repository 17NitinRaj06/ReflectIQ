// API: /api/insights/patterns (Pattern & Change Detection across entries)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getJournals, getInsights, saveInsight } from '@/lib/server/firestore-db';
import { generateContentWithFallback } from '@/lib/server/gemini';
import {
  checkRateLimit,
  errorResponse,
  rateLimitResponse,
} from '@/lib/server/security';
import { InsightPattern } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const insights = await getInsights(auth.uid);
    return NextResponse.json({ insights });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rateCheck = checkRateLimit(auth.uid);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter);
    }

    // Fetch user's recent journals
    const journals = await getJournals(auth.uid);

    if (journals.length < 2) {
      return errorResponse(
        'At least two journal reflections are needed to discover patterns and shifts over time.',
        400
      );
    }

    // Prepare journal synthesis summaries
    const entriesSummary = journals.slice(0, 10).map((j, i) => `
[Entry ${i + 1}] ID: ${j.id} | Title: "${j.title}" | Date: ${j.createdAt.split('T')[0]}
Themes: ${j.themes?.join(', ') || 'general'}
Summary: ${j.summary || j.content.slice(0, 200)}
Snippet: "${j.content.slice(0, 300)}"
`).join('\n');

    const prompt = `
You are ReflectIQ's Pattern and Change Detection engine.
Analyze the following reflection entries across time to identify:
1. Recurring themes or cognitive loops
2. Repeated friction points or blockers
3. Evident shifts in stated priorities or attitudes over time

CRITICAL LINGUISTIC RULES:
- Never speak in clinical diagnoses or assert medical conditions.
- Phrase ALL findings as gentle hypotheses or interpretations, NEVER as definitive facts (e.g. "Possible pattern detected: ...", "Possible shift: ...", "A recurring tendency appears to be...").
- Never say "This is your problem" or "You suffer from...".
- NO emojis anywhere in the output.
- Link each finding to specific evidence journal IDs and short excerpts.

ENTRIES TO ANALYZE:
<historical_entries>
${entriesSummary}
</historical_entries>

Return a JSON array of discovered patterns matching this structure:
[
  {
    "title": "Possible pattern: [Brief descriptive phrase]",
    "description": "[1-2 sentence thoughtful interpretation explaining the recurring thread]",
    "type": "pattern" | "shift" | "blocker" | "priority_change",
    "evidenceJournalIds": ["id1", "id2"],
    "evidenceSnippets": ["exact short quote or paraphrase 1", "exact short quote 2"]
  }
]
`;

    const { text: rawJson } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    let detected: any[] = [];
    try {
      detected = JSON.parse(rawJson);
      if (!Array.isArray(detected)) detected = [];
    } catch {
      detected = [];
    }

    const savedPatterns: InsightPattern[] = [];
    const now = new Date().toISOString();

    for (const item of detected) {
      if (item.title && item.description) {
        const patternId = 'ins_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const newPattern: InsightPattern = {
          id: patternId,
          uid: auth.uid,
          title: item.title,
          description: item.description,
          type: item.type || 'pattern',
          status: 'detected',
          evidenceJournalIds: Array.isArray(item.evidenceJournalIds) ? item.evidenceJournalIds : [],
          evidenceSnippets: Array.isArray(item.evidenceSnippets) ? item.evidenceSnippets : [],
          createdAt: now,
        };
        const saved = await saveInsight(auth.uid, newPattern);
        savedPatterns.push(saved);
      }
    }

    return NextResponse.json({
      patterns: savedPatterns,
      analyzedEntriesCount: journals.length,
    });
  } catch (err: any) {
    console.error('Error detecting patterns:', err);
    return errorResponse(err, 500);
  }
}
