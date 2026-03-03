'use client';

import { useState, useEffect } from 'react';
import DriverPanel from '@/components/driver/DriverPanel';
import PassengerList from '@/components/driver/PassengerList';
import VerificationPanel from '@/components/driver/VerificationPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bus, Passenger, Driver } from '@/lib/types';
import MapWrapper from '@/components/map/MapWrapper';
import {
  Navigation,
  Users,
  MapPin,
  Settings,
  Bus as BusIcon
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { subscribeToBuses, subscribeToBookings, updateBusLocation, updateLocationSharingStatus, createAlert } from '@/lib/firebaseDb';
import { addOfflinePassenger, removeOfflinePassenger } from '@/lib/seatManagement';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AlertTriangle, Car, Wrench } from 'lucide-react';
import { useAccidentDetection } from '@/hooks/useAccidentDetection';
import AccidentAlert from '@/components/driver/AccidentAlert';

export default function DriverDashboard() {
  const router = useRouter();
  const { currentUser, role, loading, signOut, userData } = useAuth();
  const { toast } = useToast();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGeolocationError, setHasGeolocationError] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);
  const [lastFirebaseUpdate, setLastFirebaseUpdate] = useState<Date | null>(null);
  const [notificationPermissionRequested, setNotificationPermissionRequested] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // Automated Accident Detection
  const { isAccidentDetected, resetDetection, triggerManualTest } = useAccidentDetection({
    currentLocation: userLocation ? { ...userLocation, timestamp: new Date() } : null,
    speed: currentSpeed,
    heading: undefined, // We could pass heading if available
    isTracking: isOnline && locationEnabled
  });

  const handleAccidentConfirm = async () => {
    resetDetection();
    await handleReportEmergency('accident');
  };

  const handleAccidentCancel = () => {
    resetDetection();
    toast({
      title: 'Alert Cancelled',
      description: 'Accident alert was cancelled.',
    });
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default' && !notificationPermissionRequested) {
      Notification.requestPermission().finally(() => {
        setNotificationPermissionRequested(true);
      });
    }
  }, [notificationPermissionRequested]);

  // Subscribe to buses from Realtime Database
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    unsubscribe = subscribeToBuses((busesData) => {
      setBuses(busesData);

      // Try to find the driver's specific bus
      const driverBus =
        busesData.find((b) => b.id === currentUser?.uid) ||
        (userData?.role === 'driver' && (userData as any).vehicleNumber
          ? busesData.find((b) => b.busNumber === (userData as any).vehicleNumber)
          : undefined);

      // Only update selectedBus if we found the driver's bus
      // This prevents showing "Rajesh Thapa" (demo data) to a new driver
      if (driverBus) {
        setSelectedBus(driverBus);
        // Sync online status with bus isActive
        setIsOnline(driverBus.isActive || false);
        setLocationEnabled(driverBus.isActive || false);
      } else if (!selectedBus && busesData.length > 0) {
        // If no bus selected yet and we can't find the driver's bus,
        // we might be in a state where the bus isn't created yet.
        // Do NOT default to busesData[0] for drivers.
        // Just leave selectedBus as null.
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedBus, currentUser, userData]);

  // Subscribe to real passengers (bookings) for the selected bus
  useEffect(() => {
    if (!selectedBus) return;

    let previousBookingCount = 0;

    const unsubscribe = subscribeToBookings(selectedBus.id, 'driver', (bookings) => {
      const mapped: Passenger[] = bookings.map((b) => ({
        id: b.id,
        name: b.passengerName,
        pickupLocation: b.pickupLocation,
        dropoffLocation: b.dropoffLocation,
        status: 'waiting',
        bookingTime: b.timestamp,
      }));

      // Notify driver when new booking arrives
      if (bookings.length > previousBookingCount && previousBookingCount > 0) {
        const newBookings = bookings.slice(previousBookingCount);
        newBookings.forEach((booking) => {
          // Play notification sound using Web Audio API
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (e) {
            // Fallback: use browser beep
            console.log('\u0007'); // ASCII bell character
          }

          // Show toast notification
          toast({
            title: 'New Booking! 🎉',
            description: `${booking.passengerName} wants to ride. Check passenger list below.`,
            duration: 5000,
          });

          // Vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // Request browser notification permission and show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Booking!', {
              body: `${booking.passengerName} wants to ride`,
              icon: '/favicon.ico',
              tag: `booking-${booking.id}`,
            });
          }
        });
      }

      previousBookingCount = bookings.length;
      setPassengers(mapped);
    });

    return () => unsubscribe();
  }, [selectedBus, toast]);

  // Get user's current location with throttling and distance checks
  useEffect(() => {
    if (!locationEnabled) {
      return;
    }

    if (!navigator.geolocation) {
      if (!hasGeolocationError) {
        toast({
          title: 'Location unavailable',
          description: 'Geolocation is not supported by this browser.',
          variant: 'destructive',
        });
        setHasGeolocationError(true);
      }
      return;
    }

    const handleGeoError = (error: GeolocationPositionError | any) => {
      // Avoid spamming toasts; show a friendly message once
      if (!hasGeolocationError) {
        let message = 'Unable to access your location. Please check your browser permissions.';
        if (error?.code === 1) {
          message = 'Location permission was denied. Turn it on in your browser settings to share your live location.';
        }

        toast({
          title: 'Location error',
          description: message,
          variant: 'destructive',
        });
        setHasGeolocationError(true);
      }

      // Still log a concise warning for debugging
      // eslint-disable-next-line no-console
      console.warn('Geolocation error:', {
        code: error?.code,
        message: error?.message,
      });
    };

    if (!locationEnabled || !selectedBus || !isOnline) {
      // eslint-disable-next-line no-console
      console.log('[DRIVER] Location tracking disabled:', { locationEnabled, hasSelectedBus: !!selectedBus, isOnline });
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[DRIVER] Starting watchPosition for bus:', selectedBus.id);

    let lastUpdateTime = 0;
    let lastLat = 0;
    let lastLng = 0;
    const UPDATE_INTERVAL = 5000; // 5 seconds
    const MIN_DISTANCE_METERS = 10; // Only update if moved more than 10 meters

    // Helper function to calculate distance in meters
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lng2 - lng1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // eslint-disable-next-line no-console
        console.log('[DRIVER] GPS coordinate received:', {
          lat: newLocation.lat,
          lng: newLocation.lng,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });

        setUserLocation(newLocation);
        setLastLocationUpdate(new Date());

        // Check if enough time has passed and if moved enough distance
        const timeSinceLastUpdate = now - lastUpdateTime;
        const distanceMoved = lastLat !== 0 && lastLng !== 0
          ? getDistance(lastLat, lastLng, newLocation.lat, newLocation.lng)
          : MIN_DISTANCE_METERS + 1; // First update always goes through

        // eslint-disable-next-line no-console
        console.log('[DRIVER] Update check:', {
          timeSinceLastUpdate,
          distanceMoved,
          shouldUpdate: timeSinceLastUpdate >= UPDATE_INTERVAL && distanceMoved >= MIN_DISTANCE_METERS,
        });

        if (timeSinceLastUpdate >= UPDATE_INTERVAL && distanceMoved >= MIN_DISTANCE_METERS) {
          // Update Firebase with driver's location
          const locationData: any = {
            lat: newLocation.lat,
            lng: newLocation.lng,
          };

          // Add heading if available
          if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
            locationData.heading = position.coords.heading;
          }

          // Add speed if available (convert m/s to km/h)
          if (position.coords.speed !== null && !isNaN(position.coords.speed)) {
            const speedKmh = Math.round(position.coords.speed * 3.6);
            locationData.speed = speedKmh;
            setCurrentSpeed(speedKmh);
          } else {
            setCurrentSpeed(0);
          }

          // eslint-disable-next-line no-console
          console.log('[DRIVER] Calling updateBusLocation:', {
            busId: selectedBus.id,
            locationData,
          });

          updateBusLocation(selectedBus.id, locationData)
            .then(() => {
              setLastFirebaseUpdate(new Date());
              setLocationUpdateCount(prev => prev + 1);
              // eslint-disable-next-line no-console
              console.log('[DRIVER] ✅ Location updated to Firebase successfully:', {
                busId: selectedBus.id,
                lat: newLocation.lat,
                lng: newLocation.lng,
                heading: locationData.heading,
                speed: locationData.speed,
                timestamp: new Date().toISOString(),
                updateCount: locationUpdateCount + 1,
              });
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error('[DRIVER] ❌ Failed to update Firebase location:', {
                busId: selectedBus.id,
                error: error.message || error,
                stack: error.stack,
              });
            });

          lastUpdateTime = now;
          lastLat = newLocation.lat;
          lastLng = newLocation.lng;
        } else {
          // eslint-disable-next-line no-console
          console.log('[DRIVER] ⏭️ Skipping update (throttled):', {
            timeSinceLastUpdate,
            distanceMoved,
          });
        }
      },
      handleGeoError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept cached position up to 5 seconds old
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationEnabled, selectedBus, isOnline, toast, hasGeolocationError]);

  const handleLocationToggle = async (enabled: boolean) => {
    if (!enabled && selectedBus) {
      // Check for active passengers (online or offline)
      const hasActivePassengers = passengers.some(p => p.status === 'waiting' || p.status === 'picked');
      const hasOfflinePassengers = (selectedBus.offlineOccupiedSeats || 0) > 0;

      if (hasActivePassengers || hasOfflinePassengers) {
        const confirmed = window.confirm(
          `You have ${passengers.filter(p => p.status !== 'dropped').length} online and ${selectedBus.offlineOccupiedSeats || 0} offline passengers active.\n\nGoing offline will stop tracking. Are you sure?`
        );
        if (!confirmed) return;
      }
    }

    setLocationEnabled(enabled);
    setIsOnline(enabled);

    if (selectedBus) {
      setSelectedBus({
        ...selectedBus,
        isActive: enabled,
      });

      // Update Firebase with location sharing status
      try {
        await updateLocationSharingStatus(selectedBus.id, enabled);
        // eslint-disable-next-line no-console
        console.log('[Driver] Location sharing', enabled ? 'enabled' : 'disabled');

        toast({
          title: enabled ? 'You are now online' : 'You are now offline',
          description: enabled
            ? 'Your location is being shared with passengers'
            : 'Your location sharing has been stopped',
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Driver] Failed to update location sharing status:', error);
        toast({
          title: 'Update failed',
          description: 'Failed to update location sharing status. Please try again.',
          variant: 'destructive',
        });
        // Revert state on error
        setLocationEnabled(!enabled);
        setIsOnline(!enabled);
      }
    }
  };

  const handleAddOfflinePassenger = async () => {
    if (!selectedBus) return;
    try {
      await addOfflinePassenger(selectedBus.id);
    } catch (error) {
      console.error('Error adding offline passenger:', error);
      toast({
        title: 'Failed to add offline passenger',
        description:
          error instanceof Error ? error.message : 'Please try again or check your connection.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveOfflinePassenger = async () => {
    if (!selectedBus) return;
    try {
      await removeOfflinePassenger(selectedBus.id);
    } catch (error) {
      console.error('Error removing offline passenger:', error);
    }
  };

  const handlePassengerPickup = (passengerId: string) => {
    setPassengers(prev =>
      prev.map(passenger =>
        passenger.id === passengerId
          ? { ...passenger, status: 'picked' }
          : passenger
      )
    );
  };

  const handlePassengerDropoff = async (passengerId: string) => {
    // 1. Update UI state immediately (optimistic update)
    setPassengers(prev =>
      prev.map(passenger =>
        passenger.id === passengerId
          ? { ...passenger, status: 'dropped' }
          : passenger
      )
    );

    // 2. Fetch Passenger Data & Trigger Minting
    try {
      if (!selectedBus || !userData) return;

      toast({
        title: 'Minting Receipt...',
        description: 'Generating Soulbound Trip Ticket for passenger.',
      });

      // Firebase lookup for passenger's Solana wallet
      const { getDatabase, ref, get } = await import('firebase/database');
      const { getFirebaseApp } = await import('@/lib/firebase');
      const db = getDatabase(getFirebaseApp());
      const passengerRef = ref(db, `users/${passengerId}`);
      const passengerSnap = await get(passengerRef);

      if (!passengerSnap.exists()) return;

      const passengerData = passengerSnap.val();
      const passengerWallet = passengerData.solanaWallet;

      if (!passengerWallet) {
        console.log(`[Trip Ticket] Passenger ${passengerId} has no linked Solana Wallet.`);
        return; // Silently exit if no wallet
      }

      // Find the specific booking ID. 
      // In this app, Passenger objects in the state represent active bookings.
      // We pass the raw passenger ID as the booking ID placeholder if we don't have the exact booking ID handy,
      // though typically the bookings listener might give us the true booking ID. 
      // The `passengers` state actually stores the `booking.id` inside `passenger.id` from subscribeToBookings.
      const bookingId = passengerId;

      const payload = {
        passengerId: passengerData.id || passengerId,
        passengerWallet,
        bookingId,
        fare: 75, // Static fare for demo based on PassengerList estimated revenue
        route: selectedBus.route,
        driverName: selectedBus.driverName,
      };

      // Call internal Next.js API route to perform the minting securely
      fetch('/api/solana/mint-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const data = await res.json();
        if (data.success) {
          toast({
            title: 'Trip Ticket Minted! 🎉',
            description: `Sent to ${passengerWallet.slice(0, 4)}...${passengerWallet.slice(-4)}`,
          });
        } else {
          console.error('[Trip Ticket] Minting API Error:', data.error);
        }
      }).catch(err => {
        console.error('[Trip Ticket] Fetch Error:', err);
      });

    } catch (error) {
      console.error('[Trip Ticket] Unexpected error during dropoff flow:', error);
    }
  };

  const handleReportEmergency = async (type: 'accident' | 'breakdown') => {
    if (!selectedBus || !userLocation) {
      toast({
        title: 'Error',
        description: 'Cannot report emergency without active bus and location.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAlert({
        busId: selectedBus.id,
        busNumber: selectedBus.busNumber,
        driverName: selectedBus.driverName,
        type,
        location: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          timestamp: new Date()
        },
        timestamp: new Date().toISOString(),
        status: 'active'
      });

      toast({
        title: 'Emergency Reported',
        description: 'Admin team has been notified. Help is on the way.',
        variant: 'destructive',
        duration: 10000,
      });
    } catch (error) {
      console.error('Failed to report emergency:', error);
      toast({
        title: 'Report Failed',
        description: 'Please try again or call emergency services directly.',
        variant: 'destructive',
      });
    }
  };

  // Auth guard
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.replace('/auth?redirect=/driver');
        return;
      }
      if (role && role !== 'driver') {
        router.replace('/passenger');
        return;
      }
      // Only check for vehicleNumber if userData is loaded (not null)
      // If userData is null but we have currentUser, it might still be loading
      if (userData !== null && !(userData as any)?.vehicleNumber) {
        // Profile incomplete (missing vehicle details)
        router.replace('/auth/profile');
        return;
      }
    }
  }, [currentUser, role, loading, router, userData]);

  if (loading || !currentUser || (role && role !== 'driver')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
            <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl w-full h-full flex items-center justify-center shadow-2xl shadow-cyan-500/50">
              <BusIcon className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-slate-400 text-lg font-medium">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0E14', overflowY: 'scroll', scrollSnapType: 'y mandatory', height: '100dvh' }}>
      {/* ── 1. Cockpit Header ── */}
      <div className="sticky top-0 z-50 border-b border-slate-800/60 overflow-hidden"
        style={{ background: 'rgba(11,14,20,0.92)', backdropFilter: 'blur(20px)' }}
      >
        {/* Animated scanning line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"
            style={{ animation: 'scanline 2.8s linear infinite', width: '60%' }} />
        </div>

        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          {/* चालक Brand */}
          <div className="flex items-center gap-3">
            {/* Shield icon with glow */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-md" />
              <svg viewBox="0 0 36 36" className="w-9 h-9 relative">
                <path d="M18 3 L33 9 L33 18 C33 26 26 32 18 34 C10 32 3 26 3 18 L3 9 Z"
                  fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6">
                  <animateTransform attributeName="transform" type="rotate"
                    from="0 18 18" to="360 18 18" dur="8s" repeatCount="indefinite" />
                </path>
                <path d="M18 6 L30 11 L30 18 C30 24.5 25 29.5 18 31.5 C11 29.5 6 24.5 6 18 L6 11 Z"
                  fill="rgba(6,182,212,0.07)" stroke="#22d3ee" strokeWidth="1" />
                <path d="M13 18 L16.5 21.5 L23 15" stroke="#22d3ee" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            <div>
              <h1
                className="text-[26px] font-extrabold leading-none"
                style={{
                  fontFamily: 'var(--font-mukta), sans-serif',
                  background: 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 40%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.5))',
                }}
              >
                चालक
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-cyan-400' : 'bg-slate-600'}`}
                  style={{
                    boxShadow: isOnline ? '0 0 6px #22d3ee' : 'none',
                    animation: isOnline ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }} />
                <span className="text-[10px] font-bold tracking-widest"
                  style={{ color: isOnline ? '#67e8f9' : '#64748b' }}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* SOS Button with rhythmic red glow */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-10 px-4 font-black tracking-widest text-sm rounded-xl border border-red-500/60"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    color: '#f87171',
                    animation: 'sos-pulse 2s ease-in-out infinite',
                    boxShadow: '0 0 0 0 rgba(239,68,68,0.4)',
                  }}
                >
                  SOS
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Emergency Report
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    This will immediately alert the admin team. Use only in emergencies.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <Button variant="outline" className="h-24 flex flex-col gap-2 border-slate-700 hover:bg-red-950 hover:border-red-500 hover:text-red-400 rounded-xl"
                    onClick={() => handleReportEmergency('accident')}>
                    <Car className="w-8 h-8" /> Accident
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col gap-2 border-slate-700 hover:bg-orange-950 hover:border-orange-500 hover:text-orange-400 rounded-xl"
                    onClick={() => handleReportEmergency('breakdown')}>
                    <Wrench className="w-8 h-8" /> Breakdown
                  </Button>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="text-slate-400">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* GPS Toggle */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur border transition-all ${locationEnabled ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
              <Switch checked={locationEnabled} onCheckedChange={handleLocationToggle}
                className="scale-75 data-[state=checked]:bg-cyan-500" />
              <MapPin className={`w-3 h-3 ${locationEnabled ? 'text-cyan-400' : 'text-slate-400'}`} />
              {locationEnabled && selectedBus && (
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${lastFirebaseUpdate && (Date.now() - lastFirebaseUpdate.getTime()) < 10000 ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="text-[10px] text-slate-300 font-medium">
                    {lastFirebaseUpdate ? `${Math.floor((Date.now() - lastFirebaseUpdate.getTime()) / 1000)}s` : '...'}
                  </span>
                </div>
              )}
            </div>

            {/* Sign Out */}
            <Button variant="ghost" onClick={signOut} size="icon"
              className="w-9 h-9 rounded-full bg-slate-900/50 border border-slate-700/50 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <span className="sr-only">Sign Out</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Map Section ── */}
      <div className="relative w-full shrink-0 border-b border-slate-800/60"
        style={{ height: '100dvh', scrollSnapAlign: 'start' }}>
        <MapWrapper
          role="driver"
          buses={buses}
          passengers={passengers}
          selectedBus={selectedBus}
          onBusSelect={setSelectedBus}
          showRoute={true}
          userLocation={userLocation}
        />
      </div>

      {/* ── 3. Scrollable Cockpit Sections ── */}
      <div className="p-4 space-y-4" style={{ background: '#0B0E14', scrollSnapAlign: 'start', minHeight: '100dvh' }}>

        {/* Bus Controls Section */}
        {selectedBus && (
          <section className="rounded-2xl border border-cyan-500/20 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.1), inset 0 0 40px rgba(6,182,212,0.03)' }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60"
              style={{ background: 'rgba(6,182,212,0.05)' }}>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase">Vehicle Status</span>
              </div>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] text-slate-600 hover:text-red-500 px-2"
                onClick={triggerManualTest}>Test Crash</Button>
            </div>
            <div className="p-4">
              <DriverPanel
                bus={selectedBus}
                onLocationToggle={handleLocationToggle}
                locationEnabled={locationEnabled}
                onAddOfflinePassenger={handleAddOfflinePassenger}
                onRemoveOfflinePassenger={handleRemoveOfflinePassenger}
              />
            </div>
          </section>
        )}

        {/* ZK Identity Section */}
        {userData && (
          <section className="rounded-2xl border border-blue-500/20 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(59,130,246,0.1), inset 0 0 40px rgba(59,130,246,0.03)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60"
              style={{ background: 'rgba(59,130,246,0.05)' }}>
              <Settings className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold tracking-widest text-blue-300 uppercase">Security Clearance</span>
            </div>
            <div className="p-4">
              <VerificationPanel
                driver={userData as Driver}
                onVerificationSuccess={() => { }}
              />
            </div>
          </section>
        )}

        {/* Passenger Manifest */}
        <section className="rounded-2xl border border-purple-500/20 overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.1), inset 0 0 40px rgba(168,85,247,0.03)' }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60"
            style={{ background: 'rgba(168,85,247,0.05)' }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold tracking-widest text-purple-300 uppercase">Passenger Manifest</span>
            </div>
            <span className="text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2.5 py-0.5">
              {passengers.length}
            </span>
          </div>
          <div className="p-4">
            <PassengerList
              passengers={passengers}
              selectedBus={selectedBus}
              onPassengerPickup={handlePassengerPickup}
              onPassengerDropoff={handlePassengerDropoff}
            />
          </div>
        </section>

        <div className="h-8" />
      </div>

      {/* Accident Alert Popup */}
      <AccidentAlert isOpen={isAccidentDetected} onConfirm={handleAccidentConfirm} onCancel={handleAccidentCancel} />

      {/* Global cockpit keyframes */}
      <style jsx global>{`
        @keyframes scanline {
          0%   { transform: translateX(-60%); }
          100% { transform: translateX(200%); }
        }
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        }
        @keyframes shield-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
