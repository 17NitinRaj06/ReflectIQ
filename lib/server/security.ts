// Server-side Defensive Security & Rate Limiting Utility
// Enforces sliding window rate-limiting per UID, input sanitization, and defensive body destructuring.

import { NextRequest, NextResponse } from 'next/server';
import { AIServiceError } from '@/lib/server/gemini';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Sliding window: max 30 Gemini / intensive calls per 60 seconds per UID
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * Check if the user has exceeded request rate limits
 */
export function checkRateLimit(uid: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(uid) || { timestamps: [] };

  // Filter out timestamps outside window
  const activeTimestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = activeTimestamps[0] || now;
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(uid, { timestamps: activeTimestamps });
  return { allowed: true };
}

/**
 * Defensive payload ingestion: null-safe JSON extraction
 */
export async function parseJsonSafely(req: NextRequest): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Sanitize untrusted input strings
 */
export function sanitizeInputString(val: any, maxLength = 10000): string {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .slice(0, maxLength)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // strip invisible control characters
}

/**
 * Validate alphanumeric IDs to prevent path traversal or injection
 */
export function isValidId(id: any): boolean {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * Standard security & error response helper
 * Frames any system or AI errors with professional, user-safe narratives.
 */
export function errorResponse(errOrMessage: any, status = 400) {
  if (errOrMessage instanceof AIServiceError) {
    return NextResponse.json(
      {
        error: errOrMessage.userMessage,
        title: errOrMessage.title,
        code: errOrMessage.code,
        isQuota: errOrMessage.isQuota,
        retryable: true,
      },
      { status: errOrMessage.statusCode }
    );
  }

  const rawMsg = typeof errOrMessage === 'string' ? errOrMessage : (errOrMessage?.message || '');

  // Log raw diagnostic for server observability
  if (status >= 500 || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    console.error('[API_ERROR_DIAGNOSTIC]', errOrMessage);
  }

  const isQuota =
    rawMsg.includes('quota') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('prepayment') ||
    rawMsg.includes('credit') ||
    status === 429;

  if (isQuota) {
    return NextResponse.json(
      {
        error: 'ReflectIQ is currently experiencing high reflection traffic. Your thoughts and notes have been securely saved. Please pause for a moment and try your prompt again.',
        title: 'Assistant Temporarily at Capacity',
        code: 'CAPACITY_REACHED',
        isQuota: true,
        retryable: true,
      },
      { status: 429 }
    );
  }

  const isTemporary =
    rawMsg.includes('unavailable') ||
    rawMsg.includes('timeout') ||
    rawMsg.includes('busy') ||
    status === 503;

  if (isTemporary) {
    return NextResponse.json(
      {
        error: 'The reflection engine is taking a brief pause. Your entry is safely preserved. Please try your reflection again in a few moments.',
        title: 'Assistant Momentarily Resting',
        code: 'TEMPORARILY_UNAVAILABLE',
        isQuota: false,
        retryable: true,
      },
      { status: 503 }
    );
  }

  // Sanitize internal database or auth errors
  if (status >= 500) {
    return NextResponse.json(
      {
        error: 'We encountered an unexpected pause while processing this reflection. Your notes remain preserved.',
        title: 'Reflection Incomplete',
        code: 'SERVER_ERROR',
        isQuota: false,
        retryable: true,
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      error: rawMsg || 'Unable to complete operation.',
      title: 'Action Incomplete',
      code: 'VALIDATION_ERROR',
      isQuota: false,
      retryable: false,
    },
    { status }
  );
}

export function rateLimitResponse(retryAfter = 60) {
  return NextResponse.json(
    {
      error: `You are reflecting deeply. To ensure reflection quality, please pause for ${retryAfter} seconds before your next prompt.`,
      title: 'Mindful Reflection Pause',
      code: 'RATE_LIMIT_PAUSE',
      isQuota: false,
      retryable: true,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
