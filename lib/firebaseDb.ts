import { getDatabase, ref, set, update, onValue, push, get, onDisconnect } from 'firebase/database';
import { getFirebaseApp } from './firebase';
import { Bus, Booking, Location, LiveUser } from './types';

const getDb = () => getDatabase(getFirebaseApp());

// --- Bus Functions ---

export const subscribeToBuses = (callback: (buses: Bus[]) => void) => {
    const db = getDb();
    const busesRef = ref(db, 'buses');

    const unsubscribe = onValue(busesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const busesList = Object.values(data).map((bus: any) => {
                // Parse Location timestamps properly
                if (bus.currentLocation) {
                    const timestamp = bus.currentLocation.timestamp instanceof Date
                        ? bus.currentLocation.timestamp
                        : typeof bus.currentLocation.timestamp === 'string'
                            ? new Date(bus.currentLocation.timestamp)
                            : new Date();

                    return {
                        ...bus,
                        currentLocation: {
                            ...bus.currentLocation,
                            timestamp,
                        },
                    };
                }
                return bus;
            }) as Bus[];
            callback(busesList);
        } else {
            callback([]);
        }
    });

    return unsubscribe;
};

export const updateBusLocation = async (
    busId: string,
    location: { lat: number; lng: number; heading?: number; speed?: number }
) => {
    const db = getDb();
    // Write high-frequency updates to separate 'locations' node
    const locationRef = ref(db, `locations/${busId}`);

    // Serialize location with timestamp as ISO string for Firebase
    const locationData = {
        id: busId,           // ✅ Required: subscribeToLiveUsers reads entry.id
        role: 'driver',      // ✅ Required: filter checks entry.role
        isOnline: true,      // ✅ Required: filter checks entry.isOnline
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString(),
        ...(location.heading !== undefined && { heading: location.heading }),
        ...(location.speed !== undefined && { speed: location.speed }),
    };

    await set(locationRef, locationData);

    // Update active status in main bus object (low frequency)
    // We do NOT write location here anymore to save bandwidth
    const busMainRef = ref(db, `buses/${busId}`);
    await update(busMainRef, {
        locationSharingEnabled: true,
        isActive: true,
    });
};

export const setDriverOffline = async (driverId: string) => {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const locationRef = ref(db, `locations/${driverId}`);
    const busRef = ref(db, `buses/${driverId}`);

    await Promise.all([
        update(locationRef, {
            id: driverId,
            role: 'driver',
            isOnline: false,
            timestamp: nowIso,
        }),
        update(busRef, {
            isActive: false,
            locationSharingEnabled: false,
        }),
    ]);
};

/**
 * Registers RTDB presence hooks for a driver so dead-zone disconnects immediately
 * mark the bus offline via onDisconnect().
 *
 * Return value is an async cleanup function that cancels onDisconnect hooks.
 */
export const attachDriverPresence = (driverId: string) => {
    const db = getDb();
    const connectedRef = ref(db, '.info/connected');
    const locationRef = ref(db, `locations/${driverId}`);
    const busRef = ref(db, `buses/${driverId}`);

    const unsubscribe = onValue(connectedRef, async (snapshot) => {
        if (snapshot.val() !== true) return;

        try {
            await Promise.all([
                onDisconnect(locationRef).update({
                    id: driverId,
                    role: 'driver',
                    isOnline: false,
                }),
                onDisconnect(busRef).update({
                    isActive: false,
                    locationSharingEnabled: false,
                }),
                update(busRef, {
                    isActive: true,
                    locationSharingEnabled: true,
                }),
            ]);
        } catch (error) {
            console.error('[Presence] Failed to attach onDisconnect handlers:', error);
        }
    });

    return async () => {
        unsubscribe();
        await Promise.allSettled([
            onDisconnect(locationRef).cancel(),
            onDisconnect(busRef).cancel(),
        ]);
    };
};

/**
 * Update location sharing status for a bus
 * @param busId - Bus ID
 * @param enabled - Whether location sharing is enabled
 */
export const updateLocationSharingStatus = async (busId: string, enabled: boolean) => {
    const db = getDb();
    const busRef = ref(db, `buses/${busId}`);
    const updates: Record<string, boolean> = {
        locationSharingEnabled: enabled,
        isActive: enabled,
    };

    await update(busRef, updates);

    if (!enabled) {
        const locationRef = ref(db, `locations/${busId}`);
        await update(locationRef, {
            id: busId,
            role: 'driver',
            isOnline: false,
            timestamp: new Date().toISOString(),
        });
    }
};

export interface TripRequest {
    id: string;
    busId: string;
    passengerId: string;
    passengerName: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    createdAt: string;
    pickupLocation?: { lat: number; lng: number; address?: string };
    dropoffLocation?: { lat: number; lng: number; address?: string };
}

export const subscribeToTripRequests = (
    busId: string,
    callback: (requests: TripRequest[]) => void
) => {
    const db = getDb();
    const tripRequestsRef = ref(db, `tripRequests/${busId}`);

    const unsubscribe = onValue(tripRequestsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const requests = Object.values(data) as TripRequest[];
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(requests);
    });

    return unsubscribe;
};

/**
 * Subscribe to real-time location updates for a specific bus
 * @param busId - Bus ID to listen to
 * @param callback - Callback function that receives location updates
 * @returns Unsubscribe function
 */
export const subscribeToBusLocation = (
    busId: string,
    callback: (location: { lat: number; lng: number; timestamp: string; heading?: number; speed?: number } | null) => void
) => {
    const db = getDb();
    // Listen to separate 'locations' node
    const locationRef = ref(db, `locations/${busId}`);

    const unsubscribe = onValue(locationRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback({
                lat: data.lat,
                lng: data.lng,
                timestamp: data.timestamp || new Date().toISOString(),
                heading: data.heading,
                speed: data.speed,
            });
        } else {
            callback(null);
        }
    });

    return unsubscribe;
};

export const updateBusSeatStatus = async (busId: string, online: number, offline: number) => {
    const db = getDb();
    const busRef = ref(db, `buses/${busId}`);

    // Get capacity first to calculate available
    const snapshot = await get(busRef);
    const bus = snapshot.val() as Bus;

    if (bus) {
        const available = Math.max(0, bus.capacity - online - offline);
        await update(busRef, {
            onlineBookedSeats: online,
            offlineOccupiedSeats: offline,
            availableSeats: available,
            lastSeatUpdate: new Date().toISOString()
        });
    }
};

// --- Booking Functions ---

export const createBooking = async (booking: Omit<Booking, 'id'>) => {
    const db = getDb();
    const bookingsRef = ref(db, 'bookings');
    const newBookingRef = push(bookingsRef);

    const newBooking = {
        ...booking,
        id: newBookingRef.key,
        timestamp: new Date().toISOString()
    };

    await set(newBookingRef, newBooking);
    return newBooking;
};

export const subscribeToBookings = (
    id: string,
    role: 'driver' | 'passenger' | 'admin',
    callback: (bookings: Booking[]) => void
) => {
    const db = getDb();
    const bookingsRef = ref(db, 'bookings');

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const allBookings = Object.values(data) as Booking[];
            // Filter based on role
            const filtered = allBookings.filter((b) => {
                if (role === 'admin') return true;
                if (role === 'passenger') {
                    // id = passengerId
                    return b.passengerId === id;
                }
                // role === 'driver' -> id = busId
                return b.busId === id;
            });
            callback(filtered);
        } else {
            callback([]);
        }
    });

    return unsubscribe;
};

// --- User Profile Functions ---

export const createUserProfile = async (userId: string, userData: any) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);
    await set(userRef, {
        ...userData,
        id: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

export const getUserProfile = async (userId: string) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
};

export const updateUserProfile = async (userId: string, updates: any) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
    });
};

export const registerPushToken = async (userId: string, token: string) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const existing = snapshot.exists() ? snapshot.val() : {};
    const existingTokens = Array.isArray(existing.pushTokens) ? existing.pushTokens : [];
    const nextTokens = Array.from(new Set([...existingTokens, token]));

    await update(userRef, {
        pushTokens: nextTokens,
        updatedAt: new Date().toISOString(),
    });
};

export const updateDriverVerificationStatus = async (
    userId: string,
    badgeData: { mintAddress: string; txSignature: string; explorerLink: string; verifiedAt: string }
) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
        verificationBadge: badgeData,
        isApproved: true, // Automatically mark as approved if verified on-chain
        updatedAt: new Date().toISOString()
    });
};

export const subscribeToUserProfile = (userId: string, callback: (userData: any) => void) => {
    const db = getDb();
    const userRef = ref(db, `users/${userId}`);

    const unsubscribe = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        callback(data || null);
    });

    return unsubscribe;
};

// --- Alert Functions ---

export const createAlert = async (alertData: Omit<import('./types').Alert, 'id'>) => {
    const db = getDb();
    const alertsRef = ref(db, 'alerts');
    const newAlertRef = push(alertsRef);

    const newAlert = {
        ...alertData,
        id: newAlertRef.key,
        timestamp: new Date().toISOString(),
        status: 'active'
    };

    await set(newAlertRef, newAlert);
    return newAlert;
};

export const resolveAlert = async (alertId: string) => {
    const db = getDb();
    const alertRef = ref(db, `alerts/${alertId}`);
    await update(alertRef, {
        status: 'resolved',
        resolvedAt: new Date().toISOString()
    });
};

export const subscribeToAlerts = (callback: (alerts: import('./types').Alert[]) => void) => {
    const db = getDb();
    const alertsRef = ref(db, 'alerts');

    const unsubscribe = onValue(alertsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const alertsList = Object.values(data) as import('./types').Alert[];
            // Sort by timestamp desc
            alertsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(alertsList);
        } else {
            callback([]);
        }
    });

    return unsubscribe;
};

// --- Seed Data (for demo) ---
export const seedInitialData = async (buses: Bus[]) => {
    const db = getDb();
    const busesRef = ref(db, 'buses');

    // Check if data exists
    const snapshot = await get(busesRef);
    if (!snapshot.exists()) {
        const updates: Record<string, any> = {};
        buses.forEach(bus => {
            updates[bus.id] = bus;
        });
        await update(busesRef, updates);
        console.log('Seeded initial bus data');
    }
};

// --- Live User Functions (Real-Time GPS Tracking) ---
// All real-time GPS updates are stored under `locations/{id}` to align with
// the existing bus-tracking architecture. The `role` field allows map-side
// role-based visibility filtering.

export const subscribeToLiveUsers = (callback: (users: LiveUser[]) => void) => {
    const db = getDb();
    // Listen to `locations` node — the canonical real-time GPS store
    const locationsRef = ref(db, 'locations');

    const unsubscribe = onValue(locationsRef, async (snapshot) => {
        const data = snapshot.val() || {};
        console.log('🔥 LOCATIONS SNAPSHOT:', data);

        // Build base LiveUser list from location entries that have a role
        const rawList = (Object.values(data) as any[])
            .filter((entry) => entry.role && entry.lat && entry.lng)
            .map((entry) => ({
                id: entry.id,
                role: entry.role as 'driver' | 'passenger',
                lat: entry.lat,
                lng: entry.lng,
                isOnline: entry.isOnline ?? true,
                timestamp: entry.timestamp,
                route: entry.route,
                vehicleType: entry.vehicleType,          // ✅ needed for driver markers
                requestStatus: entry.requestStatus,      // ✅ needed for visibility filter
            })) as LiveUser[];

        // For drivers, fetch their user profile to attach verificationBadge.
        // One-shot get() per driver so the badge shows in the passenger popup.
        const list = await Promise.all(
            rawList.map(async (user) => {
                if (user.role !== 'driver') return user;
                try {
                    const userRef = ref(db, `users/${user.id}`);
                    const userSnap = await get(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.val();
                        if (userData.verificationBadge) {
                            return { ...user, verificationBadge: userData.verificationBadge };
                        }
                    }
                } catch {
                    // Non-fatal: badge just won't show for this driver
                }
                return user;
            })
        );

        callback(list);
    });

    return unsubscribe;
};

export const updateLiveUserStatus = async (user: LiveUser) => {
    const db = getDb();

    const locationPayload: Record<string, any> = {
        id: user.id,
        role: user.role,
        lat: user.lat,
        lng: user.lng,
        isOnline: user.isOnline,
        timestamp: typeof user.timestamp === 'number'
            ? new Date(user.timestamp).toISOString()
            : user.timestamp,
        // ✅ Include optional fields so filters can read them
        ...(user.route ? { route: user.route } : {}),
        ...(user.vehicleType ? { vehicleType: user.vehicleType } : {}),
        ...(user.requestStatus ? { requestStatus: user.requestStatus } : {}),
    };

    // Write to `locations` node — read by subscribeToLiveUsers on the map
    const locationRef = ref(db, `locations/${user.id}`);
    await set(locationRef, locationPayload);
    console.log('📡 LOCATION WRITTEN:', locationPayload);

    // If this is a driver, also keep `buses/{id}/currentLocation` up to date
    // so the bus list / existing bus-tracking components stay in sync.
    if (user.role === 'driver' && user.isOnline) {
        const busRef = ref(db, `buses/${user.id}`);
        const busSnapshot = await get(busRef);
        if (busSnapshot.exists()) {
            await update(busRef, {
                currentLocation: {
                    lat: user.lat,
                    lng: user.lng,
                    timestamp: locationPayload.timestamp,
                },
                locationSharingEnabled: true,
                isActive: true,
            });
        }
    }
};
