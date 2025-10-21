import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
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
  { value: 20, label: '20 — Mid-sized building' },
];

const clampResolution = (zoom) => Math.max(0, Math.min(12, Math.round(zoom - 2)));

const computeRadius = (zoom) => {
  if (zoom <= 3) return 2;
  if (zoom <= 6) return 3;
  if (zoom <= 9) return 4;
  if (zoom <= 12) return 5;
  if (zoom <= 15) return 6;
  if (zoom <= 18) return 7;
  return 8;
};

const computeThresholds = (zoom) => {
  if (zoom <= 3) {
    return { lat: 60, lng: 120 };
  }
  if (zoom <= 6) {
    return { lat: 30, lng: 60 };
  }
  if (zoom <= 10) {
    return { lat: 12, lng: 24 };
  }
  if (zoom <= 14) {
    return { lat: 6, lng: 12 };
  }
  if (zoom <= 17) {
    return { lat: 3, lng: 6 };
  }
  return { lat: 1.5, lng: 3 };
};

const RiskMap = () => {
  const random = useMemo(() => new Random(), []);
  const [center, setCenter] = useState([0, 0]);
  const [zoom, setZoom] = useState(16);
  const [hexes, setHexes] = useState([]);

  const generateFullHexOverlay = useCallback((lat, lng, targetZoom) => {
    const resolution = clampResolution(targetZoom);
    const radius = computeRadius(targetZoom);
    const { lat: latThreshold, lng: lngThreshold } = computeThresholds(targetZoom);
    const centerHex = h3.latLngToCell(lat, lng, resolution);
    const cluster = h3.gridDisk(centerHex, radius);

    const filtered = cluster
      .map((hexId) => {
        const boundary = h3
          .cellToBoundary(hexId, true)
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

        return {
          hexId,
          boundary,
          centroidLat,
          centroidLng,
        };
      })
      .filter(({ centroidLat, centroidLng }) =>
        Math.abs(centroidLat - lat) <= latThreshold && Math.abs(centroidLng - lng) <= lngThreshold,
      );

    if (filtered.length > 0) {
      setHexes(filtered.map(({ hexId, boundary }) => ({ hexId, boundary })));
      return;
    }

    setHexes(
      cluster.map((hexId) => ({
        hexId,
        boundary: h3
          .cellToBoundary(hexId, true)
          .map(([boundaryLat, boundaryLng]) => [boundaryLat, boundaryLng]),
      })),
    );
  }, []);

  const randomizeCoords = useCallback(() => {
    const lat = random.real(-85, 85, true);
    const lng = random.real(-180, 180, true);

    setCenter([lat, lng]);
    generateFullHexOverlay(lat, lng, zoom);
  }, [generateFullHexOverlay, random, zoom]);

  const handleZoomChange = useCallback(
    (event) => {
      const newZoom = Number(event.target.value);
      setZoom(newZoom);
      generateFullHexOverlay(center[0], center[1], newZoom);
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
        data-testid="leaflet-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {hexes.map(({ hexId, boundary }) => (
          <Polygon key={hexId} positions={boundary} pathOptions={HEX_STYLE} />
        ))}
      </MapContainer>
    </div>
  );
};

export default RiskMap;