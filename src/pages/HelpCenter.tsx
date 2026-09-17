import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, ChevronDown, LifeBuoy } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import './HelpCenter.css';

const ARTICLES = [
  {
    q: 'How do I cancel or modify a booking?',
    a: 'Go to Account → My Bookings, open the trip you want to change, and use Cancel or Reschedule. Cancellation charges depend on the operator\'s policy and how close you are to departure — the exact refund amount is shown before you confirm.',
  },
  {
    q: 'How do refunds work?',
    a: 'Once a cancellation is confirmed, refunds are credited to your original payment method (or Niklo Wallet, if you choose that option) within 3–5 business days. You can track refund status from My Bookings → View Invoices.',
  },
  {
    q: 'How do I update my profile details?',
    a: 'Go to Account → Personal Information, tap Edit, update your name, email, date of birth, or gender, and tap Save Changes. Your phone number is verified at signup and cannot be changed from the app.',
  },
  {
    q: 'What is the baggage policy?',
    a: 'Bus operators typically allow one check-in bag (up to 15kg) and one hand bag per seat; exact limits vary by operator and are shown on the bus details page before you book. Hotels have no baggage restrictions.',
  },
  {
    q: 'How do you keep my trips safe?',
    a: 'Every driver and bus operator on Niklo is verified before listing. During cab rides you can share your live trip status from the ride screen, and Emergency Contact numbers are always one tap away from your Account page.',
  },
];

const QUICK_HELP = ['Bookings & Tickets', 'Payments & Refunds', 'Cancellations'];

const HelpCenter: React.FC = () => {
  const { t } = useI18n();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [quickFilter, setQuickFilter] = useState('');

  const filteredArticles = quickFilter
    ? ARTICLES.filter((a) => a.q.toLowerCase().includes(quickFilter.toLowerCase()) || a.a.toLowerCase().includes(quickFilter.toLowerCase()))
    : ARTICLES;

  return (
    <div className="hc-page-wrapper">
      <Navbar theme="blue" />

      <div className="hc-header-section">
        <div className="hc-header-container">
          <LifeBuoy size={32} />
          <h1>{t('helpCenter.pageTitle')}</h1>
          <p>{t('helpCenter.pageSubtitle')}</p>
        </div>
      </div>

      <main className="hc-main">
        <div className="hc-container">

          <div className="hc-quick-help-row">
            <button className={`hc-quick-pill ${quickFilter === '' ? 'active' : ''}`} onClick={() => setQuickFilter('')}>{t('helpCenter.allTopics')}</button>
            {QUICK_HELP.map((label) => (
              <button
                key={label}
                className={`hc-quick-pill ${quickFilter === label ? 'active' : ''}`}
                onClick={() => setQuickFilter(quickFilter === label ? '' : label.split(' ')[0])}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="hc-section">
            <h2>{t('helpCenter.popularArticlesHeading')}</h2>
            <div className="hc-faq-list">
              {filteredArticles.map((item, idx) => (
                <div key={item.q} className={`hc-faq-item ${openIdx === idx ? 'active' : ''}`}>
                  <button className="hc-faq-question" onClick={() => setOpenIdx(openIdx === idx ? null : idx)}>
                    <span>{item.q}</span>
                    <ChevronDown size={18} className={`hc-faq-chevron ${openIdx === idx ? 'open' : ''}`} />
                  </button>
                  {openIdx === idx && <div className="hc-faq-answer"><p>{item.a}</p></div>}
                </div>
              ))}
              {filteredArticles.length === 0 && <p className="hc-empty">{t('helpCenter.noArticlesMatch')}</p>}
            </div>
          </section>

          <section className="hc-section">
            <h2>{t('helpCenter.contactUsHeading')}</h2>
            <div className="hc-contact-grid">
              <a href="tel:+9118001234567" className="hc-contact-card">
                <Phone size={20} />
                <div>
                  <strong>{t('helpCenter.callSupport')}</strong>
                  <span>{t('helpCenter.callSupportDesc')}</span>
                </div>
              </a>
              <a href="mailto:hello@niklo.com" className="hc-contact-card">
                <Mail size={20} />
                <div>
                  <strong>{t('helpCenter.emailUs')}</strong>
                  <span>hello@niklo.com</span>
                </div>
              </a>
              <a href="https://wa.me/9118001234567" target="_blank" rel="noopener noreferrer" className="hc-contact-card">
                <MessageCircle size={20} />
                <div>
                  <strong>{t('helpCenter.whatsapp')}</strong>
                  <span>{t('helpCenter.whatsappDesc')}</span>
                </div>
              </a>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
