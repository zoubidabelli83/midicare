// components/MapSelector.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

// Component to handle map click events
function LocationPicker({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapSelector({ 
  initialLat, 
  initialLng, 
  onLocationSelect 
}: MapSelectorProps) {
  const [pos, setPos] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : [36.7538, 3.0588]
  );

  // ✅ FIX: Use useCallback to memoize the callback and add proper dependencies
  const notifyParent = useCallback((lat: number, lng: number) => {
    onLocationSelect(lat, lng);
  }, [onLocationSelect]);

  // ✅ FIX: Only notify parent ONCE on mount if initial coords exist
  // AND only if they're different from current pos
  useEffect(() => {
    if (initialLat && initialLng) {
      const currentLat = pos[0];
      const currentLng = pos[1];
      // Only notify if initial coords differ from current state
      if (initialLat !== currentLat || initialLng !== currentLng) {
        notifyParent(initialLat, initialLng);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount

  const handleClick = (lat: number, lng: number) => {
    setPos([lat, lng]);
    notifyParent(lat, lng);
  };

  return (
    <MapContainer 
      center={pos} 
      zoom={13} 
      style={{ height: '300px', width: '100%', borderRadius: '0.5rem' }} 
      className="border border-gray-300"
      scrollWheelZoom={true}
    >
      <TileLayer 
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
      />
      <Marker position={pos} />
      <LocationPicker onLocationSelect={handleClick} />
    </MapContainer>
  );
}