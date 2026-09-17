import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import { useI18n } from '../contexts/I18nContext';
import './BookingSuccess.css';

export function printTicket(ticketId: string) {
  const el = document.getElementById(ticketId);
  if (!el) return;
  const win = window.open('', '_blank', 'width=700,height=600');
  if (!win) return;
  const style = `body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}h3{color:#0052ff;margin-bottom:24px}.ticket-route{display:flex;align-items:center;gap:24px;margin-bottom:20px;font-size:1.1rem;font-weight:700}.ticket-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.ticket-item span{display:block;font-size:.75rem;color:#64748b;text-transform:uppercase}.ticket-item strong{font-size:.95rem}@media print{button{display:none}}`;
  const autoprint = 'window.onload=()=>{window.print();window.close();}';
  win.document.write(
    `<!DOCTYPE html><html><head><title>Niklo Ticket</title><style>${style}</style></head><body>${el.innerHTML}<script>${autoprint}</` + `script></body></html>`
  );
  win.document.close();
}

const BookingSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [showTicket, setShowTicket] = useState(false);
  const bookingState: {
    type?: string; bookingId?: string; from?: string; to?: string; busName?: string;
    depTime?: string; seats?: string; amount?: string; qrCode?: string;
    packageName?: string; startDate?: string; endDate?: string;
    rooms?: number; travellers?: Array<{ id?: string; name: string; age: string; gender: string }>;
  } = location.state || { type: 'bus' };

  return (
    <div className="success-page-container">
      <Navbar theme="blue" />
      
      <div className="success-content">
        <div className="success-card">
          
          <div className="icon-container">
            {/* Confetti decorations */}
            <div className="confetti confetti-1"></div>
            <div className="confetti confetti-2"></div>
            <div className="confetti confetti-3"></div>
            <div className="confetti confetti-4"></div>
            <div className="confetti confetti-5"></div>
            <div className="confetti confetti-6"></div>
            <div className="confetti confetti-7"></div>
            
            <div className="check-circle">
              <Check size={32} strokeWidth={3} />
            </div>
          </div>
          
          <h1 className="success-title">
            {bookingState.type === 'package' ? t('bookingSuccess.packageBookingSuccessful') : t('bookingSuccess.busBookingSuccessful')}
          </h1>
          <p className="success-subtitle">
            {bookingState.type === 'package'
              ? t('bookingSuccess.packageConfirmationSubtitle')
              : t('bookingSuccess.busConfirmationSubtitle')}
          </p>

          <div className="details-box">
            <div className="detail-row">
              <span className="detail-label">{t('booking.bookingId')}</span>
              <span className="detail-value">{bookingState.bookingId || (bookingState.type === 'package' ? 'PKG7890123' : 'PAY1234567890')}</span>
            </div>
            {bookingState.type === 'package' && (
              <div className="detail-row">
                <span className="detail-label">{t('bookingSuccess.destination')}</span>
                <span className="detail-value">{bookingState.packageName || 'Meghalaya Explorer'}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">{t('bookingSuccess.dateAndTime')}</span>
              <span className="detail-value">{bookingState.startDate || '22 May 2024 • 08:00 PM'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t('booking.amountPaid')}</span>
              <span className="detail-value">
                ₹{bookingState.amount || (bookingState.type === 'package' ? '18,580' : '1,250.00')}{' '}
                <span className="badge-paid">{t('bookingSuccess.paid')}</span>
              </span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-primary" onClick={() => setShowTicket(true)}>{t('booking.viewDetails')}</button>
            <button className="btn-secondary" onClick={() => navigate('/')}>{t('booking.backHome')}</button>
          </div>

          <div className="support-link">
            {t('bookingSuccess.needHelp')} <a href="mailto:hello@niklo.com">{t('bookingSuccess.contactSupport')}</a>
          </div>
          
        </div>
      </div>
      
      {showTicket && (
        <div className="ticket-modal-overlay">
          <div className="ticket-modal-card">
            <div className="ticket-header">
              <h3>{bookingState.type === 'package' ? t('bookingSuccess.bookingVoucher') : t('bookingSuccess.yourETicket')}</h3>
              <button className="btn-close-modal" onClick={() => setShowTicket(false)}><X size={24} /></button>
            </div>
            {bookingState.type === 'package' ? (
              <div className="ticket-body" id="ticket-print-area">
                <div className="ticket-route" style={{ marginBottom: '24px' }}>
                  <div className="loc" style={{ textAlign: 'center', width: '100%', fontSize: '1.25rem', color: '#0052ff' }}>
                    {bookingState.packageName || 'Meghalaya Explorer'}
                  </div>
                </div>
                <div className="ticket-details-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="ticket-item"><span>{t('bookingSuccess.startDate')}</span><strong>{bookingState.startDate}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.endDate')}</span><strong>{bookingState.endDate}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.totalPaid')}</span><strong>₹{bookingState.amount}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.rooms')}</span><strong>{bookingState.rooms || 1} {t('bookingSuccess.roomsSuffix')}</strong></div>
                </div>

                <div className="ticket-travellers-list" style={{ marginTop: '20px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: 800 }}>{t('bookingSuccess.travellersDetails')}</span>
                  {bookingState.travellers?.map((traveller, idx: number) => (
                    <div key={traveller.id || idx} style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', padding: '8px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{idx + 1}. {traveller.name}</span>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>{traveller.age} • {traveller.gender}</span>
                    </div>
                  ))}
                </div>

                <div className="qr-container" style={{ marginTop: '24px' }}>
                  <QRCodeSVG value={bookingState.qrCode || bookingState.bookingId || 'NIKLO-BOOKING'} size={128} />
                  <p>{t('bookingSuccess.presentVoucher')}</p>
                </div>
                <button className="btn-download-ticket" onClick={() => printTicket('ticket-print-area')}>{t('bookingSuccess.downloadBookingVoucher')}</button>
              </div>
            ) : (
              <div className="ticket-body" id="ticket-print-area">
                <div className="ticket-route">
                  <div className="loc">{bookingState.from || 'Kolkata'} <br/><span>{bookingState.depTime || 'N/A'}</span></div>
                  <div className="arrow"><ArrowRight size={20}/></div>
                  <div className="loc">{bookingState.to || 'Siliguri'}</div>
                </div>
                <div className="ticket-details-grid">
                  <div className="ticket-item"><span>{t('bookingSuccess.busName')}</span><strong>{bookingState.busName || 'N/A'}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.seats')}</span><strong>{bookingState.seats || 'N/A'}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.bookingId')}</span><strong>{bookingState.bookingId || `PAY${Date.now().toString().slice(-7)}`}</strong></div>
                  <div className="ticket-item"><span>{t('bookingSuccess.totalPaid')}</span><strong>₹{bookingState.amount || '1,250.00'}</strong></div>
                </div>
                <div className="qr-container">
                  <QRCodeSVG value={bookingState.qrCode || bookingState.bookingId || 'NIKLO-BOOKING'} size={128} />
                  <p>{t('bookingSuccess.scanToBoard')}</p>
                </div>
                <button className="btn-download-ticket" onClick={() => printTicket('ticket-print-area')}>{t('booking.downloadTicket')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingSuccess;
