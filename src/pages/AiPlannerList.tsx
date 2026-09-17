import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Calendar, Compass, RefreshCw, Bus, Zap, Info, Filter, X, Bookmark, ArrowRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SeatSelectionModal from '../components/SeatSelectionModal';
import { busService, type BusSchedule } from '../lib/busService';
import { aiPlannerService, type PlanJourneyResult, type JourneyOption } from '../lib/aiPlannerService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './AiPlannerList.css';

// The "AI Suggested Journeys" row below (when present) comes from a real
// plan-journey call made on the previous screen (see AiPlanner.tsx) — that
// backend currently returns the same 2 canned multi-leg options regardless of
// route (ai-planner-service app.service.ts), but save/book on top of it are
// genuine per-user DB writes and a real Razorpay order. The rest of this page
// (bus search + "Recommended" cheapest/fastest cards) is unchanged real
// bus-service data.

const parseDurationMins = (d: string): number => {
  const h = parseInt(d) || 0;
  const m = parseInt(d.split(' ')[1]) || 0;
  return h * 60 + m;
};

const to24Hour = (depTime: string): number => {
  const [h] = depTime.split(':').map(Number);
  const isPM = depTime.includes('PM');
  if (isPM) return h === 12 ? 12 : h + 12;
  return h === 12 ? 0 : h;
};

const TIME_SLOTS: Record<string, (hour: number) => boolean> = {
  'Early Morning': (h) => h >= 4 && h < 8,
  'Morning': (h) => h >= 8 && h < 12,
  'Afternoon': (h) => h >= 12 && h < 17,
  'Evening': (h) => h >= 17,
};

const AiPlannerList: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();

  const [from, setFrom] = useState(searchParams.get('from') || 'Kolkata');
  const [to, setTo] = useState(searchParams.get('to') || 'Gangtok');
  const [date, setDate] = useState(searchParams.get('date') || '22 May 2024');

  const aiPlan = (location.state as { aiPlan?: PlanJourneyResult } | null)?.aiPlan ?? null;
  const [savedJourneyIds, setSavedJourneyIds] = useState<Set<string>>(new Set());

  const handleSaveJourney = async (option: JourneyOption) => {
    if (!isLoggedIn || !aiPlan) return;
    try {
      await aiPlannerService.saveJourney(aiPlan.search_id, option.journey_id);
      setSavedJourneyIds((prev) => new Set(prev).add(option.journey_id));
    } catch {
      // best-effort — leave the bookmark unfilled if the save fails
    }
  };

  const [allBuses, setAllBuses] = useState<BusSchedule[]>([]);
  const [busesLoading, setBusesLoading] = useState(true);
  const [busesError, setBusesError] = useState<string | null>(null);
  const [selectedBusForSeats, setSelectedBusForSeats] = useState<BusSchedule | null>(null);
  // Mobile only: sidebar is hidden behind this toggle and opens as a full-screen
  // drawer (see .al-sidebar-open / .al-sidebar-backdrop in AiPlannerList.css) -
  // on desktop/tablet the sidebar always renders regardless of this flag.
  const [showFilters, setShowFilters] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [sortBy, setSortBy] = useState('Price: Low to High');
  const [allResultsLoaded, setAllResultsLoaded] = useState(false);

  const fetchBuses = useCallback(async () => {
    setBusesLoading(true);
    setBusesError(null);
    try {
      const results = await busService.searchSchedules(from, to, date);
      setAllBuses(results);
    } catch {
      setAllBuses([]);
      setBusesError(t('aiPlannerList.errorLoadFailed'));
    } finally {
      setBusesLoading(false);
    }
  }, [from, to, date]);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBuses();
  };

  // Real counts derived from the actual search results, not fabricated numbers.
  const typeCounts = {
    AC: allBuses.filter(b => b.category === 'AC').length,
    'Non-AC': allBuses.filter(b => b.category === 'Non-AC').length,
    Sleeper: allBuses.filter(b => b.isSleeper).length,
    Seater: allBuses.filter(b => !b.isSleeper).length,
  };

  let filteredBuses = allBuses;
  if (selectedTypes.length > 0) {
    filteredBuses = filteredBuses.filter(b => selectedTypes.some(t => {
      if (t === 'AC') return b.category === 'AC';
      if (t === 'Non-AC') return b.category === 'Non-AC';
      if (t === 'Sleeper') return b.isSleeper;
      if (t === 'Seater') return !b.isSleeper;
      return true;
    }));
  }
  if (selectedTime) {
    const inSlot = TIME_SLOTS[selectedTime];
    filteredBuses = filteredBuses.filter(b => inSlot(to24Hour(b.depTime)));
  }
  filteredBuses = [...filteredBuses].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price;
    if (sortBy === 'Price: High to Low') return b.price - a.price;
    return parseDurationMins(a.duration) - parseDurationMins(b.duration);
  });

  const cheapest = allBuses.length
    ? allBuses.reduce((min, b) => (b.price < min.price ? b : min), allBuses[0])
    : null;
  const fastest = allBuses.length
    ? allBuses.reduce((min, b) => (parseDurationMins(b.duration) < parseDurationMins(min.duration) ? b : min), allBuses[0])
    : null;

  const priceRange = allBuses.length
    ? { min: Math.min(...allBuses.map(b => b.price)), max: Math.max(...allBuses.map(b => b.price)) }
    : null;

  const timeSlotLabels: Record<string, string> = {
    'Early Morning': t('aiPlannerList.timeSlotEarlyMorning'),
    'Morning': t('aiPlannerList.timeSlotMorning'),
    'Afternoon': t('aiPlannerList.timeSlotAfternoon'),
    'Evening': t('aiPlannerList.timeSlotEvening'),
  };

  return (
    <div className="al-page-wrapper">
      <Navbar theme="blue" />

      {/* Top Search bar block */}
      <div className="al-search-header-bar">
        <form className="al-search-bar-container" onSubmit={handleSearch}>
          <div className="al-search-field">
            <label>{t('aiPlannerList.labelFrom')}</label>
            <div className="al-input-row">
              <MapPin size={16} className="al-icon" />
              <input type="text" value={from} onChange={e => setFrom(e.target.value)} className="al-search-input" />
            </div>
          </div>

          <button type="button" className="al-swap-btn" onClick={handleSwap}>
            <RefreshCw size={14} />
          </button>

          <div className="al-search-field">
            <label>{t('aiPlannerList.labelTo')}</label>
            <div className="al-input-row">
              <Compass size={16} className="al-icon" />
              <input type="text" value={to} onChange={e => setTo(e.target.value)} className="al-search-input" />
            </div>
          </div>

          <div className="al-search-field">
            <label>{t('aiPlannerList.labelDeparture')}</label>
            <div className="al-input-row">
              <Calendar size={16} className="al-icon" />
              <input type="text" value={date} onChange={e => setDate(e.target.value)} className="al-search-input" />
            </div>
          </div>

          <button type="submit" className="al-search-submit-btn">{t('aiPlannerList.buttonSearch')}</button>
        </form>
      </div>

      {/* Main content layout */}
      <main className="al-main">
        <div className="al-container">

          {/* Left Sidebar Filters - hidden behind the "Filters" toggle on mobile,
              always visible on desktop/tablet (see .al-sidebar rules in AiPlannerList.css) */}
          {showFilters && <div className="al-sidebar-backdrop" onClick={() => setShowFilters(false)} />}
          <aside className={`al-sidebar${showFilters ? ' al-sidebar-open' : ''}`}>
            <div className="al-sidebar-mobile-header">
              <h2>{t('aiPlannerList.sidebarHeadingFilters')}</h2>
              <button type="button" className="al-sidebar-close" aria-label="Close filters" onClick={() => setShowFilters(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="al-sidebar-header">
              <h2>{t('aiPlannerList.sidebarHeadingFilters')}</h2>
              <button className="al-clear-btn" onClick={() => { setSelectedTypes([]); setSelectedTime(''); }}>{t('aiPlannerList.buttonClearAll')}</button>
            </div>

            {/* Price range — real min/max from the current results */}
            <div className="al-filter-group">
              <h3>{t('aiPlannerList.filterHeadingPriceRange')}</h3>
              <div className="al-slider-wrap">
                <div className="al-slider-line"></div>
                <div className="al-slider-labels">
                  <span>{priceRange ? `₹${priceRange.min.toLocaleString('en-IN')}` : '—'}</span>
                  <span>{priceRange ? `₹${priceRange.max.toLocaleString('en-IN')}` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Bus type checkboxes — real categories from busService */}
            <div className="al-filter-group">
              <h3>{t('aiPlannerList.filterHeadingBusType')}</h3>
              <div className="al-checkbox-list">
                {(['AC', 'Non-AC', 'Sleeper', 'Seater'] as const).map(v => (
                  <label key={v} className="al-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(v)}
                      onChange={e => {
                        if (e.target.checked) setSelectedTypes([...selectedTypes, v]);
                        else setSelectedTypes(selectedTypes.filter(t => t !== v));
                      }}
                    />
                    <span>{v}</span>
                    <span className="al-chk-count">{typeCounts[v]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Departure time pills */}
            <div className="al-filter-group" style={{ borderBottom: 'none' }}>
              <h3>{t('aiPlannerList.filterHeadingDepartureTime')}</h3>
              <div className="al-pills-grid">
                {Object.keys(TIME_SLOTS).map(time => (
                  <button
                    key={time}
                    className={`al-time-pill ${selectedTime === time ? 'active' : ''}`}
                    onClick={() => setSelectedTime(selectedTime === time ? '' : time)}
                  >
                    {timeSlotLabels[time]}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Main results list */}
          <div className="al-results-col">

            <button
              type="button"
              className="al-filter-toggle-btn"
              onClick={() => setShowFilters(true)}
            >
              <Filter size={16} /> {t('aiPlannerList.sidebarHeadingFilters')}
            </button>

            {/* AI Suggested Journeys — multi-leg plan from ai-planner-service */}
            {aiPlan && aiPlan.options.length > 0 && (
              <section className="al-recommended-section">
                <h2 className="al-sec-title">AI Suggested Journeys</h2>
                <div className="al-rec-grid">
                  {aiPlan.options.map((option, idx) => (
                    <div key={option.journey_id} className={`al-rec-card ${idx === 0 ? 'orange' : 'purple'}`}>
                      <div className="al-rec-header">
                        <span className={`al-rec-badge ${idx === 0 ? 'orange' : 'purple'}`}>{option.badge_label}</span>
                        <span className="al-rec-type">
                          {option.transport_modes.includes('BUS') ? <Bus size={14} /> : <Zap size={14} />}
                          <span>{option.transport_modes.join(' + ')}</span>
                        </span>
                      </div>
                      <h3>{option.title}</h3>
                      <div className="al-rec-price-row">
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelDuration')}</span>
                          <strong>{option.total_duration}{option.total_transfers > 0 ? ` · ${option.total_transfers} transfer${option.total_transfers > 1 ? 's' : ''}` : ''}</strong>
                        </div>
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelStartingFrom')}</span>
                          <strong className={idx === 0 ? 'orange-txt' : 'blue-txt'}>₹{option.total_fare.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className={`al-rec-btn ${idx === 0 ? 'orange' : 'purple'}`}
                          style={{ flex: 1 }}
                          onClick={() => navigate('/ai-planner/breakdown', { state: { aiJourney: option, searchId: aiPlan.search_id } })}
                        >
                          {t('aiPlannerList.buttonViewDetails')} <ArrowRight size={14} />
                        </button>
                        {isLoggedIn && (
                          <button
                            type="button"
                            aria-label="Save journey"
                            onClick={() => handleSaveJourney(option)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                          >
                            <Bookmark size={18} fill={savedJourneyIds.has(option.journey_id) ? '#0052ff' : 'none'} color="#0052ff" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended row — derived from real search results only */}
            {(cheapest || fastest) && (
              <section className="al-recommended-section">
                <h2 className="al-sec-title">{t('aiPlannerList.sectionRecommended')}</h2>

                <div className="al-rec-grid">
                  {cheapest && (
                    <div className="al-rec-card orange">
                      <div className="al-rec-header">
                        <span className="al-rec-badge orange">{t('aiPlannerList.badgeCheapest')}</span>
                        <span className="al-rec-type">
                          <Bus size={14} />
                          <span>{t('aiPlannerList.labelDirectBus')}</span>
                        </span>
                      </div>
                      <h3>{cheapest.depLoc} ➔ {cheapest.arrLoc}</h3>
                      <div className="al-rec-price-row">
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelDuration')}</span>
                          <strong>{cheapest.duration}</strong>
                        </div>
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelStartingFrom')}</span>
                          <strong className="orange-txt">₹{cheapest.price.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                      <button className="al-rec-btn orange" onClick={() => setSelectedBusForSeats(cheapest)}>{t('aiPlannerList.buttonBookBus')}</button>
                    </div>
                  )}

                  {fastest && (
                    <div className="al-rec-card purple">
                      <div className="al-rec-header">
                        <span className="al-rec-badge purple">{t('aiPlannerList.badgeFastest')}</span>
                        <span className="al-rec-type">
                          <Zap size={14} />
                          <span>{t('aiPlannerList.labelDirectBus')}</span>
                        </span>
                      </div>
                      <h3>{fastest.depLoc} ➔ {fastest.arrLoc}</h3>
                      <div className="al-rec-price-row">
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelDuration')}</span>
                          <strong>{fastest.duration}</strong>
                        </div>
                        <div className="al-rec-lbl-col">
                          <span>{t('aiPlannerList.labelStartingFrom')}</span>
                          <strong className="blue-txt">₹{fastest.price.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                      <button className="al-rec-btn purple" onClick={() => navigate('/ai-planner/breakdown', { state: { bus: fastest, date } })}>{t('aiPlannerList.buttonViewDetails')}</button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* All Options list */}
            <section className="al-options-section">
              <div className="al-options-header">
                <h2>{t('aiPlannerList.sectionAllJourneyOptions').replace('{count}', String(filteredBuses.length))}</h2>
                <div className="al-options-sort">
                  <span>{t('aiPlannerList.sortByLabel')}</span>
                  <select className="al-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="Price: Low to High">{t('aiPlannerList.sortOptionPriceLowToHigh')}</option>
                    <option value="Price: High to Low">{t('aiPlannerList.sortOptionPriceHighToLow')}</option>
                    <option value="Duration">{t('aiPlannerList.sortOptionDuration')}</option>
                  </select>
                </div>
              </div>

              <div className="al-options-list">
                {busesLoading ? (
                  <div className="al-loading-state">
                    <div className="al-spinner"></div>
                    <p>{t('aiPlannerList.loadingSearching')}</p>
                  </div>
                ) : filteredBuses.length > 0 ? (
                  filteredBuses.map(bus => (
                    <div key={bus.id} className="al-option-card">
                      <div className="al-opt-left">
                        <div className="al-opt-icon-box">
                          <Bus size={18} />
                        </div>
                        <div className="al-opt-info">
                          <h3>{bus.name}</h3>
                          <p>{bus.depLoc} ➔ {bus.arrLoc}</p>
                        </div>
                      </div>

                      <div className="al-opt-middle">
                        <strong>{bus.duration}</strong>
                        <span>{bus.type}</span>
                      </div>

                      <div className="al-opt-right">
                        <div className="al-opt-price-col">
                          <span className="al-price-lbl">{t('aiPlannerList.labelPrice')}</span>
                          <strong className="al-price-val">₹{bus.price.toLocaleString('en-IN')}</strong>
                        </div>
                        <button className="al-opt-select-btn" onClick={() => setSelectedBusForSeats(bus)}>{t('aiPlannerList.buttonSelect')}</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="al-empty-state">
                    <Info size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                    <h3>{busesError ? t('aiPlannerList.emptyErrorHeading') : t('aiPlannerList.emptyNoResultsHeading')}</h3>
                    <p>{busesError || t('aiPlannerList.emptyNoResultsBody')}</p>
                    {busesError && <button className="al-btn-load-more" onClick={fetchBuses}>{t('aiPlannerList.buttonRetry')}</button>}
                  </div>
                )}
              </div>

              {filteredBuses.length > 0 && (
                allResultsLoaded ? (
                  <p className="al-load-more-status">{t('aiPlannerList.allResultsLoaded')}</p>
                ) : (
                  <button className="al-btn-load-more" onClick={() => setAllResultsLoaded(true)}>{t('aiPlannerList.buttonLoadMoreResults')}</button>
                )
              )}
            </section>

          </div>

        </div>
      </main>

      <Footer />

      {selectedBusForSeats && (
        <SeatSelectionModal
          bus={selectedBusForSeats}
          onClose={() => setSelectedBusForSeats(null)}
        />
      )}
    </div>
  );
};

export default AiPlannerList;
