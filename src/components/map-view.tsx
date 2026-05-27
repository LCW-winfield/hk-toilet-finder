'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapToilet = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  latitude: number;
  longitude: number;
  cleanlinessScore: number;
};

type MapViewProps = {
  toilets: MapToilet[];
  userLocation: { lat: number; lng: number };
  selectedToiletId: string | null;
  onSelectToilet: (id: string) => void;
};

function userDivIcon() {
  return L.divIcon({
    className: 'custom-user-marker',
    html: '<div style="width:18px;height:18px;background:#1565c0;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(21,101,192,0.18);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function toiletDivIcon() {
  return L.divIcon({
    className: 'custom-toilet-marker',
    html: '<div style="width:18px;height:18px;background:#16a34a;border:3px solid #fff;border-radius:50%;box-shadow:0 8px 18px rgba(22,163,74,0.32);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

export default function MapView({
  toilets,
  userLocation,
  selectedToiletId,
  onSelectToilet
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const toiletMarkersRef = useRef<L.Marker[]>([]);
  const routeRef = useRef<L.Polyline | null>(null);
  const clickHandlerRef = useRef(onSelectToilet);
  clickHandlerRef.current = onSelectToilet;

  /* -------- INIT MAP (once) -------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- USER MARKER -------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userDivIcon()
      }).addTo(map);
    }
  }, [userLocation.lat, userLocation.lng]);

  /* -------- TOILET MARKERS -------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    toiletMarkersRef.current.forEach((m) => m.remove());
    toiletMarkersRef.current = [];

    toilets
      .filter((toilet) => toilet.latitude !== 0 || toilet.longitude !== 0)
      .forEach((toilet) => {
      const marker = L.marker([toilet.latitude, toilet.longitude], {
        icon: toiletDivIcon()
      }).addTo(map);

      marker.bindPopup(
        `<strong>${toilet.nameZh}</strong><br/>${toilet.cleanlinessScore.toFixed(1)} / 5`
      );
      marker.on('click', () => clickHandlerRef.current(toilet.id));

      toiletMarkersRef.current.push(marker);
    });
  }, [toilets]);

  /* -------- ROUTE LINE -------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }

    if (!selectedToiletId) return;

    const toilet = toilets.find((t) => t.id === selectedToiletId);
    if (!toilet) return;

    const line = L.polyline(
      [
        [userLocation.lat, userLocation.lng],
        [toilet.latitude, toilet.longitude]
      ],
      {
        color: '#1565c0',
        weight: 5,
        opacity: 0.9,
        dashArray: '10, 8'
      }
    ).addTo(map);

    routeRef.current = line;
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }, [selectedToiletId, toilets, userLocation.lat, userLocation.lng]);

  return <div ref={containerRef} className="map-surface" />;
}
