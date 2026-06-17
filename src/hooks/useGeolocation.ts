import { useCallback, useEffect, useRef, useState } from "react";
import type { GeolocationState, GeoPosition, GeoError } from "@/types";

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    setWatching(true);
    setError(null);
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 };
    const onSuccess = (p: GeolocationPosition) =>
      setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
    const onError = (e: GeolocationPositionError) =>
      setError(e.code === 1 ? "denied" : "unavailable");

    navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...opts,
      timeout: 15_000,
    });
  }, []);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { position, error, watching, start, stop, setManual: setPosition };
}
