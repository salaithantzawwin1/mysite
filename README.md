# Salai Thant Zaw Win — Portfolio + CMS (Vercel-ready)

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)
![Storage](https://img.shields.io/badge/storage-Vercel%20Blob-blue)
![License](https://img.shields.io/badge/license-private-orange)

**Live site:** https://salaithantzawwin.vercel.app
**Admin panel:** https://salaithantzawwin.vercel.app/admin

Portfolio website with a built-in admin panel. Everything on the public site
(profile, experience, projects, skills, certifications, education, contact,
CV file) can be added, edited, reordered and deleted from the admin panel —
including image/PDF uploads for certificates and projects.

Works in two modes with the **same frontend**:

| Mode | Storage | Use |
|---|---|---|
| **Vercel (production)** | Vercel Blob (cloud) | Live site — edits persist online |
| **Local (`python server.py`)** | `data.json` + `site/uploads/` | Editing offline, no account needed |

## Deploy to Vercel

1. **Push this folder to GitHub** (e.g. `salaithantzawwin/portfolio`).

2. **Import on Vercel** — go to https://vercel.com/new, pick the repo, framework
   preset **Other**, and deploy. `vercel.json` routes everything correctly.

3. **Create Blob storage** — in the Vercel dashboard open the project →
   **Storage** → **Create Database → Blob** and connect it to the project.
   This adds `BLOB_READ_WRITE_TOKEN` automatically (uploads + content edits
   are stored there).

4. **Set environment variables** — project → Settings → Environment Variables:
   - `ADMIN_USERNAME` — your admin login name
   - `ADMIN_PASSWORD` — a strong password
   - `CMS_SECRET` — any long random string (signs login tokens)

5. **Redeploy**. Your site is live:
   - Public: `https://<your-project>.vercel.app/`
   - Admin:  `https://<your-project>.vercel.app/admin`

> Admin credentials are stored as Vercel environment variables
> (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) — they are never committed to this
> repository. Update them in the Vercel dashboard, then redeploy.

## Local development

```bash
python server.py
```

- Public site: http://127.0.0.1:8437/
- Admin panel: http://127.0.0.1:8437/admin

First run creates `server.config.json` with a random password and prints it
(change the values anytime, then restart). Local edits go straight to
`data.json` / `site/uploads/`.

## Admin panel

- URL: **https://salaithantzawwin.vercel.app/admin** (login: `admin`,
  password set in the Vercel env var `ADMIN_PASSWORD`).
- Tabs: Hero & Profile, About, Experience, Projects, Skills,
  Certifications, Education, Contact, Media files.
- Every list supports **Add / Edit / Reorder (↑↓) / Delete**.
- **Hero tab** — profile name/roles/summary, availability badge
  ("Open to new opportunities"), portrait photo upload (shown in the large
  gradient-framed hero card; empty shows the STZW initials monogram),
  stats (years, uptime, etc.) and the **CV file URL** ("Download CV" button;
  empty hides the button).
- **About tab** — paragraphs, quick facts (Location, Email, Phone, Languages,
  Interests) and an optional About photo (gets the same gradient frame).
- **Projects tab** — the **Highlight** value (e.g. `80%`) renders as a big
  gradient number on the card; `image` shows a photo (auto zoom on hover);
  `{highlight}` inside the description repeats the number.
- **Skills tab** — grouped lists (Infrastructure / Network / Security /
  Virtualization) shown as chips, plus the full icon grid.
- **Contact tab** — contact cards, **Social links** (label "LinkedIn" or
  "Facebook" auto-renders the official icon; shown in the Contact section
  and the footer) and the **Web3Forms access key**: create a free key at
  https://web3forms.com (just enter the receiving email), paste it here and
  Save — the "Send a message" form goes live and messages arrive in that
  inbox. Empty key hides the form.
- **Media files tab** — bulk image upload; copy any uploaded URL into an
  image field.
- **Save changes** persists to Vercel Blob — the public site updates on
  refresh (the site cache-busts `/api/content` on every load).

## Updating content from this repo (deploy workflow)

1. Edit files locally, then:
   ```bash
   git add <files> && git commit -m "..." && git push origin main
   ```
   Vercel auto-deploys (~10 s — watch progress in the dashboard,
   Deployments page shows "Ready").

2. **Important:** `data.json` changes are only *seed* content — the live
   site reads from **Vercel Blob**. After pushing a `data.json` change, also
   PUT it to production:
   ```bash
   B=https://salaithantzawwin.vercel.app
   TOKEN=$(curl -s -X POST $B/api/login -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}' \
     | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
   curl -s -X PUT $B/api/content -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json; charset=utf-8' \
     --data-binary @data.json
   ```
   (Admin → Save from the panel does the same thing.) Blob GET may lag a few
   seconds behind a PUT (CDN cache) — verify with a `?cb=<timestamp>`
   cache-buster on `/api/content`.

3. `vercel.json` rewrites: `/` → site, `/admin`, `/api/*`, `/css`, `/js`,
   `/assets`, `/favicon.ico`, `/manifest.webmanifest`, `/*.docx`.

## Site features (current)

- Light/dark theme toggle (saved in `localStorage`, pre-paint to avoid flash)
- STZW gradient favicon + PWA manifest (installable to a phone home screen;
  iOS opens fullscreen without Safari bars)
- Open Graph / Twitter share card (portrait OG image) when the link is shared
- Hero portrait card with entrance animation and hover lift
- Project photos with hover zoom, big gradient metrics
- Availability badge, tech tags on jobs, grouped skills
- Contact cards, social icon buttons (Contact section + footer)
- Working contact form (Web3Forms) with animated success panel
- Visitor counter badge in the footer (`/api/visit`, once per browser
  session, stored in Blob `stats/visits.json`)
- Custom 404 page in the site style

## Structure

```
api/          Serverless functions (login, content, upload, files, visit, logout)
lib/cms.js    Shared storage/auth/helpers (Vercel Blob or local filesystem)
site/         Public website + CV + certificates + uploads + manifest
admin/        Admin panel (single page app)
data.json     Seed content (local mode) — Vercel keeps a Blob copy
server.py     Local dev server mirroring the Vercel API
vercel.json   Routing config
404.html      Custom not-found page (auto-served by Vercel)
docs/         GitHub Pages-style landing page (open docs/index.html)
```
