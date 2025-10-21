import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-leaflet');

test('renders application title and RiskMap container', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Imperil: World Domination' })).toBeInTheDocument();
  expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
});
