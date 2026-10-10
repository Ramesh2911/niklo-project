import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Upload, Power } from 'lucide-react';
import {
  adventurePartnerService,
  type PartnerActivity,
  type Pagination,
} from '../../lib/adventurePartnerService';

const emptyForm = {
  title: '',
  description: '',
  category: '',
  location: '',
  city: '',
  price: '',
  duration_hours: '',
  difficulty: '',
  group_size: '',
};

const PartnerActivities: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<PartnerActivity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<PartnerActivity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerActivity | null>(null);
  const [uploading, setUploading] = useState(false);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adventurePartnerService.getActivities({ page, limit: 10 });
      setActivities(res.activities ?? []);
      setPagination(res.pagination ?? null);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowEditor(true);
  };

  const openEdit = (a: PartnerActivity) => {
    setEditing(a);
    setForm({
      title: String(a.title ?? a.name ?? ''),
      description: String(a.description ?? ''),
      category: String(a.category ?? ''),
      location: String(a.location ?? ''),
      city: String(a.city ?? ''),
      price: a.price != null ? String(a.price) : '',
      duration_hours: a.duration_hours != null ? String(a.duration_hours) : '',
      difficulty: String(a.difficulty ?? ''),
      group_size: String(a.group_size ?? ''),
    });
    setShowEditor(true);
  };

  const save = async () => {
    setSaving(true);
    const dto: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      city: form.city,
      price: form.price ? Number(form.price) : undefined,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      difficulty: form.difficulty || undefined,
      group_size: form.group_size || undefined,
    };
    try {
      if (editing) await adventurePartnerService.updateActivity(editing.id, dto);
      else await adventurePartnerService.createActivity(dto);
      setShowEditor(false);
      notify(editing ? 'Activity updated' : 'Activity created');
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a: PartnerActivity) => {
    const current = String(a.status ?? 'ACTIVE').toUpperCase();
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adventurePartnerService.setActivityStatus(a.id, { status: next });
      notify(`Status set to ${next}`);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await adventurePartnerService.deleteActivity(confirmDelete.id);
      notify('Activity deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const onMedia = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await adventurePartnerService.uploadActivityMedia(file);
      notify(res.url ? `Uploaded: ${res.url}` : 'Media uploaded');
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Activities</h1>
          <p>Create and manage the adventures you offer.</p>
        </div>
        <div className="pt-btn-row">
          <label className="pt-btn secondary" style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload media'}
            <input type="file" hidden accept="image/*" onChange={(e) => onMedia(e.target.files?.[0])} />
          </label>
          <button className="pt-btn" onClick={openCreate}><Plus size={15} /> New activity</button>
        </div>
      </div>

      {loading && <div className="pt-loading"><span className="pt-spinner" /> Loading activities…</div>}
      {error && <div className="pt-error">Could not load activities: {error}</div>}

      {!loading && !error && activities.length === 0 && (
        <div className="pt-card">
          <div className="pt-empty">
            No activities yet. Click <strong>New activity</strong> to create your first listing.
          </div>
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="pt-card">
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Activity</th><th>Category</th><th>Location</th><th>Price</th><th>Status</th><th style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => {
                  const status = String(a.status ?? 'ACTIVE').toUpperCase();
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{String(a.title ?? a.name ?? 'Untitled')}</strong>
                        {a.image_url && (
                          <div className="pt-muted" style={{ fontSize: '0.78rem' }}>{String(a.image_url).slice(0, 48)}…</div>
                        )}
                      </td>
                      <td>{String(a.category ?? '—')}</td>
                      <td>{String(a.city || a.location || '—')}</td>
                      <td>{a.price != null ? `₹${Number(a.price).toLocaleString('en-IN')}` : '—'}</td>
                      <td>
                        <span className={`pt-badge ${status === 'ACTIVE' ? 'green' : status === 'REJECTED' ? 'red' : 'amber'}`}>{status}</span>
                      </td>
                      <td>
                        <div className="pt-btn-row">
                          <button className="pt-btn sm secondary" onClick={() => openEdit(a)}><Pencil size={13} /> Edit</button>
                          <button className="pt-btn sm secondary" onClick={() => navigate(`/partner/activities/${a.id}/packages`)}><Package size={13} /> Packages</button>
                          <button className="pt-btn sm secondary" onClick={() => toggleStatus(a)} title="Toggle status"><Power size={13} /></button>
                          <button className="pt-btn sm danger" onClick={() => setConfirmDelete(a)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="pt-btn-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="pt-btn sm secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span className="pt-muted">Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button className="pt-btn sm secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}

      {showEditor && (
        <div className="pt-modal-backdrop" onClick={() => setShowEditor(false)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit activity' : 'New activity'}</h2>
            <div className="pt-field">
              <label>Title</label>
              <input className="pt-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>Description</label>
              <textarea className="pt-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Category</label>
                <input className="pt-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Water Sports" />
              </div>
              <div className="pt-field">
                <label>Difficulty</label>
                <input className="pt-input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} placeholder="Easy / Moderate" />
              </div>
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Location</label>
                <input className="pt-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>City</label>
                <input className="pt-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Price (₹)</label>
                <input className="pt-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Duration (hours)</label>
                <input className="pt-input" type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Group size</label>
                <input className="pt-input" value={form.group_size} onChange={(e) => setForm({ ...form, group_size: e.target.value })} placeholder="Up to 10 People" />
              </div>
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setShowEditor(false)}>Cancel</button>
              <button className="pt-btn" disabled={saving || !form.title.trim()} onClick={save}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="pt-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete activity?</h2>
            <p className="pt-muted">
              “{String(confirmDelete.title ?? confirmDelete.name ?? 'Untitled')}” will be permanently removed.
            </p>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="pt-btn danger" onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`pt-toast${toast.error ? ' error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default PartnerActivities;
