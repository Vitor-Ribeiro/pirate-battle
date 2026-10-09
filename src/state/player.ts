const KEY = 'pirate-battle:player:v1';

export interface PlayerIdentity { id: string; name: string }

/** Anonymous identity kept locally; other players come from fixtures. */
export function getPlayer(): PlayerIdentity {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PlayerIdentity;
  } catch {
    /* ignore and create a new one */
  }
  const player = { id: crypto.randomUUID(), name: 'You' };
  localStorage.setItem(KEY, JSON.stringify(player));
  return player;
}
