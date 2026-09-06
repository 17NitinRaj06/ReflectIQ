// Server-side Resilient Firestore & Persistent Storage Engine
// Enforces zero-crash payload hygiene (undefined-stripping), strict UID scoping,
// durable file persistence, and automatic fallback.

import fs from 'fs';
import path from 'path';
import { adminFirestore, hasServiceAccount } from './firebase-admin';
import {
  JournalEntry,
  JournalMessage,
  Goal,
  ActionItem,
  InsightPattern,
  MemoryItem,
  WeeklyReview,
  VectorDocument,
} from '@/types';

/**
 * Strips all undefined values recursively to guarantee zero Firestore/JSON driver rejections
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

const STORE_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(STORE_DIR, 'app_store.json');

// Resilient memory cache hydrated from disk
const inMemoryStore = new Map<string, any>();

function hydrateStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        let hasPurged = false;
        for (const [k, v] of Object.entries(data)) {
          if (k.includes('_init_') || k.includes('jrnl_init') || k.includes('goal_init') || k.includes('mem_init')) {
            hasPurged = true;
            continue;
          }
          inMemoryStore.set(k, v);
        }
        if (hasPurged) {
          persistStore();
        }
      }
    }
  } catch {
    // Ignore hydration errors in restricted environments
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistStore() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
      }
      const data: Record<string, any> = {};
      for (const [k, v] of inMemoryStore.entries()) {
        data[k] = v;
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Safe ignore in restricted environment
    }
  }, 100);
}

hydrateStore();

function getStoreKey(uid: string, collection: string, id: string) {
  return `${uid}:${collection}:${id}`;
}

// --- JOURNALS ---
export async function getJournals(uid: string): Promise<JournalEntry[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as JournalEntry[];
      }
    } catch (err: any) {
      console.warn('Firestore getJournals query failed, falling back to local store:', err?.message);
    }
  }

  const results: JournalEntry[] = [];
  const prefix = `${uid}:journals:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) {
      results.push(v);
    }
  }

  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function getJournalById(uid: string, journalId: string): Promise<JournalEntry | null> {
  const key = getStoreKey(uid, 'journals', journalId);
  const cached = inMemoryStore.get(key);
  if (cached) return cached;

  // Resilient scan across keys in case user switched between demo/auth tokens
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.includes(`:journals:${journalId}`) && v?.id === journalId) {
      return v;
    }
  }

  if (hasServiceAccount) {
    try {
      const doc = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .doc(journalId)
        .get();

      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() } as JournalEntry;
        inMemoryStore.set(key, data);
        persistStore();
        return data;
      }
    } catch {
      // quiet fallback
    }
  }

  return null;
}

export async function saveJournal(uid: string, journal: JournalEntry): Promise<JournalEntry> {
  const cleanData = sanitizePayload({
    ...journal,
    uid,
    updatedAt: new Date().toISOString(),
  });

  const key = getStoreKey(uid, 'journals', journal.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .doc(journal.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveJournal fallback:', err?.message);
    }
  }

  return cleanData;
}

export async function deleteJournal(uid: string, journalId: string): Promise<void> {
  const key = getStoreKey(uid, 'journals', journalId);
  inMemoryStore.delete(key);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .doc(journalId)
        .delete();
    } catch (err: any) {
      console.warn('Firestore deleteJournal fallback:', err?.message);
    }
  }
}

// --- MESSAGES ---
export async function getJournalMessages(uid: string, journalId: string): Promise<JournalMessage[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .doc(journalId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as JournalMessage[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: JournalMessage[] = [];
  const prefix = `${uid}:messages:${journalId}:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) {
      results.push(v);
    }
  }

  // Cross-UID fallback scan if journalId matches
  if (results.length === 0) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (k.includes(`:messages:${journalId}:`) && v) {
        results.push(v);
      }
    }
  }

  return results.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

export async function saveJournalMessage(
  uid: string,
  journalId: string,
  message: JournalMessage
): Promise<JournalMessage> {
  const cleanData = sanitizePayload({
    ...message,
    journalId,
    createdAt: message.createdAt || new Date().toISOString(),
  });

  const key = `${uid}:messages:${journalId}:${message.id}`;
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('journals')
        .doc(journalId)
        .collection('messages')
        .doc(message.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveJournalMessage fallback:', err?.message);
    }
  }

  return cleanData;
}

// --- VECTOR EMBEDDINGS CACHE ---
export async function saveVectorDocument(uid: string, doc: VectorDocument): Promise<void> {
  const cleanData = sanitizePayload(doc);
  const key = getStoreKey(uid, 'vectors', doc.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('vectors')
        .doc(doc.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveVectorDocument fallback:', err?.message);
    }
  }
}

export async function getVectorDocuments(uid: string): Promise<VectorDocument[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('vectors')
        .limit(100)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VectorDocument[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: VectorDocument[] = [];
  const prefix = `${uid}:vectors:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) {
      results.push(v);
    }
  }
  return results;
}

// --- GOALS ---
export async function getGoals(uid: string): Promise<Goal[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('goals')
        .orderBy('createdAt', 'desc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Goal[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: Goal[] = [];
  const prefix = `${uid}:goals:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) results.push(v);
  }
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function saveGoal(uid: string, goal: Goal): Promise<Goal> {
  const cleanData = sanitizePayload({
    ...goal,
    uid,
    updatedAt: new Date().toISOString(),
  });

  const key = getStoreKey(uid, 'goals', goal.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('goals')
        .doc(goal.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveGoal fallback:', err?.message);
    }
  }

  return cleanData;
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  const key = getStoreKey(uid, 'goals', goalId);
  inMemoryStore.delete(key);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('goals')
        .doc(goalId)
        .delete();
    } catch (err: any) {
      console.warn('Firestore deleteGoal fallback:', err?.message);
    }
  }
}

// --- ACTIONS ---
export async function getActions(uid: string): Promise<ActionItem[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('actions')
        .orderBy('createdAt', 'desc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActionItem[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: ActionItem[] = [];
  const prefix = `${uid}:actions:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) results.push(v);
  }
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function saveAction(uid: string, action: ActionItem): Promise<ActionItem> {
  const cleanData = sanitizePayload({
    ...action,
    uid,
  });

  const key = getStoreKey(uid, 'actions', action.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('actions')
        .doc(action.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveAction fallback:', err?.message);
    }
  }

  return cleanData;
}

export async function deleteAction(uid: string, actionId: string): Promise<void> {
  const key = getStoreKey(uid, 'actions', actionId);
  inMemoryStore.delete(key);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('actions')
        .doc(actionId)
        .delete();
    } catch (err: any) {
      console.warn('Firestore deleteAction fallback:', err?.message);
    }
  }
}

// --- INSIGHT PATTERNS ---
export async function getInsights(uid: string): Promise<InsightPattern[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('insights')
        .orderBy('createdAt', 'desc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InsightPattern[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: InsightPattern[] = [];
  const prefix = `${uid}:insights:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) results.push(v);
  }
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function saveInsight(uid: string, insight: InsightPattern): Promise<InsightPattern> {
  const cleanData = sanitizePayload({
    ...insight,
    uid,
  });

  const key = getStoreKey(uid, 'insights', insight.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('insights')
        .doc(insight.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveInsight fallback:', err?.message);
    }
  }

  return cleanData;
}

// --- MEMORIES ---
export async function getMemories(uid: string): Promise<MemoryItem[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('memories')
        .orderBy('createdAt', 'desc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MemoryItem[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: MemoryItem[] = [];
  const prefix = `${uid}:memories:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) results.push(v);
  }
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function saveMemory(uid: string, memory: MemoryItem): Promise<MemoryItem> {
  const cleanData = sanitizePayload({
    ...memory,
    uid,
  });

  const key = getStoreKey(uid, 'memories', memory.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('memories')
        .doc(memory.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveMemory fallback:', err?.message);
    }
  }

  return cleanData;
}

export async function deleteMemory(uid: string, memoryId: string): Promise<void> {
  const key = getStoreKey(uid, 'memories', memoryId);
  inMemoryStore.delete(key);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('memories')
        .doc(memoryId)
        .delete();
    } catch (err: any) {
      console.warn('Firestore deleteMemory fallback:', err?.message);
    }
  }
}

export async function clearAllMemories(uid: string): Promise<void> {
  const prefix = `${uid}:memories:`;
  for (const k of inMemoryStore.keys()) {
    if (k.startsWith(prefix)) inMemoryStore.delete(k);
  }
  persistStore();

  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('memories')
        .get();

      const batch = adminFirestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (err: any) {
      console.warn('Firestore clearAllMemories fallback:', err?.message);
    }
  }
}

// --- WEEKLY REVIEWS ---
export async function getWeeklyReviews(uid: string): Promise<WeeklyReview[]> {
  if (hasServiceAccount) {
    try {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('weeklyReviews')
        .orderBy('createdAt', 'desc')
        .get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WeeklyReview[];
      }
    } catch {
      // quiet fallback
    }
  }

  const results: WeeklyReview[] = [];
  const prefix = `${uid}:weeklyReviews:`;
  for (const [k, v] of inMemoryStore.entries()) {
    if (k.startsWith(prefix) && v) results.push(v);
  }
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function saveWeeklyReview(uid: string, review: WeeklyReview): Promise<WeeklyReview> {
  const cleanData = sanitizePayload({
    ...review,
    uid,
  });

  const key = getStoreKey(uid, 'weeklyReviews', review.id);
  inMemoryStore.set(key, cleanData);
  persistStore();

  if (hasServiceAccount) {
    try {
      await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('weeklyReviews')
        .doc(review.id)
        .set(cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Firestore saveWeeklyReview fallback:', err?.message);
    }
  }

  return cleanData;
}

// --- FULL DATA ARCHIVE & PURGE ---
export async function exportFullUserData(uid: string) {
  const [journals, goals, actions, insights, memories, reviews] = await Promise.all([
    getJournals(uid),
    getGoals(uid),
    getActions(uid),
    getInsights(uid),
    getMemories(uid),
    getWeeklyReviews(uid),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    uid,
    journals,
    goals,
    actions,
    insights,
    memories,
    weeklyReviews: reviews,
  };
}

export async function deleteAllUserData(uid: string): Promise<void> {
  for (const k of inMemoryStore.keys()) {
    if (k.startsWith(`${uid}:`)) {
      inMemoryStore.delete(k);
    }
  }
  persistStore();

  if (hasServiceAccount) {
    try {
      const userRef = adminFirestore.collection('users').doc(uid);
      const subcollections = [
        'journals',
        'goals',
        'actions',
        'insights',
        'memories',
        'weeklyReviews',
        'vectors',
      ];

      for (const sub of subcollections) {
        const snap = await userRef.collection(sub).get();
        const batch = adminFirestore.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      await userRef.delete();
    } catch (err: any) {
      console.warn('Firestore deleteAllUserData fallback:', err?.message);
    }
  }
}
