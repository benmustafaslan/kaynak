import { useState } from 'react';
import { LongTextField } from '../LongTextField';

interface CreatePackageFormProps {
  onCancel: () => void;
  onSubmit: (data: { headline: string; description: string }) => Promise<void>;
}

export function CreatePackageForm({ onCancel, onSubmit }: CreatePackageFormProps) {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = headline.trim();
    if (!name) {
      setError('Series name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ headline: name, description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="package-sidebar-form"
      aria-label="Create series"
    >
      <label className="package-sidebar-form-label">
        Series name
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Housing Crisis series"
          className="package-sidebar-form-input"
          maxLength={500}
          autoFocus
          aria-required="true"
        />
      </label>
      <LongTextField
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Short description"
        rows={2}
        maxLength={500}
        variant="form"
        labelSuffix="(optional)"
      />
      {error && <p className="package-sidebar-form-error" role="alert">{error}</p>}
      <div className="package-sidebar-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="package-sidebar-btn package-sidebar-btn-ghost"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="package-sidebar-btn package-sidebar-btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create Series'}
        </button>
      </div>
    </form>
  );
}
