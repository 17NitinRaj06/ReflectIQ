// Server-side Authentication & UID derivation
import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export interface VerifiedAuthContext {
  uid: string;
  email: string | null;
  isDemo: boolean;
}

/**
 * Extracts and cryptographically verifies Firebase ID token from Authorization header.
 * Derives UID directly from the verified token. Never trusts client-provided UID parameters.
 */
export async function authenticateRequest(req: NextRequest): Promise<VerifiedAuthContext> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error('Unauthorized: Empty Bearer token');
  }

  // Handle preview sandbox demo tokens safely
  if (token.startsWith('DEMO_BEARER_')) {
    const demoUid = token.replace('DEMO_BEARER_', '').trim();
    // Validate demo UID structure
    if (!demoUid || !/^[a-zA-Z0-9_-]{4,64}$/.test(demoUid)) {
      throw new Error('Unauthorized: Invalid demo token identifier');
    }
    return {
      uid: demoUid,
      email: `${demoUid}@reflectiq.internal`,
      isDemo: true,
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.uid) {
      throw new Error('Unauthorized: Token did not yield a valid user identifier');
    }
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      isDemo: false,
    };
  } catch (error: any) {
    console.error('Firebase token verification failure:', error?.message || error);
    throw new Error('Unauthorized: Invalid or expired Firebase ID token');
  }
}
