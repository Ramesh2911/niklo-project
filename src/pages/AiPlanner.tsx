import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Users, ArrowRight, Zap, Bell, Download, Share2, Trash2, Bookmark
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { aiPlannerService, type PlanLocation, type SavedJourney } from '../lib/aiPlannerService';
import headerIllustration from '../assets/ai_journey.png';
import './AiPlanner.css';

const AiPlanner: React.FC = () => {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [from, setFrom] = useState('Kolkata');
  const [fromStation, setFromStation] = useState('Capilmoda');
  const [fromLoc, setFromLoc] = useState<PlanLocation>({ name: 'Kolkata', latitude: 22.5726, longitude: 88.3639 });

  const [to, setTo] = useState('Gangtok');
  const [toStation, setToStation] = useState('Tenzing Norgay Bus Stand');
  const [toLoc, setToLoc] = useState<PlanLocation>({ name: 'Gangtok', latitude: 27.3389, longitude: 88.6065 });

  const [date, setDate] = useState('2024-05-22');
  const [passengers, setPassengers] = useState('2 Passenger');

  const [showPassengerPicker, setShowPassengerPicker] = useState(false);
  const [passengersCount, setPassengersCount] = useState(2);
  const [toolMessage, setToolMessage] = useState('');
  const [planning, setPlanning] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    aiPlannerService.getAlerts().then((a) => setAlertsEnabled(a.departure_reminder)).catch(() => {});
    aiPlannerService.getSavedJourneys().then(setSavedJourneys).catch(() => {});
  }, [isLoggedIn]);

  const formatDisplayDate = (value: string): string => {
    if (!value) return 'Select date';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ISO date -> "2024-05-22"; falls back to tomorrow if unparseable.
  const travelDateIso = (): string => {
    const parsed = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  };

  const handlePlanJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanning(true);
    setToolMessage('');
    try {
      const plan = await aiPlannerService.planJourney({
        source_location: fromLoc,
        destination_location: toLoc,
        travel_date: travelDateIso(),
        passengers_count: passengersCount,
      });
      const params = new URLSearchParams({
        from, fromStation, to, toStation, date: formatDisplayDate(date), passengers: String(passengersCount),
      });
      navigate(`/ai-planner/search?${params}`, { state: { aiPlan: plan } });
    } catch {
      // AI planning service unreachable — the plain bus search below still works.
      const params = new URLSearchParams({
        from, fromStation, to, toStation, date: formatDisplayDate(date), passengers: String(passengersCount),
      });
      navigate(`/ai-planner/search?${params}`);
    } finally {
      setPlanning(false);
    }
  };

  const handleSmartSchedule = async () => {
    try {
      const res = await aiPlannerService.optimizeSchedule({
        origin: from,
        destination: to,
        scheduled_departure: `${travelDateIso()}T09:00:00Z`,
      });
      const depTime = new Date(res.recommended_departure).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      setToolMessage(`${t('aiTools.optimizedDeparture').replace('{{from}}', from).replace('{{to}}', to).replace('{{date}}', depTime)} ${res.reasoning}`);
    } catch {
      setToolMessage(t('aiTools.optimizedDeparture').replace('{{from}}', from).replace('{{to}}', to).replace('{{date}}', date));
    }
  };

  const handleJourneyAlerts = async () => {
    if (!isLoggedIn) {
      setToolMessage('Sign in to enable persistent trip alerts.');
      return;
    }
    try {
      const updated = await aiPlannerService.updateAlerts({ departure_reminder: !alertsEnabled });
      setAlertsEnabled(updated.departure_reminder);
      setToolMessage(updated.departure_reminder
        ? t('aiTools.alertsEnabledRoute').replace('{{from}}', from).replace('{{to}}', to)
        : 'Trip alerts turned off.');
    } catch {
      setToolMessage(t('aiTools.enableNotificationPermission'));
      return;
    }
    if (alertsEnabled) return; // just turned off — no need to also prompt for browser notifications
    if ('Notification' in window) {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(t('aiTools.notificationTitle'), {
          body: t('aiTools.notificationBodyRoute').replace('{{from}}', from).replace('{{to}}', to).replace('{{date}}', date),
        });
      }
    }
  };

  const handleDeleteSavedJourney = async (id: string) => {
    setSavedJourneys((prev) => prev.filter((j) => j.id !== id));
    await aiPlannerService.deleteSavedJourney(id).catch(() => {
      aiPlannerService.getSavedJourneys().then(setSavedJourneys).catch(() => {});
    });
  };

  const handleOfflineItinerary = () => {
    const itinerary = {
      from, fromStation, to, toStation, date, passengers: passengersCount,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(itinerary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `niklo-itinerary-${from}-${to}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToolMessage(t('aiTools.itineraryDownloaded'));
  };

  const handleJourneySharing = async () => {
    const summary = t('aiTools.summaryRoute')
      .replace('{{from}}', from).replace('{{to}}', to).replace('{{date}}', formatDisplayDate(date))
      .replace('{{count}}', String(passengersCount)).replace('{{plural}}', passengersCount > 1 ? 's' : '');
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

  return (
    <div className="ap-page-wrapper" onClick={() => { setShowPassengerPicker(false); }}>
      <Navbar theme="blue" />

      {/* 1. Large Blue Banner Section */}
      <section className="ap-hero">
        <div className="ap-hero-container">
          <div className="ap-hero-left">
            <h1>{lang === 'English' ? (<>Plan smart multi-leg<br />journeys across cities</>) : t('aiPlanner.heroh1')}</h1>
            <p>{t('aiPlanner.heroSubtitle')}</p>
          </div>

          <div className="ap-hero-right">
            <img src={headerIllustration} alt={t('aiPlanner.heroIllustrationAlt')} className="ap-hero-graphic" />
          </div>
        </div>

        {/* Floating Search Bar */}
        <div className="ap-search-container" onClick={e => e.stopPropagation()}>
          <form className="ap-search-bar" onSubmit={handlePlanJourney}>
            <div className="ap-search-field">
              <label>{t('aiPlanner.fieldFromLabel')}</label>
              <div className="ap-input-row">
                <MapPin size={16} className="ap-icon" />
                <div className="ap-input-col">
                  <LocationAutocompleteInput
                    value={from}
                    onChange={setFrom}
                    onSelect={(s) => { const name = s.label.split(',')[0]; setFrom(name); setFromLoc({ name, latitude: s.lat, longitude: s.lng }); }}
                    inputClassName="ap-field-input-main"
                    required
                  />
                  <input type="text" value={fromStation} onChange={e => setFromStation(e.target.value)} className="ap-field-input-sub" />
                </div>
              </div>
            </div>

            <div className="ap-search-field">
              <label>{t('aiPlanner.fieldToLabel')}</label>
              <div className="ap-input-row">
                <ArrowRight size={16} className="ap-icon" />
                <div className="ap-input-col">
                  <LocationAutocompleteInput
                    value={to}
                    onChange={setTo}
                    onSelect={(s) => { const name = s.label.split(',')[0]; setTo(name); setToLoc({ name, latitude: s.lat, longitude: s.lng }); }}
                    inputClassName="ap-field-input-main"
                    required
                  />
                  <input type="text" value={toStation} onChange={e => setToStation(e.target.value)} className="ap-field-input-sub" />
                </div>
              </div>
            </div>

            <div className="ap-search-field relative" onClick={() => { setShowPassengerPicker(false); }}>
              <label>{t('aiPlanner.fieldDateLabel')}</label>
              <div className="ap-input-row">
                <Calendar size={16} className="ap-icon" />
                <div className="ap-input-col">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="ap-field-input-main"
                    aria-label={t('aiPlanner.fieldDateLabel')}
                    style={{ minWidth: 0, width: '100%', border: 'none', background: 'transparent', color: '#0f172a', outline: 'none' }}
                  />
                  <span className="ap-field-val-sub">{t('aiPlanner.fieldDateSubVal')}</span>
                </div>
              </div>
            </div>

            <div className="ap-search-field relative" onClick={() => { setShowPassengerPicker(!showPassengerPicker); }}>
              <label>{t('aiPlanner.fieldPassengersLabel')}</label>
              <div className="ap-input-row">
                <Users size={16} className="ap-icon" />
                <div className="ap-input-col">
                  <span className="ap-field-val-main">{passengers}</span>
                  <span className="ap-field-val-sub">{t('aiPlanner.fieldPassengersSubVal')}</span>
                </div>
              </div>

              {showPassengerPicker && (
                <div className="custom-guest-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('aiPlanner.passengerPickerLabel')}</span></div>
                    <div className="guest-controls">
                      <button type="button" onClick={() => { setPassengersCount(Math.max(1, passengersCount - 1)); setPassengers(`${Math.max(1, passengersCount - 1)} Passenger`); }}>-</button>
                      <span>{passengersCount}</span>
                      <button type="button" onClick={() => { setPassengersCount(passengersCount + 1); setPassengers(`${passengersCount + 1} Passenger`); }}>+</button>
                    </div>
                  </div>
                  <button type="button" className="guest-done-btn" onClick={() => setShowPassengerPicker(false)}>{t('aiPlanner.passengerPickerDone')}</button>
                </div>
              )}
            </div>

            <button type="submit" className="ap-search-btn" disabled={planning}>
              {planning ? 'Planning…' : t('aiPlanner.searchBtn')}
            </button>
          </form>
        </div>
      </section>

      {/* Main Container */}
      <main className="ap-main">
        <div className="ap-container">
          
          {/* 2. Travel Tools & Features */}
          <section className="ap-section">
            <div className="ap-section-header">
              <h2>{t('aiPlanner.travelToolsHeading')}</h2>
              <p>{t('aiPlanner.travelToolsSubtitle')}</p>
            </div>

            <div className="ap-features-grid">
              <div className="ap-feature-card" role="button" tabIndex={0} onClick={handleSmartSchedule} onKeyDown={e => e.key === 'Enter' && handleSmartSchedule()}>
                <div className="ap-feat-icon-box blue">
                  <Zap size={18} />
                </div>
                <h3>{t('aiPlanner.featureOptimizerTitle')}</h3>
                <p>{t('aiPlanner.featureOptimizerDesc')}</p>
              </div>

              <div className="ap-feature-card" role="button" tabIndex={0} onClick={handleJourneyAlerts} onKeyDown={e => e.key === 'Enter' && handleJourneyAlerts()}>
                <div className="ap-feat-icon-box green">
                  <Bell size={18} />
                </div>
                <h3>{t('aiPlanner.featureAlertsTitle')}{alertsEnabled ? ' ✓' : ''}</h3>
                <p>{t('aiPlanner.featureAlertsDesc')}</p>
              </div>

              <div className="ap-feature-card" role="button" tabIndex={0} onClick={handleOfflineItinerary} onKeyDown={e => e.key === 'Enter' && handleOfflineItinerary()}>
                <div className="ap-feat-icon-box purple">
                  <Download size={18} />
                </div>
                <h3>{t('aiPlanner.featureOfflineTitle')}</h3>
                <p>{t('aiPlanner.featureOfflineDesc')}</p>
              </div>

              <div className="ap-feature-card" role="button" tabIndex={0} onClick={handleJourneySharing} onKeyDown={e => e.key === 'Enter' && handleJourneySharing()}>
                <div className="ap-feat-icon-box orange">
                  <Share2 size={18} />
                </div>
                <h3>{t('aiPlanner.featureSharingTitle')}</h3>
                <p>{t('aiPlanner.featureSharingDesc')}</p>
              </div>
            </div>

            {toolMessage && <p className="ap-tool-message">{toolMessage}</p>}
          </section>

          {isLoggedIn && savedJourneys.length > 0 && (
            <section className="ap-section">
              <div className="ap-section-header">
                <h2>Saved Journeys</h2>
                <p>Journeys you've bookmarked from AI trip plans</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {savedJourneys.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Bookmark size={16} color="#0052ff" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{j.source_name} → {j.destination_name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{j.title} · {j.total_duration} · ₹{j.total_fare.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove saved journey"
                      onClick={() => handleDeleteSavedJourney(j.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AiPlanner;
