import { NextResponse } from 'next/server';
import { getConnection, getServerKeypair } from '@/lib/solana/connection';
import { createDriverVerificationBadge, BadgeMetadata } from '@/lib/solana/tokenExtensions';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { driverId, licenseNumber, driverName, vehicleType, driverWalletAddress } = body;

        // Validation
        if (!driverId || !licenseNumber || !driverName || !vehicleType || !driverWalletAddress) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Initialize Solana
        const connection = getConnection();
        const serverKeypair = getServerKeypair();

        const metadata: BadgeMetadata = {
            driverName,
            vehicleType,
            licenseNumber,
        };

        // Mint the Token-2022 Verification Badge
        const result = await createDriverVerificationBadge(
            connection,
            serverKeypair,
            driverWalletAddress,
            metadata
        );

        return NextResponse.json({
            success: true,
            mintAddress: result.mintAddress,
            signature: result.signature,
            explorerLink: result.explorerLink
        });

    } catch (error: any) {
        console.error('Verify Driver API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify driver' },
            { status: 500 }
        );
    }
}
