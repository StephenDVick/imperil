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
  color: '#374151', // Dark gray borders
  weight: 1, // Thin borders
  opacity: 0.8,
  fillOpacity: 0, // No fill
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

const BASE_ZOOM = 7;

const MapViewSynchronizer = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
};

const clampResolution = (zoom) => Math.max(0, Math.min(12, Math.round(zoom - 3))); // Decreased by 1 to double hex size

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

// Simple water detection based on major water bodies and ocean areas
const isWaterHex = (lat, lng) => {
  // Major oceans and seas - simplified geometric detection
  
  // Pacific Ocean (large portions)
  if (lng > 120 || lng < -120) {
    if (Math.abs(lat) < 60) return true;
  }
  
  // Atlantic Ocean
  if (lng > -70 && lng < 20 && Math.abs(lat) < 70) {
    if ((lat > 0 && lng > -40 && lng < 0) || // North Atlantic
        (lat < 20 && lng > -50 && lng < 10)) { // South Atlantic portions
      return true;
    }
  }
  
  // Indian Ocean
  if (lng > 40 && lng < 120 && lat < 30 && lat > -50) {
    return true;
  }
  
  // Mediterranean Sea
  if (lng > 0 && lng < 40 && lat > 30 && lat < 50) {
    return true;
  }
  
  // Red Sea
  if (lng > 30 && lng < 50 && lat > 10 && lat < 30) {
    return true;
  }
  
  // Persian Gulf
  if (lng > 45 && lng < 60 && lat > 20 && lat < 32) {
    return true;
  }
  
  // Great Lakes region (approximate)
  if (lng > -95 && lng < -75 && lat > 40 && lat < 50) {
    return true;
  }
  
  // Baltic Sea
  if (lng > 10 && lng < 35 && lat > 53 && lat < 66) {
    return true;
  }
  
  // Black Sea
  if (lng > 25 && lng < 45 && lat > 40 && lat < 48) {
    return true;
  }
  
  // Caspian Sea
  if (lng > 45 && lng < 55 && lat > 35 && lat < 50) {
    return true;
  }
  
  return false;
};

const RiskMap = () => {
  const [center, setCenter] = useState([50.0, 10.0]); // Central Europe coordinates
  const zoom = BASE_ZOOM; // Fixed zoom level
  const [hexes, setHexes] = useState([]);
  const [selectedHex, setSelectedHex] = useState(null);
  const [showHexes, setShowHexes] = useState(true); // Toggle for hex overlay visibility
  const random = useMemo(() => new Random(), []);

  const getHexPathOptions = useCallback((index, isSelected, isWater) => {
    const baseColor = getTerritoryColor(index);

    const style = {
      color: HEX_STYLE.color,
      weight: HEX_STYLE.weight,
      opacity: isWater ? HEX_STYLE.opacity * 0.5 : HEX_STYLE.opacity, // Half opacity for water hexes
      fillColor: baseColor,
      fillOpacity: HEX_STYLE.fillOpacity,
      dashArray: isWater ? '5, 5' : null, // Dashed line for water hexes
    };

    // Add subtle shadow/elevation effect
    if (!isSelected) {
      // Simulate elevation with slightly darker borders for depth
      style.color = '#1f2937';
    }

    if (isSelected) {
      style.color = '#1f2937'; // Darker border for selected
      style.weight = 2;
      style.opacity = isWater ? 0.5 : 1; // Half opacity for water hexes even when selected
      style.fillOpacity = 0; // No fill even when selected
      style.dashArray = isWater ? '5, 5' : null; // Keep dashed line for water hexes even when selected
    }

    return style;
  }, []);

  const handleHexClick = useCallback((hexId) => {
    setSelectedHex((prev) => (prev === hexId ? null : hexId));
  }, []);

  const generateFullHexOverlay = useCallback((lat, lng) => {
    const resolution = clampResolution(BASE_ZOOM);
    const centerHex = h3.latLngToCell(lat, lng, resolution);

    // Generate a perfect hexagonal grid with exactly 127 hexagons
    // This creates rings around the center: 1 + 6 + 12 + 18 + 24 + 30 + 36 = 127
    const hexagonalGrid = [];
    
    // Add center hex (ring 0)
    hexagonalGrid.push(centerHex);
    
    // Add rings 1-6 to get exactly 127 hexes
    for (let ring = 1; ring <= 6; ring++) {
      const ringHexes = h3.gridRing(centerHex, ring);
      if (ringHexes && Array.isArray(ringHexes)) {
        hexagonalGrid.push(...ringHexes);
      }
    }

    const shapedHexes = hexagonalGrid.map((hexId, index) => {
      const boundary = h3.cellToBoundary(hexId);
      // Defensive check for tests
      const safeBoundary = boundary || [[0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [-0.5, 0.5]];
      const mappedBoundary = safeBoundary.map(([boundaryLat, boundaryLng]) => [boundaryLat, boundaryLng]);
      
      const centroid = mappedBoundary.reduce(
        (acc, [boundaryLat, boundaryLng]) => {
          acc.lat += boundaryLat;
          acc.lng += boundaryLng;
          return acc;
        },
        { lat: 0, lng: 0 },
      );
      
      const pointsCount = mappedBoundary.length || 1;
      const centroidLat = centroid.lat / pointsCount;
      const centroidLng = centroid.lng / pointsCount;

      // Create territory ID (A1, A2, B1, etc.)
      const territoryId = generateTerritoryId(index);
      
      // Check if this hex is over water
      const isWater = isWaterHex(centroidLat, centroidLng);

      return {
        hexId,
        boundary: mappedBoundary,
        centroidLat,
        centroidLng,
        territoryId,
        status: 'territory', // All are playable territories now
        isWater, // Add water detection flag
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

  const toggleHexOverlay = useCallback(() => {
    setShowHexes(prev => !prev);
    setSelectedHex(null); // Clear selection when toggling
  }, []);

  useEffect(() => {
    randomizeCoords();
  }, [randomizeCoords]);

  return (
    <div className="map-wrapper">
      <div className="map-controls">
        <button type="button" onClick={randomizeCoords}>
          Randomize Coordinates
        </button>
        <button type="button" onClick={toggleHexOverlay}>
          {showHexes ? 'Hide Hexes' : 'Show Hexes'}
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
        {showHexes && hexes.map(({ hexId, boundary, status, isWater }, index) => (
          <Polygon
            key={hexId}
            positions={boundary}
            pathOptions={getHexPathOptions(index, hexId === selectedHex, isWater)}
            eventHandlers={{ click: () => handleHexClick(hexId) }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default RiskMap;