import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Shield, Edit2, LogOut, ChevronRight, Heart, Trash2, Camera, Cake, Users as UsersIcon, PhoneCall, AlertTriangle, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import defaultAvatar from '../assets/default_avatar.png';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
const api = createApi(import.meta.env.VITE_USER_BASE_URL || '/api/v1');
import { wishlistService } from '../lib/authService';
import { addressService, type Address } from '../lib/addressService';
import { userService, type EmergencyContact } from '../lib/userService';
import { useI18n } from '../contexts/I18nContext';
import './Profile.css';

const Profile: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Local per-user cache used as the instant preview + offline fallback;
  // GET /user/profile below overwrites it with the real S3 avatar_url once loaded.
  const avatarKey = user ? `niklo_avatar_${user.id}` : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    avatarKey ? localStorage.getItem(avatarKey) : null,
  );
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatarKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(avatarKey, dataUrl);
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const uploadedUrl = await userService.uploadAvatar(file);
      localStorage.setItem(avatarKey, uploadedUrl);
      setAvatarUrl(uploadedUrl);
    } catch {
      // keep the local data-URL preview — upload can be retried next edit
    } finally {
      setAvatarUploading(false);
    }
  };
  const [kycStatus, setKycStatus] = useState<'pending' | 'submitted'>('pending');
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Family');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [sosTriggering, setSosTriggering] = useState(false);
  const [sosMessage, setSosMessage] = useState('');

  useEffect(() => {
    wishlistService.list().then((items) => setWishlistCount(items.length)).catch(() => {});
    userService.getEmergencyContacts().then(setEmergencyContacts).catch(() => {});
    userService.getProfile().then((profile) => {
      updateUser({ ...user, ...profile });
      if (profile.avatar_url) { setAvatarUrl(profile.avatar_url); if (avatarKey) localStorage.setItem(avatarKey, profile.avatar_url); }
      if (profile.kyc_status && profile.kyc_status !== 'NOT_SUBMITTED') setKycStatus('submitted');
    }).catch(() => {});
    addressService.list().then(setAddresses).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSaving(true);
    setContactError('');
    try {
        const created = await userService.addEmergencyContact({
        contact_name: contactName,
        phone_number: contactPhone,
        relationship: contactRelationship,
          is_primary: emergencyContacts.length === 0,
        });
      setEmergencyContacts((prev) => [...prev, created]);
      setContactName('');
      setContactPhone('');
      setContactRelationship('Family');
      setShowContactForm(false);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Could not save contact.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleRemoveEmergencyContact = async (id: string) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await userService.deleteEmergencyContact(id);
    } catch {
      userService.getEmergencyContacts()
        .then(setEmergencyContacts).catch(() => {});
    }
  };

  const handleTriggerSos = async () => {
    if (!window.confirm('Send an emergency SOS alert to your emergency contacts and the Niklo safety team?')) return;
    setSosTriggering(true);
    setSosMessage('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      const res = await userService.triggerSos(position.coords.latitude, position.coords.longitude);
      setSosMessage(res.message || 'SOS alert sent.');
    } catch {
      setSosMessage('Could not send SOS alert — call your local emergency number directly if this is urgent.');
    } finally {
      setSosTriggering(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressError('');
    try {
      const created = await addressService.create({
        type: 'other',
        label: addressLabel,
        full_address: `${addressLine}, ${addressCity}`,
        is_default: addresses.length === 0,
      });
      setAddresses((prev) => [...prev, created]);
      setAddressLabel('');
      setAddressLine('');
      setAddressCity('');
      setShowAddressForm(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Could not save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleRemoveAddress = async (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    try { await addressService.remove(id); } catch { addressService.list().then(setAddresses).catch(() => {}); }
  };

  const handleStartKyc = async () => {
    setKycSubmitting(true);
    setKycError('');
    try {
      const form = new FormData();
      form.append('document_type', 'AADHAAR');
      await api.postForm('/user/kyc', form, true);
      setKycStatus('submitted');
    } catch {
      setKycError(t('profile.kycError'));
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await userService.updateProfile({ name, email, dob, gender });
      updateUser({ ...user, ...updated, name, email, dob, gender });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    await logout();
    navigate('/');
  };

  return (
    <div className="profile-page">
      <Navbar theme="blue" />

      <div className="profile-banner">
        <div className="profile-banner-content">
          <h1>{t('profile.bannerTitle')}</h1>
          <p>{t('profile.bannerSubtitle')}</p>
        </div>
      </div>

      <main className="profile-main">
        <div className="profile-grid">

          {/* Left sidebar */}
          <aside className="profile-sidebar">
            <div className="profile-avatar-card">
              <label className="avatar-circle" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={avatarUrl || defaultAvatar}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', opacity: avatarUploading ? 0.5 : 1 }}
                />
                <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#0052ff', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                  <Camera size={12} color="#fff" />
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
              <h2 className="profile-name">{user?.name || 'Traveller'}</h2>
              <p className="profile-phone">{user?.phone || '+91 —'}</p>
              <span className="verified-badge">
                <Shield size={12} /> {t('profile.verifiedBadge')}
              </span>
            </div>

            <nav className="profile-nav-links">
              <button className="profile-nav-item active">
                <User size={18} /> {t('profile.navPersonalInfo')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/bookings')}>
                <ChevronRight size={18} /> {t('profile.navMyBookings')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/wallet')}>
                <ChevronRight size={18} /> {t('profile.navWallet')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/referral')}>
                <ChevronRight size={18} /> {t('profile.navReferral')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/offers')}>
                <ChevronRight size={18} /> {t('profileExtra.navOffers')}
              </button>
              <button className="profile-nav-item" onClick={() => document.getElementById('emergency-contact')?.scrollIntoView({ behavior: 'smooth' })}>
                <ChevronRight size={18} /> {t('emergencyContact.navLabel')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/help')}>
                <ChevronRight size={18} /> {t('profileExtra.navHelpCenter')}
              </button>
              <button className="profile-nav-item" onClick={() => navigate('/privacy-security')}>
                <ChevronRight size={18} /> {t('profileExtra.navPrivacySecurity')}
              </button>
              <button className="profile-nav-item logout" onClick={handleLogout}>
                <LogOut size={18} /> {t('profile.navSignOut')}
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <div className="profile-content">

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>{t('profile.sectionPersonalInfo')}</h3>
                {!editing && (
                  <button className="btn-edit-profile" onClick={() => setEditing(true)}>
                    <Edit2 size={14} /> {t('profile.editButton')}
                  </button>
                )}
              </div>

              {saved && (
                <div className="save-success-banner">{t('profile.saveSuccessBanner')}</div>
              )}

              <div className="profile-fields">
                <div className="profile-field">
                  <label><User size={14} /> {t('profile.fieldFullName')}</label>
                  {editing ? (
                    <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
                  ) : (
                    <span>{user?.name || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label><Phone size={14} /> {t('profile.fieldPhoneNumber')}</label>
                  <span>{user?.phone || '—'}</span>
                </div>

                <div className="profile-field">
                  <label><Mail size={14} /> {t('profile.fieldEmailAddress')}</label>
                  {editing ? (
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
                  ) : (
                    <span>{user?.email || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label><Cake size={14} /> {t('profileExtra.dob')}</label>
                  {editing ? (
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="field-input" />
                  ) : (
                    <span>{dob || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label><UsersIcon size={14} /> {t('profileExtra.gender')}</label>
                  {editing ? (
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="field-input">
                      <option value="">{t('profileExtra.genderSelect')}</option>
                      <option value="Male">{t('profileExtra.genderMale')}</option>
                      <option value="Female">{t('profileExtra.genderFemale')}</option>
                      <option value="Other">{t('profileExtra.genderOther')}</option>
                    </select>
                  ) : (
                    <span>{gender || '—'}</span>
                  )}
                </div>

              </div>

              {editing && (
                <div className="edit-actions">
                  <button className="btn-cancel-edit" onClick={() => setEditing(false)}>{t('profile.cancelButton')}</button>
                  <button className="btn-save-profile" onClick={handleSave} disabled={saving}>
                    {saving ? t('profile.savingButton') : t('profile.saveChangesButton')}
                  </button>
                </div>
              )}
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3><MapPin size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{t('profile.fieldSavedAddresses')}</h3>
                {!showAddressForm && (
                  <button className="btn-edit-profile" onClick={() => setShowAddressForm(true)}>{t('savedAddresses.addButton')}</button>
                )}
              </div>

              {addresses.length === 0 && !showAddressForm && (
                <p className="field-placeholder">{t('savedAddresses.empty')}</p>
              )}

              {addresses.length > 0 && (
                <div className="wishlist-list">
                  {addresses.map((addr) => (
                    <div className="wishlist-item" key={addr.id}>
                      <div className="wishlist-item-info">
                        <div className="wishlist-item-row">
                          <span className="wishlist-item-name">{addr.label}</span>
                        </div>
                        <span className="wishlist-item-price">{addr.full_address || [addr.address_line, addr.city].filter(Boolean).join(', ')}</span>
                      </div>
                      <button className="btn-delete-item" onClick={() => handleRemoveAddress(addr.id)} aria-label="Remove address">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddressForm && (
                <form onSubmit={handleSaveAddress} className="profile-fields" style={{ marginTop: '16px' }}>
                  <div className="profile-field">
                    <label>{t('savedAddresses.labelLabel')}</label>
                    <input value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} className="field-input" placeholder={t('savedAddresses.labelPlaceholder')} required />
                  </div>
                  <div className="profile-field">
                    <label>{t('savedAddresses.fullAddressLabel')}</label>
                    <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="field-input" placeholder={t('savedAddresses.fullAddressPlaceholder')} required />
                  </div>
                  <div className="profile-field">
                    <label>City</label>
                    <input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className="field-input" placeholder="City" required />
                  </div>
                  {addressError && <p className="kyc-error">{addressError}</p>}
                  <div className="edit-actions">
                    <button type="button" className="btn-cancel-edit" onClick={() => setShowAddressForm(false)}>{t('profile.cancelButton')}</button>
                    <button type="submit" className="btn-save-profile" disabled={addressSaving}>
                      {addressSaving ? t('profile.savingButton') : t('savedAddresses.saveButton')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>Wishlist</h3>
              </div>
              <button className="profile-nav-item" style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} onClick={() => navigate('/wishlist')}>
                <Heart size={18} /> {wishlistCount > 0 ? `${wishlistCount} item${wishlistCount > 1 ? 's' : ''} saved` : 'Nothing saved yet'}
                <ChevronRight size={18} style={{ marginLeft: 'auto' }} />
              </button>
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>{t('profile.sectionKyc')}</h3>
              </div>
              <p className="kyc-desc">{t('profile.kycDesc')}</p>
              <div className="kyc-status">
                <span className={`kyc-badge ${kycStatus}`}>{kycStatus === 'submitted' ? t('profile.kycStatusSubmitted') : t('profile.kycStatusPending')}</span>
                {kycStatus === 'pending' && (
                  <button className="btn-start-kyc" onClick={handleStartKyc} disabled={kycSubmitting}>
                    {kycSubmitting ? t('profile.kycSubmittingButton') : t('profile.kycStartButton')}
                  </button>
                )}
              </div>
              {kycError && <p className="kyc-error">{kycError}</p>}
            </div>

            <div className="profile-section-card" id="emergency-contact">
              <div className="section-card-header">
                <h3>{t('emergencyContact.heading')}</h3>
                {!showContactForm && (
                  <button className="btn-edit-profile" onClick={() => setShowContactForm(true)}>
                    <Plus size={14} /> Add Contact
                  </button>
                )}
              </div>
              <p className="kyc-desc">{t('emergencyContact.desc')}</p>

              {emergencyContacts.length === 0 && !showContactForm && (
                <p className="field-placeholder">No emergency contacts added yet.</p>
              )}

              {emergencyContacts.length > 0 && (
                <div className="wishlist-list">
                  {emergencyContacts.map((c) => (
                    <div className="wishlist-item" key={c.id}>
                      <div className="wishlist-item-info">
                        <div className="wishlist-item-row">
                          <span className="wishlist-item-name">{c.contact_name}</span>
                          <span className="wishlist-item-type">{c.relationship}{c.is_primary ? ' • Primary' : ''}</span>
                        </div>
                        <span className="wishlist-item-price">{c.phone_number}</span>
                      </div>
                      <button className="btn-delete-item" onClick={() => handleRemoveEmergencyContact(c.id)} aria-label="Remove emergency contact">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showContactForm && (
                <form onSubmit={handleAddEmergencyContact} className="profile-fields" style={{ marginTop: '16px' }}>
                  <div className="profile-field">
                    <label>Name</label>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="field-input" required />
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field-input" required />
                  </div>
                  <div className="profile-field">
                    <label>Relationship</label>
                    <select value={contactRelationship} onChange={(e) => setContactRelationship(e.target.value)} className="field-input">
                      <option value="Family">Family</option>
                      <option value="Friend">Friend</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {contactError && <p className="kyc-error">{contactError}</p>}
                  <div className="edit-actions">
                    <button type="button" className="btn-cancel-edit" onClick={() => setShowContactForm(false)}>{t('profile.cancelButton')}</button>
                    <button type="submit" className="btn-save-profile" disabled={contactSaving}>
                      {contactSaving ? t('profile.savingButton') : 'Save Contact'}
                    </button>
                  </div>
                </form>
              )}

              <button
                className="btn-start-kyc"
                style={{ marginTop: '16px', background: '#ef4444' }}
                onClick={handleTriggerSos}
                disabled={sosTriggering}
              >
                <AlertTriangle size={14} /> {sosTriggering ? 'Sending…' : 'Send SOS Alert'}
              </button>
              {sosMessage && <p className="kyc-desc" style={{ marginTop: '8px' }}>{sosMessage}</p>}

              <a href="tel:+9118001234567" className="pkg-help-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <PhoneCall size={16} /> +91 1800 123 4567
              </a>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
