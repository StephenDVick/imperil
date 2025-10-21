import React from 'react';
import { render, screen } from '@testing-library/react';
import RiskMap from '../components/RiskMap';
import * as h3 from 'h3-js';

// Mock Leaflet L object
jest.mock('leaflet', () => ({
  divIcon: (options) => ({ options }),
  Icon: {
    Default: {
      _getIconUrl: jest.fn(),
      mergeOptions: jest.fn(),
      prototype: {},
    },
  },
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, style, ...props }) => (
    <div
      data-testid="leaflet-map"
      data-center={Array.isArray(center) ? center.join(',') : center}
      data-zoom={zoom}
      style={style}
      {...props}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution, ...props }) => (
    <div
      data-testid="tile-layer"
      data-url={url}
      data-attribution={attribution}
      {...props}
    />
  ),
  Polygon: ({ positions, pathOptions, eventHandlers, ...props }) => (
    <div
      data-testid="polygon"
      data-path-color={pathOptions?.color}
      data-path-weight={pathOptions?.weight}
      data-path-opacity={pathOptions?.opacity}
      data-path-dash-array={pathOptions?.dashArray}
      onClick={eventHandlers?.click}
      {...props}
    />
  ),
  useMap: () => ({
    flyTo: jest.fn(),
    getBounds: jest.fn(),
    getCenter: jest.fn(),
    setView: jest.fn(),
  }),
}));

// Mock H3 to return predictable results
jest.mock('h3-js', () => ({
  latLngToCell: jest.fn((lat, lng, resolution) => `hex_${lat}_${lng}_${resolution}`),
  gridRing: jest.fn((centerHex, ring) => {
    // Always return an array, even for ring 0 (which normally has no hexes)
    const hexes = [];
    const numHexes = ring === 0 ? 0 : ring * 6;
    for (let i = 0; i < numHexes; i++) {
      hexes.push(`${centerHex}_ring${ring}_${i}`);
    }
    return hexes;
  }),
  cellToBoundary: jest.fn((hexId) => [
    [0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [-0.5, 0.5]
  ]),
}));

describe('Water Detection and Hex Styling Tests', () => {
  test('water hexes have different styling than land hexes', async () => {
    render(<RiskMap />);
    
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    
    // Check that some polygons have different styling properties
    const firstPolygon = polygons[0];
    expect(firstPolygon.dataset.pathColor).toBe('#1f2937');
    expect(firstPolygon.dataset.pathOpacity).toBeDefined();
  });

  test('water hexes use dashed line styling', async () => {
    // Test with Indonesia territory which is surrounded by water
    render(<RiskMap />);
    
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    
    // At least some polygons should have dash array (water hexes)
    const polygonsWithDash = polygons.filter(p => p.dataset.pathDashArray === '5, 5');
    expect(polygonsWithDash.length).toBeGreaterThan(0);
  });

  test('land hexes use solid line styling', async () => {
    // Create a better mock that returns multiple hex IDs and boundaries
    h3.gridRing.mockImplementation((centerHex, ring) => {
      if (ring === 1) {
        return ['hex1', 'hex2', 'hex3']; // Return some hex IDs for ring 1
      }
      return [];
    });
    
    h3.cellToBoundary.mockImplementation((hexId) => {
      if (hexId === 'center') {
        // Center hex - use coordinates in central Russia (clearly on land)
        return [[55, 40], [55.1, 40.1], [55.2, 40], [55.1, 39.9], [55, 39.9], [54.9, 40]];
      } else if (hexId === 'hex1') {
        // Kazakhstan (clearly on land, avoiding all seas) 
        return [[50, 70], [50.1, 70.1], [50.2, 70], [50.1, 69.9], [50, 69.9], [49.9, 70]];
      } else if (hexId === 'hex2') {
        // Water hex (Pacific Ocean coordinates)
        return [[0, 150], [0.1, 150.1], [0.2, 150], [0.1, 149.9], [0, 149.9], [-0.1, 150]];
      } else if (hexId === 'hex3') {
        // Colorado, USA (clearly on land, avoiding all water conditions)
        return [[39, -105], [39.1, -104.9], [39.2, -105], [39.1, -105.1], [39, -105.1], [38.9, -105]];
      }
      return [[0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [-0.5, 0.5]]; // fallback
    });

    render(<RiskMap />);
    
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(1); // Should have multiple polygons now
    
    // Some polygons should not have dash array (land hexes)
    // null dashArray gets converted to "null" string in data attributes
    const solidLinePolygons = polygons.filter(p => 
      !p.dataset.pathDashArray || 
      p.dataset.pathDashArray === 'null' || 
      p.dataset.pathDashArray === 'undefined'
    );
    expect(solidLinePolygons.length).toBeGreaterThan(0);
  });

  test('water hexes have reduced opacity', async () => {
    // Test with default territory (Eastern United States) which has coastal areas
    render(<RiskMap />);
    
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    
    // Check that water hexes have reduced opacity
    const waterHexes = polygons.filter(p => p.dataset.pathOpacity === '0.4'); // 0.8 * 0.5
    expect(waterHexes.length).toBeGreaterThan(0);
  });
});