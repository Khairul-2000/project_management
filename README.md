# Delivery Ops Console

A workload + delivery dashboard for tracking Fiverr/agency projects: department (stack) workload, delivery progress, project intake over time, and full add/edit/delete on your project list.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
cp .env.example .env   # then fill in Google OAuth credentials (see below)
npm run dev
```

Then open the URL it prints (usually `http://localhost:8079`).

Project data lives in `public/data/projects.json`. With Google connected, the dashboard pulls the private sheet into that file (and refreshes every 2 minutes). Use **Export** / **Import** to back up or move a JSON copy.

## Google Sheets sync (OAuth)

The sheet can stay private. Your Google account only needs **Viewer** access. The app uses OAuth (not a public CSV link).

### 1. Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. Enable **Google Sheets API** for that project.
3. Go to **APIs & Services → OAuth consent screen**, configure it (External is fine for personal use). Add your Google account as a test user if the app is in Testing.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Authorized redirect URI:
   ```
   http://localhost:8079/api/google/callback
   ```
7. Copy the **Client ID** and **Client secret**.

### 2. Local `.env`

```bash
cp .env.example .env
```

Set at least:

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=....
GOOGLE_REDIRECT_URI=http://localhost:8079/api/google/callback
GOOGLE_SHEET_ID=1ha_1ty00uNlMAqPeLe5Rg946IQl5GbYagAS5oRHzseE
GOOGLE_SHEET_GID=1486932215
GOOGLE_SHEET_TAB_PREFIX=STA
```

`GOOGLE_SHEET_TAB_PREFIX=STA` pulls **all** monthly tabs like `STA Aug 2026`, `STA July 2026`, merges them into `projects.json`, and dedupes by Order ID (newer month wins). If nothing matches the prefix, it falls back to `GOOGLE_SHEET_GID`.

Do not commit `.env` or `.google-tokens.json` (both are gitignored).

### 3. Connect and sync

1. `npm run dev`
2. In the header, click **Connect Google** and sign in with the account that can view the sheet.
3. After redirect, the app syncs automatically. Use **Sync now** anytime.
4. While the tab stays open, it re-syncs about every **2 minutes** and writes into `public/data/projects.json`.

### Column mapping

| Sheet column | Dashboard field |
|---|---|
| Initial Data | `date` |
| Sales Person | `salesPerson` |
| Profile Name | `profile` |
| Teams Name | `teamName` |
| Project Name | `projectName` |
| Project Price | `price` |
| Phase Name | `phase` (stack derived) |
| Order ID | `orderId` / `orderUrl` |
| Dateline | `dateline` |
| Sales Status | `salesStatus` |
| Team Lead Status | `teamLeadStatus` (WIP / Delivered — drives dashboard status) |

Dashboard status uses **Team Lead Status** only (`WIP` / `Delivered`).

Core columns come from the sheet on each sync. Local-only fields (`subtasks`, `notes`, `teamMembers`, etc.) are kept when the same row is matched by Order ID (or project name + date).

## Build for deployment

```bash
npm run build
npm start
```

`npm start` serves `dist/` and the same `/api/projects` + Google Sheets routes. Point `GOOGLE_REDIRECT_URI` at your deployed origin’s `/api/google/callback` if you host this server somewhere other than localhost.

Static-only hosts (Netlify Drop, GitHub Pages without a Node server) cannot run the OAuth/sync APIs — use `npm start` or keep syncing locally and deploying updated `projects.json`.

## What's inside

- `src/App.jsx` — dashboard: KPIs, department gauges, Fiverr-profile summary, charts, filters, project table.
- `server/googleSheets.js` — OAuth + Sheets fetch/merge into `projects.json`.
- `server/sheetsApiMiddleware.js` — `/api/google/*` and `/api/sheets/sync`.
- Data model, per project:
  - `date`, `salesPerson`, `profile`, `projectName`, `price`, `phase`, `stack`, `dateline`, `salesStatus`, `teamLeadStatus`, …
- "Department" = tech stack, auto-derived from Phase Name.
- "Late" = Dateline containing "Order Late"; delivered comes from Sales Status = Delivered.

## Customizing

- **Add a Fiverr profile**: `PROFILES` and `PROFILE_SHORT` in `src/lib/constants.js`.
- **Add a department/stack**: `STACKS`, `STACK_COLOR`, and `deriveStack()` in `src/lib/utils.js`.
- **Colors/fonts**: `COLORS` and `FONTS` in `src/lib/constants.js`.

## Tech stack

React + Vite, [recharts](https://recharts.org), [lucide-react](https://lucide.dev), Node APIs for JSON DB + Google Sheets (`googleapis`).
