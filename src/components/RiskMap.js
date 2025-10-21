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

const clampResolution = (zoom) => Math.max(3, Math.min(10, Math.floor((zoom - 4) * 1.2) + 3));
const computeRadius = (zoom) => Math.max(3, Math.min(8, Math.floor(zoom / 2)));
const computeThresholds = (zoom) => {
  const scale = Math.pow(0.75, Math.max(0, zoom - 4));
  return {
    lat: Math.max(0.5, 6 * scale),
    lng: Math.max(0.5, 10 * scale),
  };
};

const RiskMap = () => {
  const random = useMemo(() => new Random(), []);
  const [center, setCenter] = useState([0, 0]);
  const [zoom, setZoom] = useState(4);
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
      .filter(({ centroidLat, centroidLng }) => {
        return (
          Math.abs(centroidLat - lat) <= latThreshold && Math.abs(centroidLng - lng) <= lngThreshold
        );
      });

    if (filtered.length > 0) {
      setHexes(filtered.map(({ hexId, boundary }) => ({ hexId, boundary })));
    } else {
      setHexes(
        cluster.map((hexId) => ({
          hexId,
          boundary: h3
            .cellToBoundary(hexId, true)
            .map(([boundaryLat, boundaryLng]) => [boundaryLat, boundaryLng]),
        })),
      );
    }
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
          <option value={4}>Zoom 4 — Regional (Countries)</option>
          <option value={5}>Zoom 5 — Regional (States)</option>
          <option value={6}>Zoom 6 — Regional Mid</option>
          <option value={7}>Zoom 7 — Regional Dense</option>
          <option value={8}>Zoom 8 — Local (Cities)</option>
          <option value={9}>Zoom 9 — Local (Districts)</option>
          <option value={10}>Zoom 10 — Local (Neighborhoods)</option>
          <option value={11}>Zoom 11 — Hyper-Local</option>
          <option value={12}>Zoom 12 — Tactical Detail</option>
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