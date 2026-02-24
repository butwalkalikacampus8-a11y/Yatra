import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : require('../service-account.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const db = admin.database();
const auth = admin.auth();

async function makeAdmin(phoneNumberOrUid: string) {
    try {
        let uid = phoneNumberOrUid;

        // Check if input is a phone number (simple check)
        if (phoneNumberOrUid.startsWith('+')) {
            console.log(`Looking up user by phone: ${phoneNumberOrUid}...`);
            try {
                const userRecord = await auth.getUserByPhoneNumber(phoneNumberOrUid);
                uid = userRecord.uid;
                console.log(`Found user: ${userRecord.uid} (${userRecord.displayName || 'No Name'})`);
            } catch (error) {
                console.error('Error finding user by phone:', error);
                return;
            }
        }

        console.log(`Promoting user ${uid} to ADMIN...`);

        // Update Realtime Database
        await db.ref(`users/${uid}`).update({
            role: 'admin',
            updatedAt: new Date().toISOString()
        });

        // Set Custom Claims (optional, but good practice)
        await auth.setCustomUserClaims(uid, { role: 'admin' });

        console.log('✅ Success! User is now an Admin.');
        console.log('👉 They may need to sign out and sign back in for changes to take effect.');

        process.exit(0);
    } catch (error) {
        console.error('Error promoting user:', error);
        process.exit(1);
    }
}

// Get argument
const target = process.argv[2];

if (!target) {
    console.error('Please provide a User UID or Phone Number (e.g. +97798...)');
    console.log('Usage: npx tsx scripts/make-admin.ts <UID_OR_PHONE>');
    process.exit(1);
}

makeAdmin(target);
