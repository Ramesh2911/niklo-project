import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import {
  adventurePartnerService,
  type EarningsAnalytics,
  type PayoutPolicy,
  type SettlementList,
} from '../../lib/adventurePartnerService';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

const TABS = ['Overview', 'Payout policy', 'Settlements'] as const;

const PartnerEarnings: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [analytics, setAnalytics] = useState<EarningsAnalytics | null>(null);
  const [policy, setPolicy] = useState<PayoutPolicy | null>(null);
  const [settlements, setSettlements] = useState<SettlementList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      const [a, p, s] = await Promise.allSettled([
        adventurePartnerService.getEarningsAnalytics(),
        adventurePartnerService.getPayoutPolicy(),
        adventurePartnerService.getSettlements({ page: 1, limit: 10 }),
      ]);
      if (!mounted) return;
      if (a.status === 'fulfilled') setAnalytics(a.value);
      if (p.status === 'fulfilled') setPolicy(p.value);
      if (s.status === 'fulfilled') setSettlements(s.value);
      if (a.status === 'rejected' && p.status === 'rejected' && s.status === 'rejected') {
        setError(String(a.reason?.message ?? a.reason));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="pt-loading"><span className="pt-spinner" /> Loading earnings…</div>;
  if (error) return <div className="pt-error">Could not load earnings: {error}</div>;

  const s = analytics?.summary;
  const w = analytics?.wallet;
  const maxBar = Math.max(1, ...(analytics?.chart.points ?? [1]));

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Earnings</h1>
          <p>Revenue, wallet balance and settlements.</p>
        </div>
      </div>

      <div className="pt-tabs">
        {TABS.map((t) => (
          <button key={t} className={`pt-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && analytics && (
        <>
          <div className="pt-grid pt-grid-4">
            <div className="pt-stat"><div className="label">Available balance</div><div className="value">{inr(w?.availableBalance ?? 0)}</div></div>
            <div className="pt-stat"><div className="label">Pending clearance</div><div className="value">{inr(w?.pendingClearance ?? 0)}</div></div>
            <div className="pt-stat"><div className="label">Lifetime earnings</div><div className="value">{inr(w?.lifetimeEarnings ?? 0)}</div></div>
            <div className="pt-stat"><div className="label">Payout status</div><div className="value" style={{ fontSize: '1.15rem', paddingTop: 6 }}>{s?.payoutStatus ?? '—'}</div></div>
          </div>

          <div className="pt-grid pt-grid-2" style={{ marginTop: 18 }}>
            <div className="pt-card">
              <h2>{analytics.label}</h2>
              <div className="pt-grid pt-grid-3">
                <div className="pt-stat"><div className="label">Net earnings</div><div className="value" style={{ fontSize: '1.25rem' }}>{inr(s?.netEarnings ?? 0)}</div></div>
                <div className="pt-stat"><div className="label">Gross revenue</div><div className="value" style={{ fontSize: '1.25rem' }}>{inr(s?.grossRevenue ?? 0)}</div></div>
                <div className="pt-stat"><div className="label">Orders</div><div className="value" style={{ fontSize: '1.25rem' }}>{s?.ordersCount ?? 0}</div></div>
                <div className="pt-stat"><div className="label">Commission</div><div className="value" style={{ fontSize: '1.25rem' }}>{inr(s?.commission ?? 0)}</div></div>
                <div className="pt-stat"><div className="label">TDS/GST</div><div className="value" style={{ fontSize: '1.25rem' }}>{inr(s?.tdsGst ?? 0)}</div></div>
                <div className="pt-stat"><div className="label">Refunds</div><div className="value" style={{ fontSize: '1.25rem' }}>{inr(s?.refunds ?? 0)}</div></div>
              </div>
            </div>
            <div className="pt-card">
              <h2>Trend</h2>
              <div className="pt-chart">
                {analytics.chart.labels.map((label, i) => (
                  <div className="bar-wrap" key={label + i}>
                    <div className="bar" style={{ height: `${Math.round(((analytics.chart.points[i] ?? 0) / maxBar) * 100)}%` }} title={`${label}: ${analytics.chart.points[i] ?? 0}`} />
                    <span className="bar-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'Payout policy' && policy && (
        <div className="pt-card">
          <h2>{policy.settlementCycle} settlements</h2>
          <div className="pt-grid pt-grid-3">
            <div className="pt-stat"><div className="label">Payout day</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{policy.payoutDay}</div></div>
            <div className="pt-stat"><div className="label">Cooling period</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{policy.coolingPeriodHours} hours</div></div>
            <div className="pt-stat"><div className="label">Platform commission</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{policy.platformCommissionPercent}%</div></div>
            <div className="pt-stat"><div className="label">TDS rate</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{policy.tdsRatePercent}%</div></div>
            <div className="pt-stat"><div className="label">Minimum payout</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{inr(policy.minimumPayoutThreshold)}</div></div>
            <div className="pt-stat"><div className="label">Support</div><div className="value" style={{ fontSize: '1.05rem', paddingTop: 6 }}>{policy.supportEmail}</div></div>
          </div>
          <h3 style={{ marginTop: 18 }}>Policy notes</h3>
          {policy.policyNotes.map((n, i) => (
            <p key={i} className="pt-muted" style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {n}
            </p>
          ))}
        </div>
      )}

      {tab === 'Settlements' && (
        <div className="pt-card">
          {(settlements?.settlements?.length ?? 0) === 0 ? (
            <div className="pt-empty">No settlements yet.</div>
          ) : (
            <div className="pt-table-wrap">
              <table className="pt-table">
                <thead>
                  <tr><th>Settlement</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {settlements!.settlements.map((st) => (
                    <tr key={st.id}>
                      <td className="pt-mono">{String(st.id).slice(0, 8)}…</td>
                      <td>{st.amount != null ? inr(Number(st.amount)) : '—'}</td>
                      <td><span className={`pt-badge ${String(st.status ?? '').toUpperCase() === 'PAID' ? 'green' : 'amber'}`}>{String(st.status ?? '—').toUpperCase()}</span></td>
                      <td>{(st as Record<string, unknown>).date ? new Date(String((st as Record<string, unknown>).date)).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerEarnings;
