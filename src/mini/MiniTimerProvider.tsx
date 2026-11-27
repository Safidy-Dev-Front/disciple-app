import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import MiniTimerView from './MiniTimerView';
import { MINI_CSS } from './miniStyles';

/**
 * `pip`   : Document Picture-in-Picture (Chrome / Edge) — fenêtre flottante
 *           toujours au premier plan, visible même quand l'app est réduite.
 * `popup` : repli (Safari, Firefox) — petite fenêtre séparée qui reste ouverte
 *           quand la fenêtre principale est réduite.
 */
export type MiniMode = 'pip' | 'popup';

interface MiniTimerContextValue {
  mode: MiniMode;
  isOpen: boolean;
  /** Doit être appelé depuis un geste utilisateur (clic). Renvoie false si bloqué. */
  open: () => Promise<boolean>;
  close: () => void;
}

const MiniTimerContext = createContext<MiniTimerContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useMiniTimer(): MiniTimerContextValue {
  const ctx = useContext(MiniTimerContext);
  if (!ctx) throw new Error('useMiniTimer doit être utilisé dans <MiniTimerProvider>');
  return ctx;
}

const detectMode = (): MiniMode => (typeof window !== 'undefined' && window.documentPictureInPicture ? 'pip' : 'popup');

interface MiniWindow {
  win: Window;
  root: HTMLElement;
}

function prepareDocument(win: Window): HTMLElement {
  const doc = win.document;
  doc.title = 'Discipline · mini-minuteur';
  doc.head.querySelectorAll('style[data-mini]').forEach((n) => n.remove());
  const style = doc.createElement('style');
  style.dataset.mini = '';
  style.textContent = MINI_CSS;
  doc.head.appendChild(style);
  doc.body.replaceChildren();
  const root = doc.createElement('div');
  root.id = 'mini-root';
  doc.body.appendChild(root);
  return root;
}

export const MiniTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode] = useState<MiniMode>(detectMode);
  const [mini, setMini] = useState<MiniWindow | null>(null);

  const close = useCallback(() => {
    mini?.win.close();
    setMini(null);
  }, [mini]);

  const open = useCallback(async (): Promise<boolean> => {
    if (mini && !mini.win.closed) {
      mini.win.focus();
      return true;
    }
    let win: Window | null;
    try {
      if (mode === 'pip' && window.documentPictureInPicture) {
        win = await window.documentPictureInPicture.requestWindow({ width: 300, height: 200 });
      } else {
        win = window.open('', 'discipline-mini', 'popup,width=320,height=240');
      }
    } catch (err) {
      console.warn('[mini] ouverture impossible', err);
      win = null;
    }
    if (!win) return false;
    const opened = win;
    const root = prepareDocument(opened);
    opened.addEventListener('pagehide', () => setMini((m) => (m?.win === opened ? null : m)), { once: true });
    setMini({ win: opened, root });
    return true;
  }, [mini, mode]);

  // Une popup ne se ferme pas toute seule avec l'app : on la ferme nous-mêmes.
  useEffect(() => {
    if (!mini) return;
    const onUnload = () => mini.win.close();
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, [mini]);

  const value = useMemo(() => ({ mode, isOpen: mini !== null, open, close }), [mode, mini, open, close]);

  return (
    <MiniTimerContext.Provider value={value}>
      {children}
      {mini && createPortal(<MiniTimerView onClose={close} />, mini.root)}
    </MiniTimerContext.Provider>
  );
};
