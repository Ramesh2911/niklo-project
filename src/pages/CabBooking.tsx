import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Search,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Phone, MessageCircle, CornerUpRight, Shield, Star, MoreVertical, Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import carMiniIcon from '../assets/car_mini.png';
import carSedanIcon from '../assets/car_sedan.png';
import carSuvIcon from '../assets/car_suv.png';
import demoDriverAvatar from '../assets/demo_driver_avatar.jpg';
import CabMap, { type LatLng } from '../components/CabMap';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput';
import DriverActionModals, { type DriverActionMode } from '../components/DriverActionModals';
import { rideService, type DriverDetails } from '../lib/rideService';
import { authService } from '../lib/authService';
import { useI18n } from '../contexts/I18nContext';
import './CabBooking.css';

// Fallback coordinates (Kolkata) used only until the map finishes geocoding the
// pickup/drop text the user typed in — see CabMap's Nominatim-backed geocoding.
const PICKUP_COORDS = { lat: 22.5726, lng: 88.3639 };
const DROP_COORDS = { lat: 22.5900, lng: 88.4200 };

const RIDES = [
  { id: 'mini', name: 'Mini', desc: 'Affordable everyday rides', time: '3 mins', price: '₹189', img: carMiniIcon },
  { id: 'sedan', name: 'Sedan', desc: 'Comfort rides for daily travel', time: '4 mins', price: '₹249', img: carSedanIcon },
  { id: 'suv', name: 'SUV', desc: 'Spacious rides for family trips', time: '5 mins', price: '₹399', img: carSuvIcon }
];

const vehicleIconFor = (vehicleType: string | null | undefined) => {
  const match = RIDES.find((r) => r.id === vehicleType?.toLowerCase());
  return match?.img ?? carSedanIcon;
};

const OUTSTATION_TRIPS = [
  { id: 1, title: 'Kolkata → Siliguri', price: '₹4,999', img: 'https://images.unsplash.com/photo-1742325646212-f917ba1feeaa?auto=format&fit=crop&q=80&w=400' },
  { id: 2, title: 'Kolkata → Digha', price: '₹2,499', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=400' },
  { id: 3, title: 'Kolkata → Darjeeling', price: '₹5,899', img: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=400' },
  { id: 4, title: 'Kolkata → Puri', price: '₹6,299', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400' }
];

const FAQS = [
  { questionKey: 'cabBooking.faqQuestion1', answerKey: 'cabBooking.faqAnswer1' },
  { questionKey: 'cabBooking.faqQuestion2', answerKey: 'cabBooking.faqAnswer2' },
  { questionKey: 'cabBooking.faqQuestion3', answerKey: 'cabBooking.faqAnswer3' }
];

const CabBooking: React.FC = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pickupLocation, setPickupLocation] = useState(searchParams.get('from') || 'Current Location, Kolkata');
  const [dropLocation, setDropLocation] = useState(searchParams.get('to') || 'Salt Lake Sector V, Kolkata');
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropCoords, setDropCoords] = useState<LatLng | null>(null);

  const [activeTab, setActiveTab] = useState('one-way');
  const [returnDate, setReturnDate] = useState('');
  const [rentalHours, setRentalHours] = useState(4);
  const [selectedRide, setSelectedRide] = useState('mini');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);

  // Real quotes from POST /ride/estimate, keyed by ride id. Falls back to the
  // static RIDES price below until a quote for that vehicle type comes back.
  const [fareEstimates, setFareEstimates] = useState<Record<string, number>>({});

  // 'selecting' | 'searching' | 'assigned' | 'completed'
  const [bookingStatus, setBookingStatus] = useState<'selecting' | 'searching' | 'assigned' | 'completed'>('selecting');
  const [rideId, setRideId] = useState<string | null>(null);
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);
  const [driverActionMode, setDriverActionMode] = useState<DriverActionMode>(null);
  const pollRef = useRef<number | null>(null);
  const acceptTimeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);

  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Fare estimates require a signed-in caller (ride-service now guards every
  // route with JwtAuthGuard) — skip quietly for a guest browsing this page
  // rather than tripping the shared 401 handler in api.ts.
  useEffect(() => {
    if (!pickupCoords || !dropCoords || !authService.isLoggedIn()) return;

    let cancelled = false;
    Promise.all(
      RIDES.map((ride) =>
        rideService
          .getEstimate({ pickup: pickupCoords, drop: dropCoords, rideType: ride.id })
          .then((quote) => [ride.id, quote.fareEstimate] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const r of results) {
        if (r) next[r[0]] = r[1];
      }
      setFareEstimates(next);
    });

    return () => { cancelled = true; };
  }, [pickupCoords, dropCoords]);

  const stopPolling = () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (acceptTimeoutRef.current) { window.clearTimeout(acceptTimeoutRef.current); acceptTimeoutRef.current = null; }
    if (completeTimeoutRef.current) { window.clearTimeout(completeTimeoutRef.current); completeTimeoutRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const handleConfirmPickup = async () => {
    if (!authService.isLoggedIn()) {
      navigate('/login');
      return;
    }
    setBookingStatus('searching');
    try {
      const { rideId: newRideId } = await rideService.requestRide({
        pickup: pickupCoords ?? PICKUP_COORDS,
        pickupAddress: pickupLocation,
        dropoff: dropCoords ?? DROP_COORDS,
        dropAddress: dropLocation,
        vehicleType: selectedRide,
      });
      setRideId(newRideId);

      // No standalone driver app exists yet; the demo driver "accepts" shortly after
      // via the same real endpoint a driver client would call.
      acceptTimeoutRef.current = window.setTimeout(() => {
        rideService.acceptAsDemoDriver(newRideId).catch(() => {});
      }, 2500);

      pollRef.current = window.setInterval(async () => {
        try {
          const status = await rideService.getStatus(newRideId);
          if (status.status === 'ACCEPTED') {
            stopPolling();
            setDriverDetails(status.driverDetails);
            setBookingStatus('assigned');

            // No standalone driver app exists — the same demo-driver stand-in
            // that "accepted" this ride above also marks it complete after a
            // short simulated trip, so the real rate-ride flow below has
            // something to act on. Real status polling continues underneath
            // in case a real completion event beats this timeout.
            completeTimeoutRef.current = window.setTimeout(() => {
              rideService.completeAsDemoDriver(newRideId).catch(() => {});
            }, 8000);

            pollRef.current = window.setInterval(async () => {
              try {
                const s = await rideService.getStatus(newRideId);
                if (s.status === 'COMPLETED') {
                  stopPolling();
                  setBookingStatus('completed');
                } else if (s.status === 'CANCELLED') {
                  stopPolling();
                  setBookingStatus('selecting');
                }
              } catch {
                // transient poll failure, keep trying
              }
            }, 1500);
          } else if (status.status === 'CANCELLED') {
            stopPolling();
            setBookingStatus('selecting');
          }
        } catch {
          // transient poll failure, keep trying
        }
      }, 1500);
    } catch {
      setBookingStatus('selecting');
    }
  };

  const handleSubmitRating = async () => {
    if (!rideId || rating === 0) return;
    setRatingSubmitting(true);
    try {
      await rideService.rateRide(rideId, { rating, feedback: feedback || undefined });
      setRatingSubmitted(true);
    } catch {
      setRatingSubmitted(true); // don't trap the user on a failed rating — the ride itself is done
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setBookingStatus('selecting');
    setRideId(null);
    setDriverDetails(null);
    setRating(0);
    setFeedback('');
    setRatingSubmitted(false);
  };

  const handleCancelRequest = () => {
    stopPolling();
    if (rideId) rideService.cancelRide(rideId).catch(() => {});
    setBookingStatus('selecting');
    setRideId(null);
    setDriverDetails(null);
    setDriverActionMode(null);
  };

  // Backend never carries a driver name/phone (no columns for it yet — see
  // rideService.ts's DriverDetails comment), so match the app's own demo
  // persona instead of a stock photo implying a real, unrelated person.
  const driverName = driverDetails?.name ?? 'Rakesh Kumar';

  return (
    <div className="cab-booking-container">
      <Navbar theme="blue" />

      {/* Hero Section */}
      <section className={`cab-hero-section ${bookingStatus !== 'selecting' ? 'layout-flipped' : ''}`}>

        {/* Sidebar */}
        <div className="cab-sidebar">

          {/* STATE 1: Selecting Ride */}
          {bookingStatus === 'selecting' && (
            <>
              <div className="sidebar-header">
                <h1>{t('cabBooking.heroTitle')}</h1>
                <p>{t('cabBooking.heroSubtitle')}</p>
              </div>

              <div className="trip-type-tabs">
                <button className={`tab ${activeTab === 'one-way' ? 'active' : ''}`} onClick={() => setActiveTab('one-way')}>{t('cabBooking.tabOneWay')}</button>
                <button className={`tab ${activeTab === 'round-trip' ? 'active' : ''}`} onClick={() => setActiveTab('round-trip')}>{t('cabBooking.tabRoundTrip')}</button>
                <button className={`tab ${activeTab === 'rental' ? 'active' : ''}`} onClick={() => setActiveTab('rental')}>{t('cabBooking.tabRental')}</button>
              </div>

              <div className="location-inputs">
                <div className="input-field pickup-field">
                  <div className="dot-icon green-dot"></div>
                  <div className="field-content">
                    <span className="label">{t('cabBooking.pickupLocationLabel')}</span>
                    <LocationAutocompleteInput
                      value={pickupLocation}
                      onChange={setPickupLocation}
                      onSelect={(s) => { setPickupLocation(s.label); setPickupCoords({ lat: s.lat, lng: s.lng }); }}
                    />
                  </div>
                  <span className="live-badge">{t('cabBooking.liveBadge')}</span>
                </div>

                <div className="input-field drop-field">
                  <div className="dot-icon red-pin"><MapPin size={16} color="#ef4444" /></div>
                  <div className="field-content">
                    <span className="label">{t('cabBooking.dropLocationLabel')}</span>
                    <LocationAutocompleteInput
                      value={dropLocation}
                      onChange={setDropLocation}
                      onSelect={(s) => { setDropLocation(s.label); setDropCoords({ lat: s.lat, lng: s.lng }); }}
                      placeholder={t('cabBooking.dropLocationPlaceholder')}
                    />
                  </div>
                  <Search size={16} className="search-icon" />
                </div>
              </div>

              {activeTab === 'round-trip' && (
                <div className="input-field" style={{ marginTop: '8px' }}>
                  <div className="field-content">
                    <span className="label">{t('cabBooking.returnDateLabel')}</span>
                    <input
                      type="date"
                      value={returnDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setReturnDate(e.target.value)}
                      style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'rental' && (
                <div className="input-field" style={{ marginTop: '8px' }}>
                  <div className="field-content">
                    <span className="label">{t('cabBooking.rentalDurationLabel')}</span>
                    <select
                      value={rentalHours}
                      onChange={(e) => setRentalHours(Number(e.target.value))}
                      style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', width: '100%' }}
                    >
                      {[4, 8, 12].map((h) => (
                        <option key={h} value={h}>{t('cabBooking.rentalHoursOption').replace('{{hours}}', String(h))}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="ride-selection">
                <h4>{t('cabBooking.chooseRideHeading')}</h4>
                <div className="ride-options">
                  {RIDES.map(ride => (
                    <div
                      key={ride.id}
                      className={`ride-card ${selectedRide === ride.id ? 'active' : ''}`}
                      onClick={() => setSelectedRide(ride.id)}
                    >
                      <img src={ride.img} alt={ride.name} />
                      <div className="ride-info">
                        <h5>{t(`cabBooking.rideName${ride.id.charAt(0).toUpperCase()}${ride.id.slice(1)}`)}</h5>
                        <p>{t(`cabBooking.rideDesc${ride.id.charAt(0).toUpperCase()}${ride.id.slice(1)}`)}</p>
                        <div className="ride-eta">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {ride.time}
                        </div>
                      </div>
                      <div className="ride-price">
                        {fareEstimates[ride.id] != null ? `₹${Math.round(fareEstimates[ride.id])}` : ride.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="confirm-pickup-btn" onClick={handleConfirmPickup}>
                {t('cabBooking.confirmPickupButton')}
              </button>
            </>
          )}

          {/* STATE 2: Searching */}
          {bookingStatus === 'searching' && (
            <div className="matching-state">
              <div className="state-top-nav">
                <button className="icon-btn"><MoreVertical size={20} /></button>
              </div>
              <h1 className="state-title">{t('cabBooking.searchingTitle')}</h1>
              <p className="state-desc">{t('cabBooking.searchingDesc')}</p>

              <div className="matching-box">
                <div className="matching-box-header">
                  <h4>{t('cabBooking.matchingStatusHeading')}</h4>
                  <Loader2 size={16} className="blue-icon spin-icon" />
                </div>
                <p className="matching-text">{t('cabBooking.matchingText')}</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '65%' }}></div>
                </div>
                <div className="progress-stats">
                  <span className="located-text">{t('cabBooking.progressLocated')}</span>
                  <span className="wait-text">{t('cabBooking.progressWait')}</span>
                </div>
              </div>

              <div className="matching-actions">
                <button className="outline-btn">{t('cabBooking.helpButton')}</button>
                <button className="outline-btn danger" onClick={handleCancelRequest}>{t('cabBooking.cancelRequestButton')}</button>
              </div>
            </div>
          )}

          {/* STATE 3: Assigned */}
          {bookingStatus === 'assigned' && (
            <div className="assigned-state">
              <div className="assigned-header-top">
                <h1 className="state-title">{t('cabBooking.assignedTitle')}</h1>
                <div className="eta-row">
                  <span className="eta-text">{t('cabBooking.arrivingEta')}</span>
                  <span className="otp-badge">{t('cabBooking.otpBadge')}</span>
                </div>
              </div>

              <div className="driver-card">
                <div className="driver-info-main">
                  <div className="driver-avatar-wrap">
                    <img src={driverDetails?.photoUrl || demoDriverAvatar} alt={driverName} className="driver-avatar" />
                  </div>
                  <div className="driver-details">
                    <h4>{driverName}</h4>
                    <div className="rating"><Star size={12} fill="#eab308" color="#eab308" /> {driverDetails?.rating ?? 4.8}</div>
                  </div>
                  <div className="car-image-mini">
                     <img src={vehicleIconFor(driverDetails?.vehicleType)} alt="Car" />
                     <div className="plate-badge">{driverDetails?.vehicleNumber ?? 'WB 02 AB 1234'}</div>
                  </div>
                </div>
                <p className="car-desc"><strong>{driverDetails?.vehicleType ?? 'Sedan'}</strong></p>
              </div>

              <div className="quick-actions">
                <div className="action-item"><button className="round-btn" onClick={() => setDriverActionMode('call')}><Phone size={22} /></button><span>{t('cabBooking.callAction')}</span></div>
                <div className="action-item"><button className="round-btn" onClick={() => setDriverActionMode('message')}><MessageCircle size={22} /></button><span>{t('cabBooking.messageAction')}</span></div>
                <div className="action-item"><button className="round-btn" onClick={() => setDriverActionMode('share')}><CornerUpRight size={22} /></button><span>{t('cabBooking.shareRideAction')}</span></div>
                <div className="action-item"><button className="round-btn danger-light" onClick={() => setDriverActionMode('safety')}><Shield size={22} color="#ef4444" /></button><span>{t('cabBooking.safetyAction')}</span></div>
              </div>

              <div className="trip-details-timeline">
                <div className="timeline-header">
                  <h4>{t('cabBooking.tripDetailsHeading')}</h4>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowTripDetails((v) => !v); }}>{t('cabBooking.tripDetailsLink')}</a>
                </div>
                <div className="timeline-path">
                   <div className="t-point pickup">
                      <div className="t-dot blue"></div>
                      <div className="t-content">
                        <span className="t-label">{t('cabBooking.pickupTimelineLabel')}</span>
                        <span className="t-val">{pickupLocation}</span>
                      </div>
                   </div>
                   <div className="t-point dropoff">
                      <div className="t-dot gray"></div>
                      <div className="t-content">
                        <span className="t-label">{t('cabBooking.dropOffTimelineLabel')}</span>
                        <span className="t-val">{dropLocation}</span>
                      </div>
                   </div>
                   {showTripDetails && (
                     <div className="t-point fare">
                        <div className="t-dot gray"></div>
                        <div className="t-content">
                          <span className="t-label">{t('cabBooking.fareTimelineLabel')}</span>
                          <span className="t-val">
                            {fareEstimates[selectedRide] != null
                              ? `₹${Math.round(fareEstimates[selectedRide])}`
                              : RIDES.find((r) => r.id === selectedRide)?.price}
                          </span>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <button className="cancel-request-full-btn" onClick={handleCancelRequest}>{t('cabBooking.cancelRequestButton')}</button>
            </div>
          )}

          {bookingStatus === 'completed' && (
            <div className="assigned-state">
              <h1 className="state-title">Trip Completed</h1>

              {!ratingSubmitted ? (
                <div className="driver-card" style={{ textAlign: 'center' }}>
                  <div className="driver-avatar-wrap" style={{ margin: '0 auto 12px' }}>
                    <img src={driverDetails?.photoUrl || demoDriverAvatar} alt={driverName} className="driver-avatar" />
                  </div>
                  <h4>{driverName}</h4>
                  <p style={{ color: '#64748b', margin: '4px 0 16px' }}>How was your ride?</p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setRatingHover(n)}
                        onMouseLeave={() => setRatingHover(0)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        <Star size={32} fill={n <= (ratingHover || rating) ? '#eab308' : 'none'} color="#eab308" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional feedback for the driver"
                    rows={3}
                    style={{ width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '10px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '12px' }}
                  />

                  <button
                    className="cancel-request-full-btn"
                    style={{ background: '#0052ff', color: '#fff' }}
                    onClick={handleSubmitRating}
                    disabled={rating === 0 || ratingSubmitting}
                  >
                    {ratingSubmitting ? 'Submitting…' : 'Submit Rating'}
                  </button>
                </div>
              ) : (
                <div className="driver-card" style={{ textAlign: 'center' }}>
                  <p style={{ color: '#16a34a', fontWeight: 700, marginBottom: '16px' }}>Thanks for your feedback!</p>
                  <button className="cancel-request-full-btn" style={{ background: '#0052ff', color: '#fff' }} onClick={handleBookAnother}>
                    Book Another Ride
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Map Area */}
        <div className="cab-map-area">
          <CabMap
            pickupAddress={pickupLocation}
            dropAddress={dropLocation}
            onPickupCoords={setPickupCoords}
            onDropCoords={setDropCoords}
          />

          {/* ETA badge for searching/assigned states — the real map (pickup/drop pins,
              route) now comes from CabMap itself; this is just an informational
              overlay, not a stand-in for markers the map already draws. */}
          {(bookingStatus === 'searching' || bookingStatus === 'assigned') && (
            <div className="eta-floating-badge">
              {t('cabBooking.etaFloatingBubble')} {t('cabBooking.etaFloatingBubbleAway')}
            </div>
          )}
        </div>
      </section>

      {/* Outstation Trips Section */}
      <section className="outstation-section">
        <div className="section-header">
          <h2>{t('cabBooking.outstationSectionTitle')}</h2>
          <div className="carousel-nav">
            <button><ChevronLeft size={20} /></button>
            <button><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="outstation-grid">
          {OUTSTATION_TRIPS.map(trip => (
            <div key={trip.id} className="outstation-card">
              <img src={trip.img} alt={trip.title} />
              <div className="outstation-details">
                <h4>{trip.title}</h4>
                <div className="outstation-price">
                  <span>{t('cabBooking.outstationStartingFrom')}</span>
                  <strong>{trip.price}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2>{t('cabBooking.faqSectionTitle')}</h2>
        <div className="faq-list">
          {FAQS.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                {t(faq.questionKey)}
                {activeFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {activeFaq === index && (
                <div className="faq-answer">
                  {t(faq.answerKey)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <Footer />

      <DriverActionModals
        mode={driverActionMode}
        driverName={driverName}
        driverAvatar={driverDetails?.photoUrl || demoDriverAvatar}
        pickupLocation={pickupLocation}
        onClose={() => setDriverActionMode(null)}
      />
    </div>
  );
};

export default CabBooking;
