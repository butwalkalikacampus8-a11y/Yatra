'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-full">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You are offline. Live updates may be delayed.</span>
        </div>
    );
}
