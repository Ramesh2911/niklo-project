import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Users, CheckCircle2,
  ChevronUp, ChevronDown, Plus, ShieldCheck, FileText, Lock, Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../lib/paymentService';
import { bookingService } from '../lib/bookingService';
import { useI18n } from '../contexts/I18nContext';
import './PackageCheckout.css';

declare const Razorpay: any;

const PackageCheckout: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const checkoutState: {
    packageId?: string; packageName?: string; pricePerPerson?: number;
    totalAmount?: number; travelDate?: string; travellersCount?: number;
    adultsCount?: number; childrenCount?: number;
    duration?: string;
    destination?: string;
  } = location.state || {};

  const pricePerPerson = checkoutState.pricePerPerson ?? 0;
  const initialAdults = checkoutState.adultsCount ?? checkoutState.travellersCount ?? 2;
  const initialChildren = checkoutState.childrenCount ?? 0;
  const initialCount = initialAdults + initialChildren;

  const [guests, setGuests] = useState({ rooms: 1, adults: initialAdults, children: initialChildren });
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [travelDate, setTravelDate] = useState(checkoutState.travelDate ?? '');
  const [insurance, setInsurance] = useState(true);
  const [gstInvoice, setGstInvoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [travellers, setTravellers] = useState(
    Array.from({ length: initialCount }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? (user?.name || '') : '',
      age: '',
      gender: i === 0 ? 'Male' : 'Female',
      open: i === 0,
    }))
  );

  const handleGuestChange = (type: 'rooms' | 'adults' | 'children', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if ((type === 'rooms' || type === 'adults') && newVal < 1) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const toggleTraveller = (id: number) => {
    setTravellers(travellers.map(t => t.id === id ? { ...t, open: !t.open } : t));
  };

  const handleAddTraveller = () => {
    setTravellers([...travellers, { id: travellers.length + 1, name: '', age: '', gender: 'Female', open: true }]);
  };

  const handleUpdateTraveller = (id: number, field: string, value: string) => {
    setTravellers(travellers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Fare formula matches the reference app's traveler-details screen: children
  // are charged half the adult base fare, GST is 5% of each traveler's own base
  // fare, and the special-offer discount is a flat per-head amount that differs
  // by traveler type (₹150/adult, ₹75/child).
  const ADULT_DISCOUNT = 150;
  const CHILD_DISCOUNT = 75;
  const GST_RATE = 0.05;
  const CHILD_FARE_RATIO = 0.5;

  const totalTravellers = guests.adults + guests.children;
  const adultBaseFare = pricePerPerson;
  const childBaseFare = Math.round(pricePerPerson * CHILD_FARE_RATIO);
  const baseAmount = guests.adults * adultBaseFare + guests.children * childBaseFare;
  const gstAmount = guests.adults * Math.round(adultBaseFare * GST_RATE)
    + guests.children * Math.round(childBaseFare * GST_RATE);
  const discountAmount = guests.adults * ADULT_DISCOUNT + guests.children * CHILD_DISCOUNT;
  const insuranceFee = insurance ? 300 : 0;
  const totalAmount = baseAmount + gstAmount - discountAmount + insuranceFee;

  const handleBookNow = async () => {
    setPaymentError('');
    setIsProcessing(true);
    try {
      const sdkLoaded = await paymentService.loadRazorpayScript();
      if (!sdkLoaded) throw new Error(t('packageCheckout.paymentGatewayError'));

      // Backend already converts rupees -> paise itself (Math.round(amount*100)
      // in payments.service.ts createOrder()); sending amount*100 here doubled
      // every order to 100x the real total.
      const booking = await bookingService.createCatalogBooking({
        bookingType: 'PACKAGE',
        referenceId: checkoutState.packageId || '',
        title: checkoutState.packageName || 'Package Booking',
        subtitle: `${totalTravellers} Travelers`,
        location: '',
        destination: checkoutState.destination || '',
        travelDate,
        departureTime: '09:00',
        totalAmount,
        travelers: totalTravellers,
      });
      const order = await paymentService.createRazorpayOrder(totalAmount, booking.id);

      new Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        order_id: order.razorpay_order_id,
        // /payment/orders echoes rupees; SDK option must be paise (guide Step 6A).
        amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR',
        name: 'Niklo',
        description: checkoutState.packageName || 'Package Booking',
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
              packageName: checkoutState.packageName ?? 'Package',
              bookingId: booking.id,
              startDate: travelDate,
              endDate: '',
              amount: totalAmount.toLocaleString('en-IN'),
              travellers,
            }
          });
        },
        modal: { ondismiss: () => setIsProcessing(false) },
        theme: { color: '#0052ff' },
      }).open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : t('packageCheckout.paymentFailedError'));
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="pkg-checkout-container" onClick={() => setShowGuestPicker(false)}>

        <header className="pkg-co-header">
          <button className="pkg-co-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="pkg-co-title-block">
            <h1>{t('packageCheckout.reviewPackage')}</h1>
            <p>{checkoutState.packageName || 'Selected Package'}</p>
          </div>
        </header>

        <div className="pkg-co-main">
          <div className="pkg-co-left">

            <section className="pkg-co-section">
              <div className="pkg-co-section-header">
                <h2 className="pkg-co-section-title">{t('packageCheckout.packageDetails')}</h2>
                {checkoutState.duration && (
                  <span className="pkg-co-duration-pill">{checkoutState.duration}</span>
                )}
              </div>
              <div className="pkg-co-grid">
                <div className="pkg-co-field">
                  <label>{t('packageCheckout.travelDate')}</label>
                  <div className="pkg-co-input-wrap">
                    <Calendar size={18} className="pkg-co-icon" />
                    <input
                      type="date"
                      style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e293b', fontSize: '0.9rem', flex: 1 }}
                      value={travelDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setTravelDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pkg-co-section">
              <h2 className="pkg-co-section-title" style={{ marginBottom: '24px' }}>{t('packageCheckout.guestsAndRooms')}</h2>
              <div className="pkg-co-field relative" onClick={(e) => { e.stopPropagation(); setShowGuestPicker(v => !v); }}>
                <div className="pkg-co-input-wrap" style={{ cursor: 'pointer' }}>
                  <Users size={18} className="pkg-co-icon" />
                  <span className="pkg-text-val">
                    {(totalTravellers > 1 ? t('packageCheckout.travellerCountPlural') : t('packageCheckout.travellerCountSingular')).replace('{count}', String(totalTravellers))}
                    {', '}
                    {(guests.rooms > 1 ? t('packageCheckout.roomCountPlural') : t('packageCheckout.roomCountSingular')).replace('{count}', String(guests.rooms))}
                  </span>
                </div>
                {showGuestPicker && (
                  <div className="custom-guest-popover" onClick={e => e.stopPropagation()}>
                    <div className="guest-row">
                      <div className="guest-info"><span>{t('packageCheckout.rooms')}</span></div>
                      <div className="guest-controls">
                        <button onClick={() => handleGuestChange('rooms', 'sub')}>-</button>
                        <span>{guests.rooms}</span>
                        <button onClick={() => handleGuestChange('rooms', 'add')}>+</button>
                      </div>
                    </div>
                    <div className="guest-row">
                      <div className="guest-info"><span>{t('packageCheckout.adults')}</span><small>{t('packageCheckout.adultsAge')}</small></div>
                      <div className="guest-controls">
                        <button onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                        <span>{guests.adults}</span>
                        <button onClick={() => handleGuestChange('adults', 'add')}>+</button>
                      </div>
                    </div>
                    <div className="guest-row">
                      <div className="guest-info"><span>{t('packageCheckout.children')}</span><small>{t('packageCheckout.childrenAge')}</small></div>
                      <div className="guest-controls">
                        <button onClick={() => handleGuestChange('children', 'sub')}>-</button>
                        <span>{guests.children}</span>
                        <button onClick={() => handleGuestChange('children', 'add')}>+</button>
                      </div>
                    </div>
                    <button className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('packageCheckout.done')}</button>
                  </div>
                )}
              </div>
            </section>

            <section className="pkg-co-section">
              <h2 className="pkg-co-section-title" style={{ marginBottom: '24px' }}>{t('packageCheckout.travellerDetails')}</h2>

              {travellers.map((traveller) => (
                <div key={traveller.id} className="pkg-co-traveller">
                  <div className="pkg-co-traveller-header" onClick={() => toggleTraveller(traveller.id)}>
                    <div className="pkg-co-t-left">
                      <div className="pkg-co-t-num">{traveller.id}</div>
                      <input
                        type="text"
                        className="pkg-co-t-name-input"
                        value={traveller.name}
                        placeholder={t('packageCheckout.fullNamePlaceholder')}
                        onChange={e => handleUpdateTraveller(traveller.id, 'name', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {traveller.open ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                  </div>
                  {traveller.open && (
                    <div className="pkg-co-traveller-body">
                      <div className="pkg-co-t-field">
                        <label className="pkg-co-t-label">{t('packageCheckout.age')}</label>
                        <input
                          type="text"
                          className="pkg-co-t-val-input"
                          value={traveller.age}
                          onChange={e => handleUpdateTraveller(traveller.id, 'age', e.target.value)}
                          placeholder={t('packageCheckout.agePlaceholder')}
                        />
                      </div>
                      <div className="pkg-co-t-field">
                        <label className="pkg-co-t-label">{t('packageCheckout.gender')}</label>
                        <select
                          className="pkg-co-t-val-select"
                          value={traveller.gender}
                          onChange={e => handleUpdateTraveller(traveller.id, 'gender', e.target.value)}
                        >
                          <option>{t('packageCheckout.genderMale')}</option><option>{t('packageCheckout.genderFemale')}</option><option>{t('packageCheckout.genderOther')}</option>
                        </select>
                      </div>
                      <div className="pkg-co-t-field">
                        <span className="pkg-co-t-label">{t('packageCheckout.status')}</span>
                        <span className="pkg-co-verified"><CheckCircle2 size={16} /> {t('packageCheckout.verified')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button className="pkg-co-add-btn" onClick={handleAddTraveller}>
                <Plus size={16} /> {t('packageCheckout.addAnotherTraveller')}
              </button>
            </section>

            <section className="pkg-co-section">
              <h2 className="pkg-co-section-title" style={{ marginBottom: '24px' }}>{t('packageCheckout.contactDetails')}</h2>
              <div className="pkg-co-contact-grid">
                <div className="pkg-co-field">
                  <label>{t('packageCheckout.emailAddress')}</label>
                  <div className="pkg-co-input-wrap">
                    <input type="email" value={user?.email || ''} readOnly placeholder={t('packageCheckout.noEmailOnAccount')} />
                  </div>
                </div>
                <div className="pkg-co-field">
                  <label>{t('packageCheckout.contactNumber')}</label>
                  <div className="pkg-co-input-wrap">
                    <input type="tel" value={user?.phone || ''} readOnly />
                  </div>
                </div>
              </div>
            </section>

            <section className="pkg-co-section">
              <h2 className="pkg-co-section-title" style={{ marginBottom: '24px' }}>{t('packageCheckout.additionalOptions')}</h2>

              <div className={`pkg-co-option ${insurance ? 'active' : ''}`}>
                <div className="pkg-co-opt-left">
                  <ShieldCheck size={24} className="pkg-co-opt-icon" />
                  <div className="pkg-co-opt-text">
                    <h4>{t('packageCheckout.travelInsuranceTitle')}</h4>
                    <p>{t('packageCheckout.travelInsuranceDesc')}</p>
                  </div>
                </div>
                <div className={`toggle-switch ${insurance ? 'active' : ''}`} onClick={() => setInsurance(!insurance)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>

              <div className={`pkg-co-option ${gstInvoice ? 'active' : ''}`}>
                <div className="pkg-co-opt-left">
                  <FileText size={24} className="pkg-co-opt-icon" />
                  <div className="pkg-co-opt-text">
                    <h4>{t('packageCheckout.gstInvoiceTitle')}</h4>
                    <p>{t('packageCheckout.gstInvoiceDesc')}</p>
                  </div>
                </div>
                <div className={`toggle-switch ${gstInvoice ? 'active' : ''}`} onClick={() => setGstInvoice(!gstInvoice)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
            </section>

          </div>

          <div className="pkg-co-right">
            <div className="pkg-co-sidebar">

              <div className="pkg-summary-card">
                <h3 className="pkg-summary-title">{t('packageCheckout.bookingSummary')}</h3>
                <div className="pkg-summary-list">
                  {pricePerPerson > 0 ? (
                    <div className="pkg-summary-row">
                      <span>
                        {t('packageCheckout.packagePrice')} (
                        {(totalTravellers > 1 ? t('packageCheckout.travellerCountPlural') : t('packageCheckout.travellerCountSingular')).replace('{count}', String(totalTravellers))}
                        )
                      </span>
                      <strong>₹{baseAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  ) : (
                    <div className="pkg-summary-row"><span>{t('packageCheckout.packagePrice')}</span><strong>—</strong></div>
                  )}
                  {insurance && (
                    <div className="pkg-summary-row">
                      <span>{t('packageCheckout.insuranceAndProtection')}</span>
                      <strong>₹{insuranceFee}</strong>
                    </div>
                  )}
                  <div className="pkg-summary-row">
                    <span>{t('packageCheckout.taxesAndFees')} (GST 5%)</span>
                    <strong>+ ₹{gstAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  {discountAmount > 0 && (
                    <div className="pkg-summary-row">
                      <span>{t('packageCheckout.specialOfferDiscount')}</span>
                      <strong>− ₹{discountAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
                <div className="pkg-summary-row total-row">
                  <div className="total-label">{t('packageCheckout.totalAmount')}</div>
                  <div className="total-amount">₹{totalAmount.toLocaleString('en-IN')}</div>
                </div>

                {paymentError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '8px 0' }}>{paymentError}</p>}

                <button className="pkg-co-book-btn" onClick={handleBookNow} disabled={isProcessing}>
                  {isProcessing ? t('packageCheckout.processing') : t('packageCheckout.bookNow')}
                </button>

                <div className="pkg-co-secure">
                  <Lock size={14} /> {t('packageCheckout.securePayment')}
                </div>
              </div>

              <div className="pkg-help-card">
                <h4>{t('packageCheckout.needHelp')}</h4>
                <p>{t('packageCheckout.needHelpDesc')}</p>
                <a href="tel:+9118001234567" className="pkg-help-phone" style={{ marginTop: '12px', display: 'flex' }}>
                  <Phone size={16} /> +91 1800 123 4567
                </a>
              </div>

            </div>
          </div>
        </div>

        <footer className="pkg-co-footer">
          <div>{t('packageCheckout.footerCopyright')}</div>
          <div className="pkg-co-footer-links">
            <a href="/privacy-security#privacy-policy">{t('packageCheckout.privacyPolicy')}</a>
            <a href="/privacy-security#terms-of-service">{t('packageCheckout.termsOfService')}</a>
          </div>
        </footer>

      </div>

      {isProcessing && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-spinner"></div>
            <h3>{t('packageCheckout.confirmingPayment')}</h3>
            <p>{t('packageCheckout.doNotClose')}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default PackageCheckout;
