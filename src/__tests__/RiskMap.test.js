import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import RiskMap from '../components/RiskMap';
import packageJson from '../../package.json';

jest.mock('react-leaflet');

const mockReal = jest.fn();
const mockInteger = jest.fn();

jest.mock('random-js', () => {
  class MockRandom {
    real(...args) {
      return mockReal(...args);
    }

    integer(...args) {
      return mockInteger(...args);
    }
  }

  return { Random: MockRandom };
});

beforeEach(() => {
  mockReal.mockReset();
  mockInteger.mockReset();

  mockReal
    .mockReturnValueOnce(10)
    .mockReturnValueOnce(20)
    .mockReturnValueOnce(30)
    .mockReturnValueOnce(40);

  mockInteger.mockReturnValueOnce(5).mockReturnValueOnce(7);
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
      expect(mapContainer.dataset.center).toBe(JSON.stringify([10, 20]));
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('5');
    });
    expect(mapContainer.dataset.styleHeight).toBe('600px');
    expect(mapContainer.dataset.styleWidth).toBe('100%');

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.dataset.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(tileLayer.dataset.attribution).toContain('OpenStreetMap');

    const polygons = await screen.findAllByTestId('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    expect(polygons[0].dataset.pathColor).toBe('#ff4500');
  });

  test('RiskMap randomizes on demand', async () => {
    render(<RiskMap />);
    const button = screen.getByRole('button', { name: 'Randomize Hex Battlefield' });
    const mapContainer = await screen.findByTestId('leaflet-map');

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe(JSON.stringify([10, 20]));
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('5');
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe(JSON.stringify([30, 40]));
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('7');
    });
  });

  test('App renders RiskMap and title', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
    expect(await screen.findByTestId('leaflet-map')).toBeInTheDocument();
  });
});
