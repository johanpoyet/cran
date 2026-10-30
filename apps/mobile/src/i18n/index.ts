import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './fr.json';

export const resources = { fr: { translation: fr } } as const;
export const defaultLanguage = 'fr';

// French only in v1; English will be added as a second resource file.
const deviceLanguage = getLocales()[0].languageCode ?? defaultLanguage;

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage in resources ? deviceLanguage : defaultLanguage,
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
