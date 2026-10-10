import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { adventurePartnerService, type PartnerPackage } from '../../lib/adventurePartnerService';

const PartnerPackages: React.FC = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PartnerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<PartnerPackage | null>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', capacity: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerPackage | null>(null);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    setError('');
    try {
      const res = await adventurePartnerService.getPackages(activityId);
      setPackages(Array.isArray(res) ? res : (res?.packages ?? []));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!activityId) return;
    setSaving(true);
    const dto: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      price: form.price ? Number(form.price) : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    };
    try {
      if (editing) await adventurePartnerService.updatePackage(editing.id, dto);
      else await adventurePartnerService.createPackage(activityId, dto);
      setShowEditor(false);
      notify(editing ? 'Package updated' : 'Package created');
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: PartnerPackage) => {
    const current = String(p.status ?? 'ACTIVE').toUpperCase();
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adventurePartnerService.setPackageStatus(p.id, { status: next });
      notify(`Status set to ${next}`);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await adventurePartnerService.deletePackage(confirmDelete.id);
      notify('Package deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  return (
    <div>
      <div className="pt-head">
        <div>
          <button className="pt-btn sm secondary" onClick={() => navigate('/partner/activities')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={13} /> Back to activities
          </button>
          <h1>Packages</h1>
          <p>Package offerings for this activity.</p>
        </div>
        <button className="pt-btn" onClick={() => { setEditing(null); setForm({ title: '', description: '', price: '', capacity: '' }); setShowEditor(true); }}>
          <Plus size={15} /> New package
        </button>
      </div>

      {loading && <div className="pt-loading"><span className="pt-spinner" /> Loading packages…</div>}
      {error && <div className="pt-error">Could not load packages: {error}</div>}

      {!loading && !error && packages.length === 0 && (
        <div className="pt-card"><div className="pt-empty">No packages yet for this activity.</div></div>
      )}

      {!loading && !error && packages.length > 0 && (
        <div className="pt-card">
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr><th>Package</th><th>Price</th><th>Capacity</th><th>Status</th><th style={{ width: 180 }}>Actions</th></tr>
              </thead>
              <tbody>
                {packages.map((p) => {
                  const status = String(p.status ?? 'ACTIVE').toUpperCase();
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{String(p.title ?? p.name ?? 'Untitled')}</strong>
                        {p.description != null && <div className="pt-muted" style={{ fontSize: '0.8rem' }}>{String(p.description)}</div>}
                      </td>
                      <td>{p.price != null ? `₹${Number(p.price).toLocaleString('en-IN')}` : '—'}</td>
                      <td>{(p as Record<string, unknown>).capacity != null ? String((p as Record<string, unknown>).capacity) : '—'}</td>
                      <td><span className={`pt-badge ${status === 'ACTIVE' ? 'green' : 'amber'}`}>{status}</span></td>
                      <td>
                        <div className="pt-btn-row">
                          <button className="pt-btn sm secondary" onClick={() => {
                            setEditing(p);
                            setForm({
                              title: String(p.title ?? p.name ?? ''),
                              description: String(p.description ?? ''),
                              price: p.price != null ? String(p.price) : '',
                              capacity: (p as Record<string, unknown>).capacity != null ? String((p as Record<string, unknown>).capacity) : '',
                            });
                            setShowEditor(true);
                          }}><Pencil size={13} /> Edit</button>
                          <button className="pt-btn sm secondary" onClick={() => toggleStatus(p)} title="Toggle status"><Power size={13} /></button>
                          <button className="pt-btn sm danger" onClick={() => setConfirmDelete(p)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="pt-modal-backdrop" onClick={() => setShowEditor(false)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit package' : 'New package'}</h2>
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
                <label>Price (₹)</label>
                <input className="pt-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Capacity</label>
                <input className="pt-input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setShowEditor(false)}>Cancel</button>
              <button className="pt-btn" disabled={saving || !form.title.trim()} onClick={save}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="pt-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete package?</h2>
            <p className="pt-muted">“{String(confirmDelete.title ?? confirmDelete.name ?? 'Untitled')}” will be removed.</p>
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

export default PartnerPackages;
