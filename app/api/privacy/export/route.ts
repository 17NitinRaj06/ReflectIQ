// API: /api/privacy/export (Download complete JSON user data archive)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { exportFullUserData } from '@/lib/server/firestore-db';
import { errorResponse } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const data = await exportFullUserData(auth.uid);

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="reflectiq_export_${auth.uid}_${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401);
  }
}
