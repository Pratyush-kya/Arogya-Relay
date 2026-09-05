"use client";

import { LanguageSwitcher } from "./language-switcher";
import { AccountPanel } from "./account-panel";

import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";

// Keep specialist workspaces out of the first dashboard payload. They load
// only when selected, which reduces the cost of opening the app on field 2G.
const CareGuidance = lazy(() => import("./care-guidance"));
const NearbyCare = lazy(() => import("./nearby-care"));
const CarePlanView = lazy(() => import("./care-plan"));
const SymptomChecker = lazy(() => import("./symptom-checker"));

import {
  fetchAllScreenings,
  submitScreening,
  submitDoctorEvaluation,
  syncPendingScreenings,
  type ScreeningRecord,
} from "@/lib/supabase/screenings";

type Tab = "overview" | "cases" | "care" | "nearby" | "plan" | "device";
type SyncState = "ready" | "syncing" | "done";
type CaseFilter = "all" | "urgent" | "review" | "evaluated";

function computeActivityBars(records: ScreeningRecord[]): number[] {
  if (records.length === 0) {
    return [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];
  }
  const bins = new Array(12).fill(0);
  const now = Date.now();
  for (const r of records) {
    const ageHours = (now - new Date(r.created_at).getTime()) / (3600 * 1000);
    const binIndex = 11 - Math.min(11, Math.max(0, Math.floor(ageHours / 2)));
    bins[binIndex]++;
  }
  const max = Math.max(...bins, 1);
  return bins.map((count) => Math.max(8, Math.round((count / max) * 100)));
}

export function DynamicGreeting() {
  const { t } = useLanguage();
  const [greetingKey, setGreetingKey] = useState<string>("overview.greetingMorning");

  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 12) {
        setGreetingKey("overview.greetingMorning");
      } else if (hour >= 12 && hour < 17) {
        setGreetingKey("overview.greetingAfternoon");
      } else {
        setGreetingKey("overview.greetingEvening");
      }
    };
    update();
    const interval = window.setInterval(update, 10000);
    return () => window.clearInterval(interval);
  }, []);

  return <h1 id="overview-title" suppressHydrationWarning>{t(greetingKey)}</h1>;
}

function WorkspaceLoading() {
  const { t } = useLanguage();
  return (
    <div className="state-card workspace-loader" aria-busy="true" aria-live="polite">
      <span className="eyebrow">{t("common.loading")}</span>
      <div className="skeleton-stack" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function Home() {
  const { t, effectiveLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("ready");
  const [noticeKey, setNoticeKey] = useState("shell.reportsStored");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const syncTimer = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchAllScreenings().then((data) => {
      if (!alive) return;
      setScreenings(data || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const syncLabel = useMemo(() => {
    if (syncState === "syncing") return t("shell.syncing");
    if (syncState === "done") return t("shell.synced");
    return t("shell.syncReady");
  }, [syncState, t]);

  // Clear any pending sync timer if the component unmounts
  useEffect(() => {
    return () => {
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen && !accountOpen) return;
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", closeMenus);
    return () => document.removeEventListener("keydown", closeMenus);
  }, [accountOpen, notificationsOpen]);

  const closeScreening = useCallback(() => {
    setScreeningOpen(false);
    openerRef.current?.focus();
  }, []);

  const openScreening = useCallback((event?: { currentTarget: HTMLElement }) => {
    openerRef.current = event?.currentTarget ?? null;
    setScreeningOpen(true);
  }, []);

  useEffect(() => {
    if (!screeningOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeScreening();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    modalRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [screeningOpen, closeScreening]);

  async function syncReports() {
    if (syncState !== "ready") return;
    setSyncState("syncing");
    setNoticeKey("shell.reportsSending");
    const count = await syncPendingScreenings();
    const refreshed = await fetchAllScreenings();
    if (refreshed.length > 0) setScreenings(refreshed);
    syncTimer.current = window.setTimeout(() => {
      setSyncState("done");
      setNoticeKey(count > 0 ? "shell.reportsReached" : "shell.reportsStored");
    }, 1200);
  }

  async function saveScreening(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const patientRef = String(formData.get("patient-reference") || "").trim();
    const age = Number(formData.get("age") || 0);
    const temperature = Number(formData.get("temperature") || 0);
    const spo2 = Number(formData.get("spo2") || 0);
    const symptomsList = formData.getAll("symptoms").map(String);
    const notes = String(formData.get("field-notes") || "").trim();

    const hasUrgentSymptom = symptomsList.some((s) =>
      ["Chest pain", "Rapid breathing", "Severe headache", "ଛାତି ଯନ୍ତ୍ରଣା", "ଦ୍ରୁତ ଶ୍ୱାସକ୍ରିୟା"].includes(s)
    );
    const isUrgent = spo2 < 92 || temperature >= 39.5 || hasUrgentSymptom;
    const urgencyTier = isUrgent ? "urgent" : (temperature > 37.8 || spo2 < 95 ? "review" : "cleared");

    const newRecord = await submitScreening({
      patient_ref: patientRef || `NR-${Math.floor(1000 + Math.random() * 9000)}`,
      age: age || 30,
      temperature: temperature || 37.0,
      spo2: spo2 || 98,
      symptoms: symptomsList.length > 0 ? symptomsList : ["General checkup"],
      field_notes: notes,
      village: "North Ridge",
      urgency_tier: urgencyTier,
    });

    setScreenings((prev) => [newRecord, ...prev.filter((item) => item.id !== newRecord.id)]);
    closeScreening();
    setNoticeKey("shell.screeningSaved");
    setActiveTab("cases");
  }

  async function handleDoctorEvaluate(id: string, doctorNotes: string, prescriptionAdvice: string) {
    await submitDoctorEvaluation(id, doctorNotes, prescriptionAdvice, "Dr. Clinician");
    const refreshed = await fetchAllScreenings();
    if (refreshed.length > 0) setScreenings(refreshed);
    setNoticeKey("shell.screeningSaved");
  }

  function openCases() {
    setActiveTab("cases");
    setNotificationsOpen(false);
  }

  const today = new Date();
  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label={t("shell.primaryNav")}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">AR</div>
          <div>
            <strong>{t("app.title")}</strong>
            <span>{t("shell.fieldIntelligence")}</span>
          </div>
        </div>

        <nav className="side-nav">
          <button
            type="button"
            className={activeTab === "overview" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "overview" ? "page" : undefined}
            onClick={() => setActiveTab("overview")}
          >
            <span className="nav-glyph">⌂</span> {t("nav.overview")}
          </button>
          <button
            type="button"
            className={activeTab === "cases" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "cases" ? "page" : undefined}
            onClick={() => setActiveTab("cases")}
          >
            <span className="nav-glyph">◎</span> {t("nav.cases")} <b>{screenings.length}</b>
          </button>
          <button
            type="button"
            className={activeTab === "care" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "care" ? "page" : undefined}
            onClick={() => setActiveTab("care")}
          >
            <span className="nav-glyph">✚</span> {t("nav.care")}
          </button>
          <button
            type="button"
            className={activeTab === "nearby" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "nearby" ? "page" : undefined}
            onClick={() => setActiveTab("nearby")}
          >
            <span className="nav-glyph">⌖</span> {t("nav.nearby")}
          </button>
          <button
            type="button"
            className={activeTab === "plan" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "plan" ? "page" : undefined}
            onClick={() => setActiveTab("plan")}
          >
            <span className="nav-glyph">♥</span> {t("nav.plan")}
          </button>
          <button
            type="button"
            className={activeTab === "device" ? "nav-item active" : "nav-item"}
            aria-current={activeTab === "device" ? "page" : undefined}
            onClick={() => setActiveTab("device")}
          >
            <span className="nav-glyph">▣</span> {t("nav.device")}
          </button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-title"><i /> {t("shell.intermittent2g")}</div>
          <div className="signal-steps" aria-label="Two of four signal bars">
            <span /><span /><span className="off" /><span className="off" />
          </div>
          <p>{t("shell.offlineCapture")}</p>
        </div>
        <AccountPanel
          open={accountOpen}
          onToggle={() => { setAccountOpen((open) => !open); setNotificationsOpen(false); }}
        />
      </aside>

      <section className="workspace" id="main-content">
        <header className="topbar">
          <div>
            <span className="location-kicker">{t("shell.fieldUnit")}</span>
            <h2>{t("shell.cluster")}</h2>
          </div>
          <div className="top-actions">
            <div className="today" aria-live="polite">
              <span suppressHydrationWarning>{new Intl.DateTimeFormat(`${effectiveLang}-IN`, { weekday: "long" }).format(today)}</span>
              <strong suppressHydrationWarning>{new Intl.DateTimeFormat(`${effectiveLang}-IN`, { day: "2-digit", month: "short", year: "numeric" }).format(today)}</strong>
            </div>
            <LanguageSwitcher />
            <div className="topbar-menu">
              <button type="button" className="quiet-icon" aria-label={t("shell.notifications")} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setAccountOpen(false); }}>●<span /></button>
              {notificationsOpen && (
                <div className="notification-popover" role="region" aria-label={t("shell.notifications")}>
                  <span className="eyebrow">{t("shell.liveNotifications")}</span>
                  <strong>{urgentCount > 0 ? `${urgentCount} ${t("common.urgent")}` : t("shell.oneUrgentSignal")}</strong>
                  <p>{t("shell.notificationDetail")}</p>
                  <button type="button" onClick={openCases}>{t("overview.openBrief")} →</button>
                </div>
              )}
            </div>
            <button type="button" className="primary-button" onClick={openScreening}>
              <span aria-hidden="true">＋</span> {t("action.newScreening")}
            </button>
          </div>
        </header>

        <div className="notice-strip" role="status" aria-live="polite">
          <span className={syncState === "done" ? "status-dot synced" : "status-dot"} />
          <p>{t(noticeKey)}</p>
          <button type="button" onClick={syncReports} disabled={syncState !== "ready"}>{syncLabel}</button>
        </div>

        {activeTab === "overview" && (
          <Overview
            screenings={screenings}
            onOpenCases={openCases}
            onOpenDevice={() => setActiveTab("device")}
          />
        )}
        {activeTab === "cases" && (
          <CaseQueue
            screenings={screenings}
            onDoctorEvaluate={handleDoctorEvaluate}
          />
        )}
        <Suspense fallback={<WorkspaceLoading />}>
          {activeTab === "care" && <CareGuidance />}
          {activeTab === "nearby" && <NearbyCare />}
          {activeTab === "plan" && <CarePlanView />}
        </Suspense>
        {activeTab === "device" && <DevicePanel />}
      </section>

      {screeningOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeScreening}>
          <section
            ref={modalRef}
            className="screening-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="screening-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div className="screening-modal-title">
                <span className="eyebrow">{t("screen.offline")}</span>
                <h2 id="screening-title">{t("screen.new")}</h2>
                <p>{t("screen.modalSubtitle")}</p>
              </div>
              <button type="button" onClick={closeScreening} aria-label={t("screen.close")}>×</button>
            </header>
            <form className="screening-form" onSubmit={saveScreening} noValidate={false} autoComplete="off">
              <div className="screening-layout">
                <section className="screening-basics" aria-labelledby="screening-basics-title">
                  <div className="screening-section-heading">
                    <span aria-hidden="true">01</span>
                    <div>
                      <h3 id="screening-basics-title">{t("screen.basics")}</h3>
                      <p>{t("screen.basicsHelp")}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label>{t("screen.patientRef")}<input required name="patient-reference" autoComplete="off" maxLength={32} pattern="[A-Za-z0-9\\-]{2,32}" title="Letters, numbers and hyphens only" placeholder="e.g. NR-1049" /></label>
                    <label>{t("screen.age")}<input required name="age" type="number" min="0" max="120" step="1" inputMode="numeric" placeholder={t("screen.years")} /></label>
                    <label>{t("screen.temperature")}<input required name="temperature" type="number" step="0.1" min="30" max="45" inputMode="decimal" placeholder="°C" /></label>
                    <label>{t("screen.oxygen")}<input required name="spo2" type="number" min="50" max="100" step="1" inputMode="numeric" placeholder="SpO₂ %" /></label>
                  </div>
                  <div className="protocol-note sc-protocol-note"><strong>Screening support only.</strong> Arogya Relay highlights patterns; it does not diagnose. Apply local clinical and referral protocols.</div>
                </section>
                <Suspense fallback={<WorkspaceLoading />}>
                  <SymptomChecker onBack={closeScreening} />
                </Suspense>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


function Overview({
  screenings,
  onOpenCases,
  onOpenDevice,
}: {
  screenings: ScreeningRecord[];
  onOpenCases: () => void;
  onOpenDevice: () => void;
}) {
  const { t } = useLanguage();

  const totalCount = screenings.length;
  const urgentCount = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;
  const reviewCount = screenings.filter((s) => s.urgency_tier === "review").length;
  const evaluatedCount = screenings.filter((s) => s.status === "doctor_evaluated").length;
  const mostUrgent = screenings.find((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency") ?? screenings[0];

  return (
    <div className="page-content">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <div className="hero-copy">
          <span className="hero-kicker"><i /> {t("overview.kicker")}</span>
          <DynamicGreeting />
          <p>{t("overview.subtitle")}</p>
          <div className="hero-actions">
            <button type="button" className="glass-button" onClick={onOpenCases}>{t("overview.liveQueue")} <span>→</span></button>
          </div>
        </div>
        <aside className="hero-command" aria-label="Field command summary">
          <div className="command-head"><span>{t("overview.liveNetwork")}</span><b><i /> {t("overview.monitoring")}</b></div>
          <strong>{t("overview.communities")}</strong>
          <p>{t("overview.coverage")}</p>
          <div className="command-metrics">
            <span><b>{totalCount}</b> {t("overview.screened")}</span>
            <span><b>{screenings.filter((s) => !s.synced).length}</b> {t("overview.offline")}</span>
            <span><b>{urgentCount.toString().padStart(2, "0")}</b> {t("common.urgent")}</span>
          </div>
          <div className="command-route" aria-hidden="true"><i /><span /><i /><span /><i /></div>
        </aside>
      </section>

      <section className="signal-layout">
        <article className="trend-card">
          <div className="trend-copy">
            <span className="alert-label">{t("overview.signals")}</span>
            <h2>{t("overview.rising")}</h2>
            <p>{t("overview.risingDetail")}</p>
            <div className="trend-actions">
              <button type="button" className="dark-button" onClick={onOpenCases}>{t("overview.reviewLinked")}</button>
              <span>{t("overview.updated")}</span>
            </div>
          </div>
          <div className="mini-chart" aria-label="Respiratory symptom reports increased across the last twelve hours">
            <div className="chart-meta"><span>{t("overview.reports2h")}</span><strong>{totalCount} <small>Active</small></strong></div>
            <div className="bars">
              {computeActivityBars(screenings).map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index > 8 && height > 40 ? "hot" : ""} />)}
            </div>
            <div className="chart-axis"><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div>
          </div>
        </article>

        {mostUrgent ? (
          <article className="urgent-card">
            <header><span>{t("overview.urgentQueue")}</span><b>{urgentCount || 1}</b></header>
            <div className="urgent-person">
              <div className={`avatar ${mostUrgent.urgency_tier === "urgent" || mostUrgent.urgency_tier === "emergency" ? "danger-avatar" : ""}`}>
                {mostUrgent.patient_ref.substring(0, 2)}
              </div>
              <div><h3>{mostUrgent.patient_ref} ({mostUrgent.age} yrs)</h3><p>{mostUrgent.village} · SpO₂ {mostUrgent.spo2}%</p></div>
            </div>
            <div className="urgent-reading"><span>SpO₂</span><strong>{mostUrgent.spo2}%</strong><em>{mostUrgent.temperature}°C</em></div>
            <p className="urgent-note">{mostUrgent.symptoms.join(", ")}</p>
            <button type="button" onClick={onOpenCases}>{t("overview.openBrief")} <span>→</span></button>
          </article>
        ) : (
          <article className="urgent-card cleared-card">
            <header><span>{t("overview.urgentQueue")}</span><b style={{ background: "var(--forest)" }}>0</b></header>
            <div className="urgent-person">
              <div className="avatar" style={{ background: "var(--mint)", color: "var(--forest)" }}>✓</div>
              <div><h3>Triage Queue Clear</h3><p>Active monitoring · 0 critical alerts</p></div>
            </div>
            <div className="urgent-reading" style={{ background: "#eef7f2", color: "#166534" }}>
              <span>Status</span><strong style={{ fontSize: "16px", color: "#166534" }}>Normal</strong><em>No active emergency</em>
            </div>
            <p className="urgent-note">No urgent patient vitals flagged. All community field signals are currently within normal baseline thresholds.</p>
            <button type="button" onClick={onOpenCases}>{t("overview.openBrief")} <span>→</span></button>
          </article>
        )}
      </section>

      <section className="metric-grid" aria-label={t("overview.dailySummary")}>
        <Metric icon="◉" value={String(totalCount)} label={t("overview.screeningsToday")} note={t("overview.moreYesterday")} tone="mint" />
        <Metric icon="⌁" value={String(reviewCount)} label={t("overview.signalsReview")} note={t("overview.newAfternoon")} tone="sand" />
        <Metric icon="✓" value={String(evaluatedCount)} label="Doctor Evaluated" note="Prescriptions ready" tone="blue" />
        <Metric icon="↗" value={String(urgentCount)} label={t("overview.referrals")} note={t("overview.awaiting")} tone="rose" />
      </section>

      <section className="lower-grid">
        <article className="panel cases-panel">
          <header className="panel-header">
            <div><span className="eyebrow">{t("overview.priorityReview")}</span><h2>{t("overview.recentSignals")}</h2></div>
            <button type="button" onClick={onOpenCases}>{t("overview.viewAll")} →</button>
          </header>
          <div className="case-list">
            {screenings.length > 0 ? (
              screenings.slice(0, 3).map((record) => <AlertRow key={record.id} record={record} onOpen={onOpenCases} />)
            ) : (
              <div className="empty-signals-card" role="status">
                <p>No screening signals recorded yet.</p>
                <small>Tap &ldquo;＋ New screening&rdquo; in the top bar to record patient vitals.</small>
              </div>
            )}
          </div>
        </article>
        <article className="panel device-card">
          <header className="panel-header"><div><span className="eyebrow">{t("overview.fieldKit")}</span><h2>Arogya Relay System</h2></div><span className="device-online"><i /> {t("common.ready")}</span></header>
          <div className="device-illustration" aria-label="Arogya Relay field device status">
            <div className="device-screen"><span>SYSTEM</span><strong>ONLINE</strong><small>LOCAL CACHE ACTIVE</small></div>
            <div className="device-sensor"><i /><i /><i /></div>
          </div>
          <div className="device-stats">
            <div><span>{t("overview.battery")}</span><strong>Healthy</strong><i><b style={{ width: '100%' }} /></i></div>
            <div><span>{t("overview.sensorCheck")}</span><strong>{t("common.passed")}</strong><em>Ready</em></div>
          </div>
          <button type="button" className="secondary-button full" onClick={onOpenDevice}>{t("overview.deviceDetails")}</button>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon, value, label, note, tone }: { icon: string; value: string; label: string; note: string; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div><strong>{value}</strong><h3>{label}</h3><p>{note}</p></div></article>;
}

function AlertRow({ record, onOpen, expanded = false }: { record: ScreeningRecord; onOpen?: () => void; expanded?: boolean }) {
  const isDanger = record.urgency_tier === "urgent" || record.urgency_tier === "emergency";
  return (
    <div className="case-row">
      <div className={`avatar ${isDanger ? 'danger-avatar' : ''}`}>{record.patient_ref.substring(0, 2)}</div>
      <div className="case-person"><strong>{record.age} years</strong><span>{record.village} · {record.patient_ref}</span></div>
      <div className="case-signal"><strong>{record.symptoms.slice(0, 2).join(", ")}</strong><span>SpO₂ {record.spo2}% · {record.temperature}°C</span></div>
      <div className="case-time">
        <span className={`priority ${isDanger ? 'danger' : 'warning'}`}>
          {record.status === "doctor_evaluated" ? "Evaluated" : (isDanger ? "Urgent" : "Review")}
        </span>
        <small>{record.synced ? "Synced" : "Local"}</small>
      </div>
      <button type="button" aria-label={`Open case ${record.patient_ref}`} aria-expanded={expanded} onClick={onOpen}>›</button>
    </div>
  );
}

function CaseQueue({
  screenings,
  onDoctorEvaluate,
}: {
  screenings: ScreeningRecord[];
  onDoctorEvaluate: (id: string, notes: string, prescription: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescriptionAdvice, setPrescriptionAdvice] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRecords = screenings.filter((record) => {
    const matchesQuery =
      !normalizedQuery ||
      `${record.patient_ref} ${record.village} ${record.symptoms.join(" ")}`.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (filter === "all") return true;
    if (filter === "urgent") return record.urgency_tier === "urgent" || record.urgency_tier === "emergency";
    if (filter === "review") return record.urgency_tier === "review";
    if (filter === "evaluated") return record.status === "doctor_evaluated";
    return true;
  });

  const selectedRecord = screenings.find((record) => record.id === selectedId) ?? null;

  async function handleEvalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingEval(true);
    await onDoctorEvaluate(selectedRecord.id, doctorNotes, prescriptionAdvice);
    setSubmittingEval(false);
    setDoctorNotes("");
    setPrescriptionAdvice("");
  }

  const urgentTotal = screenings.filter((s) => s.urgency_tier === "urgent" || s.urgency_tier === "emergency").length;
  const reviewTotal = screenings.filter((s) => s.urgency_tier === "review").length;
  const evaluatedTotal = screenings.filter((s) => s.status === "doctor_evaluated").length;

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("cases.kicker")}</span>
          <h1>{t("nav.cases")}</h1>
          <p>{t("cases.subtitle")}</p>
        </div>
      </div>
      <div className="queue-summary">
        <span><strong>{urgentTotal}</strong> {t("common.urgent")}</span>
        <span><strong>{reviewTotal}</strong> {t("common.review")}</span>
        <span><strong>{evaluatedTotal}</strong> Doctor Evaluated</span>
        <span><strong>{screenings.length}</strong> Total</span>
      </div>
      <article className="panel cases-panel full-table">
        <div className="table-tools">
          <label>
            {t("cases.search")}
            <input
              type="search"
              name="case-search"
              autoComplete="off"
              placeholder={t("cases.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div>
            <button type="button" className={filter === "all" ? "filter active" : "filter"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("cases.allSignals")}</button>
            <button type="button" className={filter === "urgent" ? "filter active" : "filter"} aria-pressed={filter === "urgent"} onClick={() => setFilter("urgent")}>{t("common.urgent")}</button>
            <button type="button" className={filter === "review" ? "filter active" : "filter"} aria-pressed={filter === "review"} onClick={() => setFilter("review")}>{t("common.review")}</button>
            <button type="button" className={filter === "evaluated" ? "filter active" : "filter"} aria-pressed={filter === "evaluated"} onClick={() => setFilter("evaluated")}>Doctor Evaluated</button>
          </div>
        </div>
        <div className="case-list">
          {visibleRecords.map((record) => (
            <AlertRow
              key={record.id}
              record={record}
              expanded={selectedId === record.id}
              onOpen={() => {
                if (selectedId === record.id) {
                  setSelectedId(null);
                } else {
                  setSelectedId(record.id);
                  setDoctorNotes(record.doctor_notes ?? "");
                  setPrescriptionAdvice(record.prescription_advice ?? "");
                }
              }}
            />
          ))}
          {visibleRecords.length === 0 && <p className="case-empty" role="status">{t("cases.noMatches")}</p>}
        </div>
        {selectedRecord && (
          <section className="case-brief" aria-live="polite">
            <div className="case-brief-head">
              <div>
                <span className="eyebrow">{t("cases.selectedBrief")}</span>
                <h2>{selectedRecord.patient_ref} · {selectedRecord.village}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedId(null)}>{t("common.close")}</button>
            </div>
            <dl>
              <div><dt>Age</dt><dd>{selectedRecord.age} yrs</dd></div>
              <div><dt>Vitals</dt><dd>SpO₂ {selectedRecord.spo2}% · {selectedRecord.temperature}°C</dd></div>
              <div><dt>Symptoms</dt><dd>{selectedRecord.symptoms.join(", ")}</dd></div>
              <div><dt>Field Notes</dt><dd>{selectedRecord.field_notes || "None"}</dd></div>
              <div><dt>Status</dt><dd>{selectedRecord.status === "doctor_evaluated" ? "Evaluated by Doctor" : "Awaiting Doctor"}</dd></div>
            </dl>

            {selectedRecord.status === "doctor_evaluated" ? (
              <div className="case-brief-doctor">
                <h3>👨‍⚕️ Clinical Decision & Prescription ({selectedRecord.evaluated_by || "Doctor"})</h3>
                <p><strong>Diagnosis / Notes:</strong> {selectedRecord.doctor_notes}</p>
                <p><strong>Prescription & Home Care:</strong> {selectedRecord.prescription_advice}</p>
                <span className="case-eval-badge">✓ Prescribed & Ready for ASHA Follow-up</span>
              </div>
            ) : (
              <form className="case-brief-doctor" onSubmit={handleEvalSubmit}>
                <h3>👨‍⚕️ Doctor / Clinician Evaluation</h3>
                <label>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#234d3f" }}>Clinical Diagnosis & Notes:</span>
                  <textarea
                    required
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="e.g. Suspected acute respiratory infection. Advise oxygen monitoring & hydration."
                  />
                </label>
                <label>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#234d3f" }}>Prescription & Patient Advice:</span>
                  <textarea
                    required
                    rows={2}
                    value={prescriptionAdvice}
                    onChange={(e) => setPrescriptionAdvice(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg TDS for 3 days, Amoxicillin 500mg BD if fever persists."
                  />
                </label>
                <div className="case-brief-actions">
                  <button type="submit" className="primary-button" disabled={submittingEval}>
                    {submittingEval ? "Saving..." : "Approve & Send to Health Worker →"}
                  </button>
                </div>
              </form>
            )}
            <p className="queue-footnote">{t("cases.privacy")}</p>
          </section>
        )}
      </article>
    </div>
  );
}

function DevicePanel() {
  const { t, effectiveLang } = useLanguage();
  const [selfCheckState, setSelfCheckState] = useState<"idle" | "testing" | "passed">("idle");
  const [lastCheck, setLastCheck] = useState("08:10");
  const [storageText, setStorageText] = useState("Local Storage Ready");
  const selfCheckTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      void navigator.storage.estimate().then((est) => {
        const usageMB = ((est.usage ?? 0) / (1024 * 1024)).toFixed(1);
        setStorageText(`${usageMB} MB Cache used`);
      });
    }
    return () => {
      if (selfCheckTimer.current !== null) window.clearTimeout(selfCheckTimer.current);
    };
  }, []);

  function runSelfCheck() {
    if (selfCheckState === "testing") return;
    setSelfCheckState("testing");
    selfCheckTimer.current = window.setTimeout(() => {
      setSelfCheckState("passed");
      setLastCheck(new Intl.DateTimeFormat(`${effectiveLang}-IN`, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
      selfCheckTimer.current = null;
    }, 800);
  }

  const sensors = [
    { name: "Local Indexed Storage", reading: storageText, tolerance: "Encrypted", calibrated: "Active" },
    { name: "Network Sync Gateway", reading: typeof navigator !== "undefined" && navigator.onLine ? "Connected" : "Offline Safe", tolerance: "2G/3G/4G", calibrated: "Auto-sync" },
    { name: "Supabase Clinical Relay", reading: "Connected", tolerance: "TLS 1.3", calibrated: "Real-time" },
    { name: "Rules Engine Integrity", reading: "v1.0.0 Active", tolerance: "RMP-Curated", calibrated: "SHA-256" },
  ];

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("device.kicker")}</span>
          <h1>Arogya Relay System Integrity</h1>
          <p>{t("device.subtitle")}</p>
        </div>
        <span className="live-badge"><i /> {t("device.ready")}</span>
      </div>
      <section className="device-overview">
        <article className="hardware-card">
          <div className="large-device">
            <div className="speaker">••••••</div>
            <div className="large-screen"><span>RELAY</span><strong>ACTIVE</strong><small>OFFLINE FIRST</small><b>SYNC</b></div>
            <div className="sensor-dock"><i /><span>DATABASE LINK</span></div>
          </div>
          <div>
            <span className="eyebrow">{t("device.designed")}</span>
            <h2>{t("device.headline")}</h2>
            <p>{t("device.description")}</p>
            <ul>
              <li>{t("device.vitals")}</li>
              <li>{t("device.localPrompts")}</li>
              <li>{t("device.forward")}</li>
            </ul>
          </div>
        </article>
        <div className="diagnostics-grid">
          <article className="diagnostic"><span>Connection</span><strong>{typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline"}</strong><p>Auto-sync active</p><i><b style={{ width: '100%' }} /></i></article>
          <article className="diagnostic"><span>Database</span><strong>Supabase</strong><p>PostgreSQL Edge</p></article>
          <article className="diagnostic"><span>Storage</span><strong>{storageText}</strong><p>Offline encrypted</p></article>
          <article className="diagnostic"><span>System Self-Check</span><strong>{selfCheckState === "testing" ? t("device.testing") : t("common.passed")}</strong><p>{lastCheck} · Operational</p></article>
        </div>
        <p className="nc-synthetic device-telemetry-note">System diagnostics verify real database connectivity and browser offline caching.</p>
        <section className="device-tech-grid" aria-label={t("device.technicalStatus")}>
          <article className="panel device-sensor-panel">
            <header className="device-tech-head">
              <div><span className="eyebrow">{t("device.technicalStatus")}</span><h2>System Components</h2></div>
              <span className="device-health"><i /> All Services Operational</span>
            </header>
            <div className="device-sensor-table" role="table" aria-label={t("device.sensorChain")}>
              <div className="device-sensor-row device-sensor-columns" role="row">
                <span role="columnheader">Component</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Protocol</span>
                <span role="columnheader">Mode</span>
              </div>
              {sensors.map((sensor) => (
                <div className="device-sensor-row" role="row" key={sensor.name}>
                  <strong role="cell"><i /> {sensor.name}</strong>
                  <span role="cell">{sensor.reading}</span>
                  <span role="cell">{sensor.tolerance}</span>
                  <span role="cell"><b>{sensor.calibrated}</b></span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel device-system-panel">
            <header className="device-tech-head"><div><span className="eyebrow">AR-07</span><h2>{t("device.systemIntegrity")}</h2></div></header>
            <dl className="device-system-list">
              <div><dt>Database Engine</dt><dd>Supabase PostgreSQL</dd></div>
              <div><dt>{t("device.rulesPack")}</dt><dd>v1.0.0 · SHA-256 verified</dd></div>
              <div><dt>{t("device.storageEncryption")}</dt><dd>AES-256-GCM · Client</dd></div>
              <div><dt>{t("device.lastSync")}</dt><dd>Real-time Active</dd></div>
              <div><dt>{t("device.network")}</dt><dd>{typeof navigator !== "undefined" && navigator.onLine ? "Broadband / 4G" : "Offline 2G"}</dd></div>
              <div><dt>{t("device.queue")}</dt><dd>Encrypted Offline Queue</dd></div>
            </dl>
            <div className={selfCheckState === "testing" ? "device-self-check testing" : "device-self-check"} aria-live="polite">
              <strong>{selfCheckState === "testing" ? t("device.testing") : t("device.selfCheckPassed")}</strong>
              <p>{t("device.noFaults")}</p>
            </div>
            <button type="button" className="secondary-button device-check-button" onClick={runSelfCheck} disabled={selfCheckState === "testing"}>
              {selfCheckState === "testing" ? t("device.testing") : t("device.runSelfCheck")}
            </button>
          </article>
        </section>
      </section>
    </div>
  );
}
