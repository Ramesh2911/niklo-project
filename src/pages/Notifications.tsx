import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService, type NotificationItem } from '../lib/notificationService';
import { useI18n } from '../contexts/I18nContext';
import './Notifications.css';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const Notifications: React.FC = () => {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    notificationService.list()
      .then(setNotifications)
      .catch(() => setError(t('notifications.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleOpen = (n: NotificationItem) => {
    if (n.isRead) return;
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
    notificationService.markAsRead(n.id).catch(() => {
      // revert the optimistic update — the read state didn't actually persist
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: false } : item)));
    });
  };

  return (
    <div className="notif-page-wrapper">
      <Navbar theme="blue" />

      <div className="notif-header-section">
        <div className="notif-header-container">
          <h1>{t('notifications.pageTitle')}</h1>
        </div>
      </div>

      <main className="notif-main">
        <div className="notif-container">
          {loading && <p className="notif-empty">{t('notifications.loading')}</p>}
          {!loading && error && <p className="notif-empty">{error}</p>}
          {!loading && !error && notifications.length === 0 && (
            <p className="notif-empty">{t('notifications.empty')}</p>
          )}
          {!loading && !error && notifications.map((n) => (
            <div
              key={n.id}
              className="notif-card"
              onClick={() => handleOpen(n)}
              style={{ cursor: n.isRead ? 'default' : 'pointer', opacity: n.isRead ? 0.6 : 1 }}
            >
              <div className="notif-icon-box">
                {n.isRead ? <Check size={18} /> : <Bell size={18} />}
              </div>
              <div className="notif-body">
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <span className="notif-date">{formatDate(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Notifications;
