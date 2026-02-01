import { Link, useParams } from 'react-router-dom';
import { KanbanBoard } from '../components/Kanban';

export default function Board() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const toolbarRight = (
    <Link to={`${basePath}/stories`} className="btn btn-primary">
      Stories
    </Link>
  );

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Pieces</h1>
        <p className="page-subtitle">Pieces by stage. Create standalone pieces here or add from a story.</p>
      </header>

      <KanbanBoard toolbarRight={toolbarRight} />
    </>
  );
}
