# Care Guidance — Hardware, Offline & Regulatory Limitations

**Prototype only.** Not a medical device. No real patient data. Synthetic data.

## Hardware / offline limitations

- **WebGPU / model inference not bundled.** The local no-key generation path
  (`@mlc-ai/web-llm`, Transformers.js) is planned but **not** shipped in this
  prototype. Guidance is produced by the deterministic engine + knowledge pack,
  which requires no GPU and no model download.
- **Model benchmarking pending.** No small quantized model has been benchmarked
  on realistic Android field devices yet, so none is selected by default.
- **Large-asset download consent.** When a model/knowledge-pack is later added,
  the UI must show download size and obtain consent before fetching, detect
  missing WebGPU, low memory, quota rejection and corrupted assets, and fall
  back to deterministic triage.
- **Browser storage is not the record of truth.** Cache Storage / IndexedDB /
  OPFS hold only derived device data (cached pack, model). Authoritative records
  live in D1; patient records are synthetic.

## Connectivity behavior

- **Offline-first:** the deterministic pack works with zero connectivity.
- **Online augmentation** (optional) uses only allow-listed national/WHO hosts,
  de-identified concepts, SSRF guards, timeouts and size/MIME validation. If the
  network is unavailable, the system transparently falls back to the offline
  pack and labels the mode `offline_fallback`.

## Regulatory / clinical limitations

- **Not clinically validated.** The synthetic gold set measures software
  behaviour (correct tier assignment, complete red-flag recall). It is **not** a
  clinical benchmark and must not be cited as clinical validation.
- **Rules require RMP sign-off.** Every rule and source is flagged
  `requiresRmpValidation`. Thresholds (e.g. IMCI fast-breathing cut-offs) are
  sourced from published guidance but must be approved by a Registered Medical
  Practitioner for the intended population.
- **No diagnosis or prescription.** The assistant never diagnoses, prescribes,
  recommends prescription drugs, or calculates doses. Medication instructions
  appear only with a signed doctor-authored order.
- **Jurisdiction.** Default sources are global (WHO) and Indian (MoHFW/ICMR).
  Local adaptation for other regions requires local clinical review.
- **Emergency routing.** India emergency number **112** is shown. Nearest-facility
  suggestions appear only when verified facility data exists; none is bundled in
  this prototype.
- **Medical-device status.** This is a research/UI prototype. Any real-patient
  deployment requires medical-device classification, clinical-safety validation,
  security assessment, and regulatory approval in each region.

## What this deliverable does NOT claim

- It does not claim diagnostic accuracy.
- It does not claim production readiness.
- It does not deploy anything as a medical device.
- It does not use real patient data.
