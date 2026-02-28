import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LiveUser } from '@/lib/types';

// Custom modern SVG icons tailored for a hackathon demo
const getBusSvg = () => `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="#3b82f6" stroke="white" stroke-width="2"/>
  <path d="M7 16H17V9C17 7.34315 15.6569 6 14 6H10C8.34315 6 7 7.34315 7 9V16Z" fill="white"/>
  <rect x="8" y="10" width="8" height="3" rx="1" fill="#3b82f6"/>
  <circle cx="9.5" cy="14.5" r="1.5" fill="#1e40af"/>
  <circle cx="14.5" cy="14.5" r="1.5" fill="#1e40af"/>
</svg>`;

const getUserSvg = () => `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="#10b981" stroke="white" stroke-width="2"/>
  <circle cx="12" cy="9" r="3" fill="white"/>
  <path d="M7 17C7 14.2386 9.23858 12 12 12C14.7614 12 17 14.2386 17 17H7Z" fill="white"/>
</svg>`;

const createRoleIcon = (role: 'driver' | 'passenger') => {
    const rawSvg = role === 'driver' ? getBusSvg() : getUserSvg();
    const encodedSvg = encodeURIComponent(rawSvg);

    return L.icon({
        iconUrl: `data:image/svg+xml;charset=utf-8,${encodedSvg}`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
        className: 'custom-hackathon-icon drop-shadow-md transition-transform duration-300 hover:scale-110'
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
    const icon = createRoleIcon(user.role);

    return (
        <Marker
            position={position}
            icon={icon}
            eventHandlers={{
                click: onClick,
                popupclose: onPopupClose
            }}
        >
            <Popup className="custom-popup min-w-[200px]">
                <div className="flex flex-col overflow-hidden rounded-xl border-0 shadow-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{user.role === 'driver' ? '🚌' : '👤'}</span>
                            <span className="font-bold capitalize text-white tracking-wide text-[15px]">{user.role}</span>
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

                        {/* Route Info Section */}
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
