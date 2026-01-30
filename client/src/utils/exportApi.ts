const API_BASE =
  typeof import.meta.env?.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL
    : '/api';

/** Download story export (DOCX or HTML). Uses fetch with credentials. */
export async function downloadExport(storyId: string, format: 'docx' | 'html') {
  const res = await fetch(`${API_BASE}/stories/${storyId}/export?format=${format}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? res.statusText ?? 'Export failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? `story-export.${format === 'docx' ? 'docx' : 'html'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
