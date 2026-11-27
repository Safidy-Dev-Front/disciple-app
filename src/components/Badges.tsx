import { CATEGORY_BY_ID, PROJECT_STATUS_LABEL } from '../data/program';
import { DAY_STATUS_LABEL } from '../lib/stats';
import type { CategoryId, DayStatus, ProjectStatus, Session } from '../types';

export const StatusBadge: React.FC<{ status: DayStatus }> = ({ status }) => (
  <span className={`badge badge-${status}`}>{DAY_STATUS_LABEL[status]}</span>
);

export const SourceBadge: React.FC<{ session: Pick<Session, 'source' | 'adjusted'> }> = ({ session }) => {
  if (session.source === 'manual') return <span className="badge badge-manual">Manuel</span>;
  if (session.adjusted) return <span className="badge badge-adjusted">Chrono · ajusté</span>;
  return <span className="badge badge-live">Chrono</span>;
};

export const KindBadge: React.FC<{ categoryId: CategoryId }> = ({ categoryId }) => {
  const kind = CATEGORY_BY_ID[categoryId].kind;
  return <span className={`badge badge-${kind.toLowerCase()}`}>{kind === 'THEORY' ? 'Théorie' : 'Pratique'}</span>;
};

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => (
  <span className={`badge badge-project-${status}`}>{PROJECT_STATUS_LABEL[status]}</span>
);
