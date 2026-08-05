"use client";

import { FormEvent, useMemo, useState } from "react";

type Tab = "overview" | "cases" | "device";
type SyncState = "ready" | "syncing" | "done";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("ready");
  const [notice, setNotice] = useState("14 reports are stored safely on this device.");

  const syncLabel = useMemo(() => {
    if (syncState === "syncing") return "Syncing reports…";
    if (syncState === "done") return "All reports synced";
    return "Sync 14 reports";
  }, [syncState]);

  function syncReports() {
    if (syncState !== "ready") return;
    setSyncState("syncing");
    setNotice("Sending encrypted reports over the available 2G connection.");
    window.setTimeout(() => {
      setSyncState("done");
      setNotice("All reports reached the district health hub.");
    }, 1400);
  }

  function saveScreening(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreeningOpen(false);
    setNotice("Screening AR-1082 saved offline and added to the review queue.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">AR</div>
          <div>
            <strong>Arogya Relay</strong>
            <span>Field intelligence</span>
          </div>
        </div>

        <nav className="side-nav">
          <button
            className={activeTab === "overview" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("overview")}
          >
            <span className="nav-glyph">⌂</span> Overview
          </button>
          <button
            className={activeTab === "cases" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("cases")}
          >
            <span className="nav-glyph">◎</span> Case queue <b>3</b>
          </button>
          <button
            className={activeTab === "device" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("device")}
          >
            <span className="nav-glyph">▣</span> Field device
          </button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-title"><i /> Intermittent 2G</div>
          <div className="signal-steps" aria-label="Two of four signal bars">
            <span /><span /><span className="off" /><span className="off" />
          </div>
          <p>Offline capture is active. Reports sync automatically when the signal is stable.</p>
        </div>
        <div className="worker-card">
          <div className="avatar">SN</div>
          <div><strong>Sara Nongrum</strong><span>Community health worker</span></div>
          <button aria-label="Open account menu">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="location-kicker">FIELD UNIT 04</span>
            <h2>Mawlynnong cluster</h2>
          </div>
          <div className="top-actions">
            <div className="today"><span>Wednesday</span><strong>05 Aug 2026</strong></div>
            <button className="quiet-icon" aria-label="Notifications">●<span /></button>
            <button className="primary-button" onClick={() => setScreeningOpen(true)}>
              <span aria-hidden="true">＋</span> New screening
            </button>
          </div>
        </header>

        <div className="notice-strip" role="status" aria-live="polite">
          <span className={syncState === "done" ? "status-dot synced" : "status-dot"} />
          <p>{notice}</p>
          <button onClick={syncReports} disabled={syncState !== "ready"}>{syncLabel}</button>
        </div>

        {activeTab === "overview" && (
          <Overview
            onNewScreening={() => setScreeningOpen(true)}
            onOpenCases={() => setActiveTab("cases")}
          />
        )}
        {activeTab === "cases" && <CaseQueue onNewScreening={() => setScreeningOpen(true)} />}
        {activeTab === "device" && <DevicePanel />}
      </section>

      {screeningOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setScreeningOpen(false)}>
          <section
            className="screening-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="screening-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div><span className="eyebrow">OFFLINE CAPTURE</span><h2 id="screening-title">New field screening</h2></div>
              <button onClick={() => setScreeningOpen(false)} aria-label="Close screening">×</button>
            </header>
            <form onSubmit={saveScreening}>
              <div className="form-grid">
                <label>Patient reference<input required placeholder="e.g. NR-1049" /></label>
                <label>Age<input required type="number" min="0" max="120" placeholder="Years" /></label>
                <label>Body temperature<input required type="number" step="0.1" placeholder="°C" /></label>
                <label>Oxygen saturation<input required type="number" min="50" max="100" placeholder="SpO₂ %" /></label>
              </div>
              <fieldset>
                <legend>Symptoms observed</legend>
                <div className="symptom-grid">
                  {['Fever', 'Cough', 'Rapid breathing', 'Diarrhoea', 'Rash', 'Severe fatigue'].map((symptom) => (
                    <label key={symptom}><input type="checkbox" /> <span>{symptom}</span></label>
                  ))}
                </div>
              </fieldset>
              <label className="notes-label">Field notes<textarea rows={3} placeholder="Exposure, onset, travel, or other observations" /></label>
              <div className="protocol-note"><strong>Screening support only.</strong> Arogya Relay highlights patterns; it does not diagnose. Apply local clinical and referral protocols.</div>
              <footer>
                <button type="button" className="secondary-button" onClick={() => setScreeningOpen(false)}>Cancel</button>
                <button className="primary-button" type="submit">Save assessment offline</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function Overview({ onNewScreening, onOpenCases }: { onNewScreening: () => void; onOpenCases: () => void }) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div><span className="eyebrow">FIELD PULSE · LAST 24 HOURS</span><h1>Good morning, Sara.</h1><p>Here is what needs attention across your three villages.</p></div>
        <span className="live-badge"><i /> Monitoring active</span>
      </div>

      <section className="signal-layout">
        <article className="trend-card">
          <div className="trend-copy">
            <span className="alert-label">RESPIRATORY SIGNAL</span>
            <h2>Symptoms are rising in North Ridge.</h2>
            <p>Twelve people reported cough with fever today. That is <strong>38% above</strong> this cluster’s seven-day baseline.</p>
            <div className="trend-actions">
              <button className="dark-button" onClick={onOpenCases}>Review 6 linked cases</button>
              <span>Updated 8 min ago</span>
            </div>
          </div>
          <div className="mini-chart" aria-label="Respiratory symptom reports increased across the last twelve hours">
            <div className="chart-meta"><span>Reports / 2 hrs</span><strong>12 <small>+38%</small></strong></div>
            <div className="bars">
              {chartBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index > 8 ? "hot" : ""} />)}
            </div>
            <div className="chart-axis"><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div>
          </div>
        </article>

        <article className="urgent-card">
          <header><span>URGENT QUEUE</span><b>1</b></header>
          <div className="urgent-person">
            <div className="avatar danger-avatar">LM</div>
            <div><h3>Child · 6 years</h3><p>North Ridge · NR-1048</p></div>
          </div>
          <div className="urgent-reading"><span>SpO₂</span><strong>91%</strong><em>Low reading</em></div>
          <p className="urgent-note">Fever and rapid breathing recorded 12 minutes ago.</p>
          <button onClick={onOpenCases}>Open referral brief <span>→</span></button>
        </article>
      </section>

      <section className="metric-grid" aria-label="Daily monitoring summary">
        <Metric icon="◉" value="47" label="Screenings today" note="8 more than yesterday" tone="mint" />
        <Metric icon="⌁" value="6" label="Signals to review" note="3 new this afternoon" tone="sand" />
        <Metric icon="✓" value="28" label="Follow-ups complete" note="82% of today’s list" tone="blue" />
        <Metric icon="↗" value="3" label="Referrals sent" note="1 awaiting transport" tone="rose" />
      </section>

      <section className="lower-grid">
        <article className="panel cases-panel">
          <header className="panel-header">
            <div><span className="eyebrow">PRIORITY REVIEW</span><h2>Recent screening signals</h2></div>
            <button onClick={onOpenCases}>View all cases →</button>
          </header>
          <div className="case-list">
            {alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
          </div>
        </article>
        <article className="panel device-card">
          <header className="panel-header"><div><span className="eyebrow">FIELD KIT</span><h2>Arogya Relay AR-07</h2></div><span className="device-online"><i /> Ready</span></header>
          <div className="device-illustration" aria-label="Arogya Relay field device status">
            <div className="device-screen"><span>AR-07</span><strong>READY</strong><small>12:42 · OFFLINE SAFE</small></div>
            <div className="device-sensor"><i /><i /><i /></div>
          </div>
          <div className="device-stats">
            <div><span>Battery</span><strong>76%</strong><i><b style={{ width: '76%' }} /></i></div>
            <div><span>Sensor check</span><strong>Passed</strong><em>Today, 08:10</em></div>
          </div>
          <button className="secondary-button full" onClick={onNewScreening}>Start a guided screening</button>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon, value, label, note, tone }: { icon: string; value: string; label: string; note: string; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div><strong>{value}</strong><h3>{label}</h3><p>{note}</p></div></article>;
}

function AlertRow({ alert }: { alert: typeof alerts[number] }) {
  return (
    <div className="case-row">
      <div className={`avatar ${alert.tone === 'danger' ? 'danger-avatar' : ''}`}>{alert.initials}</div>
      <div className="case-person"><strong>{alert.age}</strong><span>{alert.village} · {alert.id}</span></div>
      <div className="case-signal"><strong>{alert.signal}</strong><span>{alert.reading}</span></div>
      <div className="case-time"><span className={`priority ${alert.tone}`}>{alert.priority}</span><small>{alert.time}</small></div>
      <button aria-label={`Open case ${alert.id}`}>›</button>
    </div>
  );
}

function CaseQueue({ onNewScreening }: { onNewScreening: () => void }) {
  return (
    <div className="page-content section-page">
      <div className="page-heading"><div><span className="eyebrow">TRIAGE WORKSPACE</span><h1>Case queue</h1><p>Prioritized screening signals awaiting review or referral.</p></div><button className="primary-button" onClick={onNewScreening}>＋ New screening</button></div>
      <div className="queue-summary"><span><strong>1</strong> urgent</span><span><strong>2</strong> review</span><span><strong>8</strong> follow-up</span><span><strong>36</strong> cleared today</span></div>
      <article className="panel cases-panel full-table">
        <div className="table-tools"><label>Search cases<input placeholder="Patient ID or village" /></label><div><button className="filter active">All signals</button><button className="filter">Urgent</button><button className="filter">Review</button></div></div>
        <div className="case-list">{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}</div>
        <p className="queue-footnote">Demo queue · Patient names are represented by initials to support privacy in shared environments.</p>
      </article>
    </div>
  );
}

function DevicePanel() {
  return (
    <div className="page-content section-page">
      <div className="page-heading"><div><span className="eyebrow">RUGGED FIELD KIT</span><h1>Arogya Relay AR-07</h1><p>One portable device for guided screening, offline storage, and outbreak signal reporting.</p></div><span className="live-badge"><i /> Device ready</span></div>
      <section className="device-overview">
        <article className="hardware-card">
          <div className="large-device">
            <div className="speaker">••••••</div><div className="large-screen"><span>FIELD UNIT 04</span><strong>READY</strong><small>Tap START to screen</small><b>START</b></div><div className="sensor-dock"><i /><span>SENSOR DOCK</span></div>
          </div>
          <div><span className="eyebrow">DESIGNED FOR THE LAST MILE</span><h2>Built to keep working beyond the network.</h2><p>Shock-resistant enclosure, wipe-clean surfaces, solar-assisted charging, and encrypted offline storage for up to 500 assessments.</p><ul><li>Guided vital-sign capture</li><li>Local language prompts</li><li>Store-and-forward reporting</li></ul></div>
        </article>
        <div className="diagnostics-grid">
          <article className="diagnostic"><span>BATTERY</span><strong>76%</strong><p>About 2 days remaining</p><i><b style={{ width: '76%' }} /></i></article>
          <article className="diagnostic"><span>SENSOR STATUS</span><strong>4 / 4</strong><p>Temperature, SpO₂, pulse and respiration ready</p></article>
          <article className="diagnostic"><span>LOCAL STORAGE</span><strong>86 / 500</strong><p>14 reports waiting to sync</p></article>
          <article className="diagnostic"><span>LAST SELF-CHECK</span><strong>Passed</strong><p>Today at 08:10 · No action needed</p></article>
        </div>
      </section>
    </div>
  );
}
