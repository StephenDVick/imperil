import { render, screen } from '@testing-library/react';
import App from './App';

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
  Polygon: ({ positions, pathOptions, ...props }) => (
    <div
      data-testid="polygon"
      data-path-color={pathOptions?.color}
      data-path-weight={pathOptions?.weight}
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

test('renders application title and RiskMap container', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
  expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
});
