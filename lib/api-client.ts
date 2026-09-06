// Client-side API request helper attaching Firebase ID token
import {
  JournalEntry,
  JournalMessage,
  Goal,
  ActionItem,
  InsightPattern,
  MemoryItem,
  WeeklyReview,
  AskJournalResult,
  GeminiMode,
} from '@/types';

async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    let title = 'Action Incomplete';
    let code = 'REQUEST_FAILED';
    let isQuota = false;
    let retryable = true;

    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
      if (errorJson.title) title = errorJson.title;
      if (errorJson.code) code = errorJson.code;
      if (errorJson.isQuota) isQuota = true;
      if (typeof errorJson.retryable === 'boolean') retryable = errorJson.retryable;
    } catch {}

    const customErr: any = new Error(errorMsg);
    customErr.status = response.status;
    customErr.title = title;
    customErr.code = code;
    customErr.isQuota = isQuota || response.status === 429;
    customErr.retryable = retryable;
    throw customErr;
  }

  return response.json();
}

export const apiClient = {
  // Journals
  async getJournals(token: string | null): Promise<JournalEntry[]> {
    const data = await fetchWithAuth('/api/journal', token);
    return data.journals || [];
  },

  async getJournal(token: string | null, id: string): Promise<JournalEntry> {
    const data = await fetchWithAuth(`/api/journal/${id}`, token);
    return data.journal;
  },

  async createJournal(
    token: string | null,
    payload: { title?: string; content: string }
  ): Promise<{ journal: JournalEntry; extracted: any }> {
    return fetchWithAuth('/api/journal', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateJournal(
    token: string | null,
    id: string,
    payload: { title?: string; content?: string }
  ): Promise<JournalEntry> {
    const data = await fetchWithAuth(`/api/journal/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.journal;
  },

  async deleteJournal(token: string | null, id: string): Promise<void> {
    await fetchWithAuth(`/api/journal/${id}`, token, {
      method: 'DELETE',
    });
  },

  // Messages
  async getMessages(token: string | null, journalId: string): Promise<JournalMessage[]> {
    const data = await fetchWithAuth(`/api/journal/${journalId}/messages`, token);
    return data.messages || [];
  },

  async sendMessage(
    token: string | null,
    journalId: string,
    content: string,
    mode: GeminiMode = 'reflect'
  ): Promise<{ userMessage: JournalMessage; assistantMessage: JournalMessage; extracted: any }> {
    return fetchWithAuth(`/api/journal/${journalId}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ content, mode }),
    });
  },

  // Ask My Journal (RAG)
  async askMyJournal(token: string | null, query: string): Promise<AskJournalResult> {
    return fetchWithAuth('/api/rag/ask', token, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  // Insights / Patterns
  async getInsights(token: string | null): Promise<InsightPattern[]> {
    const data = await fetchWithAuth('/api/insights/patterns', token);
    return data.insights || [];
  },

  async detectPatterns(token: string | null): Promise<InsightPattern[]> {
    const data = await fetchWithAuth('/api/insights/patterns', token, {
      method: 'POST',
    });
    return data.patterns || [];
  },

  async updatePatternStatus(
    token: string | null,
    id: string,
    status: 'acknowledged' | 'dismissed' | 'detected'
  ): Promise<InsightPattern> {
    const data = await fetchWithAuth(`/api/insights/patterns/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.pattern;
  },

  // Goals
  async getGoals(token: string | null): Promise<Goal[]> {
    const data = await fetchWithAuth('/api/goals', token);
    return data.goals || [];
  },

  async createGoal(
    token: string | null,
    payload: { title: string; description?: string; progress?: number; targetDate?: string; sourceJournalId?: string }
  ): Promise<Goal> {
    const data = await fetchWithAuth('/api/goals', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.goal;
  },

  async updateGoal(
    token: string | null,
    id: string,
    payload: Partial<Goal>
  ): Promise<Goal> {
    const data = await fetchWithAuth(`/api/goals/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.goal;
  },

  async deleteGoal(token: string | null, id: string): Promise<void> {
    await fetchWithAuth(`/api/goals/${id}`, token, {
      method: 'DELETE',
    });
  },

  // Actions
  async getActions(token: string | null): Promise<ActionItem[]> {
    const data = await fetchWithAuth('/api/actions', token);
    return data.actions || [];
  },

  async createAction(
    token: string | null,
    payload: { title: string; journalId?: string; dueSuggestion?: string; status?: string }
  ): Promise<ActionItem> {
    const data = await fetchWithAuth('/api/actions', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.action;
  },

  async updateAction(
    token: string | null,
    id: string,
    payload: Partial<ActionItem>
  ): Promise<ActionItem> {
    const data = await fetchWithAuth(`/api/actions/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.action;
  },

  async deleteAction(token: string | null, id: string): Promise<void> {
    await fetchWithAuth(`/api/actions/${id}`, token, {
      method: 'DELETE',
    });
  },

  // Memory
  async getMemories(token: string | null): Promise<MemoryItem[]> {
    const data = await fetchWithAuth('/api/memory', token);
    return data.memories || [];
  },

  async saveMemory(
    token: string | null,
    payload: { content: string; category: string; status?: string; sourceJournalId?: string }
  ): Promise<MemoryItem> {
    const data = await fetchWithAuth('/api/memory', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.memory;
  },

  async updateMemory(
    token: string | null,
    id: string,
    payload: Partial<MemoryItem>
  ): Promise<MemoryItem> {
    const data = await fetchWithAuth(`/api/memory/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.memory;
  },

  async deleteMemory(token: string | null, id: string): Promise<void> {
    await fetchWithAuth(`/api/memory/${id}`, token, {
      method: 'DELETE',
    });
  },

  async clearAllMemories(token: string | null): Promise<void> {
    await fetchWithAuth('/api/memory?clearAll=true', token, {
      method: 'DELETE',
    });
  },

  // Weekly Reviews
  async getWeeklyReviews(token: string | null): Promise<WeeklyReview[]> {
    const data = await fetchWithAuth('/api/review/weekly', token);
    return data.reviews || [];
  },

  async generateWeeklyReview(token: string | null): Promise<WeeklyReview> {
    const data = await fetchWithAuth('/api/review/weekly', token, {
      method: 'POST',
    });
    return data.review;
  },

  // Privacy
  async exportData(token: string | null): Promise<void> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/privacy/export', { headers });
    if (!res.ok) throw new Error('Failed to export data archive');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reflectiq_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async deleteAllData(token: string | null, confirmPhrase: string): Promise<void> {
    await fetchWithAuth('/api/privacy/delete-all', token, {
      method: 'POST',
      body: JSON.stringify({ confirmPhrase }),
    });
  },
};
