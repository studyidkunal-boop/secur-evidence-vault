# Cryptographic Digital Evidence Vault — Production Deployment Guide

This guide provides end-to-end instructions for deploying the **Cryptographic Digital Evidence Vault** in a production environment:
- **Frontend**: React (Vite) on **Vercel**
- **Backend API**: Node.js + Express on **Render**
- **Database**: PostgreSQL on **Render Postgres** or **Supabase**
- **Forensic Storage**: **Supabase Storage** (Private Bucket)

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    Client["Vercel Frontend\n(React + Vite + Tailwind)\nhttps://vault.vercel.app"]
    API["Render Web Service\n(Node.js + Express)\nhttps://api-vault.onrender.com"]
    DB["PostgreSQL\n(Supabase / Render Postgres)\nUsers • Evidence • Hash-Chained Audit Logs"]
    Storage["Supabase Private Bucket\n(evidence-vault-private)\nSealed Forensic Buffers"]

    Client -->|HTTPS + withCredentials| API
    API -->|pg Pool + SSL| DB
    API -->|Authenticated REST API| Storage
```

---

## 2. Step 1: Database Setup (PostgreSQL)

You can use either **Supabase** or **Render Postgres**.

### Option A: Supabase PostgreSQL (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your database password.
3. In **Project Settings** > **Database**:
   - Locate the **Connection string** section.
   - Select **URI** mode.
   - If using connection pooling, select **Transaction Mode (Port 6543)**.
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. Set `DB_SSL=true`.

### Option B: Render Managed PostgreSQL
1. On your Render dashboard, click **New +** > **PostgreSQL**.
2. Set Name: `evidence-vault-db`, Database: `evidence_vault`, User: `vault_admin`.
3. Choose the **Free** tier (or Starter for production persistence).
4. Once provisioned, copy the **Internal Database URL** (if backend is on Render) or **External Database URL**.

### Run Migrations & Seed Data
From your local terminal with your production `DATABASE_URL` set in `server/.env`:
```bash
cd server
npm run migrate
npm run seed
```
This applies `schema.sql` (creating `users`, `evidence`, `audit_logs`, and immutability triggers) and seeds the 3 foundational officers plus the **Genesis Audit Block**.

---

## 3. Step 2: Private File Storage Setup (Supabase Storage)

Render's local filesystem is ephemeral and wiped on restart; evidence must be preserved in cloud storage.

1. Open your Supabase project dashboard.
2. Navigate to **Storage** > **Buckets** > **New bucket**.
3. Configure the bucket:
   - **Bucket Name**: `evidence-vault-private`
   - **Public Bucket**: **OFF** (Keep this unchecked to strictly deny unauthenticated public access).
4. Retrieve Service Role Credentials:
   - Go to **Project Settings** > **API**.
   - Copy **Project URL** (`SUPABASE_URL`).
   - Copy the `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`).
   > [!IMPORTANT]
   > Never expose the `service_role` key to the frontend or git repository. It must only reside in the Render backend environment variables.

---

## 4. Step 3: Backend API Deployment on Render

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Configure service parameters:
   - **Name**: `evidence-vault-api`
   - **Region**: Choose closest to your database (e.g., Singapore, Frankfurt, Oregon).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Configure Environment Variables in Render:

| Variable | Recommended Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render binds automatically) |
| `CLIENT_ORIGIN` | `https://your-evidence-vault.vercel.app` (Your Vercel domain) |
| `DATABASE_URL` | `postgresql://...` (From Step 1) |
| `DB_SSL` | `true` |
| `JWT_SECRET` | 32+ character high-entropy random string |
| `JWT_EXPIRES_IN` | `15m` |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (Secret key from Step 2) |
| `SUPABASE_BUCKET_NAME` | `evidence-vault-private` |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |

6. Click **Create Web Service**.
7. Note down your assigned backend URL: `https://evidence-vault-api.onrender.com`.

---

## 5. Step 4: Frontend Deployment on Vercel

1. Log into [Vercel](https://vercel.com) and click **Add New...** > **Project**.
2. Select your GitHub repository.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://evidence-vault-api.onrender.com/api` |

5. Deploy! Vercel will build the frontend and assign an address: `https://your-vault.vercel.app`.
6. Return to Render and update `CLIENT_ORIGIN` with your final Vercel URL to finalize the CORS handshake.

---

## 6. Step 5: Production CORS & Cookie Strategy

### Cross-Site Cookies Across Vercel & Render
Modern web browsers (Chrome, Safari, Edge) block third-party cookies by default unless configured properly:
- **SameSite Configuration**: When the frontend (`*.vercel.app`) communicates with the backend (`*.onrender.com`), the session cookie is transmitted across distinct domains.
- In `server/src/controllers/auth.controller.js`, cookies are set dynamically:
  ```javascript
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction, // Enforces HTTPS
    sameSite: isProduction ? 'none' : 'lax', // Required for cross-domain Vercel -> Render
    maxAge: 15 * 60 * 1000,
  });
  ```
- **Axios Client**: Both `api/axios.js` and server CORS enforce `credentials: true`.
- **Dual-Mode Authorization**: For environments where third-party cookies are strictly disallowed by institutional firewall policy, the client automatically falls back to transmitting the token via `Authorization: Bearer <token>` in the request interceptor.

---

## 7. Pre-Flight Security Checklist

Before presenting for your college viva or deploying into production, verify each item:

- [ ] **1. Immutability Triggers Active**:
  Verify PostgreSQL rejects manual tampering:
  ```sql
  DELETE FROM evidence; -- Must return: CRITICAL SECURITY VIOLATION: Evidence records are immutable
  DELETE FROM audit_logs; -- Must return: CRITICAL SECURITY VIOLATION: audit_logs entries are strictly immutable
  ```
- [ ] **2. Memory-Only File Upload**:
  Multer is configured exclusively with `multer.memoryStorage()`. No temporary unencrypted file buffers exist on Render ephemeral disk.
- [ ] **3. Cryptographic Constant-Time Comparison**:
  All hash comparisons (`POST /verify` and `POST /verify-external`) invoke `crypto.timingSafeEqual` to neutralize timing side-channel attacks.
- [ ] **4. Private Cloud Bucket Isolation**:
  `evidence-vault-private` bucket in Supabase has public access disabled. Objects are served strictly via authenticated streaming or signed short-lived URLs.
- [ ] **5. Dynamic Watermarking Enabled**:
  Judges viewing exhibits at `GET /evidence/:id/stream` receive an inline stream watermarked with their username, badge ID, case number, and exact UTC timestamp.
- [ ] **6. Strict RBAC Enforcement**:
  - `INSPECTOR`: Can only view their own uploaded files (`uploaded_by = req.user.id`).
  - `DCP`: Can review all files, approve or reject with mandatory remarks.
  - `JUDGE`: Strictly read-only access to approved files. No upload, edit, or delete endpoints exist.
- [ ] **7. Audit Hash Chain Intact**:
  Run `node scripts/tamper-demo.js --status` or trigger `GET /api/audit/verify` to ensure the mathematical chain validates from Genesis with 0 broken links.
- [ ] **8. Production CORS Restrictions**:
  `CLIENT_ORIGIN` on Render matches your exact Vercel URL, disallowing unauthorized origins.
- [ ] **9. High-Entropy JWT Secret**:
  `JWT_SECRET` is at least 32 characters long with high randomness.
- [ ] **10. Rate Limiting Active**:
  `express-rate-limit` guards the `/api` route against credential stuffing and brute-force verification attacks.

