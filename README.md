<img width="580" height="247" alt="Scherm­afbeelding 2026-04-14 om 16 34 52" src="https://github.com/user-attachments/assets/94597824-dc9f-4fd8-b8fc-5cc11b1f7edf" />

# Research Lab Manager

A web application for research lab leaders to manage their team, track PhD student progress, organize research projects, and keep meeting notes — all in one place. Lab data lives in a shared Supabase (Postgres) project so everyone in the lab sees the same data and changes propagate live.

## Features

### Dashboard

The dashboard gives you a quick overview of your entire lab: how many team members you have, how many PhD students are being tracked, active projects, and recent meeting notes. It also shows PhD progress bars at a glance, upcoming deliverables with color-coded due dates, and links to your most recent meetings.

### Team Management

Add and manage everyone in your lab — PhD students, postdocs, professors, or any other role. Each member has a name, role, email, and start date. You can mark members as inactive when they leave the lab, and toggle their visibility with the "Show Inactive" button. Team members appear throughout the app: they can be assigned to projects, linked to PhD trackers, and added as meeting attendees.

### PhD Progress Tracking

Track the progress of PhD students from start to expected completion. Each tracker includes:

- **Timeline overview** — A visual timeline showing all PhD students side by side, with a "today" marker so you can see where everyone stands at a glance.
- **Status tracking** — Mark each student as On Track, At Risk, Overdue, or Completed. Status is reflected in the progress bar colors across the app.
- **Milestones** — Add milestones with target dates (e.g., "Literature review complete", "First paper submitted"). Check them off as they're achieved. Completed milestones also appear on the timeline.
- **Dissertation chapters** — Track individual chapters of the dissertation with a title, APA reference, notes, and a status (Not Started, In Progress, Finished). Useful for keeping an overview of a paper-based dissertation.

Click on any PhD tracker card to expand it and see the full details, milestones, and chapters.

### Projects

Organize your research projects with descriptions, date ranges, color labels, and status (Active, Planned, On Hold, Completed). Each project can have:

- **Team members** — Assign lab members to projects so you can see who is working on what.
- **Deliverables** — Add deliverables with due dates, descriptions, and status tracking. Assign a deliverable to a specific team member. Upcoming deliverables automatically appear on the dashboard.

Expand any project card to manage its members and deliverables.

### Meeting Notes

A built-in note-taking tool for lab meetings. Create a new meeting note by giving it a title, date, and optionally linking it to a project. Select which team members attended.

The editor supports rich text formatting: bold, italic, strikethrough, headings, bullet lists, numbered lists, and block quotes. Notes are saved automatically as you type. A sidebar lets you browse and search through all your meeting notes.

### Publications

Pull each team member's publication record straight from [Biblio UGent](https://biblio.ugent.be/). Set a member's UGent ID on the Team page — either the **numeric form** (e.g., `801000947425`) or the **UUID form** found on newer Biblio profiles (e.g., `EB23467E-5E7C-11E6-BCAC-C275B5D1D7B1`) — and the Publications page will fetch their full bibliography on demand.

> **Note (web hosting):** Biblio UGent does not send CORS headers, so the browser cannot call it directly. The app requests publications via the relative path `/biblio-api/...`, which must be reverse-proxied to `https://biblio.ugent.be/` by your web server. The Vite dev server does this automatically; for production see [Deploying to a web server](#deploying-to-a-web-server).

Each member's publications are listed with title, authors, year, type, journal, and a link out to the Biblio record or DOI. The page also surfaces aggregate metadata across all tracked members:

- **% A1 tile** — share of publications classified as A1 (journal article in Web of Science) under the Belgian VABB classification.
- **By VABB classification** — pie chart of A1 / A2 / B / C / D / U / V codes, with A1 highlighted.
- **By type** — pie chart breaking down journal articles, book chapters, conference papers, etc.
- **Publications per year** — full-width timeline (bar per year, oldest left to newest right) so you can see output trends at a glance.

Filters let you narrow the per-member list by year or type.

### Settings

- **Account** — Shows the email you're signed in as and lets you sign out.
- **Export** — Download a JSON snapshot of the shared lab database (useful for backups).
- **Import** — Replace the shared database with a JSON backup. Also accepts exports from the legacy local-SQLite version of the app (one-time migration). **This affects everyone in the lab**, so use with care.

## Getting Started

Research Lab Manager is a web application built with Vue 3 + [Vite](https://vite.dev/) and [Supabase](https://supabase.com/) (hosted Postgres + auth + realtime). The build output is a set of static files you can serve from any web server.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later) — needed to build the static bundle
- A free [Supabase](https://supabase.com/) project (one per lab — everyone shares it)
- A web server to host the built files (e.g., nginx or Apache) with the ability to reverse-proxy the Biblio API path

### One-time Supabase setup (do this once per lab)

1. Sign up at [supabase.com](https://supabase.com/) and create a new project. Pick the region closest to your lab.
2. In the project dashboard, open the **SQL editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates all tables, views, RLS policies, and enables realtime.
3. In **Authentication → Providers**, make sure Email is enabled. For a small lab, you can also disable "Confirm email" under **Authentication → Settings** so colleagues can sign in immediately after sign-up.
4. In **Settings → API**, copy the **Project URL** and the **anon public** key. Share them with your colleagues — these are not secrets.
5. (Optional, one-time) If you have an export from the legacy local-SQLite version, sign in to the new app and use **Settings → Import JSON** to load it into Supabase.

### Per-user setup

Each colleague clones the repo and creates a `.env` file with the values from step 4 above:

```bash
cp .env.example .env
# then edit .env and paste in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Install dependencies

```bash
npm install
```

### Run in development

Launches the Vite dev server with hot reload at `http://localhost:5173`. The dev server also proxies `/biblio-api` to Biblio UGent, so the Publications page works locally without extra setup:

```bash
npm run dev
```

### Build for production

Type-checks and builds the static bundle into `dist/`:

```bash
npm run build
```

The `dist/` folder contains plain static files (`index.html`, JS, CSS, assets) — deploy it as-is to any web server or static host.

### Deploying to a web server

1. Build the bundle: `npm run build`.
2. Copy the contents of `dist/` to your web root (e.g., `/var/www/researchlabmanager`).
3. Configure your web server to reverse-proxy `/biblio-api/` to `https://biblio.ugent.be/` (so the Publications page can reach Biblio UGent without CORS issues).

A ready-to-use nginx example lives in [`deploy/nginx.conf`](deploy/nginx.conf). The essential parts:

```nginx
server {
    listen 80;
    server_name your-lab.example.com;
    root /var/www/researchlabmanager;
    index index.html;

    # Reverse-proxy the UGent Biblio API to avoid browser CORS.
    location /biblio-api/ {
        proxy_pass https://biblio.ugent.be/;
        proxy_set_header Host biblio.ugent.be;
        proxy_ssl_server_name on;
    }

    # The app uses hash-based routing, so a simple static root is enough.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The app uses hash-based routing (`/#/team`, `/#/publications`, …), so no SPA history rewrite is required — every route is served by the same `index.html`.

> **Env vars are baked in at build time.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and the optional `VITE_BIBLIO_BASE`) must be present in `.env` when you run `npm run build`, not on the server. These values are not secrets (the anon key is meant to be public, protected by Supabase Row Level Security).

### Deploying with Docker (easiest)

The repo ships a multi-stage `Dockerfile` (build with Node → serve with nginx) and a `docker-compose.yml`. nginx and the Biblio reverse proxy are baked into the image, so this is the simplest way to host the app.

1. Create a `.env` file with your Supabase values (see [`.env.example`](.env.example)).
2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:8080` (change the published port in `docker-compose.yml` if needed).

Compose reads the `VITE_*` values from `.env` and passes them as build args — Vite bakes them into the bundle, so rebuild (`--build`) after changing them.

To build the image without compose:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-public-key \
  -t researchlabmanager .
docker run -d -p 8080:80 researchlabmanager
```

For public/HTTPS hosting, run this container behind a TLS-terminating reverse proxy (Caddy, Traefik, or another nginx) pointing at the container's port 80.

### Other scripts

```bash
npm run dev       # Vite dev server (with Biblio proxy) + hot reload
npm run build     # Type-check and build the static bundle into dist/
npm run lint      # Run ESLint
npm run preview   # Locally preview the built dist/ bundle
```
