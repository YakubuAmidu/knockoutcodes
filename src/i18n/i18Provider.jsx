// src/i18n/I18nProvider.jsx

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SUPPORTED_LANGUAGES, translations } from "./translations";

const I18nContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => React.useContext(I18nContext);

const LANG_KEY = "kc_lang";

function getInitialLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && translations[saved]) return saved;

  // Optional: auto-detect from browser
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  if (translations[nav]) return nav;

  return "en";
}

function getByPath(obj, path) {
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((next) => {
    const code = String(next || "").toLowerCase();
    if (!translations[code]) return;
    setLangState(code);
    localStorage.setItem(LANG_KEY, code);
    try {
      document.documentElement.lang = code;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useCallback(
    (key, fallback = "") => {
      // 1) try current language
      const fromCurrent = getByPath(translations[lang], key);
      if (typeof fromCurrent === "string") return fromCurrent;

      // 2) fallback to English
      const fromEn = getByPath(translations.en, key);
      if (typeof fromEn === "string") return fromEn;

      // 3) fallback param or key
      return fallback || key;
    },
    [lang],
  );

  const languageLabel = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.label || "English";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      supported: SUPPORTED_LANGUAGES,
      languageLabel,
    }),
    [lang, setLang, t, languageLabel],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
