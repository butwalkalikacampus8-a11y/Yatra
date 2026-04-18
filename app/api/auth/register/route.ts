import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { idToken, role } = await request.json();

    if (!idToken || !role) {
      return NextResponse.json({ error: 'Missing idToken or role' }, { status: 400 });
    }

    if (!['driver', 'passenger'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "driver" or "passenger"' },
        { status: 400 }
      );
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);

    await auth.setCustomUserClaims(decoded.uid, { role });

    return NextResponse.json({ success: true, uid: decoded.uid });
  } catch (error) {
    console.error('[register] error', error);
    const message = error instanceof Error ? error.message : 'Failed to register user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
