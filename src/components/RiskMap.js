import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
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
  color: '#374151', // Dark gray borders
  weight: 1, // Thin borders
  opacity: 0.8,
  fillOpacity: 0.7,
};

// Territory color palette for board game aesthetic
const TERRITORY_COLORS = [
  '#dbeafe', // Soft blue
  '#dcfce7', // Soft green
  '#fef3c7', // Soft yellow
  '#fce7f3', // Soft pink
  '#e0f2fe', // Light blue
  '#f0fdf4', // Light green
  '#fffbeb', // Light yellow
  '#fdf2f8', // Light pink
  '#f0f9ff', // Very light blue
  '#f7fee7', // Very light green
  '#fefce8', // Very light yellow
  '#fdf4ff', // Very light purple
];

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

const BASE_ZOOM = 3;

const MapViewSynchronizer = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
};

const clampResolution = (zoom) => Math.max(0, Math.min(12, Math.round(zoom - 2)));

const generateTerritoryId = (index) => {
  // Generate territory IDs like A1, A2, B1, B2, etc.
  const letters = 'ABCDEFGH';
  const letterIndex = Math.floor(index / 16);
  const number = (index % 16) + 1;
  return `${letters[letterIndex] || 'H'}${number}`;
};

const getTerritoryColor = (index) => {
  return TERRITORY_COLORS[index % TERRITORY_COLORS.length];
};

const RiskMap = () => {
  const [center, setCenter] = useState([50.0, 10.0]); // Central Europe coordinates
  const [zoom, setZoom] = useState(BASE_ZOOM);
  const [hexes, setHexes] = useState([]);
  const [selectedHex, setSelectedHex] = useState(null);
  const random = useMemo(() => new Random(), []);

  const getHexPathOptions = useCallback((index, isSelected) => {
    const baseColor = getTerritoryColor(index);

    const style = {
      color: HEX_STYLE.color,
      weight: HEX_STYLE.weight,
      opacity: HEX_STYLE.opacity,
      fillColor: baseColor,
      fillOpacity: HEX_STYLE.fillOpacity,
    };

    // Add subtle shadow/elevation effect
    if (!isSelected) {
      // Simulate elevation with slightly darker borders for depth
      style.color = '#1f2937';
    }

    if (isSelected) {
      style.color = '#1f2937'; // Darker border for selected
      style.weight = 2;
      style.opacity = 1;
      style.fillOpacity = 0.9;
    }

    return style;
  }, []);

  const handleHexClick = useCallback((hexId) => {
    setSelectedHex((prev) => (prev === hexId ? null : hexId));
  }, []);

  const generateFullHexOverlay = useCallback((lat, lng) => {
    const resolution = clampResolution(BASE_ZOOM);
    const centerHex = h3.latLngToCell(lat, lng, resolution);

    // Generate hexagonal grid with 6 rings (127 hexagons total)
    // Use gridDisk with large radius and sort by distance to get hexagonal shape
    const cluster = h3.gridDisk(centerHex, 8); // Get a large disk

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

    // Sort by distance and take exactly 127 hexagons for hexagonal shape
    const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
    const cluster127 = sorted.slice(0, 127);

    const shapedHexes = cluster127.map(({ hexId, boundary, centroidLat, centroidLng }, index) => {
      // Create territory ID (A1, A2, B1, etc.)
      const territoryId = generateTerritoryId(index);

      return {
        hexId,
        boundary,
        centroidLat,
        centroidLng,
        territoryId,
        status: 'territory', // All are playable territories now
      };
    });

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
          opacity={0.4}
        />
        {hexes.map(({ hexId, boundary, status }, index) => (
          <Polygon
            key={hexId}
            positions={boundary}
            pathOptions={getHexPathOptions(index, hexId === selectedHex)}
            eventHandlers={{ click: () => handleHexClick(hexId) }}
          />
        ))}
        {hexes.map(({ hexId, centroidLat, centroidLng, territoryId }, index) => (
          <Marker
            key={`label-${hexId}`}
            position={[centroidLat, centroidLng]}
            icon={L.divIcon({
              html: `<div style="color: #374151; font-size: 10px; font-weight: bold; text-shadow: 1px 1px 1px white; pointer-events: none;">${territoryId}</div>`,
              className: 'territory-label',
              iconSize: [30, 12],
              iconAnchor: [15, 6],
            })}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default RiskMap;