import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import Card from '../ui/Card';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function toLatLng(point) {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function makePinIcon(color) {
  return L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <span style="
        display:inline-block;
        width:14px;height:14px;
        border-radius:9999px;
        border:2px solid #fff;
        background:${color};
        box-shadow:0 2px 10px rgba(0,0,0,0.25);
      "></span>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = (points || []).filter(Boolean);
    if (!valid.length) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(valid);
    map.fitBounds(bounds, { padding: [36, 36], animate: true, maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function RideTrackingMap({ ride }) {
  if (!ride) return null;

  const source = toLatLng(ride.source);
  const destination = toLatLng(ride.destination);
  const driver = toLatLng(ride.driver_location);
  const center = driver || source || destination || [20.5937, 78.9629];
  const linePoints = useMemo(() => {
    if (driver && destination) return [driver, destination];
    if (source && destination) return [source, destination];
    return [];
  }, [driver, source, destination]);
  const allPoints = [source, destination, driver].filter(Boolean);
  const sourceIcon = useMemo(() => makePinIcon('#0284c7'), []);
  const destinationIcon = useMemo(() => makePinIcon('#dc2626'), []);
  const driverIcon = useMemo(() => makePinIcon('#16a34a'), []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-label-lg text-ink">Live Tracking</h3>
        <span className="text-[12px] text-text-secondary">
          {ride.eta_minutes ? `ETA ${ride.eta_minutes} min` : 'ETA calculating...'}
        </span>
      </div>
      <div className="h-72 rounded-xl overflow-hidden border border-border">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={allPoints} />
          {source && (
            <Marker position={source} icon={sourceIcon}>
              <Tooltip>Pickup</Tooltip>
            </Marker>
          )}
          {destination && (
            <Marker position={destination} icon={destinationIcon}>
              <Tooltip>Destination</Tooltip>
            </Marker>
          )}
          {driver && (
            <Marker position={driver} icon={driverIcon}>
              <Tooltip>Driver</Tooltip>
            </Marker>
          )}
          {linePoints.length > 1 && <Polyline positions={linePoints} pathOptions={{ color: '#0f766e', weight: 4 }} />}
        </MapContainer>
      </div>
    </Card>
  );
}
