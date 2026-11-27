import { IonSelect, IonSelectOption } from '@ionic/react';

import { CATEGORIES, PROJECTS } from '../data/program';
import { isCategoryId, isProjectId } from '../storage/schema';
import type { CategoryId, ProjectId } from '../types';

const NO_PROJECT = 'none';

export const CategorySelect: React.FC<{ value: CategoryId; onChange: (v: CategoryId) => void }> = ({
  value,
  onChange,
}) => (
  <IonSelect
    label="Catégorie"
    labelPlacement="stacked"
    interface="popover"
    value={value}
    onIonChange={(e) => {
      if (isCategoryId(e.detail.value)) onChange(e.detail.value);
    }}
  >
    {CATEGORIES.map((c) => (
      <IonSelectOption key={c.id} value={c.id}>
        {c.label} · {c.kind === 'THEORY' ? 'Théorie' : 'Pratique'}
      </IonSelectOption>
    ))}
  </IonSelect>
);

export const ProjectSelect: React.FC<{ value: ProjectId | null; onChange: (v: ProjectId | null) => void }> = ({
  value,
  onChange,
}) => (
  <IonSelect
    label="Projet portfolio (optionnel)"
    labelPlacement="stacked"
    interface="popover"
    value={value ?? NO_PROJECT}
    onIonChange={(e) => onChange(isProjectId(e.detail.value) ? e.detail.value : null)}
  >
    <IonSelectOption value={NO_PROJECT}>Aucun projet</IonSelectOption>
    {PROJECTS.map((p) => (
      <IonSelectOption key={p.id} value={p.id}>
        {p.index}. {p.name}
      </IonSelectOption>
    ))}
  </IonSelect>
);
