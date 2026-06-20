import { useEffect, useState } from "react";
import type { LatLng } from "@/types";

/**
 * Reverse-geocodes a coordinate into a human-readable address using the Google
 * Maps Geocoder (already loaded by the map's APIProvider). Rounds the input so
 * small GPS jitter doesn't re-trigger lookups.
 */
export function useReverseGeocode(pos: LatLng | null): string | null {
  const [address, setAddress] = useState<string | null>(null);
  const lat = pos ? Number(pos.lat.toFixed(4)) : null;
  const lng = pos ? Number(pos.lng.toFixed(4)) : null;

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress(null);
      return;
    }
    let cancelled = false;
    let tries = 0;

    const run = async () => {
      const g = (window as { google?: typeof google }).google;
      // Wait for the maps script (loaded by APIProvider) to be ready.
      if (!g?.maps?.importLibrary) {
        if (tries++ < 20 && !cancelled) setTimeout(run, 400);
        return;
      }
      try {
        const { Geocoder } = (await g.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
        const res = await new Geocoder().geocode({ location: { lat, lng } });
        if (cancelled) return;
        const first = res.results?.[0];
        setAddress(first?.formatted_address ?? null);
      } catch {
        if (!cancelled) setAddress(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return address;
}
