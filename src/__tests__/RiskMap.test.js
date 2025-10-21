import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import RiskMap from '../components/RiskMap';
import packageJson from '../../package.json';

jest.mock('react-leaflet');

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
      expect(mapContainer.dataset.center).toBe(JSON.stringify([10, 20]));
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('16');
    });
    expect(mapContainer.dataset.styleHeight).toBe('100%');
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
    const button = screen.getByRole('button', { name: 'Randomize Coordinates' });
    const mapContainer = await screen.findByTestId('leaflet-map');

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe(JSON.stringify([10, 20]));
    });
    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('16');
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mapContainer.dataset.center).toBe(JSON.stringify([30, 40]));
    });
    expect(mapContainer.dataset.zoom).toBe('16');
  });

  test('RiskMap updates zoom from dropdown', async () => {
    render(<RiskMap />);

    const mapContainer = await screen.findByTestId('leaflet-map');
    const select = screen.getByRole('combobox', { name: 'Select zoom level' });

    expect(select).toHaveDisplayValue('16 — Street');

    fireEvent.change(select, { target: { value: '8' } });

    await waitFor(() => {
      expect(mapContainer.dataset.zoom).toBe('8');
    });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('0 — Whole world');
    expect(options[options.length - 1]).toHaveTextContent('19 — Highway details');
  });

  test('App renders RiskMap and title', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
    expect(await screen.findByTestId('leaflet-map')).toBeInTheDocument();
  });
});
