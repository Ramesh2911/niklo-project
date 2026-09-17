import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Bus as BusIcon, Car, Clock, Calendar,
  Bell, Download, Share2, Wallet
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SeatSelectionModal from '../components/SeatSelectionModal';
import type { BusSchedule } from '../lib/busService';
import { aiPlannerService, type JourneyOption } from '../lib/aiPlannerService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './AiPlannerDetails.css';

interface DetailsState {
  bus?: BusSchedule;
  date?: string;
  aiJourney?: JourneyOption;
  searchId?: string;
}

const LEG_ICON: Record<string, React.ReactNode> = {
  CAB: <Car size={18} />,
  BUS: <BusIcon size={18} />,
  TRANSFER: <MapPin size={18} />,
};

const AiPlannerDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { isLoggedIn } = useAuth();
  const state = location.state as DetailsState | null;
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [toolMessage, setToolMessage] = useState('');

  if (!state?.bus && !state?.aiJourney) {
    return (
      <div className="ad-page-wrapper">
        <Navbar theme="blue" />
        <main className="ad-main">
          <div className="ad-container">
            <div className="ad-empty-state">
              <h2>{t('aiPlannerDetails.noJourneySelectedHeading')}</h2>
              <p>{t('aiPlannerDetails.noJourneySelectedBody')}</p>
              <button className="ad-btn-book" onClick={() => navigate('/ai-planner/search')}>{t('aiPlannerDetails.backToSearch')}</button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (state.aiJourney) {
    return <AiJourneyBreakdown journey={state.aiJourney} searchId={state.searchId} />;
  }

  const bus = state.bus!;
  const date = state.date;
  const journeyLabel = `${bus.depLoc} to ${bus.arrLoc}`;

  const handleSmartSchedule = async () => {
    try {
      const res = await aiPlannerService.optimizeSchedule({
        origin: bus.depLoc,
        destination: bus.arrLoc,
        scheduled_departure: new Date().toISOString(),
      });
      setToolMessage(`${t('aiTools.optimizedBoard').replace('{{bus}}', bus.name).replace('{{time}}', bus.depTime).replace('{{journey}}', journeyLabel)} ${res.reasoning}`);
    } catch {
      setToolMessage(t('aiTools.optimizedBoard').replace('{{bus}}', bus.name).replace('{{time}}', bus.depTime).replace('{{journey}}', journeyLabel));
    }
  };

  const handleJourneyAlerts = async () => {
    if (!isLoggedIn) {
      setToolMessage('Sign in to enable persistent trip alerts.');
      return;
    }
    try {
      await aiPlannerService.updateAlerts({ departure_reminder: true });
    } catch {
      setToolMessage(t('aiTools.enableNotificationPermission'));
      return;
    }
    setToolMessage(t('aiTools.alertsEnabledJourney').replace('{{journey}}', journeyLabel));
    if ('Notification' in window) {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(t('aiTools.notificationTitle'), {
          body: t('aiTools.notificationBodyBus').replace('{{bus}}', bus.name).replace('{{from}}', bus.depLoc).replace('{{time}}', bus.depTime),
        });
      }
    }
  };

  const handleOfflineItinerary = () => {
    const itinerary = { ...bus, date, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(itinerary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `niklo-itinerary-${bus.depLoc}-${bus.arrLoc}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToolMessage(t('aiTools.itineraryDownloaded'));
  };

  const handleJourneySharing = async () => {
    const summary = t('aiTools.summaryJourney')
      .replace('{{journey}}', journeyLabel).replace('{{bus}}', bus.name).replace('{{time}}', bus.depTime)
      .replace('{{dateSuffix}}', date ? ` on ${date}` : '');
    if (navigator.share) {
      try {
        await navigator.share({ title: t('aiTools.shareTitle'), text: summary });
        setToolMessage(t('aiTools.journeyShared'));
      } catch {
        // user cancelled the native share sheet — not an error
      }
      return;
    }
    await navigator.clipboard.writeText(summary);
    setToolMessage(t('aiTools.copiedToClipboard'));
  };

  const handleBudgetTracker = () => {
    setToolMessage(t('aiTools.estimatedCost').replace('{{price}}', bus.price.toLocaleString('en-IN')).replace('{{bus}}', bus.name));
  };

  return (
    <div className="ad-page-wrapper">
      <Navbar theme="blue" />

      <main className="ad-main">
        <div className="ad-container">

          {/* Header breadcrumb & info */}
          <div className="ad-header-row">
            <button className="ad-back-link" onClick={() => navigate('/ai-planner/search')}>
              <ArrowLeft size={14} />
              <span>{t('aiPlannerDetails.backToRecommendations')}</span>
            </button>
            <div className="ad-title-wrap">
              <h1>{bus.depLoc} to {bus.arrLoc}</h1>
              <span className="ad-badge-fastest">{bus.type}</span>
            </div>
            <p className="ad-subtitle">{bus.operator} • {bus.duration}{date ? ` • ${date}` : ''}</p>
          </div>

          {/* Journey Breakdown Card */}
          <div className="ad-breakdown-card">
            <h2>{t('aiPlannerDetails.journeyBreakdownHeading')}</h2>

            <div className="ad-timeline-list">

              {/* Point 1: origin */}
              <div className="ad-timeline-row">
                <div className="ad-timeline-icon green">
                  <MapPin size={18} />
                </div>
                <div className="ad-timeline-body">
                  <h3>{bus.depLoc}</h3>
                  <p>{t('aiPlannerDetails.departureDot')} • {bus.depTime}</p>
                </div>
              </div>

              <div className="ad-timeline-line"></div>

              {/* Segment: the real bus leg */}
              <div className="ad-timeline-row action">
                <div className="ad-timeline-icon blue">
                  <BusIcon size={18} />
                </div>
                <div className="ad-timeline-body flex-row">
                  <div className="ad-body-info">
                    <h3>{bus.name}</h3>
                    <span className="ad-duration">
                      <Clock size={12} />
                      <span>{bus.duration}</span>
                    </span>
                  </div>
                  <div className="ad-body-actions">
                    <span className="ad-approx-price">{t('aiPlannerDetails.startingFrom')} ₹{bus.price.toLocaleString('en-IN')}</span>
                    <button className="ad-btn-book" onClick={() => setShowSeatModal(true)}>{t('aiPlannerDetails.bookBus')}</button>
                  </div>
                </div>
              </div>

              <div className="ad-timeline-line"></div>

              {/* Point 2: destination */}
              <div className="ad-timeline-row">
                <div className="ad-timeline-icon dark-blue">
                  <MapPin size={18} />
                </div>
                <div className="ad-timeline-body">
                  <h3>{bus.arrLoc}</h3>
                  <p>{t('aiPlannerDetails.arrivalDot')} • {bus.arrTime}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Travel Tools & Features */}
          <section className="ad-tools-section">
            <h2>{t('aiPlannerDetails.travelToolsHeading')}</h2>
            <div className="ad-tools-grid">

              <div className="ad-tool-card" role="button" tabIndex={0} onClick={handleSmartSchedule} onKeyDown={e => e.key === 'Enter' && handleSmartSchedule()}>
                <div className="ad-tool-icon-box blue">
                  <Calendar size={18} />
                </div>
                <span>{t('aiPlannerDetails.scheduleOptimizer')}</span>
              </div>

              <div className="ad-tool-card" role="button" tabIndex={0} onClick={handleJourneyAlerts} onKeyDown={e => e.key === 'Enter' && handleJourneyAlerts()}>
                <div className="ad-tool-icon-box green">
                  <Bell size={18} />
                </div>
                <span>{t('aiPlannerDetails.journeyAlerts')}</span>
              </div>

              <div className="ad-tool-card" role="button" tabIndex={0} onClick={handleOfflineItinerary} onKeyDown={e => e.key === 'Enter' && handleOfflineItinerary()}>
                <div className="ad-tool-icon-box purple">
                  <Download size={18} />
                </div>
                <span>{t('aiPlannerDetails.offlineItinerary')}</span>
              </div>

              <div className="ad-tool-card" role="button" tabIndex={0} onClick={handleJourneySharing} onKeyDown={e => e.key === 'Enter' && handleJourneySharing()}>
                <div className="ad-tool-icon-box orange">
                  <Share2 size={18} />
                </div>
                <span>{t('aiPlannerDetails.journeySharing')}</span>
              </div>

              <div className="ad-tool-card" role="button" tabIndex={0} onClick={handleBudgetTracker} onKeyDown={e => e.key === 'Enter' && handleBudgetTracker()}>
                <div className="ad-tool-icon-box light-blue">
                  <Wallet size={18} />
                </div>
                <span>{t('aiPlannerDetails.budgetTracker')}</span>
              </div>

            </div>
            {toolMessage && <p className="ap-tool-message">{toolMessage}</p>}
          </section>

        </div>
      </main>

      <Footer />

      {showSeatModal && (
        <SeatSelectionModal bus={bus} onClose={() => setShowSeatModal(false)} />
      )}
    </div>
  );
};

const fmtTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const AiJourneyBreakdown: React.FC<{ journey: JourneyOption; searchId?: string }> = ({ journey, searchId }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, isLoggedIn } = useAuth();
  const [passengerCount, setPassengerCount] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const handleBook = async () => {
    if (!isLoggedIn || !user) {
      setBookingError('Sign in to book this journey.');
      return;
    }
    if (!searchId) {
      setBookingError('This journey search has expired — plan it again.');
      return;
    }
    setBookingError('');
    setIsBooking(true);
    try {
      const passengers = Array.from({ length: passengerCount }, (_, i) => ({
        name: passengerCount > 1 ? `${user.name || 'Traveller'} ${i + 1}` : (user.name || 'Traveller'),
      }));
      const busLeg = journey.legs.find((l) => l.mode === 'BUS');
      const result = await aiPlannerService.bookMultiModal({
        search_id: searchId,
        journey_id: journey.journey_id,
        passengers,
        selected_bus_seats: busLeg?.available_seats,
        contact_email: user.email,
        contact_phone: user.phone,
      });
      // ai-planner-service's checkout_order carries a fake razorpay_order_id
      // (this endpoint is fully mocked server-side — see app.service.ts
      // bookMultiModal) that was never registered with Razorpay, so opening
      // the real Razorpay widget against it would just fail. The booking
      // reference itself is real (persisted), so that's what carries forward.
      navigate('/booking-success', {
        state: {
          type: 'package',
          packageName: journey.title,
          bookingId: result.master_booking_id,
          amount: result.total_amount.toLocaleString('en-IN'),
          travellers: passengers,
        },
      });
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed — try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="ad-page-wrapper">
      <Navbar theme="blue" />
      <main className="ad-main">
        <div className="ad-container">
          <div className="ad-header-row">
            <button className="ad-back-link" onClick={() => navigate('/ai-planner/search')}>
              <ArrowLeft size={14} />
              <span>{t('aiPlannerDetails.backToRecommendations')}</span>
            </button>
            <div className="ad-title-wrap">
              <h1>{journey.title}</h1>
              <span className="ad-badge-fastest">{journey.badge_label}</span>
            </div>
            <p className="ad-subtitle">{journey.total_duration} • {journey.total_transfers} transfer{journey.total_transfers !== 1 ? 's' : ''} • ₹{journey.total_fare.toLocaleString('en-IN')} total</p>
          </div>

          <div className="ad-breakdown-card">
            <h2>{t('aiPlannerDetails.journeyBreakdownHeading')}</h2>
            <div className="ad-timeline-list">
              {journey.legs.map((leg, idx) => (
                <React.Fragment key={leg.leg_index}>
                  <div className={`ad-timeline-row ${leg.mode !== 'TRANSFER' ? 'action' : ''}`}>
                    <div className={`ad-timeline-icon ${leg.mode === 'BUS' ? 'blue' : leg.mode === 'CAB' ? 'green' : 'dark-blue'}`}>
                      {LEG_ICON[leg.mode] ?? <MapPin size={18} />}
                    </div>
                    <div className="ad-timeline-body flex-row">
                      <div className="ad-body-info">
                        <h3>{leg.mode_label}</h3>
                        <p>
                          {leg.origin && leg.destination ? `${leg.origin} → ${leg.destination}` : leg.location}
                          {leg.instruction ? ` — ${leg.instruction}` : ''}
                        </p>
                        <span className="ad-duration">
                          <Clock size={12} />
                          <span>{leg.duration}{leg.departure_time ? ` · departs ${fmtTime(leg.departure_time)}` : ''}</span>
                        </span>
                      </div>
                      {leg.estimated_fare !== undefined && (
                        <div className="ad-body-actions">
                          <span className="ad-approx-price">₹{leg.estimated_fare.toLocaleString('en-IN')}{leg.service_provider ? ` · ${leg.service_provider}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {idx < journey.legs.length - 1 && <div className="ad-timeline-line"></div>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <section className="ad-tools-section">
            <h2>Book This Journey</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '12px 0 20px' }}>
              <span style={{ color: '#475569', fontWeight: 600 }}>Passengers</span>
              <div className="counter-controls">
                <button type="button" onClick={() => setPassengerCount((n) => Math.max(1, n - 1))}>-</button>
                <span>{passengerCount}</span>
                <button type="button" onClick={() => setPassengerCount((n) => n + 1)}>+</button>
              </div>
              <strong style={{ marginLeft: 'auto', color: '#0f172a' }}>₹{(journey.fare_per_passenger * passengerCount).toLocaleString('en-IN')}</strong>
            </div>
            {bookingError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>{bookingError}</p>}
            <button className="ad-btn-book" onClick={handleBook} disabled={isBooking}>
              {isBooking ? 'Booking…' : 'Book Now'}
            </button>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AiPlannerDetails;
