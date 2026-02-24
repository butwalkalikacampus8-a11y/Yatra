import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebaseAdmin';
import { getDatabase } from 'firebase-admin/database';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';

// Initialize Firebase Admin for database access
function getAdminApp() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase admin configuration');
    }

    // Use regional database URL if provided, otherwise default to asia-southeast1
    const databaseURL = process.env.FIREBASE_DATABASE_URL || 
      `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      databaseURL,
    });
  }
  return getApps()[0]!;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { sessionCookie, action } = await request.json();
    const { id: busId } = await params;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Missing session cookie' },
        { status: 401 }
      );
    }

    if (!busId) {
      return NextResponse.json(
        { error: 'Missing bus ID' },
        { status: 400 }
      );
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }

    // Verify session
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie);

    // Check if user is a driver (optional: verify they own this bus)
    const claims = decoded;
    if (claims.role !== 'driver') {
      return NextResponse.json(
        { error: 'Only drivers can update offline passenger count' },
        { status: 403 }
      );
    }

    // Update bus offline passenger count
    const adminApp = getAdminApp();
    const db = getDatabase(adminApp);
    const busRef = db.ref(`buses/${busId}`);

    const busSnapshot = await busRef.once('value');
    const bus = busSnapshot.val();

    if (!bus) {
      return NextResponse.json(
        { error: 'Bus not found' },
        { status: 404 }
      );
    }

    const currentOffline = bus.offlineOccupiedSeats || 0;
    const currentOnline = bus.onlineBookedSeats || 0;
    const capacity = bus.capacity || 0;

    let newOffline: number;
    if (action === 'add') {
      newOffline = Math.min(currentOffline + 1, capacity - currentOnline);
    } else {
      newOffline = Math.max(currentOffline - 1, 0);
    }

    const available = Math.max(0, capacity - currentOnline - newOffline);

    await busRef.update({
      offlineOccupiedSeats: newOffline,
      availableSeats: available,
      lastSeatUpdate: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      offlineOccupiedSeats: newOffline,
      availableSeats: available,
    });
  } catch (error) {
    console.error('[offline-count] error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update offline count';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

