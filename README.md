# Salai Thant Zaw Win — Portfolio + CMS (Vercel-ready)

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

- Tabs: Hero & Profile, About, Experience, Projects, Skills,
  Certifications, Education, Contact, Media files.
- Every list supports **Add / Edit / Reorder (↑↓) / Delete**.
- Certifications: upload an image **or PDF** — PDFs show a 📄 badge and open
  in a new tab; images show as thumbnails.
- Hero tab also has the **CV file URL** (shown on the “Download CV” button;
  empty hides the button).
- **Save changes** persists — the public site updates on refresh.

## Structure

```
api/          Serverless functions (login, content, upload, files, logout)
lib/cms.js    Shared storage/auth helpers (Vercel Blob or local filesystem)
site/         Public website + CV + certificates + uploads
admin/        Admin panel (single page app)
data.json     Seed content (local mode) — Vercel keeps a Blob copy
server.py     Local dev server mirroring the Vercel API
vercel.json   Routing config
```
