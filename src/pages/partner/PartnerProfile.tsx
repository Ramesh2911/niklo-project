import React, { useCallback, useEffect, useState } from 'react';
import { Save, Upload, Landmark, Building2 } from 'lucide-react';
import {
  adventurePartnerService,
  type PartnerProfile,
  type ProfileDocument,
  type BankDetails,
} from '../../lib/adventurePartnerService';

const emptyBusiness = { businessName: '', ownerName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' };
const emptyBank: BankDetails = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' };

const PartnerProfile: React.FC = () => {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [bank, setBank] = useState<BankDetails>(emptyBank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [business, setBusiness] = useState(emptyBusiness);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const notify = (text: string, err = false) => {
    setToast({ text, error: err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [p, d, b] = await Promise.allSettled([
      adventurePartnerService.getProfile(),
      adventurePartnerService.getProfileDocuments(),
      adventurePartnerService.getBankDetails(),
    ]);
    if (p.status === 'fulfilled') {
      setProfile(p.value);
      setBusiness({
        businessName: p.value.businessName ?? '',
        ownerName: p.value.ownerName ?? '',
        email: p.value.email ?? '',
        phone: p.value.phone ?? '',
        address: p.value.address?.fullAddress ?? '',
        city: p.value.address?.city ?? '',
        state: p.value.address?.state ?? '',
        pincode: p.value.address?.pincode ?? '',
      });
    }
    if (d.status === 'fulfilled') {
      const res = d.value;
      setDocuments(Array.isArray(res) ? res : (res?.documents ?? []));
    }
    if (b.status === 'fulfilled' && b.value) setBank({ ...emptyBank, ...b.value });
    if (p.status === 'rejected' && d.status === 'rejected' && b.status === 'rejected') {
      setError(String(p.reason?.message ?? p.reason));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBusiness = async () => {
    setSavingBusiness(true);
    try {
      const updated = await adventurePartnerService.updateBusinessDetails(business);
      setProfile(updated);
      notify('Business details saved');
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setSavingBusiness(false);
    }
  };

  const saveBank = async () => {
    setSavingBank(true);
    try {
      const saved = await adventurePartnerService.saveBankDetails(bank);
      setBank({ ...emptyBank, ...saved });
      notify('Bank details saved');
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    } finally {
      setSavingBank(false);
    }
  };

  const uploadDoc = async (file: File | undefined) => {
    if (!file) return;
    try {
      await adventurePartnerService.uploadProfileDocument(file);
      notify(`${file.name} uploaded`);
      const d = await adventurePartnerService.getProfileDocuments().catch(() => null);
      if (d) setDocuments(Array.isArray(d) ? d : (d.documents ?? []));
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
    }
  };

  if (loading) return <div className="pt-loading"><span className="pt-spinner" /> Loading profile…</div>;
  if (error) return <div className="pt-error">Could not load profile: {error}</div>;

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Profile</h1>
          <p>Business information, documents and payout account.</p>
        </div>
        {profile && (
          <span className={`pt-badge ${profile.verificationStatus === 'APPROVED' ? 'green' : profile.verificationStatus === 'REJECTED' ? 'red' : 'amber'}`}>
            {profile.verificationStatus}
          </span>
        )}
      </div>

      {profile && (
        <div className="pt-card">
          <h2><Building2 size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Business</h2>
          <p className="pt-muted" style={{ marginTop: -6 }}>
            Partner since {new Date(profile.joinedAt).toLocaleDateString('en-GB')} · Rating {profile.rating ?? 0} ({profile.reviewsCount ?? 0} reviews)
          </p>
          <div className="pt-form-row">
            <div className="pt-field">
              <label>Business name</label>
              <input className="pt-input" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>Owner name</label>
              <input className="pt-input" value={business.ownerName} onChange={(e) => setBusiness({ ...business, ownerName: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>Email</label>
              <input className="pt-input" type="email" value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>Phone</label>
              <input className="pt-input" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
            </div>
          </div>
          <div className="pt-field">
            <label>Address</label>
            <input className="pt-input" value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} />
          </div>
          <div className="pt-form-row">
            <div className="pt-field">
              <label>City</label>
              <input className="pt-input" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>State</label>
              <input className="pt-input" value={business.state} onChange={(e) => setBusiness({ ...business, state: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>Pincode</label>
              <input className="pt-input" value={business.pincode} onChange={(e) => setBusiness({ ...business, pincode: e.target.value })} />
            </div>
          </div>
          <button className="pt-btn" disabled={savingBusiness} onClick={saveBusiness}>
            <Save size={15} /> {savingBusiness ? 'Saving…' : 'Save business details'}
          </button>
        </div>
      )}

      <div className="pt-grid pt-grid-2">
        <div className="pt-card">
          <h2>Documents</h2>
          {documents.length === 0 && <div className="pt-empty">No documents uploaded yet.</div>}
          {documents.length > 0 && (
            <div className="pt-table-wrap">
              <table className="pt-table">
                <thead><tr><th>Document</th><th>Status</th><th style={{ width: 120 }}>Action</th></tr></thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{String(doc.title ?? doc.docType ?? doc.fileName ?? doc.id)}</td>
                      <td>
                        <span className={`pt-badge ${String(doc.status ?? '').toUpperCase() === 'VERIFIED' ? 'green' : String(doc.status ?? '').toUpperCase() === 'REJECTED' ? 'red' : 'blue'}`}>
                          {String(doc.status ?? '—').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <label className="pt-btn sm secondary" style={{ cursor: 'pointer' }}>
                          <Upload size={13} /> Upload
                          <input type="file" hidden onChange={(e) => uploadDoc(e.target.files?.[0])} />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <label className="pt-btn sm secondary" style={{ cursor: 'pointer', marginTop: 12 }}>
            <Upload size={13} /> Add document
            <input type="file" hidden onChange={(e) => uploadDoc(e.target.files?.[0])} />
          </label>
        </div>

        <div className="pt-card">
          <h2><Landmark size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Bank details</h2>
          <div className="pt-field">
            <label>Account holder name</label>
            <input className="pt-input" value={bank.accountHolderName ?? ''} onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })} />
          </div>
          <div className="pt-form-row">
            <div className="pt-field">
              <label>Account number</label>
              <input className="pt-input" value={bank.accountNumber ?? ''} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} />
            </div>
            <div className="pt-field">
              <label>IFSC</label>
              <input className="pt-input" value={bank.ifscCode ?? ''} onChange={(e) => setBank({ ...bank, ifscCode: e.target.value })} />
            </div>
          </div>
          <div className="pt-field">
            <label>Bank name</label>
            <input className="pt-input" value={bank.bankName ?? ''} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          </div>
          <button className="pt-btn" disabled={savingBank} onClick={saveBank}>
            <Save size={15} /> {savingBank ? 'Saving…' : 'Save bank details'}
          </button>
        </div>
      </div>

      {toast && <div className={`pt-toast${toast.error ? ' error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default PartnerProfile;
