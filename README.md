# Linkey - working rebuild of the Figma design

A no-build single-page app that reproduces the Linkey dashboard, the + Add
pop-up, the five-step onboarding and the public bio page. Plain HTML/CSS/JS,
hash routing, `localStorage` persistence, real Google sign-in (no server, no
secret), and an optional Supabase backend for cross-device accounts.

Design source: Figma `Linkey`, node `16-80334`; local design file
`E:\Linkey.figcraft` (opened headless through FigCraft for measurements).

**Live:** <https://vinaysuthar113.github.io/linkey/> - see `DEPLOY.md` for the
five-minute Google client-id setup.

## Run it

```bash
cd linkey
python -m http.server 5199 --bind 127.0.0.1
# http://127.0.0.1:5199/index.html
```

On localhost the app opens on a seeded demo account (so the dashboard is
explorable without signing up). On any other host a first visit starts signed
out, on the login screen — the seed never ships to real users.

To test clean public URLs (`/u/<handle>`) locally, use the SPA fallback server:

```bash
python tools/spa_server.py 5200
# http://127.0.0.1:5200/u/vinay.suthar
```

The dev server sends `Cache-Control: no-store`, which matters while iterating:
the browser otherwise keeps an old copy of `pages.js` and you debug a build that
is not running.

## Host it

The site is a static folder. Any host works; `DEPLOY.md` has the full walkthrough
for GitHub Pages (free, hash links) and Cloudflare Pages (free, pretty
`/u/<handle>` links).

```bash
# from linkey/
git init -b main
git add .
git commit -m "Linkey beta"
gh repo create linkey --public --source=. --push
```

Then enable Pages for `main` / root. No build step, no environment variables:
the only file a deployment ever edits is `assets/js/config.js`.

## Three modes

| Mode | How it turns on | What works |
|---|---|---|
| **Local** | default - `assets/js/config.js` left empty | the whole app, one local account, data per browser |
| **Google** | `googleClientId` set | real Google sign-in in the browser, no server, account stored on the device |
| **Cloud** | `supabaseUrl` + `supabaseAnonKey` set | Google or email sign-in, page saved to Postgres, readable across devices |

All three run the same code. Only `cloud.js` knows which one is active; `Store`
stays synchronous, and every network call fails soft (no connection never blocks
the editor). See `BACKEND.md §2` for the Supabase setup.

## Layout

```
index.html               shell, torn-paper SVG filter, base-path fix
legal.html               Terms, Privacy, Acceptable use, Trademarks, DMCA, Licences
assets/css/app.css       tokens, shell, topbar, cards, add pop-up, setup, bio page
assets/js/config.js      the only file to edit to turn on the backend
assets/js/cloud.js       first-party PKCE client: OAuth, email link, session, pages
assets/js/icons.js       inline SVG icon set
assets/js/store.js       state, 19 themes, seed data, safeUrl(), persistence
assets/js/providers.js   link picker: 8 tabs, ~70 providers, logos, colours
assets/js/addpop.js      + Add pop-up: picker step, format-aware details step
assets/js/pages.js       every page renderer + phone preview + setup + bio page
assets/js/app.js         router, actions, modals, toasts, drag & drop, boot
assets/fonts/            self-hosted Rubik (woff2) + OFL.txt
assets/icons/providers/  18 brand marks exported from the design file
assets/brand/logo.svg    the owner's mark — swap this one file to rebrand
assets/img/auth/         two decorative photos for the sign-in art pane
tests/unit.test.js       1158 assertions, zero dependencies
qa/                      reference captures, QA harness and screenshots
tools/spa_server.py      local server with SPA fallback
THIRD_PARTY.md           font licence + brand-mark provenance
LEGAL-REVIEW.md          launch checklist and name-clearance notes
```

## Routes

Editor: `#/links` `#/shop` `#/customize` `#/earn` `#/earning` `#/audience`
`#/insight` `#/planner` `#/autoreply` `#/shortener` `#/ideas` `#/profile`
`#/settings` `#/notifications`

Account: `#/login` `#/signup` `#/forgot` `#/setup` (5 steps) `#/welcome`

Public page: `/u/<handle>` (clean URL) or `#/u/<handle>` (works anywhere).

Routes are guarded in one place (`guard()` in `app.js`): signed out -> `#/login`,
signed in but not set up -> `#/setup`, set up -> the editor. `/u/<handle>` is
never gated, so a shared link keeps working after the owner signs out.

## Onboarding — five steps

The design has five `Get_Started` frames, so setup has five steps. Each one has
`Back`, `Skip` and `Continue`, a five-segment progress bar and "Step N of 5":

1. **Goal** — three cards: discover content, build a link in bio, grow an
   audience. Stored as `profile.goal`.
2. **Theme** — all 19 themes rendered from the same swatches the Customize page
   uses, so adding a theme can never drift between the two.
3. **Platforms** — twelve common platforms, pick up to five. The chips are
   disabled at the cap and announce the count; every mark is a real brand
   vector, not a letter tile.
4. **Links** — a row per selected platform (`Instagram · Username`), plus three
   optional extra URLs. A row is skipped when it is empty, so `Skip` and
   `Continue` agree about what counts as content.
5. **Profile** — avatar (PNG/JPG/WebP, re-encoded to a 256 px JPEG and capped at
   2 MB), display name and a 160-character bio with a live counter.

The handle is asked for on **sign-up**, where the design's "taken" frame lives,
not here. `completeSetup()` is the single write: it validates the handle and
name, installs the starter links, sets `onboarded`, and (in cloud mode) saves the
page. A blank sign-up gets a blank account; `Store.reset()` restores the demo.

## Link formats

Eight kinds, all authored in both the + Add pop-up and the edit modal:

| Kind | Tile shows | Clickable |
|---|---|---|
| **Link** | title, optional second line | yes |
| **Social** | platform mark from the icon row | yes |
| **Product** | title, `$38.50 · note` | yes |
| **Event** | title, `14 Nov 2026 · note` | yes |
| **Video** | title, optional note, play badge on the glyph | yes |
| **Form** | title, defaults to `Subscribe` | yes |
| **Text** | the paragraph itself, up to 160 characters | **no** — a content block |
| **Header** | the heading itself | **no** — a content block |

`text` and `header` render as `<div>`, not `<a>`, on the public page, in the
phone preview and in the editor — a block with no destination should not be a
link, and should not be focusable. Format data lives on the link (`price`,
`date`, `note`), not in a side table, so moving or copying a link keeps it.

One function, `Pages.tileInner()`, renders the inner markup for all three
surfaces; `tileNote()` decides the second line per kind. The editor, preview and
public page therefore cannot disagree about what a product costs.

## The + Add pop-up

The Add flow is the design's component, not a single form
(Figma component set `86928`, 8 variants):

1. **Picker step** — 797x684 dialog, r32. 61 px header, 56 px search pill,
   153 px rail with 8 tabs (Suggested, Commerce, Social, Media, Contact, Event,
   Text, View all), 548 px panel with a 4x125 px tile grid and 59 px link rows.
   The panel scrolls (~635 px of content in a 472 px viewport), which is how the
   remaining link types appear.
2. **Details step** — title, URL (or body text for a block), price, date and
   second line as the format needs, with a live preview, URL normalisation and
   back/close controls.

Behaviour: search filters live, pasting a URL detects the provider, Escape and
the scrim close it, focus returns to the + Add button, `aria-modal` is set.
Layout switches to a full-screen sheet below 830 px.

## Page layouts

Four layouts, chosen in Customize or during setup, applied to the phone preview
and the public page from the same `Store.layoutPlan()` call:

| Layout | Behaviour |
|---|---|
| **List** | one full-width button per link — the design's default |
| **Bento-Grid** | 4-column grid, tiles sized by a rule (social -> 1x1, media/shop -> 2x1, featured/text -> 2x2, header -> 2x1) |
| **Grid** | uniform 2-up grid |
| **Custom** | the same grid with per-link overrides; `cycleSpan()` walks 1x1 -> 2x1 -> 1x2 -> 2x2 -> auto |

The engine is **deterministic**. `spanOf(link)` is a pure function of the link's
kind, host, title length and any manual override; `layoutPlan()` is a pure
function of the link list. Same input, same layout, every render, with no network
call and no model in the path — so a page never reflows because an API was slow
or a model changed its mind.

## Authentication

- **Local** — email or username, no password. `signIn()` matches the stored
  email or handle. This is a demo, not a security boundary; it is labelled as
  such in the UI and in `THIRD_PARTY.md`.
- **Google (no server)** — Google Identity Services token client with scope
  `openid email profile`, then `openidconnect.googleapis.com/v1/userinfo`.
  `Cloud.verifyGoogleProfile()` accepts only a numeric `sub`, a verified email
  and an `https:` picture; the access token is used once and never stored. The
  identity becomes a device-local account (`auth.provider = "google"`).
- **Cloud** — Google OAuth with **PKCE** (S256), plus email magic links.
  The app never sees a client secret. Tokens arrive as `?code=` because the
  router owns the hash; `cloud.js` exchanges the code at `/auth/v1/token` with
  `grant_type=pkce`, stores the session, and strips the query with
  `history.replaceState`.
- Before a Google identity replaces a different live page, the old page is
  copied to `linkey.backup.v1`. Replacing a browser-only account is
  destructive and there is no server copy to fall back on.
- Sign-up intent (name + handle) survives the redirect in
  `state.ui.pendingSignup`, is applied only when the returned email matches, and
  expires after 30 minutes.
- A configured deployment force-signs-out the seeded demo session on boot, so a
  demo identity can never look like a real signed-in user.
- Session storage: `localStorage` under `linkey.cloud.v1`. That is fine for a
  beta (the token is readable by any script on the origin — and there are no
  third-party scripts). Production should move to httpOnly cookies set by a
  Cloudflare Function; see `BACKEND.md §7`.

## Security

- Every URL that reaches an `href` goes through `Store.safeUrl()`: only
  `http`, `https`, `mailto` and `tel` survive; `javascript:`, `data:`,
  `vbscript:`, `file:` and malformed values become `#`.
- Bare domains are upgraded to `https://` instead of resolving against a
  placeholder origin.
- Applied at input (picker, inline URL field, edit modal), at save
  (`Store.sanitizeLink`), and again at render (bio links, social icons), so old
  or hand-edited state cannot inject a scheme.
- Restored cloud pages are re-sanitised field by field: an unsafe URL becomes
  empty, an unknown platform is dropped, a reserved handle is refused.
- Avatars accept only `https:` or a tiny inline JPEG; `data:image/svg+xml` and
  anything over the size cap are rejected. No SVG uploads.
- The page style is a closed vocabulary, not CSS: `Store.sanitizeStyle()` keeps
  only known keys, clamps numbers, and accepts colours as `#rgb`/`#rrggbb`
  only. Fonts and gradients are looked up by id, so a tampered
  `localStorage` payload cannot add a rule, a `url()` or a remote font.
  `styleVars()` is the single place that turns a style into custom properties,
  and the editor preview and the live page both call it.
- A page read from another account (`Store.publicView`) goes through the same
  sanitizers, then the renderer escapes it again.
- All user strings are escaped with `Store.esc()`; no inline handlers.
- The editor has no third-party requests, cookies or analytics. The only
  optional network calls are to the Supabase project the owner configures and,
  when a client id is set, Google's own sign-in endpoints.

## Shareable public links

- `publicLink()` builds an absolute URL from the current origin and base path,
  honouring `LINKEY_CONFIG.linkBase`:
  - `"auto"` (default) — `/u/<handle>` on a real host, `#/u/<handle>` on
    `*.github.io`, which cannot rewrite paths.
  - `"hash"` — always `#/u/<handle>` (works on any static host).
  - `"path"` — always `/u/<handle>` (needs a rewrite rule: Cloudflare Pages,
    Vercel, Netlify).
- `Settings -> Your page` and the topbar chip copy that exact URL.
- On the bio route the app sets `document.title`, `description`, `og:*` and
  `twitter:*` tags so chat/social previews show the creator's name and bio.
- **A handle that is not this device's account is looked up, not faked.** With
  Supabase configured, `Cloud.loadPublicPage(handle)` reads the published row;
  without it (or if the row is missing) the visitor gets an honest
  "hasn't published here yet" page with a sign-up link instead of seeing
  somebody else's page under the wrong address.
- Crawlers do not run JS, so a *real* rich preview needs the server-rendered
  page in `BACKEND.md §4`. That is the next backend step.

## Tests

```bash
node tests/unit.test.js     # 1368 assertions
```

Covers: provider data integrity (unique ids, every provider reachable from a tab,
every logo file present), absence of placeholder copy from the design file, URL
normalisation and scheme blocking for both `AddPop._normalizeUrl` and
`Store.safeUrl`, the layout engine (`spanOf`, `layoutPlan`, `cycleSpan`), the
account layer (handle rules and reserved list, suggestions, email validation,
sign-in by email and by handle, sign-up field errors, setup completion, sign-out),
the five-step onboarding vocabulary (twelve platforms, three goals, URL builders
per platform, cap of five, starter links), avatar acceptance, sign-up intent and
its TTL, `adoptCloudUser` for new / returning / hydrated / reserved-handle cases,
`adoptProviderUser` for new / returning / replaced-with-backup / intent cases,
`verifyGoogleProfile` accept and reject paths, the style engine (clamping, closed
vocabularies, colour maths, `styleVars` for every background / fill / shape and
the promise that the preview and the live page share one string),
`publicView` for remote rows, `publicLink` for path / hash / github / file /
traversal cases, the missing-page and loading screens, `cloudSnapshot`, the
per-kind renderers and the setup wizard, and the whole `cloud.js` client
including a mocked PKCE exchange, cancellation and an expired verifier.

Browser harnesses in `qa/`:

- `qa/addpop.html?tab=social&scroll=620` — the picker standalone.
- `qa/auth.html?mode=login|signup|forgot` — signed out.
- `qa/auth.html?mode=setup&step=1..5` — any onboarding step, with a realistic
  draft (`&empty=1` for the first-run state, `&cap=1` for five platforms).
- `qa/auth.html?mode=welcome` — the "you're live" screen.
- `qa/mobile.html?auth=setup&step=3` — the same screens at 390x844.
- `qa/layout.html?layout=bento&hash=%23/bio` — a layout on the public page.
- `qa/bio.html?layout=list|bento|grid|custom` — a finished page using all eight
  link kinds, for layout and format checks (`&hash=%23/links` opens the editor
  with the same account).

## Fonts

Rubik (variable, 300-700), self-hosted in `assets/fonts/` under the SIL Open Font
License. `OFL.txt` ships with it and the public legal page links to it. No Google
Fonts request is made at runtime. The design's Ignogito is proprietary; Rubik is
the licensed stand-in (see `THIRD_PARTY.md`).

## Known gaps

- **Accounts are per device until a backend is configured.** Google mode proves
  who you are, but the page itself is still `localStorage`; clearing site data
  or switching browsers starts a new account. Supabase (`DEPLOY.md §4`) fixes
  identity and storage.
- **Sharing needs the cloud row.** A shared link only resolves for someone else
  when the owner has a Supabase project with a public read policy; without one
  the visitor sees the honest empty state described above.
- **No server-rendered OG tags.** Social previews need the function in
  `BACKEND.md §4`.
- Analytics, payouts, email capture and product checkout are UI only. Click
  counts are stored locally and are not yet incremented by visitors.
- The handle is not yet claimed atomically in cloud mode (`claim_handle()` in
  `BACKEND.md §3b`); the unique index will reject a collision, but the beta
  shows a generic error until that function is installed.
- Photos from the Figma mock are replaced with placeholders/gradients, except the
  two decorative sign-in images — see `THIRD_PARTY.md §1c`.
- The "Linkey" name conflicts with two existing apps — see `LEGAL-REVIEW.md`
  before publishing under it.

## Beta checklist

1. Deploy to GitHub Pages (`DEPLOY.md §1`). Signup, onboarding, editing and the
   public page all work on the hosted URL.
2. Add a Google OAuth client id (`DEPLOY.md §2`) with the Pages origin in
   **Authorised JavaScript origins**. The Google button then opens the real
   account chooser; until then it explains what is missing instead of pretending
   to sign in.
3. Optional: create a Supabase project, paste the URL + anon key, run
   `supabase/schema.sql`, then run `node tools/check-supabase.mjs`
   (`DEPLOY.md §4`). This makes accounts survive a new browser and makes shared
   links resolve.
4. Open the hosted `/u/<handle>` on a phone and sign in with a Google account
   that has never touched the app.
5. Only then invite testers. The demo account and the Google account are
   separate identities on purpose.
