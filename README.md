# Inventory Copilot AI — Smart Inventory for Bharat's Businesses

**Inventory Copilot AI** is a voice-first, AI-driven inventory and invoicing assistant designed for retail and small/medium businesses (SMBs). It allows business owners to manage stock, record sales/purchases, check stock alerts, and generate GST-compliant invoices using natural language in English or Hindi via text or voice.

---

## 🌟 Key Features

1. **Voice & Text AI Processing**: Speech-to-text powered by Groq Whisper Large v3 with natural language intent and entity extraction powered by Groq Llama 3.3 70B.
2. **Real-time Inventory Management**: Automatic stock updates, low-stock threshold alerts, and instant product catalog lookup.
3. **GST Invoice PDF Generation**: Automated generation of professional GST invoices downloadable as formatted PDFs.
4. **Complete AI Decision Traceability**: Detailed activity log capturing raw user inputs, extracted entities, detected intents, and action outcomes.
5. **Modern Dashboard Interface**: Custom emerald/slate theme built with Next.js 16 (App Router), React 19, Tailwind CSS, and Radix UI components.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons, Sonner Toasts
- **Database & ORM**: SQLite (Local) / PostgreSQL (Supabase / Neon for Production), Prisma ORM
- **AI Services**: Groq API (Llama 3.3 70B & Whisper Large v3)
- **PDF Engine**: `pdf-lib`

---

## 🚀 Local Development Setup

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Environment Variables Setup
Create a `.env` file in the project root:
```env
DATABASE_URL="file:../db/custom.db"
GROQ_API_KEY="gsk_your_groq_api_key_here"
```

### 3. Database Initialization
Push the schema and seed starter catalog data:
```bash
npm run db:push
npm run db:seed
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment (Vercel)

1. Push your repository to **GitHub**.
2. Import the repository into **Vercel**.
3. Configure the following **Environment Variables** in Vercel settings:
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`)
   - `DATABASE_URL`: `postgresql://...` (Supabase or Neon connection string) or `file:./db/custom.db`
4. Deploy! Vercel will automatically run `prisma generate && next build`.

---

## 🧪 Testing

Run test suites for entity extraction and inventory engine:
```bash
npx tsx tests/entityExtractor.test.ts
npx tsx tests/inventoryEngine.test.ts
```

---

## 📄 License
MIT License. Built for Codex India Hackathon 2026.
