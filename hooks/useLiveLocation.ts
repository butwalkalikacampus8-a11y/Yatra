import { useEffect, useState, useRef } from 'react';
import { updateLiveUserStatus } from '@/lib/firebaseDb';
import { LiveUser, VehicleTypeId } from '@/lib/types';

export function useLiveLocation(
    id: string | undefined,
    role: 'driver' | 'passenger' | 'admin' | undefined,
    initialTracking: boolean = false,
    route?: string,
    vehicleType?: VehicleTypeId // 👈 UPDATED: Using VehicleTypeId
) {
    const [isTracking, setIsTracking] = useState(initialTracking);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lastPushRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
    const watchIdRef = useRef<number | null>(null);

    const toggleTracking = () => {
        setIsTracking((prev) => !prev);
    };

    useEffect(() => {
        if (!isTracking || !id) {
            if (id && role) {
                const validRole = role as 'driver' | 'passenger';
                updateLiveUserStatus({
                    id,
                    role: validRole,
                    lat: location?.lat || 0,
                    lng: location?.lng || 0,
                    isOnline: false,
                    timestamp: new Date().toISOString(),
                    vehicleType // 👈 Include when going offline
                }).catch(console.error);
            }

            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const now = Date.now();

                let shouldUpdate = false;
                if (!lastPushRef.current) {
                    shouldUpdate = true;
                } else {
                    const timeElapsed = now - lastPushRef.current.time;
                    if (timeElapsed >= 3000) {
                        shouldUpdate = true;
                    }
                }

                if (shouldUpdate) {
                    console.log("📍 SENDING LOCATION:", {
                        id,
                        role,
                        vehicleType, // 👈 Log to verify it's sending
                        lat: latitude,
                        lng: longitude
                    });
                    setLocation({ lat: latitude, lng: longitude });

                    if (id && role) {
                        const validRole = role as 'driver' | 'passenger';

                        const userPayload: LiveUser = {
                            id,
                            role: validRole,
                            lat: latitude,
                            lng: longitude,
                            isOnline: true,
                            timestamp: new Date(now).toISOString(),
                            vehicleType, // 👈 CRITICAL: Push this to Firebase
                            ...(route ? { route } : {})
                        };

                        updateLiveUserStatus(userPayload).catch((err) => {
                            console.error('Failed to update live location in Firebase:', err);
                        });
                    }

                    lastPushRef.current = { lat: latitude, lng: longitude, time: now };
                }
            },
            (err) => {
                setError(err.message);
                console.error('Geolocation watch error:', err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
        // Added vehicleType to dependency array
    }, [isTracking, id, role, vehicleType, route]);

    return {
        location,
        isTracking,
        toggleTracking,
        error
    };
}