'use client';

import React, { Component, ReactNode, useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Passenger, LiveUser, VehicleTypeId } from '@/lib/types';
import { DEFAULT_LOCATION } from '@/lib/constants';
import { subscribeToLiveUsers } from '@/lib/firebaseDb';
import LiveUserMarker from './LiveUserMarker';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { getRoute } from '@/lib/routing/osrm';
// IMPORTANT: Import your Auth hook and Firestore functions
import { useAuth } from '@/lib/contexts/AuthContext';

// Fix for default Leaflet marker icons in Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface LeafletMapProps {
    role: 'driver' | 'passenger' | 'admin';
    buses?: Bus[];
    passengers?: Passenger[];
    selectedBus?: Bus | null;
    onBusSelect?: (bus: Bus) => void;
    onLocationSelect?: (location: { lat: number; lng: number }) => void;
    showRoute?: boolean;
    pickupLocation?: { lat: number; lng: number; address?: string } | null;
    dropoffLocation?: { lat: number; lng: number; address?: string } | null;
    userLocation?: { lat: number; lng: number } | null;
    pickupProximityLevel?: 'far' | 'approaching' | 'nearby' | 'arrived' | null;
    busETAs?: Record<string, number | null>;
    busLocations?: Record<string, { lat: number; lng: number; timestamp: string; heading?: number; speed?: number }>;
}

function MapUpdater({ center, selectedUserId, userLocation }: { center: { lat: number; lng: number }, selectedUserId?: string, userLocation?: { lat: number; lng: number } | null }) {
    const map = useMap();
    const [lastUserId, setLastUserId] = useState<string | undefined>(undefined);
    const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
    const [lastCenteredLat, setLastCenteredLat] = useState<number | null>(null);

    useEffect(() => {
        if (selectedUserId && selectedUserId !== lastUserId) {
            map.flyTo([center.lat, center.lng], 16);
            setLastUserId(selectedUserId);
        }
    }, [center, selectedUserId, lastUserId, map]);

    useEffect(() => {
        if (!userLocation) return;
        const movedSignificantly = lastCenteredLat !== null &&
            Math.abs(userLocation.lat - lastCenteredLat) > 0.5;

        if (!hasCenteredOnUser || movedSignificantly) {
            map.flyTo([userLocation.lat, userLocation.lng], 16);
            setHasCenteredOnUser(true);
            setLastCenteredLat(userLocation.lat);
        }
    }, [userLocation, hasCenteredOnUser, lastCenteredLat, map]);

    return null;
}

const createLocationIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-location-icon',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 900; pointer-events: auto;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

function MapEvents({ onLocationSelect, role }: { onLocationSelect?: (loc: { lat: number; lng: number }) => void; role: string; }) {
    useMapEvents({
        click(e) {
            if (onLocationSelect && role === 'passenger') {
                onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        },
    });
    return null;
}

function MapControls({ initialCenter, userLocation }: { initialCenter: { lat: number; lng: number }; userLocation?: { lat: number; lng: number } | null; }) {
    const map = useMap();
    const [locating, setLocating] = useState(false);

    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();
    const handleResetView = () => map.setView([initialCenter.lat, initialCenter.lng], 15);

    const handleLocateUser = () => {
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 16);
            return;
        }
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 16);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
            <button onClick={handleZoomIn} className="rounded-full bg-white shadow-md w-12 h-12 flex items-center justify-center text-xl">+</button>
            <button onClick={handleZoomOut} className="rounded-full bg-white shadow-md w-12 h-12 flex items-center justify-center text-xl">−</button>
            <button onClick={handleResetView} className="rounded-full bg-white shadow-md w-12 h-12 flex items-center justify-center text-base">⟳</button>
            <button onClick={handleLocateUser} disabled={locating} className="rounded-full bg-blue-500 text-white shadow-md w-12 h-12 flex items-center justify-center text-base disabled:opacity-60">{locating ? '…' : '◎'}</button>
        </div>
    );
}

function TrackingControls({ role, isTracking, onToggleTracking, currentPosition }: { role: string; isTracking: boolean; onToggleTracking: () => void; currentPosition: [number, number] | null }) {
    if (role === 'admin') return null;
    return (
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
            <button
                type="button"
                onClick={onToggleTracking}
                className={`px-5 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-md border border-white/20 ${isTracking ? 'bg-emerald-500/90 text-white shadow-emerald-500/30' : 'bg-slate-800/90 text-white shadow-slate-900/20'}`}
            >
                <div className={`w-3 h-3 rounded-full shadow-inner ${isTracking ? 'bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-slate-400'}`}></div>
                {isTracking ? 'ONLINE - Tracking' : 'GO ONLINE'}
            </button>
            {currentPosition && (
                <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40 text-xs font-mono flex gap-3 items-center">
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 text-[9px] uppercase font-bold tracking-widest">LNG</span>
                        <span className="font-semibold text-gray-800">{currentPosition[1].toFixed(4)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

// Error boundary code...
class MapErrorBoundary extends Component<{ children: ReactNode, onRetry?: () => void }, { hasError: boolean, message?: string }> {
    state = { hasError: false, message: undefined as string | undefined };
    static getDerivedStateFromError(error: Error) { return { hasError: true, message: error.message }; }
    render() {
        if (this.state.hasError) return (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-50 text-center">
                <div><p className="text-red-600 font-medium">Unable to load map.</p><button onClick={() => { this.setState({ hasError: false }); this.props.onRetry?.(); }} className="mt-2 bg-blue-600 text-white px-4 py-1 rounded">Retry</button></div>
            </div>
        );
        return this.props.children;
    }
}

function LeafletMapInner({ role, onLocationSelect, pickupLocation, dropoffLocation, userLocation, buses = [] }: LeafletMapProps) {
    const { currentUser } = useAuth(); // FIX: Access real UID
    const [mounted, setMounted] = useState(false);
    const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
    const [vehicleType, setVehicleType] = useState<VehicleTypeId | undefined>(undefined);

    // Routing States
    const [selectedUser, setSelectedUser] = useState<LiveUser | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.LineString | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

    // FIX: STABLE ID from Auth UID
    const stableId = useMemo(() => {
        if (currentUser?.uid) return currentUser.uid;
        // Fallback for demo/unauth only
        return role + "_" + Math.random().toString(36).substring(2, 7);
    }, [currentUser, role]);

    const driverRoute = role === 'driver' ? (buses?.[0]?.route || 'Route 1') : undefined;

    // Call custom hook for pushing our own location to Firebase
    const { isTracking, toggleTracking, location: liveLocation } = useLiveLocation(
        stableId,
        role === 'admin' ? undefined : (role as 'driver' | 'passenger'),
        false,
        driverRoute
    );

    useEffect(() => {
        if (liveLocation) {
            setCurrentPosition([liveLocation.lat, liveLocation.lng]);
        } else if (userLocation && !currentPosition) {
            setCurrentPosition([userLocation.lat, userLocation.lng]);
        }
    }, [liveLocation, userLocation]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const unsubscribe = subscribeToLiveUsers((users) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const visibleUsers = users.filter((u: any) => {
                    if (!u.lat || !u.lng) return false;
                    if (!u.isOnline) return false;
                    if (u.id === stableId) return false; // Hide self
                    if (role === "admin") return true;
                    if (role === "driver" && u.role === "passenger") return true;
                    if (role === "passenger" && u.role === "driver") return true;
                    return false;
                });
                setLiveUsers(visibleUsers);
            }, 300);
        });
        return () => { unsubscribe(); clearTimeout(timeout); };
    }, [role, stableId]);

    useEffect(() => {
        const prev = (L.Marker.prototype as any).options.icon;
        (L.Marker.prototype as any).options.icon = DefaultIcon;
        setMounted(true);
        return () => { (L.Marker.prototype as any).options.icon = prev; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (!selectedUser) {
            setRouteGeoJSON(null); setRouteInfo(null); return;
        }
        if (currentPosition && selectedUser) {
            getRoute(currentPosition[0], currentPosition[1], selectedUser.lat, selectedUser.lng)
                .then((res) => {
                    if (isMounted && res) {
                        setRouteGeoJSON(res.geometry);
                        setRouteInfo({ distance: res.distance, duration: res.duration });
                    }
                });
        }
        return () => { isMounted = false; };
    }, [selectedUser, currentPosition]);

    if (!mounted) return <div className="w-full h-full min-h-[300px] bg-gray-100 flex items-center justify-center"><div className="animate-pulse w-11/12 h-64 bg-gray-200 rounded-lg" /></div>;

    let center = DEFAULT_LOCATION;
    if (selectedUser) center = { lat: selectedUser.lat, lng: selectedUser.lng };
    else if (userLocation) center = userLocation;
    else if (currentPosition) center = { lat: currentPosition[0], lng: currentPosition[1] };

    return (
        <div className="relative w-full h-full min-h-[400px]">
            <MapContainer center={[center.lat, center.lng]} zoom={15} className="w-full h-full" zoomControl={false}>
                <MapEvents onLocationSelect={onLocationSelect} role={role} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={center} selectedUserId={selectedUser?.id} userLocation={userLocation} />
                <MapControls initialCenter={center} userLocation={userLocation} />
                <TrackingControls role={role} isTracking={isTracking} onToggleTracking={toggleTracking} currentPosition={currentPosition} />

                {currentPosition && <Marker position={currentPosition} zIndexOffset={1200}><Popup>You (Live)</Popup></Marker>}

                {liveUsers.map((user) => (
                    <LiveUserMarker
                        key={`${user.id}-${user.timestamp}`}
                        user={user}
                        onClick={() => setSelectedUser(user)}
                        onPopupClose={() => setSelectedUser(null)}
                        routeInfo={selectedUser?.id === user.id ? routeInfo : null}
                    />
                ))}

                {routeGeoJSON && <GeoJSON data={routeGeoJSON} style={{ color: "blue", weight: 5, opacity: 0.7 }} />}

                {pickupLocation && (
                    <>
                        <Circle center={[pickupLocation.lat, pickupLocation.lng]} radius={100} pathOptions={{ color: '#22c55e' }} />
                        <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={createLocationIcon('#10b981')}><Popup>Pickup</Popup></Marker>
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default function LeafletMap(props: LeafletMapProps) {
    const [retryKey, setRetryKey] = useState(0);
    return (
        <MapErrorBoundary onRetry={() => setRetryKey(k => k + 1)}>
            <LeafletMapInner key={retryKey} {...props} />
        </MapErrorBoundary>
    );
}