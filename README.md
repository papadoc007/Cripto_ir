# Cripto IR — Blockchain Investigation Tool

A full-stack Ethereum address investigation platform. Enter any wallet address, fetch its complete transaction history, and get dashboards, charts, AI-powered analysis, and professional forensics reports.

---

## Features

### Data Ingestion
- Fetches full transaction history from **Etherscan V2 API** (normal txs, ERC-20 token transfers, internal txs)
- Stores everything locally in **SQLite** (WAL mode, BigInt-safe TEXT storage for wei values)
- **Incremental sync** — re-syncing only fetches new blocks since last run
- **Binary-split pagination** — handles addresses with 10k+ transactions per block range
- Real-time **sync progress** via Server-Sent Events (SSE)
- Token-bucket **rate limiter** (2 req/sec, free Etherscan tier)

### Dashboard & Analytics
| Module | What it shows |
|---|---|
| **Cashflow** | Monthly inflow / outflow / net in ETH + USD, stablecoin volumes, tx counts. Toggle between USD chart, ETH chart, and full table view |
| **Timeline** | Activity heatmap by day/week/month |
| **Counterparties** | Top addresses by transaction count or volume |
| **Token Exposure** | All ERC-20 tokens the address has interacted with |
| **First Funder** | Which address first sent ETH to this wallet, with tx hash and timestamp |
| **Transaction Table** | Full paginated tx list with hash, counterparty, direction, amount, USD value, asset, running balance — filterable by direction |
| **Transfer Graph** | Force-directed node graph with Focus / Top 10 / Top 25 / All modes, sort by count or volume, side-by-side node table with click-to-highlight |
| **Heuristic Flags** | 5 automatic suspicious pattern detectors: burst activity, peel chain, counterparty concentration, round amounts, rapid in/out |

### AI Query Engine
- Free-text questions about any address (e.g. *"What are the top 5 counterparties by inflow?"*)
- **Deterministic execution**: LLM generates a JSON query plan → executor calls analytics functions → LLM narrates results
- No hallucinated numbers — narrative cites only computed data
- Supports **OpenAI**, **Anthropic**, and **Groq** (switchable via env var)

### Investigation Reports
- **HTML report** with professional cover page, stats bar, risk badge, numbered sections
- LLM-generated narrative: executive summary, behavioral analysis, risk assessment, key findings
- Risk level badge: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
- **Company branding**: upload logo (file or URL), company name, case reference
- **Markdown export** for quick text-based reports
- Print / Save as PDF directly from the browser

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript, Express |
| Database | SQLite via `better-sqlite3` |
| Frontend | React + Vite + TypeScript |
| Charts | Recharts |
| Graph | Canvas 2D with custom force-directed layout |
| AI | OpenAI / Anthropic / Groq (unified interface) |
| Monorepo | npm workspaces (`shared/`, `server/`, `client/`) |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/papadoc007/Cripto_ir.git
cd Cripto_ir
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
ETHERSCAN_API_KEY=your_etherscan_api_key

# AI provider: "openai" | "anthropic" | "groq"
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Optional: Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Optional: Groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Optional: Report branding defaults
REPORT_COMPANY_NAME=Your Company Name
REPORT_LOGO_URL=https://yourcompany.com/logo.png

PORT=3001
```

Get a free Etherscan API key at [etherscan.io/apis](https://etherscan.io/apis).

### 3. Run in development

```bash
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

---

## Project Structure

```
Cripto_ir/
├── shared/src/
│   ├── types.ts          # Shared TypeScript interfaces
│   └── constants.ts
├── server/src/
│   ├── index.ts          # Express bootstrap
│   ├── config.ts         # Env parsing
│   ├── db/               # SQLite connection, schema, queries
│   ├── etherscan/        # API client, paginator, sync orchestrator
│   ├── analytics/        # cashflow, counterparty, graph, heuristics, etc.
│   ├── query/            # LLM query planner + executor
│   ├── report/           # HTML generator, LLM narrative, markdown templates
│   ├── routes/           # Express route handlers
│   ├── middleware/        # Error handler, validation
│   └── utils/            # Rate limiter, logger, ETH price, LLM client
└── client/src/
    ├── pages/            # HomePage, DashboardPage, ReportPage
    ├── components/       # All UI components
    ├── hooks/            # useAnalytics, useSSE
    └── api/              # Fetch wrappers for all endpoints
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/address/sync` | Start sync for an address |
| GET | `/api/address/:addr` | Address metadata + sync status |
| GET | `/api/sync/progress/:addr` | SSE sync progress stream |
| GET | `/api/analytics/:addr/cashflow` | Monthly cashflow data |
| GET | `/api/analytics/:addr/counterparties` | Top counterparties |
| GET | `/api/analytics/:addr/timeline` | Activity timeline |
| GET | `/api/analytics/:addr/tokens` | Token exposure |
| GET | `/api/analytics/:addr/graph` | Transfer graph (`?limit=10&sortBy=volume`) |
| GET | `/api/analytics/:addr/heuristics` | Suspicious pattern flags |
| GET | `/api/analytics/:addr/first-funder` | First funding transaction |
| GET | `/api/analytics/:addr/transactions` | Paginated full tx list |
| POST | `/api/query` | Free-text AI question |
| POST | `/api/report/:addr` | Generate HTML or Markdown report |

---

## License

MIT
