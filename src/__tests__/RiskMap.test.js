import { render, screen } from '@testing-library/react';
import App from '../App';
import RiskMap from '../components/RiskMap';
import packageJson from '../../package.json';

jest.mock('react-leaflet');

describe('Phase 1 Smoke Tests', () => {
  test('package.json lists required dependencies', () => {
    expect(packageJson.dependencies).toMatchObject({
      leaflet: expect.any(String),
      'react-leaflet': expect.any(String),
      'random-js': expect.any(String),
    });
  });

  test('RiskMap wires MapContainer and TileLayer correctly', () => {
    render(<RiskMap />);

  const mapContainer = screen.getByTestId('leaflet-map');
    expect(mapContainer).toBeInTheDocument();
    expect(mapContainer.dataset.center).toBe(JSON.stringify([0, 0]));
    expect(mapContainer.dataset.zoom).toBe('2');
    expect(mapContainer.dataset.styleHeight).toBe('600px');
    expect(mapContainer.dataset.styleWidth).toBe('100%');

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.dataset.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(tileLayer.dataset.attribution).toContain('OpenStreetMap');
  });

  test('App renders RiskMap and title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
  expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
  });
});
