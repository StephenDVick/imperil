import RiskMap from './components/RiskMap';

const App = () => {
  return (
    <div className="app-layout">
      <aside className="tools-sidebar">
        <h1>Imperil: World Domination</h1>
        <p>Deploy forces, command territories, and randomize battlefields with a single click.</p>
        <div className="control-panel">
          <p>Phase 3 tools incoming. Stand by for army assignments and territory tracking.</p>
        </div>
      </aside>
      <section className="map-section">
        <div className="map-aspect">
          <RiskMap />
        </div>
      </section>
    </div>
  );
};

export default App;