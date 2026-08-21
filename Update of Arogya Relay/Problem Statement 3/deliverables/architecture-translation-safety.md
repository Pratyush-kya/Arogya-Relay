# Problem Statement 3 — Multilingual & Voice-Ready: Architecture & Translation Safety

## What was built

Arogya Relay now has an application-wide internationalisation (i18n) layer plus a
clinical glossary and a progressive read-aloud interface. It is offline-first: the
core multilingual experience works with no network and no external translation
API.

### Files

| File | Purpose |
| --- | --- |
| `lib/i18n/types.ts` | Language registry, `LanguageMeta`, `CatalogEntry`, safety tiers, `VoiceCapability`. |
| `lib/i18n/catalog.ts` | Typed locale catalog (8 languages) with English fallback and review status. |
| `lib/i18n/index.ts` | Runtime helpers: `t()`, `translate()`, `resolveLanguage()`, `missingKeys()`, `isPatientSafe()`, `detectVoice()`. Pure, Node-testable. |
| `lib/i18n/provider.tsx` | `LanguageProvider`, `useLanguage()` hook, `<html lang/dir>` sync, `localStorage` preference. |
| `lib/i18n/glossary.ts` | Clinical concept registry (symptoms, medicines) with stable IDs + SNOMED/LOINC-style codes. |
| `lib/i18n/voice.ts` | `speak()` / `stopSpeaking()` over the on-device Web Speech API (no upload). |
| `app/language-switcher.tsx` | Accessible topbar switcher (8 languages + "Show original English"). |
| `app/read-aloud.tsx` | Tap-to-hear / replay / speed control, graceful fallback when unsupported. |
| `app/layout.tsx` | Wraps the app in `LanguageProvider`. |
| `app/page.tsx` | Nav + overview headings localised via the catalog; switcher mounted. |
| `app/care-guidance.tsx` | Read-aloud added to the guidance explanation. |
| `tests/i18n.test.mts` | 13 tests covering registry, fallback, tiers, glossary, capability. |

## Languages (mandatory first release)

English, Hindi, Odia, Bengali, Assamese, Telugu, Marathi, Santali — all eight
mandatory languages are present in the registry. Adding the remaining scheduled
Indian languages (and a separately reviewed Khasi pack for Meghalaya) is a
**data change** in `LANGUAGES` + a catalog entry; no feature code changes.

| Language | Pack status | Notes |
| --- | --- | --- |
| English | complete | Approved baseline (source). |
| Hindi | complete | Human-reviewed translations. |
| Odia | complete | Human-reviewed translations. |
| Bengali | substantial | Machine-drafted, flagged `machine_draft`. |
| Assamese | substantial | Machine-drafted, flagged `machine_draft`. |
| Telugu | substantial | Machine-drafted, flagged `machine_draft`. |
| Marathi | substantial | Machine-drafted, flagged `machine_draft`. |
| Santali (Ol Chiki) | partial | Machine-drafted, flagged `machine_draft`. |

## Translation safety tiers

- **Tier 1 (safety-critical):** emergency actions, red flags, medicine
  names/strengths/timings, allergy warnings, consent, referral and missed-dose
  instructions. These exist **only in English** as the approved baseline and are
  **never machine-translated at runtime**. `isPatientSafe(key, lang)` returns
  `false` for any non-English Tier 1 string, so production gating can exclude
  them. The "Show original English" toggle always renders them verbatim.
- **Tier 2 (clinical explanatory):** symptom questions, home-care explanations,
  evidence summaries. May be drafted but require review before inclusion.
- **Tier 3 (normal UI):** navigation, buttons, filters, empty states,
  non-clinical help. Standard workflow.

## Language-neutral clinical meaning

Clinical concepts (`lib/i18n/glossary.ts`) are stored separately from display
labels using **stable concept IDs** and illustrative SNOMED CT / LOINC / FHIR /
UCUM-style codes. Equivalent symptom selections in different languages resolve to
the same internal concept and therefore the same triage result. A brand is never
translated into a different drug; decimals and units are preserved exactly.

## Offline & privacy

- The catalog and glossary are bundled assets — no API call, no data leaves the
  device for translation.
- An optional BHASHINI adapter is **not** wired in; it must stay disabled unless
  official access, privacy terms and credentials are provisioned. Coordinates,
  prescriptions and histories are never sent to any translation provider.
- Language is a **device preference** (`localStorage`), never a medical fact.

## Known limitations (clearly flagged, not called "approved")

- Bengali/Assamese/Telugu/Marathi/Santali packs are `machine_draft` and must be
  clinician + native-reviewer approved before production patient-facing use.
- Romanized input, automatic language detection, and Indic speech recognition
  (AI4Bharat components) are **evaluated but not yet integrated**; the read-aloud
  path uses the platform Web Speech API only and never records.
- Right-to-left readiness is reserved (`dir` plumbing present, all current
  languages are `ltr`).

## Verification

- `npm run build` ✅
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `npm test` ✅ (44 tests, incl. 13 new i18n/glossary tests)
- Manual browser check: switching to Hindi re-renders nav/headings; Tier 1
  emergency strings stay English; no hydration error.
