// API: /api/privacy/delete-all (Permanently delete all user records with strict phrase verification)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { deleteAllUserData } from '@/lib/server/firestore-db';
import { parseJsonSafely, errorResponse } from '@/lib/server/security';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await parseJsonSafely(req);

    if (body.confirmPhrase !== 'DELETE ALL REFLECTIQ DATA') {
      return errorResponse(
        'Confirmation phrase mismatch. You must explicitly type "DELETE ALL REFLECTIQ DATA" to perform this irreversible operation.',
        400
      );
    }

    await deleteAllUserData(auth.uid);

    return NextResponse.json({
      success: true,
      message: 'All reflections, insights, goals, actions, vectors, and memory records have been permanently erased.',
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to erase data', 500);
  }
}
