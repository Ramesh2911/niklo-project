import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ShieldCheck, Lock, Star, User, Plus, Edit
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../lib/paymentService';
import { bookingService } from '../lib/bookingService';
import { useI18n } from '../contexts/I18nContext';
import allTranslations from '../i18n';
import type en from '../i18n/en';
import './ExperienceCheckout.css';

declare const Razorpay: any;

const ExperienceCheckout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { lang } = useI18n();
  // ponytail: experienceCheckout keys are flat strings containing literal dots
  // (e.g. 'header.title'), so the shared t() helper — which does path.split('.')
  // and walks nested objects — can't address them. Index the per-language map
  // directly instead of going through t().
  const tc = (key: keyof typeof en.experienceCheckout): string =>
    allTranslations[lang].experienceCheckout[key];

  const checkoutState: {
    date: string; travellersCount: number; pricePerPerson: number;
    experienceName?: string; experienceLocation?: string; experienceId?: string;
    isoDate?: string;
  } = location.state || { date: 'Select Date', travellersCount: 2, pricePerPerson: 0 };

  const [travellers, setTravellers] = useState(
    Array.from({ length: checkoutState.travellersCount }, (_, i) => ({
      id: i + 1, name: i === 0 ? (user?.name || '') : '', age: '', gender: 'Male'
    }))
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', age: '', gender: 'Male' });
  const [showSupportInfo, setShowSupportInfo] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleAddGuest = () => {
    setTravellers([...travellers, { id: travellers.length + 1, name: '', age: '', gender: 'Female' }]);
  };

  const handleEditClick = (idx: number) => { setEditIndex(idx); setEditForm(travellers[idx]); };

  const handleSaveEdit = () => {
    if (editIndex !== null) {
      const updated = [...travellers];
      updated[editIndex] = { ...updated[editIndex], ...editForm };
      setTravellers(updated);
      setEditIndex(null);
    }
  };

  const basePrice = checkoutState.pricePerPerson * travellers.length;
  const discount = 150;
  const taxes = 85;
  const total = Math.max(0, basePrice - discount + taxes);

  const handleContinuePayment = async () => {
    setPaymentError('');
    setIsProcessing(true);
    try {
      const sdkLoaded = await paymentService.loadRazorpayScript();
      if (!sdkLoaded) throw new Error(tc('error.paymentGatewayUnavailable'));

      // Backend already converts rupees -> paise itself (Math.round(amount*100)
      // in payments.service.ts createOrder()); sending total*100 here doubled
      // every order to 100x the real total.
      const booking = await bookingService.createCatalogBooking({
        bookingType: 'ADVENTURE',
        referenceId: checkoutState.experienceId || '',
        title: checkoutState.experienceName || 'Experience Booking',
        subtitle: `${travellers.length} Participants`,
        location: checkoutState.experienceLocation || '',
        destination: checkoutState.experienceLocation || '',
        slotDate: checkoutState.isoDate || checkoutState.date,
        timeSlot: '',
        totalAmount: total,
        travelers: travellers.length,
      });
      const order = await paymentService.createRazorpayOrder(total, booking.id);

      new Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        order_id: order.razorpay_order_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Niklo',
        description: checkoutState.experienceName || 'Experience Booking',
        prefill: { name: user?.name || '', contact: user?.phone || '', email: user?.email || '' },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature?: string }) => {
          // Booking is already created above (booking-service); confirm the
          // payment so it moves off PENDING instead of getting auto-cancelled
          // by booking-service's sweep. Best-effort — booking is real either way.
          bookingService.confirmPayment(booking.id, {
            payment_id: response.razorpay_payment_id,
            payment_gateway_order_id: response.razorpay_order_id,
          }).catch(() => {});
          navigate('/booking-success', {
            state: {
              type: 'package',
              packageName: checkoutState.experienceName ?? 'Experience',
              bookingId: booking.id,
              startDate: checkoutState.date,
              endDate: 'Flexible',
              amount: total.toLocaleString('en-IN'),
              travellers,
            }
          });
        },
        modal: { ondismiss: () => setIsProcessing(false) },
        theme: { color: '#0052ff' },
      }).open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : tc('error.paymentFailed'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="ec-page-wrapper">

      <header className="ec-header">
        <button className="ec-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="ec-header-title">{tc('header.title')}</h1>
      </header>

      <main className="ec-main">
        <div className="ec-container">

          <div className="ec-left-col">

            <div className="ec-cancellation-banner">
              <ShieldCheck size={22} className="ec-banner-icon" />
              <div className="ec-banner-text">
                <h3>{tc('banner.freeCancellation')}</h3>
                <p>{tc('banner.freeCancellationDesc')}</p>
              </div>
            </div>

            <div className="ec-card">
              <div className="ec-card-header">
                <h2>{tc('dateCard.heading')}</h2>
                <button className="ec-card-action-btn" onClick={() => navigate(-1)}>{tc('dateCard.changeBtn')}</button>
              </div>
              <div className="ec-card-grid">
                <div className="ec-card-field">
                  <span className="ec-field-lbl">{tc('dateCard.fieldLabel')}</span>
                  <span className="ec-field-val">{checkoutState.date}</span>
                </div>
              </div>
            </div>

            <div className="ec-card">
              <div className="ec-card-header">
                <h2>{tc('travelersCard.heading')}</h2>
                <button className="ec-card-action-btn" onClick={() => navigate(-1)}>{tc('travelersCard.changeBtn')}</button>
              </div>
              <div className="ec-card-grid">
                <div className="ec-card-field">
                  <span className="ec-field-lbl">{tc('travelersCard.fieldLabel')}</span>
                  <span className="ec-field-val">{tc('travelersCard.fieldValue').replace('{{count}}', String(travellers.length))}</span>
                </div>
              </div>
            </div>

            <div className="ec-card">
              <div className="ec-card-header" style={{ marginBottom: '20px' }}>
                <h2>{tc('travelersInfoCard.heading')}</h2>
              </div>

              <div className="ec-guests-list">
                {travellers.map((traveller, idx) => (
                  <div key={traveller.id} className="ec-guest-row">
                    <div className="ec-guest-row-left">
                      <div className="ec-guest-icon-box"><User size={18} /></div>
                      <div className="ec-guest-details">
                        <h3>{traveller.name || tc('travelersInfoCard.travelerDefault').replace('{{number}}', String(idx + 1))}</h3>
                        <p>{tc('travelersInfoCard.ageGenderLine').replace('{{age}}', traveller.age || '—').replace('{{gender}}', traveller.gender)}</p>
                      </div>
                    </div>
                    <button className="ec-guest-edit-btn" onClick={() => handleEditClick(idx)}>
                      <Edit size={16} /><span>{tc('travelersInfoCard.editBtn')}</span>
                    </button>
                  </div>
                ))}
              </div>

              <button className="ec-add-guest-btn" onClick={handleAddGuest}>
                <Plus size={16} /><span>{tc('travelersInfoCard.addAnotherBtn')}</span>
              </button>
            </div>

          </div>

          <div className="ec-right-col">

            <div className="ec-summary-card">
              <h2>{tc('summary.heading')}</h2>

              <div className="ec-price-details-section">
                <span className="ec-sub-title">{tc('summary.priceDetailsLabel')}</span>
                <div className="ec-price-row">
                  <span>{travellers.length} Traveler{travellers.length > 1 ? 's' : ''} × ₹{checkoutState.pricePerPerson.toLocaleString('en-IN')}</span>
                  <span>₹{basePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="ec-price-row green">
                  <span>{tc('summary.promoDiscount')}</span>
                  <span>-₹{discount}</span>
                </div>
                <div className="ec-price-row">
                  <span>{tc('summary.taxesAndFees')}</span>
                  <span>₹{taxes}</span>
                </div>
              </div>

              <div className="ec-total-row">
                <span className="ec-total-lbl">{tc('summary.totalAmount')}</span>
                <span className="ec-total-val">₹{total.toLocaleString('en-IN')}</span>
              </div>

              {paymentError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>{paymentError}</p>}

              <button className="ec-btn-continue" onClick={handleContinuePayment} disabled={isProcessing}>
                {isProcessing ? tc('summary.processingBtn') : tc('summary.continueBtn')}
              </button>

              <div className="ec-secure-lbl">
                <Lock size={12} />
                <span>{tc('summary.secureLabel')}</span>
              </div>
            </div>

            <div className="ec-help-card">
              <h3>{tc('helpCard.heading')}</h3>
              <p>{tc('helpCard.desc')}</p>
              {showSupportInfo ? (
                <p className="ec-support-info">{tc('helpCard.supportInfo')}</p>
              ) : (
                <a href="#support" className="ec-support-link" onClick={e => { e.preventDefault(); setShowSupportInfo(true); }}>{tc('helpCard.contactLink')}</a>
              )}
            </div>

          </div>

        </div>

        <div className="ec-footer-benefits">
          <div className="ec-benefit-item"><Lock size={16} /><span>{tc('footer.securePayment')}</span></div>
          <div className="ec-benefit-item"><CheckCircle2 size={16} /><span>{tc('footer.bestPrice')}</span></div>
          <div className="ec-benefit-item"><Star size={16} /><span>{tc('footer.verifiedExperience')}</span></div>
        </div>
      </main>

      {editIndex !== null && (
        <div className="ec-modal-overlay">
          <div className="ec-edit-modal">
            <h3>{tc('editModal.heading')}</h3>
            <div className="ec-modal-field">
              <label>{tc('editModal.fullNameLabel')}</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="ec-modal-input" />
            </div>
            <div className="ec-modal-field">
              <label>{tc('editModal.ageLabel')}</label>
              <input type="text" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} className="ec-modal-input" />
            </div>
            <div className="ec-modal-field">
              <label>{tc('editModal.genderLabel')}</label>
              <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} className="ec-modal-select">
                <option>{tc('editModal.genderMale')}</option><option>{tc('editModal.genderFemale')}</option><option>{tc('editModal.genderOther')}</option>
              </select>
            </div>
            <div className="ec-modal-actions">
              <button className="ec-modal-btn-save" onClick={handleSaveEdit}>{tc('editModal.saveBtn')}</button>
              <button className="ec-modal-btn-cancel" onClick={() => setEditIndex(null)}>{tc('editModal.cancelBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="ec-processing-overlay">
          <div className="ec-processing-card">
            <div className="ec-spinner"></div>
            <h2>{tc('processingOverlay.heading')}</h2>
            <p>{tc('processingOverlay.desc')}</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExperienceCheckout;
