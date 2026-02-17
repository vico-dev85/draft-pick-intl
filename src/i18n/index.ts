import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// English translations (default)
import commonEn from "./locales/en/common.json";
import landingEn from "./locales/en/landing.json";
import authEn from "./locales/en/auth.json";
import dashboardEn from "./locales/en/dashboard.json";
import playersEn from "./locales/en/players.json";
import draftEn from "./locales/en/draft.json";
import resultsEn from "./locales/en/results.json";
import gamenightEn from "./locales/en/gamenight.json";
import legalEn from "./locales/en/legal.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        landing: landingEn,
        auth: authEn,
        dashboard: dashboardEn,
        players: playersEn,
        draft: draftEn,
        results: resultsEn,
        gamenight: gamenightEn,
        legal: legalEn,
      },
    },
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: ["en", "es", "fr", "de", "it", "nl"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "draftpick_lang",
      caches: ["localStorage"],
    },
  });

// Keep <html lang=""> in sync with the active language
const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
};

// Set on init
syncHtmlLang(i18n.language);

// Update on every language change
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
