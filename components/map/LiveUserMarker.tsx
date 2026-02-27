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
            <Popup>
                <div className="p-2 text-sm text-center">
                    <div className="font-bold capitalize">{user.role}</div>
                    <div className="text-gray-500 text-xs mt-1">
                        Status: {user.isOnline ? '🟢 Online' : '⚪ Offline'}
                    </div>
                    {routeInfo && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1 text-left">
                            <div className="font-semibold text-blue-600 text-[13px]">
                                Distance: {routeInfo.distance.toFixed(2)} KM
                            </div>
                            <div className="font-semibold text-blue-600 text-[13px]">
                                ETA: {Math.round(routeInfo.duration)} min
                            </div>
                        </div>
                    )}
                </div>
            </Popup>
        </Marker>
    );
}
