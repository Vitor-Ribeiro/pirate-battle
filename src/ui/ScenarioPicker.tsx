import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidateLists } from '../api/queries';
import { getScenario, resetMocks, SCENARIOS, setScenario, type ScenarioName } from '../mocks/scenarios';

export function ScenarioPicker() {
  const client = useQueryClient();
  const [value, setValue] = useState<ScenarioName>(getScenario());

  const change = (name: ScenarioName) => {
    setScenario(name);
    const url = new URL(window.location.href);
    if (url.searchParams.has('scenario')) {
      url.searchParams.delete('scenario');
      window.history.replaceState(null, '', url);
    }
    setValue(name);
    void invalidateLists(client);
  };

  return (
    <details className="card">
      <summary>Network scenarios (mock API)</summary>
      <p>
        <label htmlFor="scenario">Scenario</label>{' '}
        <select id="scenario" value={value} onChange={(e) => change(e.target.value as ScenarioName)}>
          {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>{' '}
        <button
          onClick={() => {
            resetMocks();
            setValue('success');
            client.clear();
            void invalidateLists(client);
          }}
        >
          Reset mocks
        </button>
      </p>
    </details>
  );
}
