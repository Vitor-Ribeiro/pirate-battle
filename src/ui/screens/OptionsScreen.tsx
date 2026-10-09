import { useState } from 'react';
import { OPTION_LIMITS, validateOptions, type UserOptions } from '../../game/config/gameConfig';
import { loadOptions, saveOptions } from '../../state/optionsStore';

export function OptionsScreen({ onBack }: { onBack: () => void }) {
  const [values, setValues] = useState(() => {
    const o = loadOptions();
    return { sessionSec: String(o.sessionSec), spawnIntervalSec: String(o.spawnIntervalSec) };
  });
  const [saved, setSaved] = useState(false);

  const parsed: UserOptions = { sessionSec: Number(values.sessionSec), spawnIntervalSec: Number(values.spawnIntervalSec) };
  const errors = validateOptions(parsed);

  return (
    <main className="screen">
      <h1>Options</h1>
      <div className="card">
        <p>
          <label htmlFor="session">Game session time (seconds)</label>
          <br />
          <input
            id="session"
            inputMode="numeric"
            value={values.sessionSec}
            aria-invalid={!!errors.sessionSec}
            aria-describedby="session-hint"
            onChange={(e) => { setSaved(false); setValues({ ...values, sessionSec: e.target.value }); }}
          />
          <span id="session-hint" role={errors.sessionSec ? 'alert' : undefined}>
            {errors.sessionSec ?? ` Between ${OPTION_LIMITS.sessionSec.min} and ${OPTION_LIMITS.sessionSec.max}.`}
          </span>
        </p>
        <p>
          <label htmlFor="spawn">Enemy spawn time (seconds)</label>
          <br />
          <input
            id="spawn"
            inputMode="decimal"
            value={values.spawnIntervalSec}
            aria-invalid={!!errors.spawnIntervalSec}
            aria-describedby="spawn-hint"
            onChange={(e) => { setSaved(false); setValues({ ...values, spawnIntervalSec: e.target.value }); }}
          />
          <span id="spawn-hint" role={errors.spawnIntervalSec ? 'alert' : undefined}>
            {errors.spawnIntervalSec ?? ` Between ${OPTION_LIMITS.spawnIntervalSec.min} and ${OPTION_LIMITS.spawnIntervalSec.max}.`}
          </span>
        </p>
        <button
          disabled={Object.keys(errors).length > 0}
          onClick={() => { saveOptions(parsed); setSaved(true); }}
        >
          Save options
        </button>{' '}
        <button onClick={onBack}>Back</button>
        <p role="status">{saved ? 'Options saved.' : ''}</p>
      </div>
    </main>
  );
}
