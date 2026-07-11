# Delivery Ops Console

A workload + delivery dashboard for tracking Fiverr/agency projects: department (stack) workload, delivery progress, project intake over time, and full add/edit/delete on your project list.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

Your data saves automatically to your browser's local storage on this machine — closing the tab or restarting your computer won't lose it. It's tied to this browser though, so use **Export** (top right) to back up a JSON copy, and **Import** to restore it or move it to another computer.

## Build for deployment

```bash
npm run build
```

This creates a `dist/` folder with static HTML/CSS/JS — no server required. You can:

- **Drag and drop `dist/` onto [Netlify Drop](https://app.netlify.com/drop)** — live in seconds, free.
- **Deploy with [Vercel](https://vercel.com)**: `npx vercel dist --prod` (after `npm i -g vercel` or using `npx`).
- **GitHub Pages**: push `dist/` to a `gh-pages` branch, or use the `gh-pages` npm package.
- Host it on any static file host (S3, Cloudflare Pages, your own server, etc.) — just point it at `dist/`.

## What's inside

- `src/App.jsx` — the whole dashboard: KPIs, department (stack) gauges, Fiverr-profile summary, charts (recharts), filters, and the add/edit/delete project table + modal.
- Data model, per project:
  - `date`, `salesPerson`, `profile` (Fiverr seller profile), `projectName`, `price`, `phase`, `stack` (department: Backend / Frontend / UI/UX / Automation / Deploy / Other), `dateline`, `salesStatus`, `teamLeadStatus`.
- "Department" = tech stack, auto-derived from Phase Name when you add a project, but you can override it in the form.
- "Late" status = the Dateline field containing "Order Late"; everything else with a live countdown counts as in progress.
- Delivered/in-progress/late is currently read from the **Sales Status** column. If you'd rather it track **Team Lead Status** instead, change `statusOf()` near the top of `src/App.jsx`.

## Customizing

- **Add a Fiverr profile**: add it to the `PROFILES` array and `PROFILE_SHORT` map near the top of `src/App.jsx`.
- **Add a department/stack**: add it to `STACKS` and `STACK_COLOR`, and teach `deriveStack()` the phase keyword that should map to it.
- **Colors/fonts**: all in the `COLORS` object and the `FONTS` Google Fonts import at the top of `src/App.jsx`.

## Tech stack

React + Vite, [recharts](https://recharts.org) for charts, [lucide-react](https://lucide.dev) for icons. No backend — everything runs in the browser.
