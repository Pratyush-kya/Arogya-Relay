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

type Tab = "overview" | "cases" | "care" | "nearby" | "plan" | "device";
type SyncState = "ready" | "syncing" | "done";
type CaseFilter = "all" | "urgent" | "review";

const alerts = [
  {
    id: "NR-1048",
    initials: "LM",
    age: "6 years",
    village: "North Ridge",
    signal: "Fever + rapid breathing",
    reading: "SpO₂ 91%",
    priority: "Urgent",
    tone: "danger",
    time: "12 min ago",
  },
  {
    id: "MR-0321",
    initials: "AK",
    age: "42 years",
    village: "Mawlynnong",
    signal: "Persistent fever",
    reading: "39.2°C",
    priority: "Review",
    tone: "warning",
    time: "46 min ago",
  },
  {
    id: "PV-0876",
    initials: "TS",
    age: "68 years",
    village: "Pynursla",
    signal: "Cough + low oxygen",
    reading: "SpO₂ 93%",
    priority: "Review",
    tone: "warning",
    time: "1 hr ago",
  },
];

const chartBars = [28, 39, 31, 47, 44, 58, 64, 52, 73, 68, 82, 88];

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
  const syncTimer = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const syncLabel = useMemo(() => {
    if (syncState === "syncing") return t("shell.syncing");
    if (syncState === "done") return t("shell.synced");
    return t("shell.syncReady");
  }, [syncState, t]);

  // Clear any pending sync timer if the component unmounts, so no state update
  // is attempted after teardown.
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
    // Return keyboard focus to whatever opened the dialog (WCAG 2.2, 2.4.3).
    openerRef.current?.focus();
  }, []);

  const openScreening = useCallback((event?: { currentTarget: HTMLElement }) => {
    openerRef.current = event?.currentTarget ?? null;
    setScreeningOpen(true);
  }, []);

  // Escape closes the dialog, and focus is moved into it when it opens.
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

    // Stop the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [screeningOpen, closeScreening]);

  function syncReports() {
    if (syncState !== "ready") return;
    setSyncState("syncing");
    setNoticeKey("shell.reportsSending");
    syncTimer.current = window.setTimeout(() => {
      setSyncState("done");
      setNoticeKey("shell.reportsReached");
    }, 1400);
  }

  function saveScreening(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closeScreening();
    setNoticeKey("shell.screeningSaved");
  }

  function openCases() {
    setActiveTab("cases");
    setNotificationsOpen(false);
  }

  const today = new Date();

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
            <span className="nav-glyph">◎</span> {t("nav.cases")} <b>3</b>
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
                  <strong>{t("shell.oneUrgentSignal")}</strong>
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
            onOpenCases={openCases}
            onOpenDevice={() => setActiveTab("device")}
          />
        )}
        {activeTab === "cases" && <CaseQueue />}
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

function Overview({ onOpenCases, onOpenDevice }: { onOpenCases: () => void; onOpenDevice: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="page-content">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <div className="hero-copy">
          <span className="hero-kicker"><i /> {t("overview.kicker")}</span>
          <h1 id="overview-title">{t("overview.greeting")}</h1>
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
            <span><b>47</b> {t("overview.screened")}</span>
            <span><b>14</b> {t("overview.offline")}</span>
            <span><b>01</b> {t("common.urgent")}</span>
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
            <div className="chart-meta"><span>{t("overview.reports2h")}</span><strong>12 <small>+38%</small></strong></div>
            <div className="bars">
              {chartBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index > 8 ? "hot" : ""} />)}
            </div>
            <div className="chart-axis"><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div>
          </div>
        </article>

        <article className="urgent-card">
          <header><span>{t("overview.urgentQueue")}</span><b>1</b></header>
          <div className="urgent-person">
            <div className="avatar danger-avatar">LM</div>
            <div><h3>{t("overview.child6")}</h3><p>North Ridge · NR-1048</p></div>
          </div>
          <div className="urgent-reading"><span>SpO₂</span><strong>91%</strong><em>{t("overview.lowReading")}</em></div>
          <p className="urgent-note">{t("overview.urgentNote")}</p>
          <button type="button" onClick={onOpenCases}>{t("overview.openBrief")} <span>→</span></button>
        </article>
      </section>

      <section className="metric-grid" aria-label={t("overview.dailySummary")}>
        <Metric icon="◉" value="47" label={t("overview.screeningsToday")} note={t("overview.moreYesterday")} tone="mint" />
        <Metric icon="⌁" value="6" label={t("overview.signalsReview")} note={t("overview.newAfternoon")} tone="sand" />
        <Metric icon="✓" value="28" label={t("overview.followups")} note={t("overview.todayList")} tone="blue" />
        <Metric icon="↗" value="3" label={t("overview.referrals")} note={t("overview.awaiting")} tone="rose" />
      </section>

      <section className="lower-grid">
        <article className="panel cases-panel">
          <header className="panel-header">
            <div><span className="eyebrow">{t("overview.priorityReview")}</span><h2>{t("overview.recentSignals")}</h2></div>
            <button type="button" onClick={onOpenCases}>{t("overview.viewAll")} →</button>
          </header>
          <div className="case-list">
            {alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onOpen={onOpenCases} />)}
          </div>
        </article>
        <article className="panel device-card">
          <header className="panel-header"><div><span className="eyebrow">{t("overview.fieldKit")}</span><h2>Arogya Relay AR-07</h2></div><span className="device-online"><i /> {t("common.ready")}</span></header>
          <div className="device-illustration" aria-label="Arogya Relay field device status">
            <div className="device-screen"><span>AR-07</span><strong>READY</strong><small>12:42 · OFFLINE SAFE</small></div>
            <div className="device-sensor"><i /><i /><i /></div>
          </div>
          <div className="device-stats">
            <div><span>{t("overview.battery")}</span><strong>76%</strong><i><b style={{ width: '76%' }} /></i></div>
            <div><span>{t("overview.sensorCheck")}</span><strong>{t("common.passed")}</strong><em>08:10</em></div>
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

function AlertRow({ alert, onOpen, expanded = false }: { alert: typeof alerts[number]; onOpen?: () => void; expanded?: boolean }) {
  return (
    <div className="case-row">
      <div className={`avatar ${alert.tone === 'danger' ? 'danger-avatar' : ''}`}>{alert.initials}</div>
      <div className="case-person"><strong>{alert.age}</strong><span>{alert.village} · {alert.id}</span></div>
      <div className="case-signal"><strong>{alert.signal}</strong><span>{alert.reading}</span></div>
      <div className="case-time"><span className={`priority ${alert.tone}`}>{alert.priority}</span><small>{alert.time}</small></div>
      <button type="button" aria-label={`Open case ${alert.id}`} aria-expanded={expanded} onClick={onOpen}>›</button>
    </div>
  );
}

function CaseQueue() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleAlerts = alerts.filter((alert) => {
    const matchesQuery = !normalizedQuery || `${alert.id} ${alert.village} ${alert.signal}`.toLowerCase().includes(normalizedQuery);
    const matchesFilter = filter === "all" || (filter === "urgent" ? alert.tone === "danger" : alert.tone === "warning");
    return matchesQuery && matchesFilter;
  });
  const selectedAlert = alerts.find((alert) => alert.id === selectedId) ?? null;

  return (
    <div className="page-content section-page">
      <div className="page-heading"><div><span className="eyebrow">{t("cases.kicker")}</span><h1>{t("nav.cases")}</h1><p>{t("cases.subtitle")}</p></div></div>
      <div className="queue-summary"><span><strong>1</strong> {t("common.urgent")}</span><span><strong>2</strong> {t("common.review")}</span><span><strong>8</strong> {t("cases.followup")}</span><span><strong>36</strong> {t("cases.cleared")}</span></div>
      <article className="panel cases-panel full-table">
        <div className="table-tools"><label>{t("cases.search")}<input type="search" name="case-search" autoComplete="off" placeholder={t("cases.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} /></label><div><button type="button" className={filter === "all" ? "filter active" : "filter"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("cases.allSignals")}</button><button type="button" className={filter === "urgent" ? "filter active" : "filter"} aria-pressed={filter === "urgent"} onClick={() => setFilter("urgent")}>{t("common.urgent")}</button><button type="button" className={filter === "review" ? "filter active" : "filter"} aria-pressed={filter === "review"} onClick={() => setFilter("review")}>{t("common.review")}</button></div></div>
        <div className="case-list">
          {visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} expanded={selectedId === alert.id} onOpen={() => setSelectedId((id) => id === alert.id ? null : alert.id)} />)}
          {visibleAlerts.length === 0 && <p className="case-empty" role="status">{t("cases.noMatches")}</p>}
        </div>
        {selectedAlert && (
          <section className="case-brief" aria-live="polite">
            <div><span className="eyebrow">{t("cases.selectedBrief")}</span><h2>{selectedAlert.id} · {selectedAlert.village}</h2></div>
            <dl><div><dt>{t("cases.signal")}</dt><dd>{selectedAlert.signal}</dd></div><div><dt>{t("cases.reading")}</dt><dd>{selectedAlert.reading}</dd></div><div><dt>{t("common.review")}</dt><dd>{selectedAlert.priority} · {selectedAlert.time}</dd></div></dl>
            <button type="button" className="secondary-button" onClick={() => setSelectedId(null)}>{t("common.close")}</button>
          </section>
        )}
        <p className="queue-footnote">{t("cases.privacy")}</p>
      </article>
    </div>
  );
}

function DevicePanel() {
  const { t, effectiveLang } = useLanguage();
  const [selfCheckState, setSelfCheckState] = useState<"idle" | "testing" | "passed">("idle");
  const [lastCheck, setLastCheck] = useState("08:10");
  const selfCheckTimer = useRef<number | null>(null);

  useEffect(() => {
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
    }, 900);
  }

  const sensors = [
    { name: t("device.temperatureSensor"), reading: "36.8 °C", tolerance: "±0.2 °C", calibrated: "20 Aug 2026" },
    { name: t("device.oxygenSensor"), reading: "98% SpO₂", tolerance: "±2%", calibrated: "20 Aug 2026" },
    { name: t("device.pulseSensor"), reading: "72 bpm", tolerance: "±3 bpm", calibrated: "20 Aug 2026" },
    { name: t("device.respirationSensor"), reading: "16 / min", tolerance: "±2 / min", calibrated: "20 Aug 2026" },
  ];

  return (
    <div className="page-content section-page">
      <div className="page-heading"><div><span className="eyebrow">{t("device.kicker")}</span><h1>Arogya Relay AR-07</h1><p>{t("device.subtitle")}</p></div><span className="live-badge"><i /> {t("device.ready")}</span></div>
      <section className="device-overview">
        <article className="hardware-card">
          <div className="large-device">
            <div className="speaker">••••••</div><div className="large-screen"><span>{t("shell.fieldUnit")}</span><strong>{t("common.ready")}</strong><small>{t("device.tapStart")}</small><b>START</b></div><div className="sensor-dock"><i /><span>SENSOR DOCK</span></div>
          </div>
          <div><span className="eyebrow">{t("device.designed")}</span><h2>{t("device.headline")}</h2><p>{t("device.description")}</p><ul><li>{t("device.vitals")}</li><li>{t("device.localPrompts")}</li><li>{t("device.forward")}</li></ul></div>
        </article>
        <div className="diagnostics-grid">
          <article className="diagnostic"><span>{t("overview.battery")}</span><strong>76%</strong><p>{t("device.remaining")}</p><i><b style={{ width: '76%' }} /></i></article>
          <article className="diagnostic"><span>{t("device.sensorStatus")}</span><strong>4 / 4</strong><p>{t("device.sensorsReady")}</p></article>
          <article className="diagnostic"><span>{t("device.storage")}</span><strong>86 / 500</strong><p>{t("device.waitingSync")}</p></article>
          <article className="diagnostic"><span>{t("device.selfCheck")}</span><strong>{selfCheckState === "testing" ? t("device.testing") : t("common.passed")}</strong><p>{lastCheck} · {t("device.noAction").split(" · ").at(-1)}</p></article>
        </div>
        <p className="nc-synthetic device-telemetry-note">{t("device.simulatedTelemetry")}</p>
        <section className="device-tech-grid" aria-label={t("device.technicalStatus")}>
          <article className="panel device-sensor-panel">
            <header className="device-tech-head">
              <div><span className="eyebrow">{t("device.technicalStatus")}</span><h2>{t("device.sensorChain")}</h2></div>
              <span className="device-health"><i /> {t("device.allSensorsReady")}</span>
            </header>
            <div className="device-sensor-table" role="table" aria-label={t("device.sensorChain")}>
              <div className="device-sensor-row device-sensor-columns" role="row">
                <span role="columnheader">{t("device.sensor")}</span>
                <span role="columnheader">{t("device.reading")}</span>
                <span role="columnheader">{t("device.tolerance")}</span>
                <span role="columnheader">{t("device.calibration")}</span>
              </div>
              {sensors.map((sensor) => (
                <div className="device-sensor-row" role="row" key={sensor.name}>
                  <strong role="cell"><i /> {sensor.name}</strong>
                  <span role="cell">{sensor.reading}</span>
                  <span role="cell">{sensor.tolerance}</span>
                  <span role="cell"><b>{t("device.calibrated")}</b><small>{sensor.calibrated}</small></span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel device-system-panel">
            <header className="device-tech-head"><div><span className="eyebrow">AR-07</span><h2>{t("device.systemIntegrity")}</h2></div></header>
            <dl className="device-system-list">
              <div><dt>{t("device.firmware")}</dt><dd>v1.6.2</dd></div>
              <div><dt>{t("device.rulesPack")}</dt><dd>v1.0.0 · SHA-256 verified</dd></div>
              <div><dt>{t("device.storageEncryption")}</dt><dd>AES-256-GCM · target</dd></div>
              <div><dt>{t("device.lastSync")}</dt><dd>05 Aug 2026 · 11:54</dd></div>
              <div><dt>{t("device.network")}</dt><dd>2G · −101 dBm</dd></div>
              <div><dt>{t("device.queue")}</dt><dd>{t("device.encryptedReports")}</dd></div>
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
