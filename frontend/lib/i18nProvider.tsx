"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "./i18n";
import { getLocale, setLocaleStorage, tFrom } from "./i18n";

type I18nCtx = {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (lc: Locale) => void;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    setLocaleState(getLocale());
  }, []);

  const setLocale = (lc: Locale) => {
    setLocaleStorage(lc);
    setLocaleState(lc);
  };

  const value = useMemo(
    () => ({ locale, setLocale, t: (key: string) => tFrom(locale, key) }),
    [locale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}