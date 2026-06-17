// Google Maps custom style — warm, muted basemap so routes and markers pop.
export const POSON_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "geometry", stylers: [{ color: "#f5f1e8" }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c8d8e8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9db9d0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#ddd4c5" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#7a6e5f" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f4e9cc" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e0cc99" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#7a6e5f" }] },
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f1e8" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#eee8da" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#5a5049" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#3d2c1e" }] },
];

export const ANURADHAPURA_CENTER = { lat: 8.3494, lng: 80.3975 };
export const DEFAULT_ZOOM = 14;
export const DEFAULT_SPEED_KMH = 18;
export const SNAP_THRESHOLD_M = 300;
