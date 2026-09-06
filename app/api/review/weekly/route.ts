// API: /api/review/weekly (GET, POST to generate new Weekly Review)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import {
  getJournals,
  getGoals,
  getActions,
  getWeeklyReviews,
  saveWeeklyReview,
} from '@/lib/server/firestore-db';
import { generateContentWithFallback } from '@/lib/server/gemini';
import {
  checkRateLimit,
  errorResponse,
  rateLimitResponse,
} from '@/lib/server/security';
import { WeeklyReview } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const reviews = await getWeeklyReviews(auth.uid);
    return NextResponse.json({ reviews });
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

    const [journals, goals, actions] = await Promise.all([
      getJournals(auth.uid),
      getGoals(auth.uid),
      getActions(auth.uid),
    ]);

    if (journals.length === 0) {
      return errorResponse(
        'Please write at least one reflection before generating a weekly synthesis review.',
        400
      );
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `Week of ${sevenDaysAgo.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const recentJournals = journals.slice(0, 10);
    const completedActionsCount = actions.filter((a) => a.status === 'completed').length;

    const journalsContext = recentJournals
      .map(
        (j, idx) => `
[ENTRY ${idx + 1}] "${j.title}" (${j.createdAt.split('T')[0]})
Summary: ${j.summary || 'None'}
Themes: ${j.themes?.join(', ') || 'General'}
Excerpt: "${j.content.slice(0, 250)}"
`
      )
      .join('\n');

    const goalsContext = goals.map((g) => `- "${g.title}" (Progress: ${g.progress}%)`).join('\n');

    const prompt = `
You are ReflectIQ's Weekly Synthesis Engine.
Synthesize the user's reflection entries, goals, and actions from this past week.

CRITICAL RULES:
- Never assume clinical authority or issue psychological diagnoses.
- Use restrained, grounded editorial language.
- Frame all patterns as interpretations ("Possible pattern: ...").
- NO emojis anywhere.

USER DATA:
<entries>
${journalsContext}
</entries>

<current_goals>
${goalsContext || 'No active goals recorded yet.'}
</current_goals>

Return a single JSON object matching this structure:
{
  "recurringThemes": ["theme1", "theme2", "theme3"],
  "goalsMentioned": ["goal title or focus area 1", "goal title 2"],
  "notableWins": ["grounded positive achievement or realization 1", "realization 2"],
  "unresolvedChallenges": ["stated friction or challenge 1", "challenge 2"],
  "possiblePattern": "Possible pattern: [1-2 sentences explaining a recurring thread across these entries]",
  "suggestedFocus": "[1-2 sentences proposing a thoughtful, non-prescriptive inquiry or focus for the upcoming week]"
}
`;

    const { text: resultJson } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(resultJson);
    } catch {
      parsed = {};
    }

    const reviewId = 'rev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const review: WeeklyReview = {
      id: reviewId,
      uid: auth.uid,
      weekLabel,
      startDate: sevenDaysAgo.toISOString().split('T')[0] || '',
      endDate: now.toISOString().split('T')[0] || '',
      reflectionCount: recentJournals.length,
      recurringThemes: Array.isArray(parsed.recurringThemes) ? parsed.recurringThemes : ['reflection', 'clarity'],
      goalsMentioned: Array.isArray(parsed.goalsMentioned) ? parsed.goalsMentioned : [],
      actionsCompleted: completedActionsCount,
      notableWins: Array.isArray(parsed.notableWins) ? parsed.notableWins : ['Maintained consistent reflection practice.'],
      unresolvedChallenges: Array.isArray(parsed.unresolvedChallenges) ? parsed.unresolvedChallenges : [],
      possiblePattern: parsed.possiblePattern || 'Possible pattern: Consistent focus on clarifying next steps.',
      suggestedFocus: parsed.suggestedFocus || 'Continue exploring personal priorities with patient observation.',
      createdAt: now.toISOString(),
    };

    const saved = await saveWeeklyReview(auth.uid, review);
    return NextResponse.json({ review: saved });
  } catch (err: any) {
    console.error('Error generating weekly review:', err);
    return errorResponse(err, 500);
  }
}
