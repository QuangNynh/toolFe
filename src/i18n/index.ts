import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import viCommon from '@/locales/vi.json'
import enCommon from '@/locales/en.json'

export const LANG_STORAGE_KEY = 'app_language'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: {
        translation: viCommon
      },
      
      en: {
        translation: enCommon
      }
    },

    fallbackLng: 'vi',
    load: 'languageOnly',

    supportedLngs: ['vi', 'en'],
    nonExplicitSupportedLngs: true,

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => lng.split('-')[0]
    }
  })

export default i18n
