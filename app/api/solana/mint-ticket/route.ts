import { NextResponse } from 'next/server';
import { getConnection, getServerKeypair } from '@/lib/solana/connection';
import { mintTripTicketNFT, TripTicketMetadata } from '@/lib/solana/tripTicket';
import { getAdminDb } from '@/lib/firebaseAdmin';

// Important: Next.js API Routes need this to avoid timeout on Devnet
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { passengerId, passengerWallet, bookingId, fare, route, driverName } = body;

        if (!passengerId || !passengerWallet || !bookingId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        console.log(`🎟️ [Trip Ticket] Starting mint for booking ${bookingId}`);

        const connection = getConnection();
        const serverKeypair = getServerKeypair();

        const metadataDetails: TripTicketMetadata = {
            tripId: bookingId,
            route: route || 'Unknown Route',
            fare: fare?.toString() || '0',
            driverName: driverName || 'Yatra Driver',
            tripDate: new Date().toISOString(),
        };

        const mintResult = await mintTripTicketNFT(
            connection,
            serverKeypair,
            passengerWallet,
            metadataDetails
        );

        console.log(`✅ [Trip Ticket] Minted to ${passengerWallet}`);

        // Update Firebase with Mint Result using Admin SDK
        const adminDb = getAdminDb();
        const bookingRef = adminDb.ref(`bookings/${bookingId}`);

        await bookingRef.update({
            receipt: {
                mintAddress: mintResult.mintAddress,
                txSignature: mintResult.signature,
                explorerLink: mintResult.explorerLink,
                status: 'minted',
                mintedAt: new Date().toISOString()
            }
        });

        console.log(`🔥 [Firebase] Updated booking ${bookingId} with receipt`);

        return NextResponse.json({ success: true, receipt: mintResult });

    } catch (error: any) {
        console.error('❌ [Trip Ticket] API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
