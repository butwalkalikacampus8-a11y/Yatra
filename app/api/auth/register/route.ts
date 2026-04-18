import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { idToken, role, userData } = await request.json();

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
    const uid = decoded.uid;

    const phoneNumber = decoded.phone_number || userData?.phone || '';
    const email = decoded.email || userData?.email || '';

    if (!phoneNumber && !email) {
      return NextResponse.json(
        { error: 'Either phone number or email is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const userRef = db.ref(`users/${uid}`);

    const userRecord = {
      id: uid,
      phone: phoneNumber,
      name: userData?.name || decoded.name || email.split('@')[0] || 'User',
      email: email || null,
      role,
      createdAt: new Date().toISOString(),
      ...(role === 'driver' && {
        vehicleType: userData?.vehicleType || null,
        vehicleNumber: userData?.vehicleNumber || null,
        capacity: userData?.capacity || null,
        licenseNumber: userData?.licenseNumber || null,
        isApproved: false,
        rating: null,
      }),
      ...(role === 'passenger' && {
        emergencyContact: userData?.emergencyContact || null,
      }),
    };

    await userRef.update(userRecord);
    await auth.setCustomUserClaims(uid, { role });

    return NextResponse.json({ success: true, user: userRecord });
  } catch (error) {
    console.error('[register] error', error);
    const message = error instanceof Error ? error.message : 'Failed to register user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
