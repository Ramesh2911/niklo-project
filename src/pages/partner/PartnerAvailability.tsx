import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, CalendarDays } from 'lucide-react';
import {
  adventurePartnerService,
  type PartnerSlot,
  type SlotListResponse,
} from '../../lib/adventurePartnerService';

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().getMonth() + 1;
const thisYear = () => new Date().getFullYear();

const emptyForm = { date: today(), start_time: '09:00', end_time: '18:00', capacity: '10', price: '' };

const PartnerAvailability: React.FC = () => {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<SlotListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthError, setMonthError] = useState('');
  const [monthSummary, setMonthSummary] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<PartnerSlot | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerSlot | null>(null);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adventurePartnerService.getSlots({ date });
      setData(res);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setMonthError('');
      setMonthSummary(null);
      try {
        const res = await adventurePartnerService.getMonthSummary({ month: thisMonth(), year: thisYear() });
        if (mounted) setMonthSummary(res as Record<string, unknown>);
      } catch (e) {
        if (mounted) setMonthError(String((e as Error).message ?? e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    const dto: Record<string, unknown> = {
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      price: form.price ? Number(form.price) : undefined,
    };
    try {
      if (editing) await adventurePartnerService.updateSlot(editing.id, dto);
      else await adventurePartnerService.createSlot(dto);
      setShowEditor(false);
      notify(editing ? 'Slot updated' : 'Slot created');
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: PartnerSlot) => {
    const current = String(s.status ?? 'ACTIVE').toUpperCase();
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adventurePartnerService.setSlotStatus(s.id, { status: next });
      notify(`Slot ${next}`);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await adventurePartnerService.deleteSlot(confirmDelete.id);
      notify('Slot deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const summary = data?.summary;

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Availability</h1>
          <p>Manage bookable time slots per date.</p>
        </div>
        <button className="pt-btn" onClick={() => { setEditing(null); setForm({ ...emptyForm, date }); setShowEditor(true); }}>
          <Plus size={15} /> New slot
        </button>
      </div>

      <div className="pt-grid pt-grid-4">
        <div className="pt-stat"><div className="label">Total slots</div><div className="value">{summary?.totalSlots ?? 0}</div></div>
        <div className="pt-stat"><div className="label">Booked</div><div className="value">{summary?.totalBooked ?? 0}</div></div>
        <div className="pt-stat"><div className="label">Capacity</div><div className="value">{summary?.totalCapacity ?? 0}</div></div>
        <div className="pt-stat"><div className="label">Occupancy</div><div className="value">{summary ? `${Math.round((summary.occupancyRate ?? 0) * (summary.occupancyRate > 1 ? 1 : 100))}%` : '0%'}</div></div>
      </div>

      <div className="pt-card" style={{ marginTop: 18 }}>
        <div className="pt-btn-row" style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 600 }}>
            <CalendarDays size={16} /> Date
          </label>
          <input className="pt-input" type="date" style={{ maxWidth: 190 }} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {loading && <div className="pt-loading"><span className="pt-spinner" /> Loading slots…</div>}
        {error && <div className="pt-error">Could not load slots: {error}</div>}
        {!loading && !error && (data?.slots?.length ?? 0) === 0 && (
          <div className="pt-empty">No slots for {data?.formattedDate && data.formattedDate !== 'Invalid Date' ? data.formattedDate : date}.</div>
        )}
        {!loading && !error && (data?.slots?.length ?? 0) > 0 && (
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr><th>Time</th><th>Capacity</th><th>Booked</th><th>Status</th><th style={{ width: 160 }}>Actions</th></tr>
              </thead>
              <tbody>
                {data!.slots.map((s) => {
                  const status = String(s.status ?? 'ACTIVE').toUpperCase();
                  return (
                    <tr key={s.id}>
                      <td className="pt-mono">{String(s.start_time ?? '')}{s.end_time ? ` – ${String(s.end_time)}` : ''}</td>
                      <td>{s.capacity ?? '—'}</td>
                      <td>{s.booked ?? '—'}</td>
                      <td><span className={`pt-badge ${status === 'ACTIVE' ? 'green' : 'amber'}`}>{status}</span></td>
                      <td>
                        <div className="pt-btn-row">
                          <button className="pt-btn sm secondary" onClick={() => {
                            setEditing(s);
                            setForm({
                              date: String(s.date ?? date),
                              start_time: String(s.start_time ?? '09:00'),
                              end_time: String(s.end_time ?? '18:00'),
                              capacity: s.capacity != null ? String(s.capacity) : '10',
                              price: s.price != null ? String(s.price) : '',
                            });
                            setShowEditor(true);
                          }}><Pencil size={13} /></button>
                          <button className="pt-btn sm secondary" onClick={() => toggleStatus(s)} title="Toggle status"><Power size={13} /></button>
                          <button className="pt-btn sm danger" onClick={() => setConfirmDelete(s)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pt-card">
        <h2>Month summary — {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][thisMonth() - 1]} {thisYear()}</h2>
        {monthError && (
          <p className="pt-muted">
            Month summary endpoint is currently unavailable ({monthError}). Slots for a single date still work above.
          </p>
        )}
        {!monthError && !monthSummary && <div className="pt-empty">No summary data.</div>}
        {monthSummary && <pre className="pt-mono" style={{ whiteSpace: 'pre-wrap', color: '#475569' }}>{JSON.stringify(monthSummary, null, 2)}</pre>}
      </div>

      {showEditor && (
        <div className="pt-modal-backdrop" onClick={() => setShowEditor(false)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit slot' : 'New slot'}</h2>
            <div className="pt-field">
              <label>Date</label>
              <input className="pt-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Start time</label>
                <input className="pt-input" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>End time</label>
                <input className="pt-input" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Capacity</label>
                <input className="pt-input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Price per person (₹, optional)</label>
                <input className="pt-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setShowEditor(false)}>Cancel</button>
              <button className="pt-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create slot'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="pt-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete slot?</h2>
            <p className="pt-muted">{String(confirmDelete.start_time ?? '')} on {String(confirmDelete.date ?? date)} will be removed.</p>
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

export default PartnerAvailability;
