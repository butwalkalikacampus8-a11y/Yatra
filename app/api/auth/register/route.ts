import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';

// Initialize Firebase Admin for Firestore access
function getAdminApp() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      // Dev mode fallback: Return null instead of throwing
      console.warn('Missing Firebase admin configuration. Running in Dev Mode (no server-side auth ops).');
      return null;
    }

    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    // Use regional database URL if provided, otherwise default to asia-southeast1
    const databaseURL = process.env.FIREBASE_DATABASE_URL ||
      `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

    return initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    });
  }
  return getApps()[0]!;
}

export async function POST(request: Request) {
  try {
    const { idToken, role, userData } = await request.json();

    if (!idToken || !role) {
      return NextResponse.json(
        { error: 'Missing idToken or role' },
        { status: 400 }
      );
    }

    if (!['driver', 'passenger'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "driver" or "passenger"' },
        { status: 400 }
      );
    }

    // Check for Admin SDK (Dev Mode)
    const adminApp = getAdminApp();
    if (!adminApp) {
      // Dev Mode: Skip server-side verification and return success
      // The client has already created the user profile in Firestore
      return NextResponse.json({
        success: true,
        message: 'Dev Mode: Skipped server-side registration',
        devMode: true
      });
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Get user phone number from token or email
    const phoneNumber = decoded.phone_number || userData?.phone || '';
    const email = decoded.email || userData?.email || '';

    // Require either phone or email
    if (!phoneNumber && !email) {
      return NextResponse.json(
        { error: 'Either phone number or email is required' },
        { status: 400 }
      );
    }

    // Create user record in Realtime Database
    const db = getDatabase(adminApp);
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

    // Set custom claims for role
    await auth.setCustomUserClaims(uid, { role });

    return NextResponse.json({
      success: true,
      user: userRecord,
    });
  } catch (error) {
    console.error('[register] error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to register user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

