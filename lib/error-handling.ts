// Client-side user-friendly error normalization utility
// Transforms raw technical exceptions and quota messages into professional, reassuring notices.

export interface FormattedError {
  title: string;
  message: string;
  isQuota: boolean;
  retryable: boolean;
  code: string;
}

export function formatUserFriendlyError(err: any): FormattedError {
  if (!err) {
    return {
      title: 'Action Paused',
      message: 'The operation could not be completed. Your notes remain safely preserved.',
      isQuota: false,
      retryable: true,
      code: 'UNKNOWN_ERROR',
    };
  }

  // If already structured
  if (err.isQuota) {
    return {
      title: err.title || 'Assistant Temporarily at Capacity',
      message:
        err.message ||
        'ReflectIQ is currently experiencing high reflection traffic. Your thoughts and notes have been securely saved. Please pause for a moment and try your prompt again.',
      isQuota: true,
      retryable: true,
      code: err.code || 'CAPACITY_REACHED',
    };
  }

  const raw = String(err?.message || err?.error || err || '');

  // Detect quota, rate limits, prepayment, credits, 429
  if (
    raw.includes('quota') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('prepayment') ||
    raw.includes('credit') ||
    raw.includes('429') ||
    raw.includes('Capacity') ||
    raw.includes('capacity')
  ) {
    return {
      title: 'Assistant Temporarily at Capacity',
      message:
        'ReflectIQ is currently experiencing high reflection demand. Your personal reflections and notes are securely saved. Please take a brief pause and try again in a few moments.',
      isQuota: true,
      retryable: true,
      code: 'CAPACITY_REACHED',
    };
  }

  // Detect rate limit pause
  if (
    raw.includes('Too many requests') ||
    raw.includes('rate limit') ||
    raw.includes('RATE_LIMIT') ||
    raw.includes('reflecting deeply')
  ) {
    return {
      title: 'Mindful Reflection Pause',
      message: raw.includes('seconds')
        ? raw
        : 'You are reflecting deeply. To ensure reflection quality, please take a short pause before your next prompt.',
      isQuota: false,
      retryable: true,
      code: 'RATE_LIMIT_PAUSE',
    };
  }

  // Detect model unavailability or temporary AI service issues
  if (
    raw.includes('fallback ladder') ||
    raw.includes('unavailable') ||
    raw.includes('timeout') ||
    raw.includes('503') ||
    raw.includes('504') ||
    raw.includes('overloaded') ||
    raw.includes('busy') ||
    raw.includes('Resting')
  ) {
    return {
      title: 'Assistant Momentarily Resting',
      message:
        'The reflection engine is taking a brief pause while models recalibrate. Your entry is safely preserved. Please try again in a few moments.',
      isQuota: false,
      retryable: true,
      code: 'TEMPORARILY_UNAVAILABLE',
    };
  }

  // Detect network interruptions
  if (
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('fetch failed') ||
    raw.includes('offline')
  ) {
    return {
      title: 'Connection Interrupted',
      message:
        'Network connection was momentarily interrupted. Your local reflection is safe. Please check your connection and retry.',
      isQuota: false,
      retryable: true,
      code: 'NETWORK_ERROR',
    };
  }

  // Detect auth issues
  if (
    raw.includes('auth') ||
    raw.includes('Unauthorized') ||
    raw.includes('unauthenticated') ||
    raw.includes('ID token')
  ) {
    return {
      title: 'Session Refresh Required',
      message: 'Your session has expired. Please sign in again to continue your reflection session.',
      isQuota: false,
      retryable: false,
      code: 'AUTH_REQUIRED',
    };
  }

  // Clean fallback for any other error without exposing raw code/stacks
  const safeMessage =
    err.message &&
    !err.message.includes('Error:') &&
    !err.message.includes('stack') &&
    !err.message.includes('TypeError') &&
    !err.message.includes('at ')
      ? err.message
      : 'We encountered an unexpected pause while processing this reflection. Your notes remain preserved.';

  return {
    title: err.title || 'Reflection Incomplete',
    message: safeMessage,
    isQuota: false,
    retryable: true,
    code: err.code || 'OPERATION_FAILED',
  };
}
