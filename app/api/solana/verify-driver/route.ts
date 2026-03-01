import { NextResponse } from 'next/server';
import { getConnection, getServerKeypair } from '@/lib/solana/connection';
import { createDriverVerificationBadge, BadgeMetadata } from '@/lib/solana/tokenExtensions';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * POST /api/solana/verify-driver
 *
 * Mints a Token-2022 NonTransferable (soulbound) verification badge on Solana Devnet
 * for the given driver, then saves the badge data to Firebase Realtime Database using
 * the Admin SDK — bypassing security rules so the server-side write always succeeds
 * regardless of whether a session cookie is present.
 *
 * Body fields:
 *   driverId            — Firebase user ID of the driver
 *   driverName          — Driver's full name (stored in mint metadata)
 *   vehicleType         — Vehicle type string
 *   licenseNumber       — License number (SHA-256 hashed before storing)
 *   driverWalletAddress — Solana public key (base58) to receive the badge
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { driverId, licenseNumber, driverName, vehicleType, driverWalletAddress } = body;

        // ── Input validation ──────────────────────────────────────────────
        if (!driverId || !licenseNumber || !driverName || !vehicleType || !driverWalletAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: driverId, licenseNumber, driverName, vehicleType, driverWalletAddress' },
                { status: 400 }
            );
        }

        // ── Solana minting ────────────────────────────────────────────────
        const connection = getConnection();
        const serverKeypair = getServerKeypair();

        const metadata: BadgeMetadata = { driverName, vehicleType, licenseNumber };

        const result = await createDriverVerificationBadge(
            connection,
            serverKeypair,
            driverWalletAddress,
            metadata
        );

        // ── Persist badge data to Firebase via Admin SDK ──────────────────
        // Admin SDK bypasses security rules — no auth session required on the server.
        const adminDb = getAdminDb();
        const badgeData = {
            mintAddress: result.mintAddress,
            txSignature: result.signature,
            explorerLink: result.explorerLink,
            verifiedAt: new Date().toISOString(),
        };

        await adminDb.ref(`users/${driverId}`).update({
            verificationBadge: badgeData,
            isApproved: true,         // Blockchain-verified drivers are automatically approved
            updatedAt: new Date().toISOString(),
        });

        console.log(`[verify-driver] ✅ Badge minted and saved for driver ${driverId}:`, result.mintAddress);

        return NextResponse.json({
            success: true,
            mintAddress: result.mintAddress,
            signature: result.signature,
            explorerLink: result.explorerLink,
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to verify driver';
        console.error('[verify-driver] ❌ Error:', msg);
        return NextResponse.json(
            { error: msg },
            { status: 500 }
        );
    }
}
