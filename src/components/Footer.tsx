import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import nikloLogo from '../assets/niklo-logo-white.svg';
import { useI18n } from '../contexts/I18nContext';
import './Footer.css';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <footer className="home-footer" role="contentinfo" aria-label="Site footer">
      <div className="footer-top-columns">
        {/* Brand Info */}
        <div className="footer-brand-col">
          <img src={nikloLogo} alt="Niklo Logo" className="footer-brand-logo" />
          <p className="footer-brand-desc">
            {t('footer.brandDesc')}
          </p>
          <div className="footer-contact-info">
            <p><Phone size={14} /> +91 1800 123 4567</p>
            <p><Mail size={14} /> hello@niklo.com</p>
            <p><MapPin size={14} /> Tech Hub, Sector 62, Gurgaon, Haryana, India</p>
          </div>
          <div className="footer-social-row">
            <a href="#facebook" className="social-circle-btn" aria-label="Facebook">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#instagram" className="social-circle-btn" aria-label="Instagram">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="#twitter" className="social-circle-btn" aria-label="Twitter/X">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-7-6.2 7H1.3l8.1-9.3L1 2h7.1l4.9 6.4L18.9 2Zm-2.4 18h1.9L7.6 4H5.6l10.9 16Z"/></svg>
            </a>
            <a href="#linkedin" className="social-circle-btn" aria-label="LinkedIn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Explore */}
        <nav aria-label="Explore services">
          <h4 className="footer-col-title">{t('footer.exploreHeading')}</h4>
          <ul className="footer-links-list">
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/buses'); }}>{t('footer.linkBusBooking')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/cabs'); }}>{t('footer.linkCabRides')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/hotels'); }}>{t('footer.linkHotelBooking')}</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>{t('footer.linkTrainTravel')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/packages'); }}>{t('footer.linkHolidayPackages')}</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>{t('footer.linkInternationalFlights')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/offers'); }}>{t('nav.offers')}</a></li>
          </ul>
        </nav>

        {/* Company */}
        <nav aria-label="Company links">
          <h4 className="footer-col-title">{t('footer.companyHeading')}</h4>
          <ul className="footer-links-list">
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>{t('footer.linkAboutUs')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/careers'); }}>{t('footer.linkCareers')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>{t('footer.linkBlog')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/sustainability'); }}>{t('footer.linkSustainability')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/press'); }}>{t('footer.linkPressCenter')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/investors'); }}>{t('footer.linkInvestorRelations')}</a></li>
          </ul>
        </nav>

        {/* Help & Support */}
        <nav aria-label="Help and support links">
          <h4 className="footer-col-title">{t('footer.helpHeading')}</h4>
          <ul className="footer-links-list">
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/help'); }}>{t('footer.linkHelpCenter')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/help'); }}>{t('footer.linkFaqs')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/cancellation-policy'); }}>{t('footer.linkCancellationPolicy')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy-security#trust-safety'); }}>{t('footer.linkTrustSafety')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy-security#privacy-policy'); }}>{t('footer.linkPrivacyPolicy')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy-security#terms-of-service'); }}>{t('footer.linkTermsOfService')}</a></li>
          </ul>
        </nav>
      </div>

      {/* Newsletter */}
      <div className="footer-newsletter-row">
        <div className="newsletter-text">
          <h4>{t('footer.newsletterHeading')}</h4>
          <p>{t('footer.newsletterDesc')}</p>
        </div>
        <form className="newsletter-form" aria-label="Newsletter subscription" onSubmit={(e) => { e.preventDefault(); }}>
          <label htmlFor="footer-email" className="visually-hidden">Email address</label>
          <input id="footer-email" type="email" placeholder={t('footer.newsletterPlaceholder')} className="newsletter-input" required aria-label="Email address" />
          <button type="submit" className="btn-newsletter-submit">{t('footer.newsletterSubscribe')}</button>
        </form>
      </div>

      {/* Bottom copyright */}
      <div className="footer-bottom-row">
        <div className="footer-bottom-text">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.madeInIndia')}</span>
        </div>
        <div className="footer-bottom-badges">
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="footer-badge-img" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play Store" className="footer-badge-img" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
