// Core Types for ReflectIQ

export type GeminiMode =
  | 'reflect'
  | 'brainstorm'
  | 'plan'
  | 'review'
  | 'problem_solve'
  | 'ask_journal';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  memoryEnabled: boolean;
}

export interface JournalMessage {
  id: string;
  journalId: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: GeminiMode;
  createdAt: string;
  metadata?: {
    citations?: {
      journalId: string;
      title: string;
      date: string;
      snippet: string;
    }[];
    proposedMemories?: {
      category: 'goal' | 'project' | 'preference' | 'challenge';
      content: string;
    }[];
    suggestedActions?: {
      title: string;
      dueSuggestion?: string;
    }[];
    suggestedGoalUpdate?: {
      goalTitle: string;
      progressDelta?: number;
      note?: string;
    };
    detectedPatternNotice?: string;
  };
}

export interface JournalEntry {
  id: string;
  uid: string;
  title: string;
  content: string;
  summary?: string;
  themes?: string[];
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
  messagesCount?: number;
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  targetDate?: string;
  progress: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
  sourceJournalId?: string;
}

export interface ActionItem {
  id: string;
  uid: string;
  journalId?: string;
  title: string;
  status: 'suggested' | 'accepted' | 'completed' | 'dismissed';
  dueSuggestion?: string;
  createdAt: string;
}

export interface InsightPattern {
  id: string;
  uid: string;
  title: string;
  description: string;
  type: 'pattern' | 'shift' | 'blocker' | 'priority_change';
  status: 'detected' | 'acknowledged' | 'dismissed';
  evidenceJournalIds: string[];
  evidenceSnippets: string[];
  createdAt: string;
}

export type MemoryCategory = 'goal' | 'project' | 'preference' | 'challenge';

export interface MemoryItem {
  id: string;
  uid: string;
  category: MemoryCategory;
  content: string;
  status: 'pending' | 'approved' | 'dismissed';
  sourceJournalId?: string;
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  uid: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  reflectionCount: number;
  recurringThemes: string[];
  goalsMentioned: string[];
  actionsCompleted: number;
  notableWins: string[];
  unresolvedChallenges: string[];
  possiblePattern: string;
  suggestedFocus: string;
  createdAt: string;
}

export interface VectorDocument {
  id: string;
  uid: string;
  journalId: string;
  title: string;
  date: string;
  textSnippet: string;
  embedding: number[];
}

export interface AskJournalResult {
  answer: string;
  citations: {
    journalId: string;
    title: string;
    date: string;
    snippet: string;
    similarity: number;
  }[];
  confidence: 'high' | 'moderate' | 'insufficient';
  insufficientContext: boolean;
}
