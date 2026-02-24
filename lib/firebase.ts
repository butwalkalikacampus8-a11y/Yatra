import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmail,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  type UserCredential,
} from 'firebase/auth';
// Client-side Firebase
let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    const clientConfig: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      databaseURL?: string;
    } = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };

    // Add databaseURL if provided, or use regional URL for asia-southeast1
    if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
      clientConfig.databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    } else if (clientConfig.projectId) {
      // Default to asia-southeast1 region based on the warning
      clientConfig.databaseURL = `https://${clientConfig.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
    }

    if (!clientConfig.apiKey) {
      throw new Error('Missing Firebase client configuration. Please set NEXT_PUBLIC_FIREBASE_* env vars.');
    }

    firebaseApp = getApps().length === 0 ? initializeApp(clientConfig) : getApps()[0]!;
  }

  return firebaseApp;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseAuth) {
    const app = getFirebaseApp();
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth;
};

export const getRecaptchaVerifier = async (containerId: string) => {
  if (typeof window === 'undefined') return null;
  const auth = getFirebaseAuth();

  if (!recaptchaVerifier) {
    // Modular SDK v9+ signature: new RecaptchaVerifier(auth, container, parameters)
    // We stick to this shape to avoid touching internal auth.settings.
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    });
    await recaptchaVerifier.render();
  }

  return recaptchaVerifier;
};

export const resetRecaptchaVerifier = async () => {
  if (recaptchaVerifier) {
    try {
      await recaptchaVerifier.clear();
    } catch {
      // ignore
    } finally {
      recaptchaVerifier = null;
    }
  }
};

export const signInWithPhone = async (
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult> => {
  const auth = getFirebaseAuth();
  const verifier = await getRecaptchaVerifier(recaptchaContainerId);
  if (!verifier) {
    throw new Error('reCAPTCHA is not available on the server side.');
  }

  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } finally {
    await resetRecaptchaVerifier();
  }
};

// Email/Password Authentication
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  const auth = getFirebaseAuth();
  return await firebaseSignInWithEmail(auth, email, password);
};

export const createUserWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  const auth = getFirebaseAuth();
  return await firebaseCreateUserWithEmail(auth, email, password);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const auth = getFirebaseAuth();
  return await firebaseSendPasswordReset(auth, email);
};
