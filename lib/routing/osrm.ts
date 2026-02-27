// lib/routing/osrm.ts

export async function getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
} | null> {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error("OSRM API error:", response.statusText);
            return null;
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.warn("No route found from OSRM");
            return null;
        }

        const route = data.routes[0];

        // distance in meters -> KM
        const distanceKm = route.distance / 1000;

        // duration in seconds -> Minutes
        const durationMin = route.duration / 60;

        return {
            distance: distanceKm,
            duration: durationMin,
            geometry: route.geometry as GeoJSON.LineString,
        };
    } catch (err) {
        console.error("Failed to fetch route from OSRM:", err);
        return null;
    }
}
