'use client';

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LiveUser, VehicleTypeId } from '@/lib/types';

// Helper to determine the emoji based on role and vehicle type
const getVehicleEmoji = (role: 'driver' | 'passenger', vehicleType?: string) => {
    if (role === 'passenger') return '👤';

    switch (vehicleType as VehicleTypeId) {
        case 'bike': return '🏍️';
        case 'bus': return '🚌';
        case 'taxi': return '🚕';
        case 'others': return '🚗';
        default: return '🚗'; // Default fallback for drivers
    }
};

const createRoleIcon = (role: 'driver' | 'passenger', vehicleType?: string) => {
    const label = getVehicleEmoji(role, vehicleType);

    return L.divIcon({
        html: `<div style="font-size: 28px; line-height: 1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${label}</div>`,
        className: 'custom-hackathon-icon flex items-center justify-center transition-transform hover:scale-110',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

export default function LiveUserMarker({
    user,
    onClick,
    onPopupClose,
    routeInfo
}: {
    user: LiveUser;
    onClick?: () => void;
    onPopupClose?: () => void;
    routeInfo?: { distance: number; duration: number } | null;
}) {
    const position: [number, number] = [user.lat, user.lng];

    // Pass vehicleType to the icon creator
    const icon = createRoleIcon(user.role, user.vehicleType);
    const isVerified = user.role === 'driver' && !!user.verificationBadge;
    const currentEmoji = getVehicleEmoji(user.role, user.vehicleType);

    return (
        <Marker
            position={position}
            icon={icon}
            eventHandlers={{
                click: onClick,
                popupclose: onPopupClose
            }}
        >
            <Popup className="custom-popup min-w-[220px]">
                <div className="flex flex-col overflow-hidden rounded-xl border-0 shadow-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 pb-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{currentEmoji}</span>
                                <span className="font-bold capitalize text-white tracking-wide text-[15px]">
                                    {user.role === 'driver' && user.vehicleType ? user.vehicleType : user.role}
                                </span>
                            </div>

                            {/* Solana Verified badge */}
                            {isVerified && (
                                <span
                                    title="Verified on Solana Devnet"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                                    style={{
                                        background: 'rgba(16,185,129,0.15)',
                                        border: '1px solid rgba(16,185,129,0.4)',
                                        color: '#34d399',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    ✅ Solana Verified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="bg-white px-4 pt-4 pb-3 flex flex-col -mt-2 rounded-t-xl z-10 relative shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-3 w-3">
                                {user.isOnline && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                            </div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${user.isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {user.isOnline ? 'Active Now' : 'Offline'}
                            </span>
                        </div>

                        {/* Verification detail link */}
                        {isVerified && user.verificationBadge && (
                            <a
                                href={user.verificationBadge.explorerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mb-2 text-[10px] text-emerald-600 underline break-all font-mono"
                            >
                                View token on Solana Explorer ↗
                            </a>
                        )}

                        {/* Route Info Section - Populated by OSRM logic */}
                        {routeInfo && (
                            <div className="mt-3 bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Distance</span>
                                    <span className="font-bold text-blue-700 text-sm">{routeInfo.distance.toFixed(2)} KM</span>
                                </div>
                                <div className="h-[1px] w-full bg-blue-100/80"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">ETA</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-black text-blue-600 text-lg">{Math.round(routeInfo.duration)}</span>
                                        <span className="text-blue-500 font-bold text-xs uppercase">Min</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}