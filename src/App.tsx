import { useCallback, useState } from 'react';
import type { MatchResult } from './game/core/types';
import { loadOptions } from './state/optionsStore';
import { saveLastResult } from './state/lastResult';
import { MainMenu } from './ui/screens/MainMenu';
import { MatchScreen } from './ui/screens/MatchScreen';
import { OptionsScreen } from './ui/screens/OptionsScreen';
import { ResultScreen } from './ui/screens/ResultScreen';

type Screen = 'menu' | 'options' | 'match' | 'result';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [matchKey, setMatchKey] = useState(0); // a new key creates a brand new match

  const handleFinish = useCallback((r: MatchResult) => {
    saveLastResult(r);
    setResult(r);
    setScreen('result');
  }, []);

  const play = () => {
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  switch (screen) {
    case 'options':
      return <OptionsScreen onBack={() => setScreen('menu')} />;
    case 'match':
      return <MatchScreen key={matchKey} options={loadOptions()} onFinish={handleFinish} onExit={() => setScreen('menu')} />;
    case 'result':
      return result ? <ResultScreen key={result.matchId} result={result} onPlayAgain={play} onMainMenu={() => setScreen('menu')} /> : null;
    default:
      return <MainMenu onPlay={play} onOptions={() => setScreen('options')} />;
  }
}
