import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Carga traducciones desde /public/locales
  .use(Backend)
  // Detecta idioma del usuario
  .use(LanguageDetector)
  // Pasa la instancia a react-i18next
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    load: 'languageOnly', // Carga 'es' en vez de 'es-419'
    debug: false,

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
  });

export default i18n;
