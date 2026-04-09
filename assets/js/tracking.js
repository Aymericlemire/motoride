import { getFirebaseServices } from "../../firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const trackingState = {
  loading: false,
  active: false,
  watchId: null,
  points: [],
  maxSpeed: 0
};

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function startTracking() {
  if (trackingState.active) return;
  trackingState.active = true;
  trackingState.points = [];
  trackingState.maxSpeed = 0;
  trackingState.watchId = navigator.geolocation.watchPosition((position) => {
    const point = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: Math.max(0, (position.coords.speed || 0) * 3.6),
      ts: Date.now()
    };
    trackingState.maxSpeed = Math.max(trackingState.maxSpeed, point.speed);
    trackingState.points.push(point);
  }, (error) => console.error("[Tracking] Erreur GPS:", error), { enableHighAccuracy: true });
}

export async function stopTrackingAndSave(uid) {
  trackingState.loading = true;
  try {
    if (trackingState.watchId !== null) navigator.geolocation.clearWatch(trackingState.watchId);
    trackingState.active = false;
    if (trackingState.points.length < 2) return null;
    let total = 0;
    for (let i = 1; i < trackingState.points.length; i += 1) {
      total += distanceMeters(trackingState.points[i - 1], trackingState.points[i]);
    }
    const durationSec = Math.round((trackingState.points.at(-1).ts - trackingState.points[0].ts) / 1000);
    const avgSpeed = durationSec > 0 ? (total / durationSec) * 3.6 : 0;
    const payload = {
      uid,
      points: trackingState.points,
      distanceKm: Number((total / 1000).toFixed(2)),
      durationSec,
      avgSpeed: Number(avgSpeed.toFixed(1)),
      maxSpeed: Number(trackingState.maxSpeed.toFixed(1)),
      createdAt: serverTimestamp()
    };
    const { db } = getFirebaseServices();
    const ref = await addDoc(collection(db, "trips"), payload);
    return { id: ref.id, ...payload };
  } catch (error) {
    console.error("[Tracking] Erreur stopTrackingAndSave:", error);
    return null;
  } finally {
    trackingState.loading = false;
  }
}
