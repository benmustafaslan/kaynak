import { useEffect, useState } from 'react';
import { usersApi } from '../../utils/usersApi';
import type { User } from '../../types/user';
import { ModalShell } from '../ModalShell';

export interface AssignmentResult {
  producer: string | null;
  editors: string[];
}

interface AssignmentModalProps {
  onClose: () => void;
  onConfirm: (assignments: AssignmentResult) => void;
}

export function AssignmentModal({ onClose, onConfirm }: AssignmentModalProps) {
  const [users, setUsers] = useState<Pick<User, '_id' | 'name' | 'email'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [producerId, setProducerId] = useState('');
  const [editorIds, setEditorIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi
      .list()
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onConfirm({
      producer: producerId || null,
      editors: editorIds.filter(Boolean),
    });
    onClose();
  };

  const toggleEditor = (id: string) => {
    setEditorIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  return (
    <ModalShell variant="form" onRequestClose={onClose}>
      <div className="modal-header">
        <h2 className="modal-title">Assign Producer & Editors</h2>
      </div>
      <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {loading ? (
              <p style={{ color: 'var(--medium-gray)', fontSize: 14 }}>Loading users…</p>
            ) : (
              <>
                <div>
                  <label className="form-label">Producer</label>
                  <select
                    value={producerId}
                    onChange={(e) => setProducerId(e.target.value)}
                    className="form-input"
                    aria-label="Producer"
                  >
                    <option value="">— None —</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Editors</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {users.map((u) => (
                      <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editorIds.includes(u._id)}
                          onChange={() => toggleEditor(u._id)}
                        />
                        <span style={{ fontSize: 14 }}>{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            {error && (
              <p style={{ fontSize: 14, color: 'var(--accent-danger)', fontWeight: 500 }}>{error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Confirm & Approve
            </button>
          </div>
        </form>
    </ModalShell>
  );
}
