# NEW YORK WILL BE OURS

A plain HTML / JavaScript Deadlock race tracker hosted on GitHub Pages, with a
Convex database for the shared player list and race start time. No React or
frontend build step is required. Player statistics still come directly from
Deadlock API; this backend does not cache statistics.

## Backend

Project: https://dashboard.convex.dev/t/hashim-rafiq/new-york-will-be-ours

This project belongs to the personal `hashim-rafiq` team. The committed
`backend-config.js` points at the production deployment. Every visitor subscribes
to the same race; Legacy player/date URL parameters are removed; shared settings come from the database.

```sh
npm ci
npm run backend:dev
npm run typecheck
npm run backend:deploy
```

Initialize an empty deployment once with `npx convex run race:initialize --prod`.
The initial date is seven days before initialization at midnight UTC. Change it
in the page to the actual race start.

## Organizer access

Visitors can read the race and add players without signing in. Additions are
saved directly to production with an append-only mutation; concurrent additions
do not overwrite one another. Successful saves are confirmed in the page.
To change the race start date, click **Organizer access** and enter the deployment's `RACE_ADMIN_KEY`. The key stays in tab memory only;
**Lock editing** clears it. Organizer updates validate the key on the server and check
revision numbers to prevent overwriting concurrent edits.

Player removal is available only by editing the `races` table directly in the
Convex dashboard. There is no remove control, and the public update mutation
rejects removal even with an organizer key.

The initial key is in the ignored local `.env.organizer` file. Keep it private.
Set or rotate it in Convex Dashboard → production deployment → Settings →
Environment Variables → `RACE_ADMIN_KEY`. An unset key disables organizer updates; public joining remains available.
Do not put organizer keys, deployment keys, or `.env` files on GitHub Pages.
There is no per-user login or brute-force throttling; use a long random key.

## Static hosting

Publish `index.html`, `backend-config.js`, `vendor/`, and the existing media with
GitHub Pages. No Node process is needed to serve the frontend. The vendored
Convex browser client is pinned to the installed package version (1.47.0); its
license is in `vendor/convex.LICENSE`.

For local preview, serve only public files with a static server. Avoid exposing
this project directory publicly because it includes ignored local secrets.

Backend configuration or connection failures disable saving and display an error;
there is no local-only fallback that could look like a successful database save.
