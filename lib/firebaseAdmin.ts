import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';

let adminAuth: Auth | undefined;
let adminDb: Database | undefined;

/**
 * Lazily initializes the Firebase Admin SDK app (only once across warm lambda instances).
 * Reads credentials from FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 */
function ensureAdminAppInitialized() {
  if (getApps().length > 0) return; // Already initialized

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  // Next.js sometimes preserves literal double quotes from .env.local;
  // strip them and convert escaped \n sequences into real newlines.
  const privateKey = rawPrivateKey.replace(/^\"|\"$/g, '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase admin config. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

  initializeApp({ credential: cert(serviceAccount), databaseURL });
}

/**
 * Firebase Admin Auth — for verifying session cookies and minting tokens server-side.
 */
export const getFirebaseAdminAuth = (): Auth => {
  ensureAdminAppInitialized();
  if (!adminAuth) adminAuth = getAuth();
  return adminAuth;
};

/**
 * Firebase Admin Realtime Database — bypasses all security rules.
 * ONLY use in trusted server code (API routes / server actions).
 * Never import this in client components or pages bundles.
 */
export const getAdminDb = (): Database => {
  ensureAdminAppInitialized();
  if (!adminDb) adminDb = getDatabase();
  return adminDb;
};
