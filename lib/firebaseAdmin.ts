import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminAuth: Auth | undefined;

export const getFirebaseAdminAuth = (): Auth => {
  if (!adminAuth) {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase admin configuration. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
      }

      const serviceAccount: ServiceAccount = {
        projectId,
        clientEmail,
        privateKey,
      };

      const databaseURL = process.env.FIREBASE_DATABASE_URL ||
        `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

      initializeApp({
        credential: cert(serviceAccount),
        databaseURL,
      });
    }

    adminAuth = getAuth();
  }

  return adminAuth;
};


