# IACCD — UI/UX Enhancement Prompt & OEM Audit Demo Script

---

## 🎨 UI/UX Enhancement Prompt

> Use this prompt with any AI design tool (v0, Figma AI, Galileo, etc.) to generate enhanced UI mockups.

---

**Prompt:**

Design an OEM-grade Automotive Cybersecurity Compliance Dashboard with the following specifications:

**Visual Identity:**
- Dark engineering theme: primary background `#0f172a`, card surface `#1e293b`, accent `#3b82f6`
- Typography: Inter or IBM Plex Sans — no rounded/playful fonts
- No gradients on text; use flat, high-contrast labels
- Color-coded risk indicators: Critical `#ef4444`, High `#f97316`, Medium `#eab308`, Low `#22c55e`

**Hero Section:**
- Full-width header with a photographic automotive image (side profile, studio lighting, dark background)
- ECU zone overlay using absolute-positioned circular markers with blue glow on active node
- Thin top accent bar in gradient: blue → purple → red (regulatory severity indicator)
- Compact control row: Role selector + Component dropdown + live threat count badge

**Navigation:**
- Horizontal pill-style tab bar: Dashboard | Compliance Checklist | Analytics | Upload
- Active tab: white background, blue text, subtle shadow
- Inactive: gray text, no border

**Compliance Checklist Panel:**
- Three sub-tabs: UN R155 Annex 5 | TARA ISO/SAE 21434 | CSMS
- Summary bar showing: score %, Compliant/Partial/Gap counts, horizontal stacked progress bar
- Table columns: Clause Reference | Requirement | Evidence Required | Status
- Status badges: pill shape, color-filled background (green/yellow/red), dot indicator

**KPI Cards:**
- 4-column grid, dark card background, colored metric value
- Labels in uppercase tracking-wide gray text
- No icons — use clean numeric/percentage values only

**Gauge Charts:**
- Radial bar style, single metric per gauge
- Color changes dynamically: red < 50%, yellow 50–79%, green ≥ 80%
- Label below gauge in small gray text

**General Rules:**
- No cartoon, illustration, or anime elements anywhere
- No drop shadows on text
- All borders: `border-gray-700` or `border-blue-500/30`
- Spacing: 24px card padding, 16px gap between cards
- Responsive: 2-col on tablet, 4-col on desktop

---

## 🎤 OEM Audit Demo Presentation Script

**Duration:** ~12 minutes | **Audience:** ARAI / TÜV / ICAT Auditors, OEM Cybersecurity Team

---

### Slide 1 — Opening (1 min)

> "Good morning. What you're looking at is the Integrated Automotive Cyber-Safety Compliance Dashboard — IACCD — built to support UN R155 type approval, ISO/SAE 21434 TARA validation, and CSMS audit readiness in a single engineering interface."

> "This is not a reporting tool. It is a live compliance validation platform that maps ECU-level threats to regulatory requirements in real time."

---

### Slide 2 — Vehicle ECU Topology (1.5 min)

> "The header shows a real vehicle with ECU zone markers overlaid. Each node represents a safety-critical electronic control unit — from the Airbag Control Module to the Battery Management System."

> "When I select a component from the dropdown — say, the ADAS ECU — the active node lights up, and the dashboard immediately loads all threat data and compliance status for that specific ECU."

> "This gives auditors an instant visual confirmation of which system is under review."

---

### Slide 3 — Compliance Gauges (1 min)

> "The four gauges at the top show real-time compliance scores across UN R155, ISO 21434, ISO 26262, and UN R156 OTA readiness."

> "These are not static numbers. They update based on the threat mitigation state of the selected component. A score below 50% triggers a red indicator — a direct signal for audit action."

---

### Slide 4 — Compliance Checklist: UN R155 Annex 5 (3 min)

> "Now let's go to the Compliance Checklist tab. This automatically loads when a component is selected."

> "The first tab covers UN R155 Annex 5 — the core CSMS requirements for type approval."

> "Annex 5 Paragraph 1 covers governance: CSMS documentation, organizational roles, incident response, and risk assessment procedures."

> "Paragraph 2 covers risk management: threat identification, attack feasibility scoring, secure development lifecycle evidence, and supplier management."

> "Paragraph 3 covers post-production obligations: OTA security, vulnerability handling, and regulatory incident reporting."

> "Each row shows the clause reference, the specific requirement, the evidence that must be produced, and the current compliance status — Compliant, Partial, or Gap."

> "Gaps are highlighted in red. These are the items that require immediate remediation before type approval can be granted."

---

### Slide 5 — TARA: ISO/SAE 21434 (2.5 min)

> "The second tab covers the TARA process under ISO/SAE 21434."

> "Clause 8 validates that asset identification, damage scenarios, threat derivation, attack path analysis, and risk calculation have all been completed."

> "Clause 9 checks that cybersecurity goals are defined and that security requirements are traceable — a mandatory audit evidence item."

> "Clause 15 covers validation activities: penetration testing, fuzz testing on CAN and UDS interfaces, SCA vulnerability scanning, and formal risk acceptance decisions."

> "For this component, you can see that fuzz testing and risk acceptance documentation are currently marked as Gap — these must be closed before submission."

---

### Slide 6 — CSMS Organizational Requirements (1.5 min)

> "The third tab covers the Cyber Security Management System at the organizational level."

> "This includes policy approval by top management, competence management, supplier integration, incident response readiness, monitoring infrastructure, and audit frequency."

> "The summary bar at the top gives an instant score. For this organization, the CSMS score is currently 56% — indicating partial readiness with specific gaps in monitoring and incident response."

---

### Slide 7 — Closing (1 min)

> "To summarize: this dashboard provides a single-pane view of cybersecurity compliance across all 12 safety-critical ECUs, mapped directly to UN R155, ISO/SAE 21434, and CSMS requirements."

> "It works even when backend systems are unavailable — all component data and regulation checklists are available offline."

> "It is designed to support both internal engineering teams and external regulatory auditors with the same interface."

> "We are ready to walk through any specific ECU or regulation clause in detail. Thank you."

---

*Document version: 1.0 | IACCD Compliance Dashboard*
