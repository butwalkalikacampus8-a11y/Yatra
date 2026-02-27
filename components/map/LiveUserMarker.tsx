import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LiveUser } from '@/lib/types';

// Simple reusable icon creation based on role
const createRoleIcon = (role: 'driver' | 'passenger') => {
    const color = role === 'driver' ? '#3b82f6' : '#10b981'; // Blue for driver, Green for passenger
    const label = role === 'driver' ? '🚌' : '👤';

    return L.divIcon({
        className: 'custom-role-icon',
        html: `<div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        ">${label}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
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
