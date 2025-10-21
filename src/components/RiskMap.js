import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Random } from 'random-js';
import * as h3 from 'h3-js';

// Leaflet icon fix (Phase 1 carryover)
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HEX_STYLE = {
  color: '#ff4500',
  weight: 2,
  opacity: 0.9,
  fillColor: '#ff6347',
  fillOpacity: 0.4,
};

const ZOOM_LEVELS = [
  { value: 0, label: '0 — Whole world' },
  { value: 1, label: '1 — Continent / Intercontinental' },
  { value: 2, label: '2 — Subcontinental area' },
  { value: 3, label: '3 — Largest country' },
  { value: 4, label: '4 — Large region' },
  { value: 5, label: '5 — Large African country' },
  { value: 6, label: '6 — Large European country' },
  { value: 7, label: '7 — Small country or US state' },
  { value: 8, label: '8 — Wide area' },
  { value: 9, label: '9 — Large metropolitan area' },
  { value: 10, label: '10 — Metropolitan area' },
  { value: 11, label: '11 — City' },
  { value: 12, label: '12 — Town or city district' },
  { value: 13, label: '13 — Village or suburb' },
  { value: 14, label: '14 — Small town' },
  { value: 15, label: '15 — Small road' },
  { value: 16, label: '16 — Street' },
  { value: 17, label: '17 — Block / park / addresses' },
  { value: 18, label: '18 — Buildings and trees' },
  { value: 19, label: '19 — Highway details' },
];

const BASE_ZOOM = 5;
const MAX_HEXES = 128;
const NEUTRAL_RATIO = 0.125;

const MapViewSynchronizer = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
};

const clampResolution = (zoom) => Math.max(0, Math.min(12, Math.round(zoom - 2)));

const RiskMap = () => {
  const [center, setCenter] = useState([48.8566, 2.3522]); // Paris coordinates
  const [zoom, setZoom] = useState(BASE_ZOOM);
  const [hexes, setHexes] = useState([]);
  const [selectedHex, setSelectedHex] = useState(null);
  const random = useMemo(() => new Random(), []);

  const getHexPathOptions = useCallback((status, isSelected) => {
    const style = {
      color: HEX_STYLE.color,
      weight: HEX_STYLE.weight,
      opacity: HEX_STYLE.opacity,
      fillColor: HEX_STYLE.fillColor,
      fillOpacity: HEX_STYLE.fillOpacity,
    };

    if (status === 'neutral') {
      style.color = '#6b7280';
      style.fillColor = '#9ca3af';
      style.opacity = 0.6;
      style.fillOpacity = 0.2;
    }

    if (isSelected) {
      style.color = '#ffd166';
      style.fillColor = 'rgba(255, 209, 102, 0.6)';
      style.weight = 3;
      style.opacity = 1;
      style.fillOpacity = 0.5;
    }

    return style;
  }, []);

  const handleHexClick = useCallback((hexId) => {
    setSelectedHex((prev) => (prev === hexId ? null : hexId));
  }, []);

  const generateFullHexOverlay = useCallback((lat, lng) => {
    const resolution = clampResolution(BASE_ZOOM);
    let radius = 3;
    const centerHex = h3.latLngToCell(lat, lng, resolution);
    let cluster = h3.gridDisk(centerHex, radius);

    while (cluster.length < MAX_HEXES && radius < 12) {
      radius += 1;
      cluster = h3.gridDisk(centerHex, radius);
    }

    const candidates = cluster.map((hexId) => {
      const boundary = h3
        .cellToBoundary(hexId)
        .map(([boundaryLat, boundaryLng]) => [boundaryLat, boundaryLng]);
      const centroid = boundary.reduce(
        (acc, [boundaryLat, boundaryLng]) => {
          acc.lat += boundaryLat;
          acc.lng += boundaryLng;
          return acc;
        },
        { lat: 0, lng: 0 },
      );
      const pointsCount = boundary.length || 1;
      const centroidLat = centroid.lat / pointsCount;
      const centroidLng = centroid.lng / pointsCount;
      const distance = Math.hypot(centroidLat - lat, centroidLng - lng);

      return {
        hexId,
        boundary,
        centroidLat,
        centroidLng,
        distance,
      };
    });

    const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
    const limited = sorted.slice(0, MAX_HEXES);
    const neutralCount = limited.length > 0 ? Math.max(1, Math.floor(limited.length * NEUTRAL_RATIO)) : 0;
    const neutralStartIndex = Math.max(limited.length - neutralCount, 0);

    const shapedHexes = limited.map(({ hexId, boundary }, index) => ({
      hexId,
      boundary,
      status: index >= neutralStartIndex ? 'neutral' : 'active',
    }));

    setHexes(shapedHexes);
  }, []);

  const randomizeCoords = useCallback(() => {
    const lat = random.real(-85, 85, true);
    const lng = random.real(-180, 180, true);

    setCenter([lat, lng]);
    setSelectedHex(null);
    generateFullHexOverlay(lat, lng);
  }, [generateFullHexOverlay, random]);

  const handleZoomChange = useCallback(
    (event) => {
      const newZoom = Number(event.target.value);
      setZoom(newZoom);
      setSelectedHex(null);
      generateFullHexOverlay(center[0], center[1]);
    },
    [center, generateFullHexOverlay],
  );

  useEffect(() => {
    randomizeCoords();
  }, [randomizeCoords]);

  return (
    <div className="map-wrapper">
      <div className="map-controls">
        <select aria-label="Select zoom level" value={zoom} onChange={handleZoomChange}>
          {ZOOM_LEVELS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" onClick={randomizeCoords}>
          Randomize Coordinates
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        data-testid="leaflet-map"
      >
        <MapViewSynchronizer center={center} zoom={zoom} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {hexes.map(({ hexId, boundary, status }) => (
          <Polygon
            key={hexId}
            positions={boundary}
            pathOptions={getHexPathOptions(status, hexId === selectedHex)}
            eventHandlers={{ click: () => handleHexClick(hexId) }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default RiskMap;