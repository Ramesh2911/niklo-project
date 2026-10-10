import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ShieldCheck, Lock, Star, User, Plus, Edit
} from 'lucide-react';
import { hotelService, type RoomType, type HotelBookingQuote } from '../lib/hotelService';
import { paymentService } from '../lib/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './HotelCheckout.css';

declare const Razorpay: any;

// "Fri, 23 May 2025" -> "2025-05-23"
function toIsoDate(label: string): string {
  const cleaned = label.replace(/^[A-Za-z]+,\s*/, '');
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

const HotelCheckout: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, isLoggedIn } = useAuth();

  // Get passed state or use defaults
  const checkoutState = location.state || {
    checkIn: 'Fri, 23 May 2025',
    checkOut: 'Sun, 25 May 2025',
    guests: { adults: 2, children: 0, rooms: 1 }
  };

  const [travellers, setTravellers] = useState([
    { id: 1, name: user?.name || '', age: '', gender: 'Male', open: false }
  ]);
  const [hotelName, setHotelName] = useState('');
  const [room, setRoom] = useState<RoomType | null>(null);
  const [pricePerNight, setPricePerNight] = useState(0);
  // Authoritative price (taxes/discount included) from POST /bookings/hotel/quote.
  // Only fetchable once signed in - the endpoint is behind the JWT guard.
  const [quote, setQuote] = useState<HotelBookingQuote | null>(null);

  const ciDate = toIsoDate(checkoutState.checkIn);
  const coDate = toIsoDate(checkoutState.checkOut);
  const nights = Math.max(1, Math.round((new Date(coDate).getTime() - new Date(ciDate).getTime()) / 86400000));
  const rooms = checkoutState.guests?.rooms ?? 1;
  const adults = checkoutState.guests?.adults ?? 1;
  const children = checkoutState.guests?.children ?? 0;

  useEffect(() => {
    if (!id) return;
    hotelService.getHotelDetails(id).then((data) => {
      setHotelName(data.hotelName ?? '');
      // Prefer the room the user actually picked on the availability screen
      // (checkoutState.roomTypeId), falling back to the hotel's first room type.
      const activeRoom = data.roomTypes?.find((r) => r.id === checkoutState.roomTypeId) ?? data.roomTypes?.[0] ?? null;
      setRoom(activeRoom);
      setPricePerNight(Number(activeRoom?.price ?? checkoutState.pricePerNight ?? data.priceInt ?? 0));
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !room || !isLoggedIn) {
      setQuote(null);
      return;
    }
    hotelService.quoteBooking({
      hotelId: id,
      roomTypeId: room.id,
      pricePerNight,
      checkInDate: ciDate,
      checkOutDate: coDate,
      rooms,
      adults,
      children,
      isHourly: false,
    }).then(setQuote).catch(() => setQuote(null));
  }, [id, room, isLoggedIn, ciDate, coDate, rooms, adults, children, pricePerNight]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', age: '', gender: 'Male' });
  const [showSupportInfo, setShowSupportInfo] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleAddGuest = () => {
    setTravellers([
      ...travellers,
      { id: travellers.length + 1, name: `Guest ${travellers.length + 1}`, age: '25', gender: 'Female', open: false }
    ]);
  };

  const handleEditClick = (idx: number) => {
    setEditIndex(idx);
    setEditForm(travellers[idx]);
  };

  const handleSaveEdit = () => {
    if (editIndex !== null) {
      const updated = [...travellers];
      updated[editIndex] = { ...updated[editIndex], ...editForm };
      setTravellers(updated);
      setEditIndex(null);
    }
  };

  const handleContinuePayment = async () => {
    if (!isLoggedIn || !user) {
      setPaymentError(t('hotelCheckout.errorSignInRequired'));
      return;
    }
    if (!room) {
      setPaymentError(t('hotelCheckout.errorPricingUnavailable'));
      return;
    }

    setPaymentError('');
    setIsProcessing(true);
    try {
      const res = await hotelService.createBooking({
        hotelId: id || '',
        roomTypeId: room.id,
        pricePerNight,
        checkInDate: ciDate,
        checkOutDate: coDate,
        rooms,
        adults,
        children,
        childAges: [],
        isHourly: false,
        guests: travellers.map((tr) => ({
          name: tr.name,
          age: Number(tr.age) || 0,
          gender: tr.gender,
        })),
        contactEmail: user.email,
        contactPhone: user.phone,
      });

      // backend: the hotel-booking-create route doesn't reliably populate
      // totalAmount, so res.amount can come back undefined — fall back to
      // what we already know locally (quote total, or plain rate*nights*rooms)
      // instead of crashing on `.toLocaleString()` of undefined.
      const localTotal = quote?.amount ?? pricePerNight * nights * rooms;
      const displayAmount = res.amount ?? localTotal;
      const sdkLoaded = await paymentService.loadRazorpayScript();
      if (!sdkLoaded) throw new Error(t('hotelCheckout.errorBookingFailed'));
      const order = await paymentService.createRazorpayOrder(displayAmount, res.bookingId);
      new Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: order.razorpay_order_id,
        // /payment/orders echoes rupees; SDK option must be paise (guide Step 6A).
        amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR',
        name: 'Niklo Travel',
        description: hotelName || t('hotelCheckout.defaultHotelBookingName'),
        prefill: { name: user.name || '', email: user.email || '', contact: user.phone },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature?: string }) => {
          hotelService.confirmPayment(res.bookingId, {
            paymentId: response.razorpay_payment_id,
            paymentGatewayOrderId: response.razorpay_order_id,
          }).catch(() => {});
          navigate('/booking-success', {
            state: {
              type: 'package',
              packageName: hotelName || t('hotelCheckout.defaultHotelBookingName'),
              bookingId: res.bookingId,
              startDate: checkoutState.checkIn,
              endDate: checkoutState.checkOut,
              amount: displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              travellers,
            },
          });
        },
        modal: { ondismiss: () => setIsProcessing(false) },
        theme: { color: '#0052ff' },
      }).open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : t('hotelCheckout.errorBookingFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="hc-page-wrapper">

      {/* Header */}
      <header className="hc-header">
        <button className="hc-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="hc-header-title">{t('hotelCheckout.headerTitle')}</h1>
      </header>

      {/* Main Grid Content */}
      <main className="hc-main">
        <div className="hc-container">

          {/* Left Column details */}
          <div className="hc-left-col">

            {/* Free Cancellation Alert */}
            <div className="hc-cancellation-banner">
              <ShieldCheck size={22} className="hc-banner-icon" />
              <div className="hc-banner-text">
                <h3>{t('hotelCheckout.freeCancellationTitle')}</h3>
                <p>{t('hotelCheckout.freeCancellationDesc')}</p>
              </div>
            </div>

            {/* Dates Card */}
            <div className="hc-card">
              <div className="hc-card-header">
                <h2>{t('hotelCheckout.datesCardTitle')}</h2>
                <button className="hc-card-action-btn" onClick={() => navigate(-1)}>{t('hotelCheckout.changeButton')}</button>
              </div>
              <div className="hc-card-grid">
                <div className="hc-card-field">
                  <span className="hc-field-lbl">{t('hotelCheckout.checkInLabel')}</span>
                  <span className="hc-field-val">{checkoutState.checkIn}</span>
                </div>
                <div className="hc-card-field">
                  <span className="hc-field-lbl">{t('hotelCheckout.checkOutLabel')}</span>
                  <span className="hc-field-val">{checkoutState.checkOut}</span>
                </div>
              </div>
              <span className="hc-nights-badge">🌙 {nights} {nights === 1 ? t('hotelCheckout.nightSingular') : t('hotelCheckout.nightPlural')}</span>
            </div>

            {/* Guests & Rooms Card */}
            <div className="hc-card">
              <div className="hc-card-header">
                <h2>{t('hotelCheckout.guestsRoomsCardTitle')}</h2>
                <button className="hc-card-action-btn" onClick={() => navigate(-1)}>{t('hotelCheckout.changeButton')}</button>
              </div>
              <div className="hc-card-grid">
                <div className="hc-card-field">
                  <span className="hc-field-lbl">{t('hotelCheckout.roomsLabel')}</span>
                  <span className="hc-field-val">{t('hotelCheckout.roomsSummary').replace('{rooms}', String(checkoutState.guests.rooms))}</span>
                </div>
                <div className="hc-card-field">
                  <span className="hc-field-lbl">{t('hotelCheckout.guestsLabel')}</span>
                  <span className="hc-field-val">{t('hotelCheckout.guestsSummary').replace('{adults}', String(checkoutState.guests.adults)).replace('{children}', String(checkoutState.guests.children))}</span>
                </div>
              </div>
            </div>

            {/* Guests Information */}
            <div className="hc-card">
              <div className="hc-card-header" style={{ marginBottom: '20px' }}>
                <h2>{t('hotelCheckout.guestsInformationTitle')}</h2>
              </div>

              <div className="hc-guests-list">
                {travellers.map((traveller, idx) => (
                  <div key={traveller.id} className="hc-guest-row">
                    <div className="hc-guest-row-left">
                      <div className="hc-guest-icon-box">
                        <User size={18} />
                      </div>
                      <div className="hc-guest-details">
                        <h3>{traveller.name}</h3>
                        <p>{t('hotelCheckout.guestAgeLine').replace('{age}', String(traveller.age)).replace('{gender}', String(traveller.gender))}</p>
                      </div>
                    </div>
                    <button className="hc-guest-edit-btn" onClick={() => handleEditClick(idx)}>
                      <Edit size={16} />
                      <span>{t('hotelCheckout.editButton')}</span>
                    </button>
                  </div>
                ))}
              </div>

              <button className="hc-add-guest-btn" onClick={handleAddGuest}>
                <Plus size={16} />
                <span>{t('hotelCheckout.addAnotherGuestButton')}</span>
              </button>
            </div>

          </div>

          {/* Right Column sidebar summary */}
          <div className="hc-right-col">

            <div className="hc-summary-card">
              <h2>{t('hotelCheckout.bookingSummaryTitle')}</h2>

              <div className="hc-price-details-section">
                <span className="hc-sub-title">{t('hotelCheckout.priceDetailsLabel')}</span>
                {quote ? (
                  <>
                    <div className="hc-price-row">
                      <span>{quote.priceBreakdown.nights || 1} {(quote.priceBreakdown.nights || 1) === 1 ? t('hotelCheckout.nightSingular') : t('hotelCheckout.nightPlural')} × {quote.priceBreakdown.rooms} {quote.priceBreakdown.rooms > 1 ? t('hotelCheckout.roomPlural') : t('hotelCheckout.roomSingular')}</span>
                      <span>₹{quote.priceBreakdown.roomStayCost.toLocaleString('en-IN')}</span>
                    </div>
                    {quote.priceBreakdown.extraGuestCharges > 0 && (
                      <div className="hc-price-row">
                        <span>{t('hotelCheckout.extraGuestChargesLabel')}</span>
                        <span>₹{quote.priceBreakdown.extraGuestCharges.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="hc-price-row">
                      <span>{t('hotelCheckout.taxesAndFeesLabel')}</span>
                      <span>₹{quote.priceBreakdown.taxes.toLocaleString('en-IN')}</span>
                    </div>
                    {quote.priceBreakdown.discount > 0 && (
                      <div className="hc-price-row">
                        <span>{t('hotelCheckout.discountLabel')}</span>
                        <span>-₹{quote.priceBreakdown.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                ) : pricePerNight > 0 ? (
                  <div className="hc-price-row">
                    <span>{nights} {nights > 1 ? t('hotelCheckout.nightPlural') : t('hotelCheckout.nightSingular')} × {rooms} {rooms > 1 ? t('hotelCheckout.roomPlural') : t('hotelCheckout.roomSingular')}</span>
                    <span>₹{(pricePerNight * nights * rooms).toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <div className="hc-price-row"><span>{t('hotelCheckout.loadingPricing')}</span></div>
                )}
              </div>

              <div className="hc-total-row">
                <span className="hc-total-lbl">{t('hotelCheckout.totalAmountLabel')}</span>
                <span className="hc-total-val">
                  {quote
                    ? `₹${quote.priceBreakdown.total.toLocaleString('en-IN')}`
                    : pricePerNight > 0
                      ? `₹${(pricePerNight * nights * rooms).toLocaleString('en-IN')}`
                      : '—'}
                </span>
              </div>

              {paymentError && <p className="hc-payment-error">{paymentError}</p>}

              <button className="hc-btn-continue" onClick={handleContinuePayment} disabled={isProcessing}>
                {isProcessing ? t('hotelCheckout.confirming') : t('hotelCheckout.continueToPayment')}
              </button>

              <div className="hc-secure-lbl">
                <Lock size={12} />
                <span>{t('hotelCheckout.secureEncrypted')}</span>
              </div>
            </div>

            <div className="hc-help-card">
              <h3>{t('hotelCheckout.needHelpTitle')}</h3>
              <p>{t('hotelCheckout.needHelpDesc')}</p>
              {showSupportInfo ? (
                <p className="hc-support-details">
                  {t('hotelCheckout.supportCallLabel')} <a href="tel:+9118001234567">+91 1800 123 4567</a> {t('hotelCheckout.supportOrEmailLabel')} <a href="mailto:hello@niklo.com">hello@niklo.com</a>
                </p>
              ) : (
                <a href="#support" className="hc-support-link" onClick={e => { e.preventDefault(); setShowSupportInfo(true); }}>{t('hotelCheckout.contactSupport')}</a>
              )}
            </div>

          </div>

        </div>

        {/* Bottom Benefits Row */}
        <div className="hc-footer-benefits">
          <div className="hc-benefit-item">
            <Lock size={16} />
            <span>{t('hotelCheckout.securePaymentBenefit')}</span>
          </div>
          <div className="hc-benefit-item">
            <CheckCircle2 size={16} />
            <span>{t('hotelCheckout.bestPriceGuaranteedBenefit')}</span>
          </div>
          <div className="hc-benefit-item">
            <Star size={16} />
            <span>{t('hotelCheckout.verifiedLuxuryStayBenefit')}</span>
          </div>
        </div>
      </main>

      {/* Edit Guest Modal */}
      {editIndex !== null && (
        <div className="hc-modal-overlay">
          <div className="hc-edit-modal">
            <h3>{t('hotelCheckout.editGuestModalTitle')}</h3>
            <div className="hc-modal-field">
              <label>{t('hotelCheckout.fullNameLabel')}</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="hc-modal-input"
              />
            </div>
            <div className="hc-modal-field">
              <label>{t('hotelCheckout.ageLabel')}</label>
              <input
                type="text"
                value={editForm.age}
                onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                className="hc-modal-input"
              />
            </div>
            <div className="hc-modal-field">
              <label>{t('hotelCheckout.genderLabel')}</label>
              <select
                value={editForm.gender}
                onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                className="hc-modal-select"
              >
                <option value="Male">{t('hotelCheckout.genderMale')}</option>
                <option value="Female">{t('hotelCheckout.genderFemale')}</option>
                <option value="Other">{t('hotelCheckout.genderOther')}</option>
              </select>
            </div>
            <div className="hc-modal-actions">
              <button className="hc-modal-btn-save" onClick={handleSaveEdit}>{t('hotelCheckout.saveChangesButton')}</button>
              <button className="hc-modal-btn-cancel" onClick={() => setEditIndex(null)}>{t('hotelCheckout.cancelButton')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {isProcessing && (
        <div className="hc-processing-overlay">
          <div className="hc-processing-card">
            <div className="hc-spinner"></div>
            <h2>{t('hotelCheckout.confirmingPaymentTitle')}</h2>
            <p>{t('hotelCheckout.doNotCloseDesc')}</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default HotelCheckout;
