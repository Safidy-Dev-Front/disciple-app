import { useEffect, useState } from 'react';

/**
 * Renvoie `Date.now()` rafraîchi toutes les `intervalMs` tant que `active` est vrai.
 * Le tick ne sert qu'à redessiner : le temps est toujours recalculé depuis les
 * timestamps, donc un onglet mis en veille affiche la bonne valeur au réveil.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const kick = window.setTimeout(tick, 0);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(kick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, intervalMs]);

  return now;
}
