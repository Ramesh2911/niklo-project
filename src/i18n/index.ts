import en from './en';
import hi from './hi';
import bn from './bn';
import gu from './gu';

export type Lang = 'English' | 'Hindi' | 'Bengali' | 'Gujarati';
// Widened to string so translations in other languages can hold different literals
export type Translations = { [K in keyof typeof en]: { [J in keyof typeof en[K]]: string } };

const translations: Record<Lang, Translations> = {
  English: en,
  Hindi: hi,
  Bengali: bn,
  Gujarati: gu,
};

export function t(lang: Lang, path: string): string {
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obj: any = translations[lang] ?? en;
  for (const k of keys) {
    obj = obj?.[k];
    if (obj === undefined) break;
  }
  return typeof obj === 'string' ? obj : path;
}

export { en, hi, bn, gu };
export default translations;
