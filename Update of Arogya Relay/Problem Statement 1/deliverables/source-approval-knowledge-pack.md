# Care Guidance — Source Approval & Knowledge-Pack Documentation

The offline knowledge pack (`lib/clinical/knowledge-pack.ts`) is a small,
illustrative **starter corpus** for the prototype. Every source is national or
WHO-published, cited with its canonical URL, jurisdiction, population and
licence, and recorded with a content hash and version for staleness/integrity
checks.

| sourceId | Title | Publisher | Jurisdiction | Licence | Population |
| --- | --- | --- | --- | --- | --- |
| WHO-IMCI-2005 | IMCI Chart Booklet | WHO | Global / low-resource | WHO open content (attribution) | infant, child |
| WHO-EMT-2016 | Emergency Triage Assessment & Treatment | WHO | Global | WHO open content (attribution) | all |
| WHO-ANC-2016 | Antenatal Care recommendations | WHO | Global | WHO open content (attribution) | adult |
| MoHFW-IDSP | IDSP fever surveillance | MoHFW, India | India | GoI open data (attribution) | all |
| MoHFW-NHP | National Health Portal home care | MoHFW, India | India | GoI open content (attribution) | all |
| WHO-MH-GAP-2010 | mhGAP Intervention Guide | WHO | Global | WHO open content (attribution) | all |
| AHA-2020 | Heart attack warning signs | AHA / India summary | Global | Educational reuse (attribution) | adult, older_adult |

## Provenance & review

- **Versioned:** each source carries `version` (e.g. `2026.1`) and a `reviewDate`.
- **Hashed:** each source carries a `hash` for integrity/rollback.
- **Flagged:** every source and rule is `requiresRmpValidation: true`. The pack
  must be reviewed by a Registered Medical Practitioner before real-patient use.
- **No web scraping:** sources were selected by publisher reputation, not crawled.
  The online adapter only contacts a fixed allow-list and never scrapes
  Google Scholar or forums.

## Ingestion, not training

New approved documents flow through `lib/clinical/ingestion.ts`, which:

1. accepts PDF/HTML/JSON/FHIR;
2. validates type and size (≤ 20 MB);
3. extracts text while preserving page/section anchors;
4. de-identifies permitted clinical material;
5. rejects identifiable reports as general knowledge;
6. records legal basis, licence, reviewers;
7. chunks by section (deterministic keywords; model embeddings optional and
   stored only as derived device/index data);
8. detects duplicates and stale versions via content hash;
9. publishes a signed/versioned manifest;
10. retains the previous safe pack for rollback.

No model is fine-tuned or trained on ingested documents.

## Recommended expansion (post-RMP review)

Add current Indian guidelines (ICMR, DGHS/NHM, NCDC, CDSCO safety notices) and
ABDM/NRCeS references via the allow-listed adapter, each with provenance,
licence and reviewer sign-off recorded in `source_versions`.
