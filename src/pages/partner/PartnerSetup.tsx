import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Trash2, Upload, FileText } from 'lucide-react';
import {
  adventurePartnerService,
  type SetupMeta,
  type SetupProgress,
  type SetupVerificationStatus,
} from '../../lib/adventurePartnerService';

const STEP_LABELS = ['Partner type', 'Business details', 'Categories', 'Location', 'Documents', 'Submit'];

const emptyBusiness = {
  businessName: '', ownerName: '', email: '', phone: '',
  address: '', city: '', state: '', pincode: '',
};

const PartnerSetup: React.FC = () => {
  const [meta, setMeta] = useState<SetupMeta | null>(null);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [verification, setVerification] = useState<SetupVerificationStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [partnerType, setPartnerType] = useState('');
  const [business, setBusiness] = useState(emptyBusiness);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState({ address: '', city: '', state: '', pincode: '', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3200);
  };

  const hydrate = useCallback(async (p: SetupProgress) => {
    setProgress(p);
    setPartnerType(p.partnerType ?? '');
    setSelectedCategories(p.selectedCategories ?? []);
    setBusiness({
      businessName: p.businessDetails.businessName ?? '',
      ownerName: p.businessDetails.ownerName ?? '',
      email: p.businessDetails.email ?? '',
      phone: p.businessDetails.phone ?? '',
      address: p.businessDetails.address ?? '',
      city: p.businessDetails.city ?? '',
      state: p.businessDetails.state ?? '',
      pincode: p.businessDetails.pincode ?? '',
    });
    if (p.location) {
      setLocation((prev) => ({
        ...prev,
        address: p.location?.address ?? '',
        latitude: p.location?.latitude != null ? String(p.location.latitude) : '',
        longitude: p.location?.longitude != null ? String(p.location.longitude) : '',
      }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        adventurePartnerService.getSetupMeta(),
        adventurePartnerService.getSetupProgress(),
        adventurePartnerService.getVerificationStatus(),
      ]);
      const [m, p, v] = results;
      if (m.status === 'fulfilled') setMeta(m.value);
      if (p.status === 'fulfilled') await hydrate(p.value);
      if (v.status === 'fulfilled') setVerification(v.value);
      if (m.status === 'rejected' && p.status === 'rejected') {
        setLoadError(String(p.reason?.message ?? p.reason));
      }
      setLoading(false);
    })();
  }, [hydrate]);

  const run = async (fn: () => Promise<SetupProgress | unknown>, okMsg: string) => {
    setSaving(true);
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'partnerId' in res) await hydrate(res as SetupProgress);
      else {
        const p = await adventurePartnerService.getSetupProgress().catch(() => null);
        if (p) await hydrate(p);
      }
      const v = await adventurePartnerService.getVerificationStatus().catch(() => null);
      if (v) setVerification(v);
      notify(okMsg);
      return true;
    } catch (e) {
      notify(String((e as Error).message ?? e), true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const onUpload = async (docType: string, file: File | undefined) => {
    if (!file) return;
    const rules = meta?.documentRules;
    if (rules && file.size > rules.maxFileSizeBytes) {
      notify(`File too large (max ${Math.round(rules.maxFileSizeBytes / 1048576)} MB)`, true);
      return;
    }
    await run(() => adventurePartnerService.uploadSetupDocument(docType, file), `${file.name} uploaded`);
  };

  const submitted = verification && verification.verificationStatus !== 'DRAFT';

  const steps = useMemo(
    () => STEP_LABELS.map((label, i) => (
      <div key={label} className={`pt-step${step === i ? ' active' : ''}${step > i ? ' done' : ''}`}>
        <span className="num">{step > i ? <Check size={11} /> : i + 1}</span>
        {label}
      </div>
    )),
    [step],
  );

  if (loading) return <div className="pt-loading"><span className="pt-spinner" /> Loading setup…</div>;
  if (loadError) return <div className="pt-error">Could not load setup: {loadError}</div>;

  return (
    <div>
      <div className="pt-head">
        <div>
          <h1>Setup &amp; Verification</h1>
          <p>Complete onboarding to start listing activities.</p>
        </div>
        {verification && (
          <span className={`pt-badge ${verification.verificationStatus === 'APPROVED' ? 'green' : verification.verificationStatus === 'REJECTED' ? 'red' : 'amber'}`}>
            {verification.statusTitle}
          </span>
        )}
      </div>

      {verification && (
        <div className="pt-card">
          <h2>Application status</h2>
          {verification.progressSteps.map((s) => (
            <div key={s.step} className={`pt-verify-step${s.status === 'COMPLETED' || s.status === 'DONE' ? ' done' : ''}${s.status === 'ACTIVE' ? ' active' : ''}`}>
              <span className="vs-icon">{s.status === 'COMPLETED' || s.status === 'DONE' ? <Check size={13} /> : s.step}</span>
              <div>
                <div className="vs-title">{s.title}</div>
                <div className="vs-sub">{s.subtitle}</div>
              </div>
            </div>
          ))}
          {verification.rejectionReason && (
            <p style={{ color: '#b91c1c', fontSize: '0.86rem', marginTop: 10 }}>{verification.rejectionReason}</p>
          )}
        </div>
      )}

      <div className="pt-steps">{steps}</div>

      <div className="pt-card">
        {step === 0 && (
          <>
            <h2>What kind of partner are you?</h2>
            <div className="pt-grid pt-grid-2">
              {(meta?.partnerTypes ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pt-option${partnerType === t.id ? ' selected' : ''}`}
                  onClick={() => setPartnerType(t.id)}
                >
                  <div>
                    <span className="opt-title">{t.title}</span>
                    <span className="opt-sub">{t.subtitle}</span>
                  </div>
                  {partnerType === t.id && <span className="opt-check"><Check size={18} /></span>}
                </button>
              ))}
            </div>
            <div className="pt-modal-actions">
              <button
                className="pt-btn"
                disabled={saving || !partnerType}
                onClick={() => run(() => adventurePartnerService.setPartnerType({ partnerType }), 'Partner type saved')}
              >
                Save &amp; continue <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Business details</h2>
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
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setStep(0)}><ChevronLeft size={15} /> Back</button>
              <button className="pt-btn" disabled={saving} onClick={() => run(() => adventurePartnerService.saveBusinessDetails(business), 'Business details saved')}>
                Save &amp; continue <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Categories you offer</h2>
            <p className="pt-muted" style={{ marginTop: 0 }}>Select every category that applies to your activities.</p>
            <div className="pt-grid pt-grid-2">
              {(meta?.categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`pt-option${selectedCategories.includes(c.id) ? ' selected' : ''}`}
                  onClick={() => toggleCategory(c.id)}
                >
                  <img className="opt-img" src={c.imageUrl} alt="" loading="lazy" />
                  <div><span className="opt-title">{c.title}</span></div>
                  {selectedCategories.includes(c.id) && <span className="opt-check"><Check size={18} /></span>}
                </button>
              ))}
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setStep(1)}><ChevronLeft size={15} /> Back</button>
              <button
                className="pt-btn"
                disabled={saving || selectedCategories.length === 0}
                onClick={() => run(() => adventurePartnerService.saveCategories({ categories: selectedCategories }), 'Categories saved')}
              >
                Save &amp; continue <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Operating location</h2>
            <div className="pt-field">
              <label>Address</label>
              <input className="pt-input" value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} />
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>City</label>
                <input className="pt-input" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>State</label>
                <input className="pt-input" value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Pincode</label>
                <input className="pt-input" value={location.pincode} onChange={(e) => setLocation({ ...location, pincode: e.target.value })} />
              </div>
            </div>
            <div className="pt-form-row">
              <div className="pt-field">
                <label>Latitude (optional)</label>
                <input className="pt-input" value={location.latitude} onChange={(e) => setLocation({ ...location, latitude: e.target.value })} />
              </div>
              <div className="pt-field">
                <label>Longitude (optional)</label>
                <input className="pt-input" value={location.longitude} onChange={(e) => setLocation({ ...location, longitude: e.target.value })} />
              </div>
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setStep(2)}><ChevronLeft size={15} /> Back</button>
              <button
                className="pt-btn"
                disabled={saving}
                onClick={() => run(() => adventurePartnerService.saveLocation({
                  address: location.address || undefined,
                  city: location.city || undefined,
                  state: location.state || undefined,
                  pincode: location.pincode || undefined,
                  latitude: location.latitude ? Number(location.latitude) : undefined,
                  longitude: location.longitude ? Number(location.longitude) : undefined,
                }), 'Location saved')}
              >
                Save &amp; continue <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Documents</h2>
            <p className="pt-muted" style={{ marginTop: 0 }}>
              Required: {meta?.documentRules.requiredDocumentTypes.join(', ') || '—'}
              {meta?.documentRules.optionalDocumentTypes?.length ? ` · Optional: ${meta.documentRules.optionalDocumentTypes.join(', ')}` : ''}
            </p>
            <div className="pt-table-wrap">
              <table className="pt-table">
                <thead>
                  <tr><th>Document</th><th>Status</th><th>File</th><th style={{ width: 210 }}>Action</th></tr>
                </thead>
                <tbody>
                  {(progress?.documents ?? []).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                        {doc.isRequired && <span className="pt-badge red" style={{ marginLeft: 8 }}>Required</span>}
                      </td>
                      <td>
                        <span className={`pt-badge ${doc.status === 'VERIFIED' ? 'green' : doc.status === 'UPLOADED' ? 'blue' : doc.status === 'REJECTED' ? 'red' : ''}`}>
                          {doc.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="pt-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} /> {doc.fileName ?? '—'}
                      </td>
                      <td>
                        <div className="pt-btn-row">
                          <label className="pt-btn sm secondary" style={{ cursor: 'pointer' }}>
                            <Upload size={13} /> {doc.fileName ? 'Replace' : 'Upload'}
                            <input
                              type="file"
                              hidden
                              accept={meta?.documentRules.allowedMimeTypes.join(',')}
                              onChange={(e) => onUpload(doc.docType, e.target.files?.[0])}
                            />
                          </label>
                          {doc.status !== 'NOT_UPLOADED' && (
                            <button
                              className="pt-btn sm danger"
                              onClick={() => run(() => adventurePartnerService.deleteSetupDocument(doc.docType), 'Document removed')}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setStep(3)}><ChevronLeft size={15} /> Back</button>
              <button className="pt-btn" disabled={saving} onClick={() => setStep(5)}>
                Continue <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2>Submit for verification</h2>
            <p className="pt-muted">
              Once submitted, our team reviews your profile — you will see progress on the status card above.
              {submitted ? ' Your application has already been submitted.' : ''}
            </p>
            <div className="pt-modal-actions">
              <button className="pt-btn secondary" onClick={() => setStep(4)}><ChevronLeft size={15} /> Back</button>
              <button
                className="pt-btn success"
                disabled={saving || !!submitted}
                onClick={() => run(() => adventurePartnerService.submitSetup(), 'Application submitted')}
              >
                {submitted ? 'Submitted' : 'Submit application'}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <div className={`pt-toast${toast.error ? ' error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default PartnerSetup;
