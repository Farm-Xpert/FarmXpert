# FarmXpert Frontend

The web app: the public landing site, sign-in, farm onboarding, the farmer dashboard and
the admin console. Built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and
next-intl.

```
src/
  app/[locale]/
    page.jsx                 landing page
    agents/ features/ how-it-works/ technology/   marketing pages
    (app)/                   signed-in shell (fonts, theme, session)
      auth/                  login, register, verify email, forgot password
      onboarding/            five-step farm setup
      dashboard/             today, ask, voice, tasks, water, soil, mandi, usage, settings
      dashboard/admin, dashboard/accounts          operators only
  components/
    landingpage/  marketing/ landing site sections and pages
    auth/  onboarding/       sign-in screens and the setup wizard
    dashboard/               shell, sidebar, root vine, assistant, voice mode, pages
    admin/                   analytics console and hand-built SVG charts
    ui/                      design primitives, icons, logo, skeletons, pickers
  context/                   AuthContext, FarmContext, theme
  hooks/  lib/  services/    data fetching, API client, streaming chat and voice
  i18n/  messages/           next-intl routing; en.json, hi.json, gu.json
  styles/                    landing, navbar, auth, app (Tailwind) stylesheets
```

## Run

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the Node API, `http://localhost:4000` by default. For
production, `npm run build` produces a standalone server that the Dockerfile ships.

## Notes

- **Languages:** every screen is in English, Hindi and Gujarati. English has no URL
  prefix; the other languages use `/hi/...` and `/gu/...`. Add copy to all three
  files in `src/messages/`.
- **Themes:** light and dark are chosen by the `fx_theme` cookie, so the first paint is
  already right. App colours are CSS variables on `.fx-app[data-mode]`, and the landing
  site's are on `html[data-theme]`.
- **Roles:** admins see only the Admin, Accounts and Settings pages. Farmers see
  everything else. Opening a page for the other role by its address redirects home.
- **Streaming:** answers arrive as server-sent events and are revealed as they are
  written. Voice answers also play sentence by sentence.
