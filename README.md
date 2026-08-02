# DukaanDost AI — Autonomous Operations Workspace for Bharat's Retailers

[![Hackathon](https://img.shields.io/badge/Codex%20India%20Hackathon-2026-indigo.svg)](https://blockseblock.com/)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-black.svg?logo=next.js)](https://nextjs.org/)
[![Database: Neon Postgres](https://img.shields.io/badge/Database-Neon%20Postgres-00e599.svg?logo=postgresql)](https://neon.tech/)
[![AI Engine: Groq Llama 3.3](https://img.shields.io/badge/AI%20Engine-Llama%203.3%20%7C%20Whisper-orange.svg)](https://groq.com/)

**DukaanDost AI** is an autonomous AI operations employee designed for small/medium retail stores and MSMEs in India. By converting unstructured voice or text inputs in English and Hindi into database actions, it manages inventory, records sales, tracks procurement, generates compliant Rule 46 GST tax invoices, and serves dynamic business insights—all through a premium, Raycast-inspired SaaS dashboard.

---

## 🚀 Why DukaanDost AI?

Traditional ERP and inventory software fail for micro-retailers (Dukaans) due to:
* **Complex Interfaces:** Multitudes of dense forms, dropdowns, and tabular configurations.
* **Typing Friction:** Store owners are active and need hands-free updates on the go.
* **Tax Compliance Overhead:** Managing GST rates, HSN codes, and compiling invoices manually is time-consuming.

**DukaanDost AI** solves this by offering a **voice-first workspace**. An owner can call out *"Sold 5 laptops for 40,000 each to Aman"* or *"Bought 10 keyboards from supplier"*, and the AI engine plans, extracts parameters, validates stock, updates the database, and compiles a downloadable tax invoice automatically.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router), React 19, TypeScript
* **UI & Styling:** Tailwind CSS, Radix UI Primitives, Lucide Icons, Sonner Toasts
* **Database & ORM:** Neon Serverless PostgreSQL Database, Prisma ORM
* **AI Core (Groq):** Llama 3.3 70B (Intent Classification & Parameter Extraction), Whisper Large v3 (Multilingual Voice Speech-to-Text)
* **Invoice Compiler:** `pdf-lib` (Client-side digital tax invoice compilation)

---

## 🧠 Agentic AI Pipeline (Orchestration Flow)

DukaanDost AI doesn't just call a chatbot wrapper; it runs an agentic pipeline containing multiple specialized sub-agents:

```mermaid
graph TD
    A[User Voice/Text Input] --> B[Groq Whisper Speech-to-Text]
    B --> C[Planner Agent]
    C --> D[Intent Classification Agent]
    D -->|Classify Intent| E[Entity Extraction Agent]
    E -->|Check Parameter Completeness| F{All Fields Present?}
    F -->|No| G[Clarification Dialog & Context Merging]
    G --> A
    F -->|Yes| H[Inventory Matcher & Validation]
    H -->|Fuzzy Product Resolve| I{Found in Catalog?}
    I -->|No| J[AI Onboarding Drawer]
    I -->|Yes| K[Business Rules & GST Calculator]
    K -->|Stock Level Check| L[Prisma Transaction Write]
    L --> M[Invoice Compiler Agent]
    L --> N[Analytics & Recommendation Agents]
    M --> O[Downloadable GST Tax Invoice]
```

### Specialized Agents:
1. **Planner Agent:** Manages transaction validation and delegates to downstream sub-agents.
2. **Intent Agent:** Classifies actions (`record_sale`, `record_purchase`, `check_stock`, `generate_invoice`).
3. **Inventory Agent:** Performs fuzzy entity matching against product catalog names. Handles sliding-window context merging to resolve multi-turn clarification answers.
4. **Invoice Agent:** Dynamically maps HSN codes and compiles Rule 46 GST tax invoices.
5. **Analytics & Recommendation Agent:** Forecasts product runout intervals and drafts restocking orders.

---

## 🌟 Premium UX & Trust Features (Theme 2)

* **Execution Graph:** Visualizes active agent states, model confidence, and execution speed (ms) for every command.
* **Deep Trace Logs:** Transparently displays raw inputs, parsed JSON parameters, and action results (visible in the *Audit Logs* tab).
* **Keyboard Shortcuts:** Raycast-inspired command console, shortcut chips, and `⌘K` Command Palette search triggers.
* **Onboarding Drawer:** Registers missing items dynamically if Llama flags a catalog mismatch.

---

## 📦 Local Development Setup

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/amanrock1/KiranaCopilot_AI.git
cd KiranaCopilot_AI
npm install --legacy-peer-deps
```

### 2. Environment Variables Setup
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require&channel_binding=require"
GROQ_API_KEY="gsk_your_groq_api_key_here"
```

### 3. Database Initialization
Synchronize the PostgreSQL schema and load the product catalog starter seeds:
```bash
npx prisma db push
npx tsx scripts/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

Verify the AI intent/entity parsing engine and transactional logic locally:
```bash
# Test entity extraction parameters
npx tsx tests/entityExtractor.test.ts

# Test database inventory transaction logic
npx tsx tests/inventoryEngine.test.ts
```

---

## 📄 License
Distributed under the MIT License. Built with ❤️ for the Codex India Hackathon 2026.
