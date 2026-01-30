import { useRef, useState, useEffect } from 'react';
import { KanbanBoard } from '../components/Kanban';

export default function Board() {
  const [showNewStory, setShowNewStory] = useState(false);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setNewMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [newMenuOpen]);

  const toolbarRight = (
    <div className="board-new-story-row" ref={newMenuRef}>
      <div className="board-new-story-split">
        <button
          type="button"
          onClick={() => { setNewMenuOpen(false); setShowNewPackage(false); setShowNewStory(true); }}
          className="btn btn-primary"
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          + New Story
        </button>
        <button
          type="button"
          onClick={() => setNewMenuOpen((o) => !o)}
          className="btn btn-primary board-new-story-toggle"
          aria-label="More create options"
          aria-expanded={newMenuOpen}
        >
          <span
            style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '5px solid currentColor',
              verticalAlign: 'middle',
              transform: newMenuOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
      </div>
      {newMenuOpen && (
        <div className="board-new-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 14 }}
            onClick={() => { setNewMenuOpen(false); setShowNewPackage(false); setShowNewStory(true); }}
          >
            New Story
          </button>
          <button
            type="button"
            role="menuitem"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 14 }}
            onClick={() => { setNewMenuOpen(false); setShowNewPackage(true); setShowNewStory(true); }}
          >
            New Series
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Board</h1>
        <p className="page-subtitle">Manage stories across workflow stages.</p>
      </header>

      <KanbanBoard
        controlledShowNewStory={showNewStory}
        controlledShowNewPackage={showNewPackage}
        onCloseNewStory={() => { setShowNewStory(false); setShowNewPackage(false); }}
        onRequestNewStory={() => { setShowNewStory(true); }}
        toolbarRight={toolbarRight}
      />
    </>
  );
}
