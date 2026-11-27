import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { mapOutline, statsChartOutline, timerOutline } from 'ionicons/icons';
import { Navigate, Route } from 'react-router-dom';

import GuidedWatcher from './components/GuidedWatcher';
import Roadmap from './pages/Roadmap';
import Today from './pages/Today';
import Week from './pages/Week';
import { AppStoreProvider } from './state/AppStore';

/* CSS indispensable d'Ionic (on n'importe que le nécessaire pour rester léger). */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';

/* Thème sombre permanent. */
import '@ionic/react/css/palettes/dark.always.css';

import './theme/variables.css';
import './theme/app.css';

setupIonicReact({
  mode: 'md',
  // Transitions sobres : moins de travail GPU sur une machine ancienne.
  animated: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
});

const App: React.FC = () => (
  <IonApp>
    <AppStoreProvider>
      <GuidedWatcher />
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/today" element={<Today />} />
            <Route path="/week" element={<Week />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="today" href="/today">
              <IonIcon aria-hidden="true" icon={timerOutline} />
              <IonLabel>Aujourd'hui</IonLabel>
            </IonTabButton>
            <IonTabButton tab="week" href="/week">
              <IonIcon aria-hidden="true" icon={statsChartOutline} />
              <IonLabel>Semaine & Stats</IonLabel>
            </IonTabButton>
            <IonTabButton tab="roadmap" href="/roadmap">
              <IonIcon aria-hidden="true" icon={mapOutline} />
              <IonLabel>Roadmap</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </AppStoreProvider>
  </IonApp>
);

export default App;
