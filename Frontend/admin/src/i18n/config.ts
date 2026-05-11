import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import vi from "../locales/vi.json";

const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
};

// Get saved language from localStorage or default to Vietnamese
const savedLanguage = localStorage.getItem("language") || "vi";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
