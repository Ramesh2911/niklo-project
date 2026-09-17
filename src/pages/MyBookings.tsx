import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Headphones, FileText, Printer, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import escapeWeekendImg from '../assets/escape_the_weekend.png';
import { bookingService, type MyBookingItem } from '../lib/bookingService';
import { busService } from '../lib/busService';
import { useI18n } from '../contexts/I18nContext';
import './MyBookings.css';

const MyBookings: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [showQrModal, setShowQrModal] = useState<MyBookingItem | null>(null);
  const [allBookings, setAllBookings] = useState<MyBookingItem[]>([]);
  const [showInvoices, setShowInvoices] = useState(false);
  // Distinguishes "genuinely no bookings" from "the fetch failed" — without
  // this, a failed request left allBookings at its empty initial state and
  // silently rendered the same empty-state copy as having zero bookings.
  const [loadError, setLoadError] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    bookingService.getUserBookings().then(setAllBookings).catch(() => setLoadError(true));
  }, []);

  const handleBookAgain = (booking: MyBookingItem) => {
    const params = new URLSearchParams({ from: booking.boarding, to: booking.dropping });
    navigate(booking.type === 'Cab' ? `/cabs?${params}` : `/buses?${params}`);
  };

  const handleCancelBooking = async (booking: MyBookingItem) => {
    if (!window.confirm(t('bookingActions.cancelConfirm'))) return;
    setCancellingId(booking.id);
    try {
      await bookingService.cancelBooking(booking.pnr);
      setAllBookings(prev => prev.map(b => b.id === booking.id ? { ...b, badge: 'CANCELLED', status: 'CANCELLED' } : b));
    } catch {
      window.alert(t('bookingActions.cancelFailed'));
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewDetails = async (booking: MyBookingItem) => {
    // The list view only carries a summary; fetch the full record (real
    // seats/passengers/fare) plus the schedule (bus name, departure time)
    // instead of letting the details screen fall back to placeholder text.
    // backend: no GET /bookings/:id route yet, so this 404s and `full`
    // stays null — the summary fields below still carry the page.
    const full = await bookingService.getBooking(booking.pnr).catch(() => null);
    const schedule = full?.schedule_id
      ? await busService.getScheduleById(full.schedule_id).catch(() => null)
      : null;

    navigate('/booking-success', {
      state: {
        type: booking.type === 'Bus' ? 'bus' : 'cab',
        bookingId: booking.pnr,
        from: booking.boarding,
        to: booking.dropping,
        startDate: booking.date,
        amount: booking.amount,
        qrCode: booking.qrCode,
        busName: schedule?.name,
        depTime: schedule?.depTime,
        seats: full?.seat_numbers?.join(', '),
        travellers: full?.passenger_details ?? undefined,
      },
    });
  };

  const tabLabels: Record<string, string> = {
    Upcoming: t('myBookings.tabUpcoming'),
    Completed: t('myBookings.tabCompleted'),
    Cancelled: t('myBookings.tabCancelled'),
    'All Trips': t('myBookings.tabAllTrips'),
  };

  const filteredBookings = allBookings.filter(booking => {
    if (activeTab === 'Upcoming') return booking.badge === 'UPCOMING';
    if (activeTab === 'Completed') return booking.badge === 'COMPLETED';
    if (activeTab === 'Cancelled') return booking.badge === 'CANCELLED';
    return true; // All Trips
  });

  return (
    <div className="mb-page-wrapper">
      <Navbar theme="blue" />

      {/* Header section */}
      <div className="mb-header-section">
        <div className="mb-header-container">
          <h1>{t('myBookings.pageTitle')}</h1>
          <p>{t('myBookings.pageSubtitle')}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="mb-promo-btn" onClick={() => navigate('/help')}>
              <Headphones size={16} style={{ marginRight: '6px' }} /> {t('bookingActions.customerSupport')}
            </button>
            <button className="mb-promo-btn" onClick={() => setShowInvoices((v) => !v)}>
              <FileText size={16} style={{ marginRight: '6px' }} /> {t('bookingActions.viewInvoices')}
            </button>
          </div>
        </div>
      </div>

      {showInvoices && (
        <div className="mb-main" style={{ paddingBottom: 0 }}>
          <div className="mb-container">
            <div className="mb-card">
              <div className="mb-card-header">
                <h2>{t('bookingActions.invoicesHeading')}</h2>
                <button className="mb-qr-btn" onClick={() => window.print()} aria-label="Print invoices">
                  <Printer size={18} />
                </button>
              </div>
              <div className="mb-card-body">
                {allBookings.length === 0 ? (
                  <p>{t('bookingActions.noInvoices')}</p>
                ) : (
                  allBookings.map((b) => (
                    <div key={b.id} className="mb-footer-row" style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <div className="mb-meta-info">
                        <span>{b.title} • {b.date}</span><br />
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{t('bookingActions.invoiceNumberPrefix')}{b.pnr} • {b.status}</span>
                      </div>
                      <strong>₹{b.amount}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs & List content */}
      <main className="mb-main">
        <div className="mb-container">
          
          {/* Filter Tabs */}
          <div className="mb-tabs-row">
            {['Upcoming', 'Completed', 'Cancelled', 'All Trips'].map(tab => (
              <button 
                key={tab} 
                className={`mb-tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {/* Bookings cards list */}
          <div className="mb-grid">
            {filteredBookings.length > 0 ? (
              filteredBookings.map(booking => (
                <div key={booking.id} className="mb-card">
                  <div className="mb-card-header">
                    <div className="mb-card-title-wrap">
                      <h2>{booking.title}</h2>
                      <span className="mb-card-date">{booking.date}</span>
                    </div>
                    <span className="mb-upcoming-badge">{booking.badge}</span>
                  </div>

                  <div className="mb-card-body">
                    {/* Timeline itinerary */}
                    <div className="mb-timeline">
                      <div className="mb-timeline-item">
                        <div className="mb-dot blue"></div>
                        <div className="mb-timeline-content">
                          <span className="mb-lbl">{t('myBookings.timelineLabelBoarding')}</span>
                          <span className="mb-val">{booking.boarding}</span>
                        </div>
                      </div>
                      <div className="mb-timeline-item">
                        <div className="mb-dot grey"></div>
                        <div className="mb-timeline-content">
                          <span className="mb-lbl">{t('myBookings.timelineLabelDropping')}</span>
                          <span className="mb-val">{booking.dropping}</span>
                        </div>
                      </div>
                    </div>

                    <hr className="mb-divider" />

                    {/* Metadata & Actions row */}
                    <div className="mb-footer-row">
                      <div className="mb-meta-info">
                        <div className="mb-pnr">
                          <span>{t('myBookings.pnrLabel')} <strong>{booking.pnr}</strong></span>
                          <span className="mb-status-badge">{booking.status}</span>
                        </div>
                      </div>

                      <div className="mb-action-btns">
                        <button className="mb-qr-btn" onClick={() => handleBookAgain(booking)} aria-label={t('bookingActions.bookAgain')} title={t('bookingActions.bookAgain')}>
                          <RefreshCw size={18} />
                        </button>
                        <button className="mb-qr-btn" onClick={() => setShowQrModal(booking)}>
                          <QrCode size={18} />
                        </button>
                        {booking.badge === 'UPCOMING' && (
                          <button
                            className="mb-cancel-btn"
                            onClick={() => handleCancelBooking(booking)}
                            disabled={cancellingId === booking.id}
                          >
                            {cancellingId === booking.id ? t('bookingActions.cancelling') : t('bookingActions.cancelBooking')}
                          </button>
                        )}
                        <button className="mb-details-btn" onClick={() => handleViewDetails(booking)}>
                          {t('myBookings.viewDetailsButton')}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="mb-empty-state">
                <p>{loadError ? t('myBookings.loadErrorMessage') : t('myBookings.emptyStateMessage')}</p>
              </div>
            )}
          </div>

          {/* Promotion Banner */}
          <section className="mb-promo-banner" style={{ backgroundImage: `url('${escapeWeekendImg}')` }}>
            <div className="mb-promo-overlay"></div>
            <div className="mb-promo-content">
              <h2>{t('myBookings.promoBannerHeading')}</h2>
              <p>{t('myBookings.promoBannerSubtext')}</p>
              <button className="mb-promo-btn" onClick={() => navigate('/experiences')}>
                {t('myBookings.promoBannerButton')}
              </button>
            </div>
          </section>

        </div>
      </main>

      {/* QR Code Modal Popup */}
      {showQrModal && (
        <div className="mb-modal-overlay" onClick={() => setShowQrModal(null)}>
          <div className="mb-qr-modal" onClick={e => e.stopPropagation()}>
            <h3>{t('myBookings.qrModalTitle')}</h3>
            <p>{t('myBookings.qrModalPnrLabel')} {showQrModal.pnr}</p>
            <div className="mb-qr-graphic">
              <QRCodeSVG value={showQrModal.qrCode || showQrModal.pnr} size={180} />
            </div>
            <p className="mb-qr-note">{t('myBookings.qrModalNote')}</p>
            <button className="mb-modal-close-btn" onClick={() => setShowQrModal(null)}>{t('myBookings.qrModalCloseButton')}</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyBookings;
