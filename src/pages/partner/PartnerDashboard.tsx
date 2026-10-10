import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Wallet, CalendarCheck, Star } from 'lucide-react';
import {
  adventurePartnerService,
  type EarningsAnalytics,
  type HomeChart,
  type SetupVerificationStatus,
} from '../../lib/adventurePartnerService';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [analytics, setAnalytics] = useState<EarningsAnalytics | null>(null);
  const [chart, setChart] = useState<HomeChart | null>(null);
  const [verification, setVerification] = useState<SetupVerificationStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled([
        adventurePartnerService.getEarningsAnalytics(),
        adventurePartnerService.getChart('week'),
        adventurePartnerService.getVerificationStatus(),
        adventurePartnerService.getDashboard(),
      ]);
      if (!mounted) return;
      const [a, c, v, d] = results;
      if (a.status === 'fulfilled') setAnalytics(a.value);
      if (c.status === 'fulfilled') setChart(c.value);
      if (v.status === 'fulfilled') setVerification(v.value);
      if (d.status === 'rejected') setDashboardError(String(d.reason?.message ?? d.reason));
      if (a.status === 'rejected' && c.status === 'rejected') {
        setError(String(a.reason?.message ?? a.reason));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="pt-loading"><span className="pt-spinner" /> Loading dashboard…</div>;
  }
  if (error) return <div className="pt-error">Could not load dashboard: {error}</div>;

  const s = analytics?.summary;
  const w = analytics?.wallet;
  const maxBar = Math.max(1, ...(chart?.datasets[0]?.data ?? [1]));

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Dashboard</h1>
          <p>Adventure partner overview — bookings, earnings and verification.</p>
        </div>
        <button className="pt-btn" onClick={() => navigate('/partner/setup')}>
          {verification?.verificationStatus === 'APPROVED' ? 'View verification' : 'Continue setup'}
        </button>
      </div>

      {verification && verification.verificationStatus !== 'APPROVED' && (
        <div className="pt-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={17} color="#f59e0b" /> {verification.statusTitle}
          </h2>
          {verification.statusSubtitle && <p className="pt-muted">{verification.statusSubtitle}</p>}
          {verification.rejectionReason && <p style={{ color: '#b91c1c', fontSize: '0.86rem' }}>{verification.rejectionReason}</p>}
        </div>
      )}

      {dashboardError && (
        <p className="pt-muted" style={{ marginBottom: 14 }}>
          Live dashboard endpoint is currently unavailable ({dashboardError}) — showing earnings analytics instead.
        </p>
      )}

      <div className="pt-grid pt-grid-4">
        <div className="pt-stat">
          <div className="label">Available balance</div>
          <div className="value">{inr(w?.availableBalance ?? 0)}</div>
          <div className="sub">Next payout: {w?.nextPayoutDate ? new Date(w.nextPayoutDate).toLocaleDateString('en-GB') : '—'}</div>
        </div>
        <div className="pt-stat">
          <div className="label">Net earnings</div>
          <div className="value">{inr(s?.netEarnings ?? 0)}</div>
          <div className="sub">{analytics?.label ?? ''}</div>
        </div>
        <div className="pt-stat">
          <div className="label">Orders</div>
          <div className="value">{s?.ordersCount ?? 0}</div>
          <div className="sub">Gross {inr(s?.grossRevenue ?? 0)}</div>
        </div>
        <div className="pt-stat">
          <div className="label">Verification</div>
          <div className="value" style={{ fontSize: '1.1rem', paddingTop: 6 }}>{verification?.verificationStatus ?? '—'}</div>
          <div className="sub">{verification?.progressSteps?.find((p) => p.status === 'ACTIVE')?.title ?? ''}</div>
        </div>
      </div>

      <div className="pt-grid pt-grid-2" style={{ marginTop: 18 }}>
        <div className="pt-card">
          <h2><TrendingUp size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Bookings this {chart?.period ?? 'week'}</h2>
          {chart && chart.datasets[0]?.data.length ? (
            <div className="pt-chart">
              {chart.labels.map((label, i) => (
                <div className="bar-wrap" key={label + i}>
                  <div
                    className="bar"
                    style={{ height: `${Math.round(((chart.datasets[0].data[i] ?? 0) / maxBar) * 100)}%` }}
                    title={`${label}: ${chart.datasets[0].data[i] ?? 0}`}
                  />
                  <span className="bar-label">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-empty">No chart data yet.</div>
          )}
        </div>

        <div className="pt-card">
          <h2><Wallet size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Wallet</h2>
          <div className="pt-grid pt-grid-3">
            <div className="pt-stat">
              <div className="label">Pending clearance</div>
              <div className="value" style={{ fontSize: '1.2rem' }}>{inr(w?.pendingClearance ?? 0)}</div>
            </div>
            <div className="pt-stat">
              <div className="label">Lifetime</div>
              <div className="value" style={{ fontSize: '1.2rem' }}>{inr(w?.lifetimeEarnings ?? 0)}</div>
            </div>
            <div className="pt-stat">
              <div className="label">Payout status</div>
              <div className="value" style={{ fontSize: '1.2rem' }}>{s?.payoutStatus ?? '—'}</div>
            </div>
          </div>
          <p className="pt-muted" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
            <CalendarCheck size={14} /> Commission {s ? `${Math.round((s.commission / Math.max(1, s.grossRevenue)) * 100)}` : '—'}% ·
            <Star size={14} /> TDS/GST {inr(s?.tdsGst ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
