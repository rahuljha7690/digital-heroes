# Digital Heroes: Web-to-Print Platform

A custom web-to-print platform for a six-division print house (labels & stickers, race & event numbers, MTB boards, stamps, trophies, laser-cut work). Customers configure a product, see an instant price, design in the browser (or upload artwork), approve a versioned proof, pay and reorder. Staff run every job through a production pipeline and download print-ready files.

Built for the Digital Heroes PRD (Level 2, 2026 edition).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Fabric.js (designer) |
| Backend | Node.js, Express 5, JWT auth, Helmet, rate limiting |
| Database | MongoDB (Mongoose), hosted on MongoDB Atlas |
| Print files | `sharp` + `pdfkit` on the server; `csv-parse` for variable-data merge; `archiver` for ZIP bundles |
| Payments | Stripe (mock checkout when no key is set) |
| Email | Nodemailer over SMTP (logged to console when `SMTP_HOST` is empty) |
| Hosting | Render (API web service + static site) |

> **Stack note.** The PRD recommends Next.js + Supabase and allows equivalents if justified. This project uses React/Vite + Express + MongoDB. Justification: document-shaped data (parameter-driven products, canvas JSON, per-order config), one language end to end, and server-side file generation in a long-running Node process rather than serverless functions.

## Features mapped to the PRD

- **Roles:** visitor, registered customer, administrator, enforced by JWT middleware.
- **Catalogue:** six divisions, parameter-driven products (no SKU per size).
- **Pricing:** instant per-unit quote with automatic volume discounts.
- **Designer:** template-driven editing locked to the print area, live preview, upload path (PDF, SVG, AI, PNG), saved designs.
- **Proofs:** versioned (v1, v2, ...), change requests, approval log, approval gate before print files unlock.
- **Print engine:** server-side PDF/PNG output, CSV merge (one artwork per row), `OrderID_ProductType_Date_Output` naming.
- **Customer dashboard:** profile, order history, saved designs, active proofs, one-click reorder, invoices.
- **Admin dashboard:** searchable jobs, ready-for-production flag, file download, pipeline stages, reports, users.
- **Notifications:** email on order, proof and completion events.

## Project structure

```
digital-heroes/
├── client/                 React + Vite frontend
│   └── src/{pages,components,context,services,data}
├── server/                 Express API
│   ├── controllers/ routes/ models/ middleware/
│   ├── utils/              pricing, print specs, artwork renderer, invoice PDF, mailer, paths
│   ├── seedProducts.js     seeds the product catalogue
│   └── seedAdmin.js        seeds the demo admin + customer
├── render.yaml             Render Blueprint (optional one-click setup)
└── package.json            root scripts (npm run dev runs both apps)
```

## Run locally

Requires Node 20+ and a MongoDB connection string (a free Atlas cluster works).

```bash
# 1. install
npm install
npm install --prefix server
npm install --prefix client

# 2. configure
cp server/.env.example server/.env      # fill in MONGO_URI and JWT_SECRET
cp client/.env.example client/.env

# 3. seed data
npm run seed --prefix server            # products
npm run seed:admin --prefix server      # demo admin + customer

# 4. start both apps
npm run dev                             # client :5173, API :5000
```

## Environment variables

### Server (`server/.env`)

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | Atlas connection string including the database name |
| `JWT_SECRET` | yes | Long random string. The server refuses to start without it |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `CLIENT_URL` | yes | Frontend origin for CORS and redirects. Comma-separate for several. No trailing slash |
| `NODE_ENV` | yes in prod | `production` |
| `STORAGE_DIR` | prod | Persistent disk mount path (e.g. `/var/data`). Empty locally |
| `ALLOW_MOCK_PAYMENTS` | no | `true` enables the mock checkout in production when Stripe is not configured |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | for real payments | Webhook URL: `<api>/api/payments/webhook` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for email | Leave `SMTP_HOST` empty to log emails instead |
| `ADMIN_NOTIFY_EMAIL` | no | Receives admin notifications |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_EMAIL`, `DEMO_PASSWORD` | seed only | Credentials created by `seed:admin` |
| `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_TAX_ID` | no | Invoice header |

### Client (`client/.env`)

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Full API URL including `/api`. Baked in at build time, so rebuild after changing it |

Never commit `.env` files. They are already in `.gitignore`.

## Deploy on Render

Architecture: **MongoDB Atlas** (database) + **Render Web Service** (API) + **Render Static Site** (frontend).

### Before you start

- Use **new** accounts (GitHub, Render, Atlas) rather than personal ones if the assignment requires it.
- Plan choice for the API:

| | Free | Starter (paid, ~$7/mo) |
|---|---|---|
| Sleeps after 15 min idle (30-60 s cold start) | yes | no |
| Uploads, proofs and customer artwork survive restarts | **no** (ephemeral disk) | yes, with a persistent disk |
| Outbound SMTP (ports 465/587) | **blocked** | works |
| Shell access (for seeding) | no | yes |

  Free is fine for a quick look. For the graded submission use Starter, or the proof and artwork flows will break whenever the service restarts.

### Step 1: Push the code to GitHub

Put the project at the repo root (`client/` and `server/` side by side), confirm `.env` is not tracked, then:

```bash
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/digital-heroes.git
git push -u origin main
```

### Step 2: Create the database (MongoDB Atlas)

1. Create a free **M0** cluster.
2. **Database Access** > add a user with a password (avoid `@ : / ?` in the password, or URL-encode them).
3. **Network Access** > add `0.0.0.0/0`. Render does not give fixed outbound IPs on these plans.
4. **Connect > Drivers** > copy the URI and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/digital-heroes?retryWrites=true&w=majority`

### Step 3: Deploy the API (Web Service)

1. Render dashboard > **New + > Web Service** > connect the GitHub repo.
2. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Starter (or Free for a demo)
   - **Health Check Path:** `/api/health`
3. **Environment** variables: `NODE_VERSION=22`, `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (e.g. `openssl rand -hex 48`), `ALLOW_MOCK_PAYMENTS=true`, plus any mail/Stripe values from the table above. Leave `CLIENT_URL` for step 5.
4. **Starter only:** **Disks > Add Disk**, mount path `/var/data`, 1 GB. Add `STORAGE_DIR=/var/data`.
5. **Create Web Service**. When the deploy is live, open `https://<api-name>.onrender.com/api/health` and `/api/health/db`. Both should return `success: true`.

### Step 4: Seed the database

Run once from your own machine, pointed at Atlas (works on every plan, including Free):

```bash
cd server
MONGO_URI="mongodb+srv://..." npm run seed
MONGO_URI="mongodb+srv://..." ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD='<strong-password>' npm run seed:admin
```

(On Windows PowerShell set the variables first: `$env:MONGO_URI="..."`.) On Starter you can instead use the service's **Shell** tab and run `npm run seed && npm run seed:admin`.

### Step 5: Deploy the frontend (Static Site)

1. **New + > Static Site** > same repo.
2. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. **Environment:** `NODE_VERSION=22`, `VITE_API_URL=https://<api-name>.onrender.com/api`
4. **Redirects/Rewrites** tab > add a rule: Source `/*`, Destination `/index.html`, Action **Rewrite**. Without it, refreshing `/dashboard` or `/login` returns 404.
5. **Create Static Site** and note its URL (`https://<site-name>.onrender.com`).

### Step 6: Connect the two (CORS)

Back on the API service > **Environment** > set `CLIENT_URL=https://<site-name>.onrender.com` (no trailing slash; add a custom domain too, comma-separated, if you have one). Saving triggers a redeploy.

### Step 7: Smoke test

Walk the PRD checklist on the live URL: sign up and log in, configure a product and check live pricing and the volume discount, open the designer, create a proof and approve it, place an order (mock checkout), download the print files and CSV merge as admin, reorder from the customer dashboard, and check mobile width.

### Optional: one-click setup with the Blueprint

`render.yaml` at the repo root defines both services, the disk and the env vars. **New + > Blueprint** > pick the repo, fill in the prompted secrets (`MONGO_URI`, `CLIENT_URL`, `VITE_API_URL`), then do steps 4 and 6. Edit the service names first if they are taken.

### Going live with payments and email

- **Stripe:** set `STRIPE_SECRET_KEY`, create a webhook endpoint at `https://<api>.onrender.com/api/payments/webhook`, copy its signing secret into `STRIPE_WEBHOOK_SECRET`, then set `ALLOW_MOCK_PAYMENTS=false`.
- **Email:** on Starter, use any SMTP provider (`SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`). On Free, SMTP is blocked, so leave `SMTP_HOST` empty (emails are logged) or switch the mailer to an HTTPS email API.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| API deploy exits immediately | `JWT_SECRET` or `MONGO_URI` missing, or Atlas IP allow-list does not include `0.0.0.0/0` |
| Browser shows CORS errors | `CLIENT_URL` does not exactly match the site origin (scheme, no trailing slash) |
| Products never load / calls go to localhost | `VITE_API_URL` missing at build time. Set it and trigger a manual redeploy of the static site |
| 404 on page refresh | Missing `/*` to `/index.html` rewrite rule |
| Uploaded images or proofs vanish | No persistent disk or `STORAGE_DIR` not set |
| First request takes up to a minute | Free instance waking from sleep |
| Emails not sent | SMTP blocked on Free plan, or SMTP credentials wrong (check logs) |

## Database schema

Collections (see `server/models/`): `User`, `Product`, `Template`, `Design`, `Order`, `Proof`. Orders reference the user and design; proofs reference the order and carry the version number, status and approval log.

## Design decisions (where the PRD is silent)

- Mock checkout is gated behind `ALLOW_MOCK_PAYMENTS` so a demo works without Stripe keys, while real Stripe takes over automatically once keys exist.
- Customer-supplied artwork (PDF/SVG/AI) is stored outside the public static folder and is downloadable by admins only.
- Print-file generation and CSV merge run on the server only.
- Storage is filesystem-based behind `STORAGE_DIR`; moving to S3/Supabase Storage only needs changes in `utils/paths.js` and the upload handlers.

## Scripts

| Command | Where | Purpose |
|---|---|---|
| `npm run dev` | root | API + client together |
| `npm start` | `server` | Production API |
| `npm run seed` | `server` | Seed products |
| `npm run seed:admin` | `server` | Seed demo admin and customer |
| `npm run build` | `client` | Production build to `dist/` |

## License

ISC. Issued for the Digital Heroes selection process.
