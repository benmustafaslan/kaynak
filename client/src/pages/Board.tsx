import { KanbanBoard } from '../components/Kanban';

export default function Board() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Pieces</h1>
        <p className="page-subtitle">Pieces by stage. Create standalone pieces here or add from a story.</p>
      </header>

      <KanbanBoard />
    </>
  );
}
