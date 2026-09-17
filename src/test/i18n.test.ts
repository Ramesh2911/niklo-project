import { describe, it, expect } from 'vitest';
import { t } from '../i18n';

describe('i18n translation helper', () => {
  it('returns English strings', () => {
    expect(t('English', 'nav.packages')).toBe('Packages');
    expect(t('English', 'auth.sendOtp')).toBe('Send OTP');
    expect(t('English', 'common.loading')).toBe('Loading…');
  });

  it('returns Hindi strings', () => {
    expect(t('Hindi', 'nav.packages')).toBe('पैकेज');
    expect(t('Hindi', 'auth.sendOtp')).toBe('OTP भेजें');
  });

  it('returns Bengali strings', () => {
    expect(t('Bengali', 'nav.packages')).toBe('প্যাকেজ');
    expect(t('Bengali', 'home.searchBtn')).toBe('খুঁজুন');
  });

  it('returns Gujarati strings', () => {
    expect(t('Gujarati', 'nav.packages')).toBe('પેકેજ');
  });

  it('returns the key path for missing keys', () => {
    expect(t('English', 'nav.nonexistent')).toBe('nav.nonexistent');
  });
});
