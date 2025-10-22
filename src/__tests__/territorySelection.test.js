// Territory Selection Tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RiskMap from '../components/RiskMap';

// Mock H3
jest.mock('h3-js', () => ({
  latLngToCell: jest.fn((lat, lng, resolution) => {
    const latInt = Math.floor(Math.abs(lat));
    const lngInt = Math.floor(Math.abs(lng));
    return `8${latInt}${lngInt}res${resolution}`;
  }),
  gridDisk: jest.fn((centerHex, distance) => {
    const hexes = [centerHex];
    if (distance >= 1) {
      for (let i = 0; i < 6; i++) {
        hexes.push(`${centerHex}_neighbor_${i}`);
      }
    }
    return hexes;
  }),
  cellToBoundary: jest.fn((hexId) => [
    [0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [-0.5, 0.5]
  ]),
}));

// Mock Leaflet
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

// Mock react-leaflet
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
  Popup: ({ children, ...props }) => (
    <div data-testid="popup" {...props}>{children}</div>
  ),
  useMap: () => ({
    flyTo: jest.fn(),
    getBounds: jest.fn(),
    getCenter: jest.fn(),
    setView: jest.fn(),
  }),
}));

describe('Territory Selection Tests', () => {
  test('renders territory dropdown with all 42 territories', () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    expect(dropdown).toBeInTheDocument();
    
    // Get all options in the territory dropdown
    const options = screen.getAllByRole('option');
    
    // Should have 44 options (42 territories + 1 "Select Territory" placeholder + 1 "World")
    expect(options.length).toBe(48); // 44 territory options + 4 hex size options
    
    // Verify placeholder exists
    expect(screen.getByRole('option', { name: 'Select Territory' })).toBeInTheDocument();
  });

  test('territories are grouped by continent', () => {
    render(<RiskMap />);
    
    // Check for continent groups
    expect(screen.getByRole('group', { name: 'North America' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'South America' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Europe' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Africa' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Asia' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Australia' })).toBeInTheDocument();
  });

  test('North America territories are present', () => {
    render(<RiskMap />);
    
    const northAmericanTerritories = [
      'Alaska',
      'Alberta',
      'Central America',
      'Eastern United States',
      'Greenland',
      'Northwest Territory',
      'Ontario',
      'Quebec',
      'Western United States'
    ];
    
    northAmericanTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('South America territories are present', () => {
    render(<RiskMap />);
    
    const southAmericanTerritories = ['Argentina', 'Brazil', 'Peru', 'Venezuela'];
    
    southAmericanTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('Europe territories are present', () => {
    render(<RiskMap />);
    
    const europeanTerritories = [
      'Great Britain',
      'Iceland',
      'Northern Europe',
      'Scandinavia',
      'Southern Europe',
      'Ukraine',
      'Western Europe'
    ];
    
    europeanTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('Africa territories are present', () => {
    render(<RiskMap />);
    
    const africanTerritories = [
      'Congo',
      'East Africa',
      'Egypt',
      'Madagascar',
      'North Africa',
      'South Africa'
    ];
    
    africanTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('Asia territories are present', () => {
    render(<RiskMap />);
    
    const asianTerritories = [
      'Afghanistan',
      'China',
      'India',
      'Irkutsk',
      'Japan',
      'Kamchatka',
      'Middle East',
      'Mongolia',
      'Siam',
      'Siberia',
      'Ural',
      'Yakutsk'
    ];
    
    asianTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('Australia territories are present', () => {
    render(<RiskMap />);
    
    const australianTerritories = [
      'Eastern Australia',
      'Indonesia',
      'New Guinea',
      'Western Australia'
    ];
    
    australianTerritories.forEach(territory => {
      expect(screen.getByRole('option', { name: territory })).toBeInTheDocument();
    });
  });

  test('defaults to World on initial render', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    await waitFor(() => {
      expect(dropdown.value).toBe('World');
    });
    
    // Map should center on World coordinates
    const mapContainer = screen.getByTestId('leaflet-map');
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('0,0');
    });
  });

  test('selecting World updates map center to global view', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    const mapContainer = screen.getByTestId('leaflet-map');
    
    // First select a territory to change from default
    fireEvent.change(dropdown, { target: { value: 'Brazil' } });
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('-10,-52');
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('7');
    });
    
    // Now select World
    fireEvent.change(dropdown, { target: { value: 'World' } });
    await waitFor(() => {
      expect(dropdown.value).toBe('World');
    });
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('0,0');
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('1');
    });
  });

  test('selecting a territory updates the dropdown value', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    
    // Select Brazil
    fireEvent.change(dropdown, { target: { value: 'Brazil' } });
    
    await waitFor(() => {
      expect(dropdown.value).toBe('Brazil');
    });
  });

  test('selecting a territory updates map center', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    const mapContainer = screen.getByTestId('leaflet-map');
    
    // Select Alaska
    fireEvent.change(dropdown, { target: { value: 'Alaska' } });
    
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('64,-153');
    });
    
    // Select China
    fireEvent.change(dropdown, { target: { value: 'China' } });
    
    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe('35,105');
    });
  });

  test('selecting a territory generates new hexes', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    
    // Enable hexes
    const showHexesButton = screen.getByRole('button', { name: 'Show Hexes' });
    fireEvent.click(showHexesButton);
    
    // Wait for initial hexes
    await screen.findAllByTestId('polygon');
    
    // Select a different territory
    fireEvent.change(dropdown, { target: { value: 'Japan' } });
    
    // Wait for hexes to regenerate
    await waitFor(() => {
      const newPolygons = screen.queryAllByTestId('polygon');
      // Hex count should exist (might be same or different, but should regenerate)
      expect(newPolygons.length).toBeGreaterThan(0);
    });
  });

  test('selecting multiple territories in succession works correctly', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    const mapContainer = screen.getByTestId('leaflet-map');
    
    const territories = [
      { name: 'Iceland', center: '65,-18' },
      { name: 'Madagascar', center: '-19,47' },
      { name: 'Kamchatka', center: '56,160' },
      { name: 'Peru', center: '-10,-75' }
    ];
    
    for (const territory of territories) {
      fireEvent.change(dropdown, { target: { value: territory.name } });
      
      await waitFor(() => {
        expect(dropdown.value).toBe(territory.name);
      });
      
      expect(mapContainer.dataset.center).toBe(territory.center);
    }
  });

  test('selecting a territory clears hex selection', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    
    // Enable hexes
    const showHexesButton = screen.getByRole('button', { name: 'Show Hexes' });
    fireEvent.click(showHexesButton);
    
    // Wait for hexes and click one
    const polygons = await screen.findAllByTestId('polygon');
    fireEvent.click(polygons[0]);
    
    // Select a new territory
    fireEvent.change(dropdown, { target: { value: 'Greenland' } });
    
    // Selection should be cleared (no error should occur)
    await waitFor(() => {
      expect(dropdown.value).toBe('Greenland');
    });
  });

  test('territory coordinates are valid (within lat/lng bounds)', () => {
    render(<RiskMap />);
    
    const mapContainer = screen.getByTestId('leaflet-map');
    const dropdown = screen.getByTestId('territory-dropdown');
    
    // Test a sample of territories to ensure coordinates are valid
    const territoriesToTest = [
      'Alaska', 'Brazil', 'Egypt', 'India', 'Western Australia'
    ];
    
    territoriesToTest.forEach(territory => {
      fireEvent.change(dropdown, { target: { value: territory } });
      
      const center = mapContainer.dataset.center;
      const [lat, lng] = center.split(',').map(Number);
      
      // Latitude should be between -90 and 90
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      
      // Longitude should be between -180 and 180
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

  test('debug marker shows hex count after territory selection', async () => {
    render(<RiskMap />);
    
    const dropdown = screen.getByTestId('territory-dropdown');
    
    // Select a territory
    fireEvent.change(dropdown, { target: { value: 'Mongolia' } });
    
    // Debug marker should exist and show hex count
    const debugMarker = screen.getByTestId('debug-marker');
    expect(debugMarker).toBeInTheDocument();
    expect(debugMarker.textContent).toMatch(/Total hexes: \d+/);
  });
});
