// Mock H3 first, before any imports
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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import RiskMap from '../components/RiskMap';
import packageJson from '../../package.json';

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
      data-style-height={style?.height}
      data-style-width={style?.width}
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
  Marker: ({ position, icon, ...props }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)} {...props} />
  ),
  useMap: () => ({
    flyTo: jest.fn(),
    getBounds: jest.fn(),
    getCenter: jest.fn(),
    setView: jest.fn(),
  }),
}));

const mockReal = jest.fn();

jest.mock('random-js', () => {
  class MockRandom {
    real(...args) {
      return mockReal(...args);
    }

    integer() {
      return 0;
    }
  }

  return { Random: MockRandom };
});

beforeEach(() => {
  mockReal.mockReset();

  mockReal
    .mockReturnValueOnce(10)
    .mockReturnValueOnce(20)
    .mockReturnValueOnce(30)
    .mockReturnValueOnce(40);
});

describe('Phase 1 Smoke Tests', () => {
  test('package.json lists required dependencies', () => {
    expect(packageJson.dependencies).toMatchObject({
      leaflet: expect.any(String),
      'react-leaflet': expect.any(String),
      'random-js': expect.any(String),
      'h3-js': expect.any(String),
    });
  });

  test('RiskMap wires MapContainer, TileLayer, and hex polygons', async () => {
    render(<RiskMap />);

    const mapContainer = await screen.findByTestId('leaflet-map');
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('10,20');
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('7'); // Updated to fixed zoom level
    });
    expect(mapContainer.dataset.styleHeight).toBe('100%');
    expect(mapContainer.dataset.styleWidth).toBe('100%');

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.dataset.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(tileLayer.dataset.attribution).toContain('OpenStreetMap');

    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    expect(polygons[0].dataset.pathColor).toBe('#1f2937');
  });

  test('RiskMap randomizes coordinates without changing zoom', async () => {
    render(<RiskMap />);
    const button = screen.getByRole('button', { name: 'Randomize Coordinates' });
    const mapContainer = await screen.findByTestId('leaflet-map');

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('10,20');
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('7'); // Fixed zoom level
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('30,40');
    });
    expect(mapContainer.dataset.zoom).toBe('7'); // Zoom should remain the same
  });

  test('RiskMap renders hex overlay toggle button', async () => {
    render(<RiskMap />);
    
    const toggleButton = screen.getByRole('button', { name: 'Hide Hexes' });
    expect(toggleButton).toBeInTheDocument();
    
    // Initially hexes should be visible
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
  });

  test('RiskMap toggles hex overlay visibility', async () => {
    render(<RiskMap />);
    
    const toggleButton = screen.getByRole('button', { name: 'Hide Hexes' });
    
    // Initially hexes should be visible
    let polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    
    // Click to hide hexes
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show Hexes' })).toBeInTheDocument();
    });
    
    // Hexes should be hidden
    polygons = screen.queryAllByTestId('polygon');
    expect(polygons.length).toBe(0);
    
    // Click to show hexes again
    const showButton = screen.getByRole('button', { name: 'Show Hexes' });
    fireEvent.click(showButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hide Hexes' })).toBeInTheDocument();
    });
    
    // Hexes should be visible again
    polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
  });

  test('RiskMap handles hex selection', async () => {
    render(<RiskMap />);
    
    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    
    // Click on first hex
    fireEvent.click(polygons[0]);
    
    // Verify hex click is handled (this test mainly ensures no errors occur)
    expect(polygons[0]).toBeInTheDocument();
  });

  test('App renders RiskMap and title', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
    expect(await screen.findByTestId('leaflet-map')).toBeInTheDocument();
  });
});
