import { Bus, Booking } from './types';
import { getDatabase, ref, update, get, onValue, off } from 'firebase/database';
import { getFirebaseApp } from './firebase';

/**
 * Calculate available seats based on capacity and current bookings
 */
export function calculateAvailableSeats(bus: Bus): number {
    const available = bus.capacity - bus.onlineBookedSeats - bus.offlineOccupiedSeats;
    return Math.max(0, available); // Never return negative
}

/**
 * Check if bus can accommodate a booking request
 */
export function canAccommodateBooking(bus: Bus, numberOfPassengers: number): boolean {
    const available = calculateAvailableSeats(bus);
    return available >= numberOfPassengers;
}

/**
 * Update offline passenger count in Firebase Realtime Database
 */
export async function updateOfflineSeats(
    busId: string,
    offlineSeats: number
): Promise<void> {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const busRef = ref(db, `buses/${busId}`);

    // Ensure non-negative
    const validOfflineSeats = Math.max(0, offlineSeats);

    // Get current bus data to calculate available seats
    const snapshot = await get(busRef);
    if (!snapshot.exists()) {
        throw new Error(`Bus ${busId} not found`);
    }

    const busData = snapshot.val();
    const capacity = busData.capacity || 0;
    const onlineBooked = busData.onlineBookedSeats || 0;
    const availableSeats = capacity - onlineBooked - validOfflineSeats;

    await update(busRef, {
        offlineOccupiedSeats: validOfflineSeats,
        availableSeats: Math.max(0, availableSeats),
        lastSeatUpdate: new Date().toISOString(),
    });
}

/**
 * Increment offline passenger count
 */
export async function addOfflinePassenger(busId: string): Promise<void> {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const busRef = ref(db, `buses/${busId}`);

    const snapshot = await get(busRef);
    if (!snapshot.exists()) {
        throw new Error(`Bus ${busId} not found`);
    }

    const busData = snapshot.val();
    const currentOffline = busData.offlineOccupiedSeats || 0;
    const capacity = busData.capacity || 0;
    const onlineBooked = busData.onlineBookedSeats || 0;

    // Don't exceed capacity
    if (currentOffline + onlineBooked >= capacity) {
        throw new Error('Bus is at full capacity');
    }

    await updateOfflineSeats(busId, currentOffline + 1);
}

/**
 * Decrement offline passenger count
 */
export async function removeOfflinePassenger(busId: string): Promise<void> {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const busRef = ref(db, `buses/${busId}`);

    const snapshot = await get(busRef);
    if (!snapshot.exists()) {
        throw new Error(`Bus ${busId} not found`);
    }

    const busData = snapshot.val();
    const currentOffline = busData.offlineOccupiedSeats || 0;

    // Don't go below zero
    if (currentOffline <= 0) {
        return;
    }

    await updateOfflineSeats(busId, currentOffline - 1);
}

/**
 * Update online booked seats count
 */
export async function updateOnlineBookedSeats(
    busId: string,
    onlineSeats: number
): Promise<void> {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const busRef = ref(db, `buses/${busId}`);

    const validOnlineSeats = Math.max(0, onlineSeats);

    const snapshot = await get(busRef);
    if (!snapshot.exists()) {
        throw new Error(`Bus ${busId} not found`);
    }

    const busData = snapshot.val();
    const capacity = busData.capacity || 0;
    const offlineOccupied = busData.offlineOccupiedSeats || 0;
    const availableSeats = capacity - validOnlineSeats - offlineOccupied;

    await update(busRef, {
        onlineBookedSeats: validOnlineSeats,
        availableSeats: Math.max(0, availableSeats),
        lastSeatUpdate: new Date().toISOString(),
    });
}

/**
 * Subscribe to real-time seat updates for a bus
 */
export function subscribeToBusSeatUpdates(
    busId: string,
    callback: (bus: any) => void
): () => void {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const busRef = ref(db, `buses/${busId}`);

    onValue(busRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    });

    // Return unsubscribe function
    return () => off(busRef);
}

/**
 * Check if a booking has expired (10 minutes timeout)
 */
export function isBookingExpired(booking: Booking): boolean {
    if (!booking.reservationExpiresAt) {
        return false;
    }

    const expirationTime = new Date(booking.reservationExpiresAt).getTime();
    const now = new Date().getTime();

    return now > expirationTime;
}

/**
 * Create a new booking with expiration time
 */
export function createBookingWithTimeout(
    bookingData: Omit<Booking, 'reservationExpiresAt' | 'isExpired'>,
    timeoutMinutes: number = 10
): Booking {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

    return {
        ...bookingData,
        reservationExpiresAt: expiresAt,
        isExpired: false,
    };
}

/**
 * Expire old bookings and release their seats
 */
export async function expireOldBookings(busId: string): Promise<number> {
    const app = getFirebaseApp();
    const db = getDatabase(app);
    const bookingsRef = ref(db, `bookings`);

    const snapshot = await get(bookingsRef);
    if (!snapshot.exists()) {
        return 0;
    }

    const bookings = snapshot.val();
    let expiredCount = 0;
    let totalSeatsReleased = 0;

    for (const [bookingId, booking] of Object.entries(bookings as Record<string, any>)) {
        if (
            booking.busId === busId &&
            booking.status === 'pending' &&
            isBookingExpired(booking)
        ) {
            // Mark as expired
            await update(ref(db, `bookings/${bookingId}`), {
                status: 'expired',
                isExpired: true,
            });

            totalSeatsReleased += booking.numberOfPassengers || 0;
            expiredCount++;
        }
    }

    // Update online booked seats
    if (totalSeatsReleased > 0) {
        const busSnapshot = await get(ref(db, `buses/${busId}`));
        if (busSnapshot.exists()) {
            const busData = busSnapshot.val();
            const currentOnline = busData.onlineBookedSeats || 0;
            await updateOnlineBookedSeats(busId, currentOnline - totalSeatsReleased);
        }
    }

    return expiredCount;
}

/**
 * Format time ago (e.g., "30s ago", "2m ago")
 */
export function formatTimeAgo(date: Date | string): string {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) {
        return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes}m ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffSeconds / 86400);
        return `${days}d ago`;
    }
}
