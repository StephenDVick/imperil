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

const HEX_RING_RADIUS = 4;
const HEX_STYLE = {
  color: '#ff4500',
  weight: 2,
  opacity: 0.9,
  fillColor: '#ff6347',
  fillOpacity: 0.4,
};

const clampResolution = (zoom) => Math.max(2, Math.min(10, Math.floor((zoom - 3) * 1.2) + 2));

const RiskMap = () => {
  const random = useMemo(() => new Random(), []);
  const [center, setCenter] = useState([0, 0]);
  const [zoom, setZoom] = useState(3);
  const [hexes, setHexes] = useState([]);

  const generateHexOverlay = useCallback((lat, lng, targetZoom) => {
    const resolution = clampResolution(targetZoom);
    const centerHex = h3.latLngToCell(lat, lng, resolution);
    const cluster = h3.gridDisk(centerHex, HEX_RING_RADIUS);

    setHexes(
      cluster.map((hexId) => ({
        hexId,
        boundary: h3
          .cellToBoundary(hexId, true)
          .map(([boundaryLat, boundaryLng]) => [boundaryLat, boundaryLng]),
      })),
    );
  }, []);

  const randomizeMap = useCallback(() => {
    const lat = random.real(-85, 85, true);
    const lng = random.real(-180, 180, true);
    const newZoom = random.integer(3, 10);

    setCenter([lat, lng]);
    setZoom(newZoom);
    generateHexOverlay(lat, lng, newZoom);
  }, [generateHexOverlay, random]);

  useEffect(() => {
    randomizeMap();
  }, [randomizeMap]);

  return (
    <div>
      <button onClick={randomizeMap} style={{ marginBottom: '10px' }}>
        Randomize Hex Battlefield
      </button>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '600px', width: '100%' }}
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