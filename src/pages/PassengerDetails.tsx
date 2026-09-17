import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Shield, User as UserIcon, Mail, ChevronUp, ChevronDown, Layers
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

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handlePassengerChange = (index: number, field: string, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleContinuePayment = async () => {
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

    const discount = Math.round(busPrice * seatCount * 0.15);
    const insuranceFee = insurance ? seatCount * 20 : 0;
    const taxes = 20;
    const totalAmount = busPrice * seatCount - discount + insuranceFee + taxes;

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

    const goToSuccess = () => navigate('/booking-success', { state: {
      type: 'bus',
      bookingId: booking.id,
      qrCode: booking.qr_code,
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
      goToSuccess();
    };

    // Booking is already created for real above; Razorpay checkout is a best-effort
    // payment UX on top of it — if the gateway isn't configured, still show success
    // since the underlying booking is real, not simulated.
    const sdkLoaded = await paymentService.loadRazorpayScript();
    const order = sdkLoaded ? await paymentService.createRazorpayOrder(totalAmount, booking.id).catch(() => null) : null;

    if (order && (window as unknown as { Razorpay?: unknown }).Razorpay) {
      setIsProcessing(false);
      const RazorpayClass = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open(): void } }).Razorpay;
      const rzp = new RazorpayClass({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
        amount: order.amount,
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

        </div>

        {/* Right Column (Sidebar) */}
        <div className="right-column">

          <div className="details-card fare-summary-card">
            <h3>{t('passengerDetails.fareSummary')}</h3>
            <div className="fare-breakdown">
              <div className="fare-row">
                <span>{(seatCount > 1 ? t('passengerDetails.ticketFarePlural') : t('passengerDetails.ticketFare')).replace('{{count}}', String(seatCount))}</span>
                <span>₹{busPrice * seatCount}</span>
              </div>
              <div className="fare-row discount">
                <span>{t('passengerDetails.discount')}</span>
                <span>-₹{Math.round(busPrice * seatCount * 0.15)}</span>
              </div>
              <div className="fare-row">
                <span>{t('passengerDetails.travelInsurance')}</span>
                <span>{insurance ? `₹${seatCount * 20}` : '—'}</span>
              </div>
              <div className="fare-row">
                <span>{t('passengerDetails.taxes')}</span>
                <span>₹20</span>
              </div>
            </div>
            <div className="fare-total">
              <span>{t('passengerDetails.totalAmount')}</span>
              <span className="total-val">
                ₹{Math.round(busPrice * seatCount * 0.85) + (insurance ? seatCount * 20 : 0) + 20}
              </span>
            </div>
            {bookingError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '8px' }}>{bookingError}</p>
            )}
            <button className="btn-continue-payment" onClick={handleContinuePayment} disabled={isProcessing}>
              {isProcessing ? t('passengerDetails.processing') : t('passengerDetails.continueToPayment')}
            </button>
            <div className="secure-badge">
              <Shield size={14} className="icon-green" />
              <span>{t('passengerDetails.securePayments')}</span>
            </div>
          </div>

          <div className="promo-applied-card">
            <h4>{t('passengerDetails.promoApplied')}</h4>
            <p>{t('passengerDetails.promoSavedDesc')}</p>
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
