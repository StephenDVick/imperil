const React = require('react');

const MapContainer = ({ children, ...props }) =>
  React.createElement(
    'div',
    {
      'data-testid': props['data-testid'] ?? 'map-container',
      'data-center': props.center ? JSON.stringify(props.center) : undefined,
      'data-zoom': props.zoom !== undefined ? String(props.zoom) : undefined,
      'data-style-height': props.style?.height,
      'data-style-width': props.style?.width,
    },
    children,
  );

const TileLayer = ({ url, attribution, children }) =>
  React.createElement(
    'div',
    {
      'data-testid': 'tile-layer',
      'data-url': url,
      'data-attribution': attribution,
    },
    children,
  );

const Polygon = ({ positions, pathOptions, children }) =>
  React.createElement(
    'div',
    {
      'data-testid': 'polygon',
      'data-positions': JSON.stringify(positions),
      'data-path-color': pathOptions?.color,
    },
    children,
  );

const mockMapInstance = {
  setView: () => {},
};

const useMap = () => mockMapInstance;

module.exports = {
  __esModule: true,
  MapContainer,
  TileLayer,
  Polygon,
  useMap,
};
