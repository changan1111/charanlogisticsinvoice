# Charan Logistics — Invoice Manager

React + Vite app, deployable on GitHub Pages. Converted from single-file HTML.

## Features

- 📋 Invoices list with search, filter, pagination
- 📊 Monthly performance chart
- 💰 Payroll slip entry + PDF download
- 📄 Quotation builder + PDF
- 💬 WhatsApp Quick Send templates
- ➕ Add / Edit invoices with line items
- 🧾 Quick Invoice chatbot FAB
- 📥 Invoice PDF download + share

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USER/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BASE_PATH=/your-repo-name/
```

### 3. Add static assets

Place these in the `public/` folder:

- `header.png` — PDF/app header banner
- `footer.png` — PDF footer strip
- `QRCode.jpeg` — PayNow QR code
- `login.html` — your existing login page

### 4. Run locally

```bash
npm run dev
```

---

## Deploy to GitHub Pages

### Step 1 — Enable GitHub Pages

In your repo → Settings → Pages → Source: **GitHub Actions**

### Step 2 — Add Secrets

Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

### Step 3 — Add Variable

Settings → Secrets and variables → Actions → Variables → **New repository variable**:

| Name | Value |
|------|-------|
| `VITE_BASE_PATH` | `/your-repo-name/` |

### Step 4 — Push to main

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

The Actions workflow will build and deploy automatically. Your app will be live at:
`https://YOUR_USER.github.io/YOUR_REPO/`

---

## Local PDF assets

The PDF generator tries to load `header.png`, `footer.png`, and `QRCode.jpeg` from the public folder. If they're missing, it falls back to programmatic headers/footers — so the app still works without them.

---

## Auth

The app redirects to `./login.html` if no Supabase session exists. Make sure your `login.html` is in `public/` so it gets copied to `dist/` on build.
