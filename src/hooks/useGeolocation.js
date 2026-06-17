import { useCallback, useEffect, useRef, useState } from "react";

// Live geolocation with watch. The route auto-recomputes when the user moves
// significantly (handled by the consumer comparing positions).
export function useGeolocation() {
  const [position, setPosition] = useState(null); // {lat,lng,accuracy}
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    setWatching(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setError(e.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setError(e.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { position, error, watching, start, stop, setManual: setPosition };
}
