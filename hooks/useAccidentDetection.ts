import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/types';

interface AccidentDetectionProps {
    currentLocation: Location | null;
    speed: number; // km/h
    heading?: number;
    isTracking: boolean;
}

interface AccidentDetectionResult {
    isAccidentDetected: boolean;
    accidentScore: number;
    resetDetection: () => void;
    triggerManualTest: () => void;
}

export function useAccidentDetection({
    currentLocation,
    speed,
    heading,
    isTracking
}: AccidentDetectionProps): AccidentDetectionResult {
    const [isAccidentDetected, setIsAccidentDetected] = useState(false);
    const [accidentScore, setAccidentScore] = useState(0);

    // History tracking
    const historyRef = useRef<{
        speed: number;
        location: Location;
        timestamp: number;
    }[]>([]);

    const lastCheckRef = useRef<number>(0);

    useEffect(() => {
        if (!isTracking || !currentLocation) {
            historyRef.current = [];
            return;
        }

        const now = Date.now();

        // Throttle checks to every 1 second
        if (now - lastCheckRef.current < 1000) {
            return;
        }
        lastCheckRef.current = now;

        // Add current state to history
        const entry = {
            speed,
            location: currentLocation,
            timestamp: now
        };

        // Keep last 10 seconds of history
        historyRef.current = [...historyRef.current, entry].filter(
            e => now - e.timestamp < 10000
        );

        // Need at least 2 points to compare
        if (historyRef.current.length < 2) return;

        const prevEntry = historyRef.current[historyRef.current.length - 2];
        let score = 0;

        // 1. Sudden Deceleration (Crash Stop)
        // If speed drops by > 25 km/h in 1 second
        if (prevEntry.speed - speed > 25) {
            console.log('[AccidentDetection] Sudden deceleration detected:', prevEntry.speed, '->', speed);
            score += 2;
        }

        // 2. Impact Stop
        // If we had high speed (> 30km/h) recently (5s ago) AND now speed is near 0
        const hadHighSpeed = historyRef.current.some(
            e => e.speed > 30 && now - e.timestamp < 5000
        );
        if (hadHighSpeed && speed < 1) {
            // Check if we've been stopped for a bit (not just a traffic light)
            // This is hard to distinguish instantly, but combined with deceleration it's a strong signal
            if (prevEntry.speed - speed > 15) {
                console.log('[AccidentDetection] High speed to zero detected');
                score += 1;
            }
        }

        // 3. GPS Jump (Impact Dislocation)
        // Calculate distance between last two points
        const distance = getDistance(
            prevEntry.location.lat, prevEntry.location.lng,
            currentLocation.lat, currentLocation.lng
        );

        // If moved > 100m in < 2 seconds (impossible speed > 180km/h) AND speed dropped
        if (distance > 100 && (now - prevEntry.timestamp) < 2000 && speed < prevEntry.speed) {
            console.log('[AccidentDetection] Unnatural GPS jump detected:', distance.toFixed(2), 'm');
            score += 2;
        }

        if (score >= 2) {
            setIsAccidentDetected(true);
            setAccidentScore(score);
        }

    }, [currentLocation, speed, isTracking]);

    const resetDetection = () => {
        setIsAccidentDetected(false);
        setAccidentScore(0);
        historyRef.current = [];
    };

    const triggerManualTest = () => {
        setIsAccidentDetected(true);
        setAccidentScore(5);
    };

    return {
        isAccidentDetected,
        accidentScore,
        resetDetection,
        triggerManualTest
    };
}

// Helper: Haversine Distance in meters
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
