/**
 * Arogya Relay language switcher (Problem Statement 3).
 *
 * A compact, accessible switcher shown in the topbar. Changing language updates
 * the global preference and re-renders all catalog strings. Includes a "Show
 * original English" toggle so clinical Tier 1 instructions can always be shown
 * verbatim. Keyboard and screen-reader friendly.
 */

"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { LANGUAGES } from "@/lib/i18n/types";

export function LanguageSwitcher() {
  const { lang, setLang, showOriginal, setShowOriginal, t } = useLanguage();

  return (
    <div className="lang-switcher" role="group" aria-label={t("action.language")}>
      <label className="lang-label" htmlFor="lang-select">
        {t("action.language")}
      </label>
      <select
        id="lang-select"
        className="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as (typeof LANGUAGES)[number]["code"])}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName} ({l.englishName})
            {l.packStatus !== "complete" ? ` · ${l.packStatus} pack` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={showOriginal ? "lang-original active" : "lang-original"}
        aria-pressed={showOriginal}
        onClick={() => setShowOriginal(!showOriginal)}
        title={t("action.showOriginal")}
      >
        EN
      </button>
    </div>
  );
}
