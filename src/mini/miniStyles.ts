/** Feuille de style autonome de la fenêtre flottante (le CSS de l'app n'y est pas chargé). */
export const MINI_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #0b0d10; color: #e7e9ee;
  font: 13px/1.35 -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; overflow: hidden; }
#mini-root { height: 100%; }
.mini { height: 100%; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px;
  border-top: 3px solid #2a303a; }
.mini-running { border-top-color: #3ecf8e; }
.mini-paused { border-top-color: #f5b84a; }
.mini-head { display: flex; justify-content: space-between; gap: 8px; color: #8b93a1; font-size: 11.5px; }
.mini-cat { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-dot::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 6px;
  border-radius: 50%; background: #8b93a1; vertical-align: 1px; }
.mini-running .mini-dot::before { background: #3ecf8e; }
.mini-paused .mini-dot::before { background: #f5b84a; }
.mini-time { font: 600 38px/1.1 ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em; text-align: center; }
.mini-detail { text-align: center; color: #7c9cff; font-size: 12px; min-height: 16px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-day { display: flex; align-items: center; gap: 8px; color: #8b93a1; font-size: 11px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
.mini-bar { flex: 1; height: 5px; border-radius: 99px; background: #181c22; overflow: hidden; }
.mini-bar > div { height: 100%; background: #7c9cff; }
.mini-bar > div.ok { background: #3ecf8e; }
.mini-actions { display: flex; gap: 6px; margin-top: auto; }
button { flex: 1; font: inherit; font-weight: 600; color: #e7e9ee; background: #23272f;
  border: 1px solid #2f3540; border-radius: 8px; padding: 7px 10px; cursor: pointer; }
button:hover { background: #2a303a; }
button.primary { background: #7c9cff; border-color: #7c9cff; color: #0b0d10; }
button.ghost { flex: 0 0 auto; background: transparent; color: #8b93a1; }
.mini-alert { height: 100%; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.mini-alert strong { font-size: 15px; color: #f5b84a; }
.mini-alert-goal strong { color: #3ecf8e; }
.mini-alert span { color: #c9ced8; }
.mini-alert button { flex: 0 0 auto; margin-top: 4px; background: #7c9cff; border-color: #7c9cff; color: #0b0d10; }
`;
