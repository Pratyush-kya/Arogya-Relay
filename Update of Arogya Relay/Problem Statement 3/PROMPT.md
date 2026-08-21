# Problem Statement 3: Indian Multilingual and Voice-Ready Experience

Copy everything below this line into your coding agent.

---

Work directly in:

`/home/pratyush/Project/Website/Arogya-Relay`

Act as a combined Indian-language NLP engineer, Odia specialist, clinical translator, health-literacy expert, accessibility specialist, medical informatician, UX writer and senior React/Next.js engineer.

Inspect the existing project first. Preserve Next.js 16, Vinext, Cloudflare Worker, the responsive dashboard and offline-first behavior. Do not use an external translation widget that transmits the entire page.

## Objective

Make Arogya Relay multilingual, offline-capable and understandable to local patients and community health workers.

Mandatory first-release languages:

- English
- Hindi
- Odia
- Bengali
- Assamese
- Telugu
- Marathi
- Santali

Design a registry that can add all 22 scheduled Indian languages without feature-code changes. Allow a separately reviewed Khasi pack for Meghalaya deployments.

## Translation safety tiers

**Tier 1 — safety-critical:** emergency actions, red flags, medicine names/strengths/timings, allergy warnings, consent, referral and missed-dose instructions. These require versioned human translation approved by a clinician and native-language reviewer. Never machine-translate them at runtime.

**Tier 2 — clinical explanatory:** symptom questions, home-care explanations, appointment preparation and evidence summaries. Automated translation may draft them, but they require review before inclusion in an approved offline pack.

**Tier 3 — normal UI:** navigation, buttons, filters, empty states and non-clinical help. These may use standard localization workflows.

## Internationalisation architecture

- Extract every visible string into typed locale catalogs.
- Do not concatenate translated sentence fragments.
- Support plurals, date/time, units and Indian number formatting.
- Set correct `lang` attributes and support future RTL languages with `dir`.
- Use Unicode and locally hosted Noto fonts for Latin, Devanagari, Odia, Bengali/Assamese, Telugu and Ol Chiki.
- Avoid essential text inside images.
- Let users change language without losing a screening.
- Store language as a device preference, not a medical fact.
- Offer “show original English” for clinical instructions.
- Do not rely on browser auto-translation.

## Language-neutral clinical meaning

Store clinical concepts separately from display labels using stable IDs and, where appropriate and permitted, SNOMED CT, LOINC, FHIR coding and UCUM-style units. Equivalent symptom selections in different languages must resolve to the same internal concept and triage result.

For each term store canonical concept, language, native-script label, romanized synonyms, plain-language explanation, review status, reviewer, version and review date.

## Local NLP

Evaluate AI4Bharat components after checking licences, model size, browser compatibility and target-language quality:

- IndicLID for native/romanized language identification;
- IndicTrans2 for assisted scheduled-language translation;
- IndicXlit-style romanized input support;
- IndicConformer or another approved model for later speech recognition.

Never trust automatic language detection silently. Show the detected language and let the user correct it.

For chatbot input:

1. preserve the original text;
2. use/confirm the language;
3. normalize romanized spelling without deleting the original;
4. map symptom words to canonical concepts;
5. retrieve using concepts and multilingual embeddings;
6. generate a structured answer;
7. render it through approved language templates;
8. preserve citations, numbers, drug names and units exactly;
9. offer original and English views.

Ship approved locale packs and a small clinical glossary for offline use. The core feature must not require an online translation API.

Create an optional BHASHINI adapter, disabled unless official access, privacy terms and credentials are provisioned. Never send identifiers, coordinates, prescriptions or full histories to translation providers.

## Voice and low-literacy support

Progressively add tap-to-hear, replay, speed, large touch targets, visual symptom choices, read-aloud emergency/referral instructions and opt-in voice input. Show recording state, let users edit transcripts, and delete raw audio after transcription by default.

Detect speech capability. Do not claim every device has an accurate voice. Fall back to approved recorded audio or text. Never start recording automatically.

## Clinical glossary safety

Protect terms for symptoms, body parts, negation, duration, pregnancy, child health, medicine form/strength/dose/route/timing, allergies, referrals and “before food,” “after food,” “as needed,” and “do not double the dose.”

Never translate a brand into a different drug. Preserve decimal quantities and units. Visually distinguish “once daily” from “one tablet.” Avoid ambiguous abbreviations.

## Review workflow

Implement `draft -> linguist reviewed -> clinician reviewed -> approved -> retired`. Only approved Tier 1 text may be patient-facing in production mode. Maintain version history/rollback and record the translation version used for each signed instruction.

## Accessibility

Meet WCAG 2.2 AA expectations: keyboard use, screen-reader labels, correct language spans, sufficient contrast, 200% zoom, unclipped scripts/matras, touch targets, reduced motion and localized announced errors.

## Testing

Test every required locale, missing keys, English fallback, script/font rendering, mobile overflow, Hindi-English and Odia-English mixing, romanized input, detection correction, number/dose/unit preservation, negation, medicine names, emergency parity, RTL readiness, screen-reader attributes, offline packs, mid-form switching and regressions.

Create clinician-reviewed synthetic English/Hindi/Odia cases. Semantically identical inputs must produce identical internal urgency.

## Deliverables

Implement and provide:

1. Typed language registry and locale architecture.
2. Complete English/Hindi/Odia UI packs.
3. Substantial first packs for the five additional languages.
4. Clinical concept/glossary structure.
5. Translation review/version workflow.
6. Integrated language switcher.
7. Offline packs.
8. Optional detection/translation adapters.
9. Progressive voice/read-aloud interface.
10. Translation-safety documentation.
11. Localization/accessibility tests.
12. Build, lint and test results.

Use synthetic data. Clearly list untranslated, machine-drafted and unreviewed material. Never call machine translation clinically approved.
