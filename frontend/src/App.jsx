import { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import CaseSelect from './components/CaseSelect';
import InvestigationRoom from './components/InvestigationRoom';
import { useSimStore } from './state/useSimStore';
import { fetchAgents } from './lib/api';

function App() {
  const loaded = useSimStore((state) => state.loaded);
  const screen = useSimStore((state) => state.screen);
  const setAgents = useSimStore((state) => state.setAgents);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((err) => setLoadError(err.message));
  }, [setAgents]);

  if (loadError) {
    return (
      <div className="app app--error">
        <Header />
        <div className="app__error">
          No se pudo conectar con el backend ({loadError}). Verifica que esté corriendo en el
          puerto configurado.
        </div>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <div className="app">
      <Header />
      {screen === 'room' ? <InvestigationRoom /> : <CaseSelect />}
    </div>
  );
}

export default App;
