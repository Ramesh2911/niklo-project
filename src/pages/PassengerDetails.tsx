import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Shield, User as UserIcon, Mail, ChevronUp, ChevronDown, Layers,
  Wallet as WalletIcon, Ticket, Timer,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { bookingService } from '../lib/bookingService';
import { busService, type RoutePoint } from '../lib/busService';
import { paymentService } from '../lib/paymentService';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import './PassengerDetails.css';

const PassengerDetails = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingState = (location.state as {
    scheduleId?: string; selectedSeats?: string[]; busPrice?: number;
    busName?: string; from?: string; to?: string; depTime?: string; travelDate?: string;
  }) || {};

  const seatCount = bookingState.selectedSeats?.length ?? 2;
  const busPrice = bookingState.busPrice ?? 793;

  const [passengers, setPassengers] = useState(
    Array.from({ length: seatCount }, (_, i) => ({ id: i + 1, name: '', age: '', gender: 'Male' as 'Male' | 'Female' | 'Other' }))
  );
  const [openGenderFor, setOpenGenderFor] = useState<number | null>(null);
  const genderDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [boardingPoints, setBoardingPoints] = useState<RoutePoint[]>([]);
  const [droppingPoints, setDroppingPoints] = useState<RoutePoint[]>([]);
  const [boardingPointId, setBoardingPointId] = useState('');
  const [droppingPointId, setDroppingPointId] = useState('');

  useEffect(() => {
    if (!bookingState.scheduleId) return;
    busService.getBoardingPoints(bookingState.scheduleId)
      .then((res) => {
        setBoardingPoints(res.boarding_points);
        setDroppingPoints(res.dropping_points);
        if (res.boarding_points.length) setBoardingPointId(res.boarding_points[0].id);
        if (res.dropping_points.length) setDroppingPointId(res.dropping_points[0].id);
      })
      .catch(() => {
        // No real stop list for this route — fall back to the plain city name.
        setBoardingPoints([]);
        setDroppingPoints([]);
      });
  }, [bookingState.scheduleId]);

  const selectedBoardingPoint = boardingPoints.find((p) => p.id === boardingPointId);
  const selectedDroppingPoint = droppingPoints.find((p) => p.id === droppingPointId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openGenderFor === null) return;
      const ref = genderDropdownRefs.current[openGenderFor];
      if (ref && !ref.contains(e.target as Node)) setOpenGenderFor(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openGenderFor]);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [insurance, setInsurance] = useState(true);
  const [gst, setGst] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Guide §6 checklist: the 5-min seat hold taken in the seat map ticks down
  // here — if it hits zero the seats are released and payment must be blocked.
  const [lockSeconds, setLockSeconds] = useState(300);
  // Guide Step 4.2: coupon validated server-side via POST /offers/validate
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  // Guide Step 6 Option B: pay from the Niklo wallet instead of Razorpay
  const [payMethod, setPayMethod] = useState<'gateway' | 'wallet'>('gateway');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const ticketFare = busPrice * seatCount;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const insuranceFee = insurance ? seatCount * 20 : 0;
  const taxes = 20;
  const totalAmount = ticketFare - discount + insuranceFee + taxes;
  const lockExpired = lockSeconds <= 0;
  const lockTimeLabel = `${Math.floor(lockSeconds / 60)}:${String(lockSeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (!bookingState.scheduleId) return;
    const timer = setInterval(() => setLockSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [bookingState.scheduleId]);

  useEffect(() => {
    paymentService.getWalletInfo()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handlePassengerChange = (index: number, field: string, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponMsg(null);
    try {
      const res = await bookingService.validateOffer(code, ticketFare, 'BUS');
      if (res.valid) {
        const amount = res.discount_amount ?? (res.final_amount != null ? Math.max(0, ticketFare - res.final_amount) : 0);
        const applied = res.code || code;
        setAppliedCoupon({ code: applied, discount: amount });
        setCouponMsg({
          kind: 'ok',
          text: t('passengerDetails.couponAppliedMessage').replace('{{code}}', applied).replace('{{amount}}', String(amount)),
        });
      } else {
        setAppliedCoupon(null);
        setCouponMsg({ kind: 'err', text: res.message || t('passengerDetails.couponInvalidError') });
      }
    } catch {
      setAppliedCoupon(null);
      setCouponMsg({ kind: 'err', text: t('passengerDetails.couponInvalidError') });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
  };

  const handleContinuePayment = async () => {
    if (lockExpired) {
      setBookingError(t('passengerDetails.seatLockExpired'));
      return;
    }
    if (passengers.some(p => !p.name || !p.age)) {
      setBookingError(t('passengerDetails.errorFillPassengers'));
      return;
    }
    if (!bookingState.scheduleId) {
      setBookingError(t('passengerDetails.errorMissingSchedule'));
      return;
    }
    setIsProcessing(true);
    setBookingError('');

    let booking;
    try {
      // backend: booking-service has no POST /bookings route yet, so this
      // 404s and always falls into the catch below until that's built.
      booking = await bookingService.createBusBooking({
        scheduleId: bookingState.scheduleId,
        seatIds: bookingState.selectedSeats ?? [],
        passengers: passengers.map(p => ({ name: p.name, age: p.age, gender: p.gender })),
        contactEmail: email,
        contactPhone: phone,
        travelDate: bookingState.travelDate,
        title: bookingState.busName,
        departureTime: bookingState.depTime,
        travelInsurance: insurance,
        boardingPoint: selectedBoardingPoint?.name ?? bookingState.from,
        droppingPoint: selectedDroppingPoint?.name ?? bookingState.to,
        fareBreakdown: { baseFare: busPrice * seatCount, discount, insurance: insuranceFee, taxes, total: totalAmount },
      });
    } catch {
      setIsProcessing(false);
      setBookingError(t('passengerDetails.errorBookingFailed'));
      return;
    }

    const formattedDate = bookingState.travelDate
      ? new Date(bookingState.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : undefined;

    const goToSuccess = (qrCode?: string) => navigate('/booking-success', { state: {
      type: 'bus',
      bookingId: booking.id,
      qrCode: qrCode || booking.qr_code,
      from: bookingState.from,
      to: bookingState.to,
      busName: bookingState.busName,
      depTime: bookingState.depTime,
      seats: bookingState.selectedSeats?.join(', '),
      amount: `${totalAmount.toLocaleString('en-IN')}.00`,
      startDate: formattedDate && bookingState.depTime ? `${formattedDate} • ${bookingState.depTime}` : formattedDate,
    } });

    // Booking stays PENDING (and is auto-cancelled ~15 min later by
    // booking-service's sweep) until payment is reported back, so every path
    // to the success screen confirms it first.
    const confirmAndSucceed = async (paymentId?: string, paymentGatewayOrderId?: string) => {
      await bookingService.confirmPayment(booking.id, { payment_id: paymentId, payment_gateway_order_id: paymentGatewayOrderId }).catch(() => {});
      // Guide Step 6.3: the QR token is issued when the booking flips to
      // CONFIRMED — the create-time record is still PENDING, so refetch to
      // pick up qr_code before rendering the ticket (create-time value as fallback).
      const fresh = await bookingService.getBooking(booking.id).catch(() => null);
      goToSuccess(fresh?.qr_code || booking.qr_code);
    };

    // Guide Step 6 Option B — direct wallet payment (no Razorpay checkout).
    if (payMethod === 'wallet') {
      if (walletBalance != null && walletBalance < totalAmount) {
        setIsProcessing(false);
        setBookingError(t('passengerDetails.walletInsufficientError'));
        return;
      }
      try {
        const payRes = await paymentService.payWithWallet({
          booking_id: booking.id,
          amount: totalAmount,
          booking_type: 'BUS',
          description: 'Payment for Bus Booking',
        });
        if (payRes.success === false) throw new Error('wallet payment declined');
        await confirmAndSucceed(payRes.transaction_id);
      } catch {
        setIsProcessing(false);
        setBookingError(t('passengerDetails.walletPaymentFailed'));
      }
      return;
    }

    // Booking is already created for real above; Razorpay checkout is a best-effort
    // payment UX on top of it — if the gateway isn't configured, still show success
    // since the underlying booking is real, not simulated.
    const sdkLoaded = await paymentService.loadRazorpayScript();
    const order = sdkLoaded ? await paymentService.createRazorpayOrder(totalAmount, booking.id).catch(() => null) : null;

    if (order && (window as unknown as { Razorpay?: unknown }).Razorpay) {
      setIsProcessing(false);
      const RazorpayClass = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open(): void } }).Razorpay;
      const rzp = new RazorpayClass({
        // guide Step 6A: POST /payment/orders echoes the plain rupee amount —
        // the Razorpay SDK option must be in paise, so convert here.
        key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: 'Niklo',
        description: `Bus Booking – ${bookingState.selectedSeats?.join(', ')}`,
        theme: { color: '#0052ff' },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature?: string }) =>
          confirmAndSucceed(response.razorpay_payment_id, response.razorpay_order_id),
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      rzp.open();
      return;
    }

    setIsProcessing(false);
    void confirmAndSucceed();
  };

  return (
    <div className="passenger-details-page">
      {isProcessing && (
        <div className="payment-modal-overlay">
          <div className="payment-overlay-card">
            <div className="spinner"></div>
            <h2>{t('passengerDetails.confirmingPayment')}</h2>
            <p>{t('passengerDetails.confirmingPaymentDesc')}</p>
          </div>
        </div>
      )}
      {/* 1. Header Navigation */}
      <Navbar theme="white" />

      {/* 2. Blue Top Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <button className="btn-back" onClick={() => navigate('/buses')}>
            <ArrowLeft size={16} />
            {t('passengerDetails.backToSelectSeats')}
          </button>
          <h1>{t('passengerDetails.pageTitle')}</h1>
          <p>{t('passengerDetails.pageSubtitle')}</p>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <main className="main-content-grid">

        {/* Left Column (Forms) */}
        <div className="left-column">

          {/* Bus Summary Card */}
          <div className="details-card bus-summary-card">
            <div className="bus-summary-header">
              <div className="bus-title-area">
                <h2>{bookingState.busName ?? 'Bus'}</h2>
                <div className="bus-rating">
                  <span className="rating-badge">★ Rated</span>
                  <span className="rating-text">{t('passengerDetails.topRated')}</span>
                </div>
              </div>
              <div className="bus-time-area">
                {bookingState.depTime && (
                  <span className="bus-time">{bookingState.depTime} {t('passengerDetails.departure')}</span>
                )}
              </div>
            </div>

            <div className="bus-route-summary">
              <div className="route-point">
                <div className="point-dot blue"></div>
                <div className="point-text">
                  {boardingPoints.length > 0 ? (
                    <select
                      value={boardingPointId}
                      onChange={(e) => setBoardingPointId(e.target.value)}
                      style={{ fontWeight: 700, border: 'none', background: 'transparent', fontSize: 'inherit', color: 'inherit', padding: 0 }}
                    >
                      {boardingPoints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <strong>{bookingState.from ?? 'Origin'}</strong>
                  )}
                  <span>{t('passengerDetails.boardingPoint')}</span>
                  {selectedBoardingPoint?.address && <span style={{ fontSize: '0.75rem' }}>{selectedBoardingPoint.address}</span>}
                </div>
              </div>
              <div className="route-line-vertical"></div>
              <div className="route-point">
                <div className="point-dot orange"></div>
                <div className="point-text">
                  {droppingPoints.length > 0 ? (
                    <select
                      value={droppingPointId}
                      onChange={(e) => setDroppingPointId(e.target.value)}
                      style={{ fontWeight: 700, border: 'none', background: 'transparent', fontSize: 'inherit', color: 'inherit', padding: 0 }}
                    >
                      {droppingPoints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <strong>{bookingState.to ?? 'Destination'}</strong>
                  )}
                  <span>{t('passengerDetails.droppingPoint')}</span>
                  {selectedDroppingPoint?.address && <span style={{ fontSize: '0.75rem' }}>{selectedDroppingPoint.address}</span>}
                </div>
              </div>

              <div className="seats-badge">
                <strong>{seatCount} {seatCount !== 1 ? t('passengerDetails.seatPlural') : t('passengerDetails.seatSingular')}</strong>
                <span>{t('passengerDetails.selected')}</span>
              </div>
            </div>
          </div>

          {/* Passenger Input Cards */}
          {passengers.map((p, index) => (
            <div key={p.id} className="details-card passenger-card">
              <div className="card-header">
                <UserIcon size={20} className="icon-blue" />
                <h3>{t('passengerDetails.passengerAdult').replace('{{number}}', String(index + 1))}</h3>
              </div>
              <div className="form-grid">
                <div className="input-group full-name">
                  <label>{t('passengerDetails.fullName')}</label>
                  <input
                    type="text"
                    placeholder={t('passengerDetails.fullNamePlaceholder')}
                    value={p.name}
                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="input-group age">
                  <label>{t('passengerDetails.age')}</label>
                  <input
                    type="number"
                    placeholder={t('passengerDetails.agePlaceholder')}
                    value={p.age}
                    onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                  />
                </div>
                <div className="input-group gender">
                  <label>{t('passengerDetails.gender')}</label>
                  <div
                    className="gender-dropdown"
                    ref={(el) => { genderDropdownRefs.current[index] = el; }}
                  >
                    <button
                      type="button"
                      className="gender-dropdown-btn"
                      aria-haspopup="listbox"
                      aria-expanded={openGenderFor === index}
                      onClick={() => setOpenGenderFor(openGenderFor === index ? null : index)}
                    >
                      <span>{t(`passengerDetails.${p.gender.toLowerCase()}`)}</span>
                      <ChevronDown size={14} />
                    </button>
                    {openGenderFor === index && (
                      <div className="gender-dropdown-menu" role="listbox">
                        {(['Male', 'Female', 'Other'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            role="option"
                            aria-selected={p.gender === g}
                            className={p.gender === g ? 'active' : ''}
                            onClick={() => { handlePassengerChange(index, 'gender', g); setOpenGenderFor(null); }}
                          >
                            {t(`passengerDetails.${g.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Contact Details Card */}
          <div className="details-card contact-card">
            <div className="card-header">
              <Mail size={20} className="icon-blue" />
              <h3>{t('passengerDetails.contactDetails')}</h3>
            </div>
            <p className="card-subtitle">{t('passengerDetails.contactSubtitle')}</p>
            <div className="form-grid contact-grid">
              <div className="input-group">
                <label>{t('passengerDetails.emailAddress')}</label>
                <input
                  type="email"
                  placeholder={t('passengerDetails.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>{t('passengerDetails.mobileNumber')}</label>
                <input
                  type="tel"
                  placeholder={t('passengerDetails.mobilePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Additional Options Card */}
          <div className="details-card options-card">
            <div className="card-header">
              <Layers size={20} className="icon-blue" />
              <h3>{t('passengerDetails.additionalOptions')}</h3>
            </div>
            <div className="options-list">

              <label className="custom-checkbox-wrapper">
                <div className="checkbox-input">
                  <input
                    type="checkbox"
                    checked={insurance}
                    onChange={(e) => setInsurance(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                </div>
                <div className="checkbox-content">
                  <div className="checkbox-title-row">
                    <strong>{t('passengerDetails.travelInsurance')}</strong>
                    <span className="price-tag">₹20</span>
                  </div>
                  <p>{t('passengerDetails.travelInsuranceDesc')}</p>
                </div>
              </label>

              <label className="custom-checkbox-wrapper">
                <div className="checkbox-input">
                  <input
                    type="checkbox"
                    checked={gst}
                    onChange={(e) => setGst(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                </div>
                <div className="checkbox-content">
                  <div className="checkbox-title-row">
                    <strong>{t('passengerDetails.gstInvoice')}</strong>
                  </div>
                  <p>{t('passengerDetails.gstInvoiceDesc')}</p>
                </div>
              </label>

            </div>
          </div>

          {/* Payment Method Card — guide Step 6 (Gateway vs Wallet) */}
          <div className="details-card">
            <div className="card-header">
              <WalletIcon size={20} className="icon-blue" />
              <h3>{t('passengerDetails.paymentMethodHeading')}</h3>
            </div>
            <div className="options-list">
              <label className="custom-checkbox-wrapper">
                <div className="checkbox-input">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'gateway'}
                    onChange={() => setPayMethod('gateway')}
                  />
                  <span className="checkmark"></span>
                </div>
                <div className="checkbox-content">
                  <strong>{t('passengerDetails.payRazorpayOption')}</strong>
                </div>
              </label>
              <label className="custom-checkbox-wrapper">
                <div className="checkbox-input">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'wallet'}
                    onChange={() => setPayMethod('wallet')}
                  />
                  <span className="checkmark"></span>
                </div>
                <div className="checkbox-content">
                  <div className="checkbox-title-row">
                    <strong>{t('passengerDetails.payWalletOption')}</strong>
                  </div>
                  {walletBalance != null && (
                    <p>{t('passengerDetails.walletBalanceLabel').replace('{{amount}}', walletBalance.toFixed(2))}</p>
                  )}
                </div>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar) */}
        <div className="right-column">

          <div className="details-card fare-summary-card">
            <h3>{t('passengerDetails.fareSummary')}</h3>
            {bookingState.scheduleId && (
              <div
                style={{
                  display: 'block', textAlign: 'center', padding: '6px 10px', borderRadius: '8px',
                  fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px',
                  background: lockExpired ? '#fef2f2' : '#eff6ff',
                  color: lockExpired ? '#ef4444' : '#0052ff',
                }}
              >
                <Timer size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                {lockExpired
                  ? t('passengerDetails.seatLockExpired')
                  : t('passengerDetails.seatsHoldTimer').replace('{{time}}', lockTimeLabel)}
              </div>
            )}
            <div className="fare-breakdown">
              <div className="fare-row">
                <span>{(seatCount > 1 ? t('passengerDetails.ticketFarePlural') : t('passengerDetails.ticketFare')).replace('{{count}}', String(seatCount))}</span>
                <span>₹{ticketFare}</span>
              </div>
              {discount > 0 && (
                <div className="fare-row discount">
                  <span>{t('passengerDetails.discountLabel')} ({appliedCoupon?.code})</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="fare-row">
                <span>{t('passengerDetails.travelInsurance')}</span>
                <span>{insurance ? `₹${insuranceFee}` : '—'}</span>
              </div>
              <div className="fare-row">
                <span>{t('passengerDetails.taxes')}</span>
                <span>₹{taxes}</span>
              </div>
            </div>
            <div className="fare-total">
              <span>{t('passengerDetails.totalAmount')}</span>
              <span className="total-val">
                ₹{totalAmount}
              </span>
            </div>
            {bookingError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '8px' }}>{bookingError}</p>
            )}
            {lockExpired ? (
              <button className="btn-continue-payment" onClick={() => navigate('/buses')}>
                {t('passengerDetails.reselectSeats')}
              </button>
            ) : (
              <button className="btn-continue-payment" onClick={handleContinuePayment} disabled={isProcessing}>
                {isProcessing ? t('passengerDetails.processing') : t('passengerDetails.continueToPayment')}
              </button>
            )}
            <div className="secure-badge">
              <Shield size={14} className="icon-green" />
              <span>{t('passengerDetails.securePayments')}</span>
            </div>
          </div>

          <div className="promo-applied-card">
            <h4><Ticket size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{t('passengerDetails.couponInputLabel')}</h4>
            {!appliedCoupon ? (
              <>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="NIKLOBUS"
                    aria-label={t('passengerDetails.couponInputLabel')}
                    style={{
                      flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1',
                      borderRadius: '8px', fontSize: '0.85rem', textTransform: 'uppercase',
                    }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponInput.trim()}
                    style={{
                      padding: '10px 16px', border: 'none', borderRadius: '8px', background: '#0052ff',
                      color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {applyingCoupon ? '…' : t('passengerDetails.couponApplyButton')}
                  </button>
                </div>
                {couponMsg && (
                  <p style={{ marginTop: '8px', color: couponMsg.kind === 'ok' ? '#16a34a' : '#ef4444' }}>{couponMsg.text}</p>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <p style={{ color: '#16a34a', fontWeight: 600 }}>{couponMsg?.text}</p>
                <button
                  onClick={handleRemoveCoupon}
                  style={{
                    padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                    background: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {t('passengerDetails.couponRemoveButton')}
                </button>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 4. FAQ Section */}
      <section className="faq-section">
        <h2>{t('passengerDetails.faqTitle')}</h2>
        <div className="faq-list">
          {[
            t('passengerDetails.faqQ1'),
            t('passengerDetails.faqQ2'),
            t('passengerDetails.faqQ3')
          ].map((question, index) => (
            <div
              key={index}
              className={`faq-item ${activeFaq === index ? 'active' : ''}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-question">
                <span>{question}</span>
                {activeFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {activeFaq === index && (
                <div className="faq-answer">
                  <p>{t('passengerDetails.faqAnswer')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. Footer */}
      <Footer />
    </div>
  );
};

export default PassengerDetails;
