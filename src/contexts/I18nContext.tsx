/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { type Lang, t as translate, type Translations } from '../i18n';
import en from '../i18n/en';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
  translations: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'English',
  setLang: () => undefined,
  t: (p) => p,
  translations: en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('English');

  const value: I18nContextValue = {
    lang,
    setLang,
    t: (path) => translate(lang, path),
    translations: en,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
