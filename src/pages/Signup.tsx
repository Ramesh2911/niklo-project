import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import nikloLogo from '../assets/niklo-logo-white.svg';
import welcomeBackBG from '../assets/welcome_back_BG.png';
import { authService } from '../lib/authService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './Auth.css';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string })?.from || '/';
  const { login } = useAuth();
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(54);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (showOtp && timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtp, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || phoneNumber.length !== 10) return;
    setLoading(true);
    setError('');
    try {
      await authService.sendOtp(`+91${phoneNumber}`);
      setTimer(54);
      setOtp(['', '', '', '', '', '']);
      setShowOtp(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.couldNotSendOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const numValue = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = numValue.slice(-1);
    setOtp(newOtp);
    if (index < 5 && numValue) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError(t('auth.pleaseEnterOtp'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await authService.verifyOtp(`+91${phoneNumber}`, enteredOtp);
      // Persist name if backend returned empty
      if (!user.name) user.name = fullName;
      localStorage.setItem('user', JSON.stringify(user));
      login(user);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      await authService.sendOtp(`+91${phoneNumber}`);
    } catch {
      // swallow
    } finally {
      setTimer(54);
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
    }
  };

  const formatTime = (s: number) => `0${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <div className="auth-container fade-in" style={{ backgroundImage: `url("${welcomeBackBG}")` }}>
      <div className="auth-logo-container">
        <img src={nikloLogo} alt="Niklo Logo" className="auth-logo-img" />
      </div>

      <div className="auth-card">
        <div className="auth-title-section">
          <h2 className="auth-card-title">{t('auth.createAccountTitle')}</h2>
          <p className="auth-card-subtitle">{t('auth.createAccountSubtitle')}</p>
        </div>

        <form className="auth-card-form" onSubmit={handleSendOtp}>
          <div className="standard-input-container">
            <label className="visually-hidden" htmlFor="name-input">{t('auth.fullNameLabel')}</label>
            <input
              id="name-input"
              type="text"
              required
              className="standard-input-field"
              placeholder={t('auth.fullNamePlaceholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="phone-input-container">
            <div className="country-code-section">
              <span className="country-code-label">{t('auth.countryCodeLabel')}</span>
              <span className="country-code-val">+91</span>
            </div>
            <div className="phone-number-section">
              <label className="phone-number-label" htmlFor="phone-input">{t('auth.mobileLabel')}</label>
              <input
                id="phone-input"
                type="tel"
                pattern="[0-9]{10}"
                maxLength={10}
                required
                className="phone-input-field"
                placeholder={t('auth.phonePlaceholder')}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {!showOtp && error && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '4px 0' }}>{error}</p>
          )}

          <button type="submit" className="btn-submit-otp" disabled={loading}>
            {loading ? t('auth.sendingButton') : t('auth.getStartedButton')}
          </button>
        </form>

        <p className="auth-footer-text">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="auth-footer-link">{t('auth.logInLink')}</Link>
        </p>
      </div>

      {showOtp && (
        <div className="modal-overlay">
          <div className="otp-modal">
            <button className="btn-close-modal" onClick={() => setShowOtp(false)}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="otp-title-section">
              <h2 className="otp-title">{t('auth.enterOtp')}</h2>
              <p className="otp-subtitle">{t('auth.sentCodeTo')}</p>
              <div className="otp-phone-row">
                <span>+91 {phoneNumber}</span>
                <button className="btn-edit-phone" onClick={() => setShowOtp(false)}>{t('auth.editButton')}</button>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="otp-inputs-row">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    aria-label={t('auth.otpDigitLabel').replace('{{n}}', String(idx + 1))}
                    ref={(el) => { if (el) inputRefs.current[idx] = el; }}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="otp-box-input"
                  />
                ))}
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '8px 0' }}>{error}</p>}

              <div className="otp-resend-section">
                <span>{t('auth.didntReceiveCode')}</span><br />
                {timer > 0 ? (
                  <span style={{ color: '#64748b' }}>{t('auth.resendCodeLabel')} <span className="otp-timer-val">{t('auth.resendInLabel')} {formatTime(timer)}</span></span>
                ) : (
                  <button type="button" className="btn-resend-code" onClick={handleResend}>{t('auth.resendCodeLabel')}</button>
                )}
              </div>

              <button type="submit" className="btn-verify-otp" disabled={loading}>
                {loading ? t('auth.verifyingButton') : t('auth.verify')}
              </button>

              <p className="otp-legal-text">
                {t('auth.agreeToTermsSignup')}<br />
                <a href="/privacy-security#terms-of-service" className="otp-legal-link">{t('auth.termsConditions')}</a>
                {' '}{t('auth.andWord')}{' '}
                <a href="/privacy-security#privacy-policy" className="otp-legal-link">{t('auth.privacyPolicyLink')}</a>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
