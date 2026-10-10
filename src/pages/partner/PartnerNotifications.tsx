import React, { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Trash2, Bell } from 'lucide-react';
import {
  adventurePartnerService,
  type NotificationsResponse,
  type NotificationPreferences,
} from '../../lib/adventurePartnerService';

const PREF_LABELS: Array<{ key: keyof NotificationPreferences; label: string; hint: string }> = [
  { key: 'pushNewBookings', label: 'New bookings', hint: 'Push alert when a customer books' },
  { key: 'pushPaymentAlerts', label: 'Payment alerts', hint: 'Settlement and refund updates' },
  { key: 'pushLowCapacity', label: 'Low capacity', hint: 'When a slot is nearly full' },
  { key: 'pushSettlements', label: 'Settlements', hint: 'Payout processed notifications' },
  { key: 'emailDailySummary', label: 'Daily email summary', hint: 'Day-end performance digest' },
  { key: 'whatsappUrgent', label: 'WhatsApp urgent alerts', hint: 'Safety / cancellation critical notices' },
];

const PartnerNotifications: React.FC = () => {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [n, p] = await Promise.allSettled([
      adventurePartnerService.getNotifications(),
      adventurePartnerService.getNotificationPreferences(),
    ]);
    if (n.status === 'fulfilled') setData(n.value);
    if (p.status === 'fulfilled') setPrefs(p.value);
    if (n.status === 'rejected' && p.status === 'rejected') setError(String(n.reason?.message ?? n.reason));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      notify(okMsg);
      load();
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  const togglePref = async (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      const updated = await adventurePartnerService.updateNotificationPreferences({ [key]: next[key] });
      setPrefs(updated);
      notify('Preference saved');
    } catch (e) {
      setPrefs(prefs);
      notify(String((e as Error).message ?? e), true);
    }
  };

  const items = data?.sections ?? [];

  if (loading) return <div className="pt-loading"><span className="pt-spinner" /> Loading notifications…</div>;
  if (error) return <div className="pt-error">Could not load notifications: {error}</div>;

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Notifications</h1>
          <p>{data?.unreadCount ?? 0} unread · booking and account alerts.</p>
        </div>
        <button
          className="pt-btn secondary"
          onClick={() => run(() => adventurePartnerService.markAllNotificationsRead(), 'All marked as read')}
        >
          <CheckCheck size={15} /> Mark all read
        </button>
      </div>

      <div className="pt-grid pt-grid-2">
        <div className="pt-card">
          <h2><Bell size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Inbox</h2>
          {items.length === 0 && <div className="pt-empty">No notifications yet.</div>}
          {items.map((section, si) => (
            <div key={String(section.id ?? si)}>
              {(section.title || section.items?.length) ? (
                <>
                  {section.title && <h3 style={{ marginTop: 10 }}>{section.title}</h3>}
                  {(section.items ?? []).map((item) => (
                    <div key={String(item.id)} className={`pt-note${item.read ? ' read' : ''}`}>
                      <span className="dot" />
                      <div style={{ flex: 1 }}>
                        <div className="note-title">{item.title ?? 'Notification'}</div>
                        {item.body && <div className="note-body">{item.body}</div>}
                        {item.createdAt && (
                          <div className="note-time">{new Date(item.createdAt).toLocaleString('en-GB')}</div>
                        )}
                      </div>
                      <div className="pt-btn-row">
                        {!item.read && (
                          <button
                            className="pt-btn sm secondary"
                            onClick={() => run(() => adventurePartnerService.markNotificationRead(String(item.id)), 'Marked read')}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          className="pt-btn sm danger"
                          onClick={() => run(() => adventurePartnerService.deleteNotification(String(item.id)), 'Deleted')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          ))}
        </div>

        <div className="pt-card">
          <h2>Preferences</h2>
          {!prefs && <div className="pt-empty">Preferences unavailable.</div>}
          {prefs && PREF_LABELS.map(({ key, label, hint }) => (
            <div className="pt-toggle-row" key={key}>
              <div>
                <div className="pt-toggle-label">{label}</div>
                <div className="pt-toggle-hint">{hint}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs[key]}
                className={`pt-switch${prefs[key] ? ' on' : ''}`}
                onClick={() => togglePref(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {toast && <div className={`pt-toast${toast.error ? ' error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default PartnerNotifications;
