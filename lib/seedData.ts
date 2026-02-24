import { getDatabase, ref, get, update, remove } from 'firebase/database';
import { getFirebaseApp } from './firebase';
import { MOCK_BUSES } from './constants';
import type { Bus } from './types';

const getDb = () => getDatabase(getFirebaseApp());
const BUSES_PATH = 'buses';

// Ensure bus has all required realtime fields normalized
const normalizeBusForSeed = (bus: Bus): Bus => {
  const nowIso = new Date().toISOString();

  return {
    ...bus,
    isActive: true,
    onlineBookedSeats: 0,
    offlineOccupiedSeats: 0,
    availableSeats: bus.capacity,
    lastSeatUpdate: nowIso as any,
    currentLocation: bus.currentLocation
      ? {
          ...bus.currentLocation,
          timestamp: nowIso as any,
        }
      : (undefined as any),
    destination: bus.destination
      ? {
          ...bus.destination,
          timestamp: nowIso as any,
        }
      : (undefined as any),
  };
};

export const hasDemoBuses = async (): Promise<boolean> => {
  const db = getDb();
  const busesRef = ref(db, BUSES_PATH);
  const snapshot = await get(busesRef);
  return snapshot.exists();
};

export const seedDemoBuses = async (): Promise<{ created: number; skipped: boolean }> => {
  const db = getDb();
  const busesRef = ref(db, BUSES_PATH);

  const snapshot = await get(busesRef);
  if (snapshot.exists()) {
    // Do not duplicate if anything is already under /buses
    return { created: 0, skipped: true };
  }

  const updates: Record<string, Bus> = {};
  MOCK_BUSES.slice(0, 5).forEach((bus) => {
    updates[bus.id] = normalizeBusForSeed(bus);
  });

  await update(busesRef, updates);
  return { created: Object.keys(updates).length, skipped: false };
};

export const clearDemoData = async (): Promise<void> => {
  const db = getDb();
  const busesRef = ref(db, BUSES_PATH);
  await remove(busesRef);
};


