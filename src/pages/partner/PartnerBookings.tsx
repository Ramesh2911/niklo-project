import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, CheckCircle2, CalendarClock, Ban, LogIn, X } from 'lucide-react';
import {
  adventurePartnerService,
  type PartnerBooking,
  type PartnerBookingList,
} from '../../lib/adventurePartnerService';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const statusBadge = (status?: string) => {
  const s = String(status ?? '').toUpperCase();
  if (s === 'CONFIRMED' || s === 'COMPLETED') return 'green';
  if (s === 'CANCELLED') return 'red';
  if (s === 'PENDING') return 'amber';
  return 'blue';
};

const PartnerBookings: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PartnerBookingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [detail, setDetail] = useState<PartnerBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reschedule, setReschedule] = useState<{ id: string; date: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adventurePartnerService.getBookings({
        page,
        limit: 10,
        status: tab === 'all' ? undefined : tab,
        q: search || undefined,
      });
      setData(res);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [page, tab, search]);

  useEffect(() => { load(); }, [load]);

  const action = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      notify(okMsg);
      setDetail(null);
      setReschedule(null);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (b: PartnerBooking) => {
    setDetail(b);
    setDetailLoading(true);
    try {
      const full = await adventurePartnerService.getBooking(b.id);
      setDetail(full);
    } catch {
      /* keep the row data if detail fetch fails */
    } finally {
      setDetailLoading(false);
    }
  };

  const counts = data?.summaryCounts;

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Bookings</h1>
          <p>Track, confirm and manage customer bookings.</p>
        </div>
        <form
          className="pt-btn-row"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}
        >
          <input
            className="pt-input"
            style={{ width: 220 }}
            placeholder="Search customer / activity"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="pt-btn secondary" type="submit"><Search size={15} /></button>
        </form>
      </div>

      <div className="pt-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`pt-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => { setTab(t.key); setPage(1); }}
          >
            {t.label}
            {counts ? ` (${t.key === 'all' ? counts.all : counts[t.key as keyof typeof counts] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <div className="pt-card">
        {loading && <div className="pt-loading"><span className="pt-spinner" /> Loading bookings…</div>}
        {error && <div className="pt-error">Could not load bookings: {error}</div>}
        {!loading && !error && (data?.bookings?.length ?? 0) === 0 && (
          <div className="pt-empty">No bookings{tab !== 'all' ? ` (${tab})` : ''} yet.</div>
        )}
        {!loading && !error && (data?.bookings?.length ?? 0) > 0 && (
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr><th>Booking</th><th>Customer</th><th>Activity</th><th>Date</th><th>Status</th><th style={{ width: 90 }}>View</th></tr>
              </thead>
              <tbody>
                {data!.bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="pt-mono">{String(b.bookingId ?? b.id).slice(0, 8)}…</td>
                    <td>{String(b.customerName ?? b.name ?? '—')}</td>
                    <td>{String(b.activityTitle ?? b.title ?? '—')}</td>
                    <td>{b.date ? new Date(b.date).toLocaleDateString('en-GB') : '—'}</td>
                    <td><span className={`pt-badge ${statusBadge(b.status)}`}>{String(b.status ?? '—').toUpperCase()}</span></td>
                    <td>
                      <button className="pt-btn sm secondary" onClick={() => openDetail(b)}><Eye size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pagination.totalPages > 1 && (
          <div className="pt-btn-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="pt-btn sm secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="pt-muted">Page {data.pagination.currentPage} of {data.pagination.totalPages}</span>
            <button className="pt-btn sm secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {detail && (
        <div className="pt-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Booking {String(detail.bookingId ?? detail.id).slice(0, 8)}…</h2>
            {detailLoading && <div className="pt-loading"><span className="pt-spinner" /> Loading…</div>}
            <div className="pt-table-wrap">
              <table className="pt-table">
                <tbody>
                  {Object.entries(detail)
                    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
                    .map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ color: '#64748b', textTransform: 'capitalize', width: 160 }}>{k.replace(/_/g, ' ')}</td>
                        <td className="pt-mono">{String(v)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="pt-modal-actions" style={{ flexWrap: 'wrap' }}>
              <button className="pt-btn secondary" onClick={() => setDetail(null)}><X size={14} /> Close</button>
              <button
                className="pt-btn success"
                disabled={busy}
                onClick={() => action(() => adventurePartnerService.confirmBooking(detail.id), 'Booking confirmed')}
              >
                <CheckCircle2 size={14} /> Confirm
              </button>
              <button
                className="pt-btn"
                disabled={busy}
                onClick={() => action(() => adventurePartnerService.checkInBooking(detail.id), 'Checked in')}
              >
                <LogIn size={14} /> Check-in
              </button>
              <button
                className="pt-btn secondary"
                disabled={busy}
                onClick={() => setReschedule({ id: detail.id, date: '', time: '' })}
              >
                <CalendarClock size={14} /> Reschedule
              </button>
              <button
                className="pt-btn danger"
                disabled={busy}
                onClick={() => action(() => adventurePartnerService.cancelBooking(detail.id, { reason: 'Cancelled by partner' }), 'Booking cancelled')}
              >
                <Ban size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reschedule && (
        <div className="pt-modal-backdrop" onClick={() => setReschedule(null)}>
          <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reschedule booking</h2>
            <div className="pt-field">
              <label>New date</label>
              <input className="pt-input" type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>New time</label>
              <input className="pt-input" type="time" value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} />
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setReschedule(null)}>Cancel</button>
              <button
                className="pt-btn"
                disabled={busy || !reschedule.date}
                onClick={() => action(
                  () => adventurePartnerService.rescheduleBooking(reschedule.id, { date: reschedule.date, time: reschedule.time || undefined }),
                  'Booking rescheduled',
                )}
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`pt-toast${toast.error ? ' error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default PartnerBookings;
