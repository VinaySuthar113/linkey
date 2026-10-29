# Backend plan

What has to exist before a link you publish opens with *your* content on someone
else's phone — and what each side has to do.

Today the app is local-first: state lives in `localStorage`, and `/u/<handle>`
renders whatever is in the *visitor's* browser. Four things break because of that:

| Symptom | Cause |
|---|---|
| A stranger sees the demo profile, not yours | Data never leaves your browser |
| Slack / iMessage / WhatsApp previews are blank | OG tags are set in JS; crawlers don't run JS |
| Anyone could edit a page if you sync by handle | No auth, no ownership |
| No avatar upload | `avatar` is a data URL in state, there is no storage |

The last one is the important architectural constraint: **the public page needs
server-rendered HTML**, not just an API. Everything else can stay client-side.

## What already ships in this repo

The beta is not a mock-up of a backend. Three pieces are implemented and tested:

| Piece | File | State |
|---|---|---|
| PKCE OAuth + email link + session | `assets/js/cloud.js` | working, unit-tested with a mocked exchange |
| Config gate (empty config = local demo) | `assets/js/config.js` | working |
| Page save / restore per user | `cloud.js` `savePage()` / `loadPage()` | working against a `pages` table |
| Account adoption on boot | `store.js` `adoptCloudUser()`, `app.js` boot | working, tested for new / returning / hydrated / reserved-handle |
| Server-rendered `/u/:handle` with OG tags | — | **not built** (see §4) |
| Avatar upload to object storage | — | **not built** (see §6) |

Wiring the first four costs one Supabase project and two keys. That is enough for
a usable private beta: real Google sign-in, a page that follows you between
devices, and the same UI the design shows.

---

## 1. The five jobs

1. **Store** — profiles and links in Postgres, keyed by handle.
2. **Auth** — prove who owns a page.
3. **Serve** — return HTML for `/u/:handle` with the OG/Twitter tags already in
   the `<head>`, then let the existing JS take over.
4. **Upload** — avatars in object storage, size/type limited.
5. **Count** — optional click counter (a single `UPDATE ... clicks + 1`).

Everything else (themes, preview, drag-and-drop, the Add pop-up) stays exactly as
it is. The app already funnels every write through `Store.commit()`, so the
persistence swap is contained to one place, and the cloud calls are already
fire-and-forget so a network failure degrades to local editing instead of a
broken editor.

---

## 2. Turn on cloud auth (ten minutes)

### 2.1 Create the project

1. <https://supabase.com> -> New project. Free plan, region closest to your users.
2. Project Settings -> API: copy **Project URL** and the **anon public** key.
3. Paste both into `assets/js/config.js`:

```js
window.LINKEY_CONFIG = {
  supabaseUrl: "https://abcdefghijklmno.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
  siteUrl: "",            // leave empty unless served from a sub-path
  auth: { google: true, emailLink: true, apple: false }
};
```

The anon key is public by design: it identifies the project, it does not grant
anything on its own. Row access is enforced by RLS below. **Never** paste a
service-role key into this file — it bypasses RLS and is not needed by the client.

Once `supabaseUrl` and `supabaseAnonKey` are both set, `Cloud.isConfigured()` is
true, Google and email sign-in become real, the seeded demo session is signed out
on boot, and new accounts start blank.

### 2.2 Create the table

The client stores the page as one sanitised snapshot, not one row per link. That
is deliberate: a link in this app is a small object with a kind, a price, a date
and a span, and reordering needs a stable array. One row means one atomic write,
no partial pages, and a restore path that is already covered by
`Store.sanitizeLink()`.

The canonical schema lives in [`supabase/schema.sql`](supabase/schema.sql); run
that file rather than retyping the DDL. It creates:

```sql
create table public.pages (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  handle     text not null,              -- lowercase, unique, URL-safe
  onboarded  boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index pages_handle_key on public.pages (handle);
```

A `handle_taken(text)` function (SECURITY DEFINER, boolean only) lets signup ask
whether an address is free without exposing another account's draft. The unique
index is the backstop for a race between two simultaneous claims.

`data` is exactly what `Store.cloudSnapshot()` returns:

```json
{
  "name": "Ada Chen",
  "bio": "Design systems and type.",
  "avatar": "https://…",
  "goal": "build",
  "theme": "halo",
  "layout": "bento",
  "platforms": ["instagram", "youtube"],
  "links": [
    { "kind": "product", "title": "Grid Poster", "url": "https://…", "price": 38, "note": "Signed" },
    { "kind": "text", "title": "Open for two projects this winter.", "url": "" }
  ]
}
```

The client re-sanitises every field on read, so a tampered row cannot inject a
`javascript:` URL, an SVG avatar, an unknown platform or a reserved handle.

### 2.3 Row-level security

`supabase/schema.sql` installs four owner policies (`select`, `insert`,
`update`, `delete` on `auth.uid() = user_id`), one published-only policy for the
`anon` role, and column grants:

- `anon` may `select (handle, onboarded, data)` from published rows only.
- `authenticated` may read and write its own row; the `with check` clause stops
  a caller writing a row for another user id.
- `user_id`, timestamps and drafts are never part of the public projection.

Public read is therefore on by default in the shipped schema, not opt-in.
`Cloud.loadPublicPage(handle)` uses it, so a shared link resolves for a
signed-out visitor without any client change. If you prefer the beta default
(shared links only work when signed in), drop the `pages_public_read` policy and
the anon grant.

Verify with a second account: sign in as A, then call

```js
fetch(URL + "/rest/v1/pages?select=handle,onboarded,data", {
  headers: { apikey, Authorization: "Bearer " + otherToken }
})
```

and confirm you get `[]`, not B's row. A missing policy is a data leak, not a bug.
An anonymous call must return only published rows and only the three granted
columns; `select=user_id` or `select=*` must fail.

### 2.4 Google sign-in

1. <https://console.cloud.google.com> -> APIs & Services -> Credentials ->
   Create credentials -> OAuth client ID -> Web application.
2. Authorised redirect URI (exact, no trailing slash mistakes):

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

3. Copy the **Client ID** and **Client secret** into Supabase ->
   Authentication -> Providers -> Google, and enable it.
4. Supabase -> Authentication -> URL Configuration:
   - **Site URL**: `https://<your-domain>/` (or your `*.pages.dev` URL)
   - **Redirect allow-list**: `https://<your-domain>/**` and
     `http://localhost:5200/**` for local testing.

The client sends `code_challenge_method=s256` and the flow returns `?code=`.
Tokens never appear in the URL, the history entry is cleaned with
`replaceState`, and the verifier is single-use in `localStorage`
(`linkey.pkce.v1`).

Common failure modes:

| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` from Google | the Google console URI must be the **Supabase** callback, not your site |
| `{"error":"flow_state_not_found"}` | the verifier was cleared (private mode, different browser, expired) — start again |
| Sign-in returns to the wrong page | set `siteUrl` in `config.js`, or add the exact origin to the allow-list |
| `Sign-in needs a secure (https) page` | the browser is on `file://`; serve over localhost or https |

### 2.5 Email sign-in (optional)

Authentication -> Providers -> Email: enable, and turn **Confirm email** on.
Supabase's built-in SMTP is rate-limited and lands in spam; for a beta either
keep email sign-in off (`auth: { emailLink: false }`) or connect Resend
(3,000 emails/month free) under Authentication -> Emails -> SMTP.

The client calls `/auth/v1/otp` with a PKCE challenge and always answers "if that
email has an account, a link is on its way", so the screen cannot be used to
enumerate accounts.

---

## 3. Recommended stack — $0/month

**Cloudflare Pages + Pages Functions + Supabase + Resend.**

| Piece | Free allowance | Enough for |
|---|---|---|
| Cloudflare Pages (static) | unlimited requests and bandwidth, 500 builds/month | the whole app, forever, at any traffic a small product sees |
| Pages Functions | 100,000 requests/day | `/u/:handle`, OG rendering, link redirects |
| Supabase | 500 MB database, 1 GB storage, 50k monthly active users | thousands of pages |
| Resend | 3,000 emails/month, 100/day | magic links and password resets |
| `*.pages.dev` subdomain | included | launch without buying anything |

**Cost: $0/month.** The only optional spend is a custom domain (~$10–12/year).
Cloudflare's free plan permits commercial use, which is the reason it is the
recommendation rather than Vercel.

> **Do not launch on Vercel Hobby.** Vercel's Hobby plan is for non-commercial use;
> a product with paying users (or ads, or affiliate links) needs Pro at $20/user/month.
> Netlify's free tier is usable but its function allowance is far smaller than
> Cloudflare's. If you already pay for Vercel, it is a fine host — this is a
> licensing point, not a technical one.

Two free-tier traps to plan for: Supabase pauses a project after ~7 days of
inactivity on the free plan (a daily cron ping avoids it), and the free database
is shared-CPU — fine for this workload, but do not put image processing in the
request path.

---

## 3b. Data model, normalised

`pages.data` is the right shape for the beta because it matches
`Store.cloudSnapshot()` exactly and needs one atomic write. When public pages,
search or per-link analytics arrive, split it:

```sql
create table public.profiles (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null references auth.users(id) on delete cascade,
  handle          text not null,
  title           text not null default '',
  bio             text not null default '',
  avatar_url      text,
  theme           jsonb not null default '{}'::jsonb,
  layout          text  not null default 'list',
  socials         jsonb not null default '[]'::jsonb,
  seo_title       text,
  seo_description text,
  published       boolean not null default true,
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index profiles_handle_key on public.profiles (lower(handle));
create unique index profiles_owner_key  on public.profiles (owner);

create table public.links (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 160),
  url        text not null default '',
  kind       text not null default 'link',
  provider   text,
  logo       text,
  note       text,
  price      numeric(10,2) check (price is null or price >= 0),
  event_date date,
  active     boolean not null default true,
  position   int  not null default 0,
  clicks     bigint not null default 0,
  created_at timestamptz not null default now(),
  -- text and header are content blocks: they have no destination
  constraint links_url_required check (
    kind in ('text','header') or url ~* '^(https?://|mailto:|tel:)'
  )
);
create index links_profile_idx on public.links (profile_id, position);
```

The `url` CHECK and the `links_url_required` constraint are the server-side twins
of `Store.safeUrl()`. Client validation is a convenience; the database is the
enforcement. The `kind` list should be checked against `Store.LINK_TYPES` at
migration time.

### Claiming a handle (the only race worth handling)

Two people can submit the same handle in the same second. The unique index is the
authority; the client just has to translate the failure:

```sql
create table public.reserved_handles (handle text primary key);
insert into public.reserved_handles (handle) values
  ('u'),('api'),('app'),('admin'),('root'),('www'),('mail'),('support'),('help'),
  ('legal'),('terms'),('privacy'),('security'),('abuse'),('dmca'),('billing'),
  ('status'),('about'),('blog'),('login'),('signin'),('signup'),('logout'),
  ('register'),('account'),('settings'),('dashboard'),('links'),('shop'),
  ('customize'),('explore'),('discover'),('trending'),('linkey'),('official'),
  ('staff'),('team'),('me'),('new'),('create'),('home'),('index'),('null');

create function public.claim_handle(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from reserved_handles where handle = lower(p_handle)) then
    raise exception 'reserved' using errcode = 'P0001';
  end if;
  update pages set handle = lower(p_handle), updated_at = now()
   where user_id = auth.uid();
  if not found then
    raise exception 'no page' using errcode = 'P0002';
  end if;
end;
$$;
```

- `23505` (unique violation) -> "That username was just taken. Try one of these."
- `P0001` with `reserved` -> "That username is reserved."
- Anything else -> generic failure, and log it. Never surface the database message.

The same function is the place to enforce a change limit (e.g. twice per 30 days)
so a handle cannot be cycled to squat names.

### Handle rules (mirror these exactly)

`Store.handleIssue()` is the reference implementation and is unit-tested:

- 3–30 characters, `a-z 0-9 . _ -`
- must start and end with a letter or number
- no two separators in a row (`vin..ay`, `vin--ay`)
- lowercased and stored lowercased; the unique index is on `lower(handle)`
- not in `reserved_handles`

### Setup, end to end

The client has five steps. The writes are the same single `savePage()` call
(`completeSetup()`), so the server does not have to model step order:

1. `signUp` -> `auth.users` row (via OAuth or OTP) + `pages` row with
   `onboarded = false`. The handle is chosen here, where the design's "taken"
   frame sits. `claim_handle()` is the atomic version.
2. Steps 1–5 edit a local draft only: goal, theme, platforms, links, profile.
3. `Finish setup` validates the handle and name, installs the starter links,
   writes `pages` with `onboarded = true`, then navigates to `#/welcome`.
4. On the next device, `Cloud.loadPage()` restores the row and
   `Store.adoptCloudUser()` re-sanitises it before the editor renders.

The client guard in `assets/js/app.js` (`guard()`) is a convenience only. The
server must assume a request can arrive at any step: every write is authorised by
`auth.uid() = pages.user_id`, not by "the user reached step 5".

### Abuse controls that matter here

- Rate-limit OTP sends per email **and** per IP (e.g. 3/hour, 20/day). Supabase
  has built-in limits; keep them on.
- Do not reveal whether an email has an account — the client already answers
  "if that email has an account, a link is on its way".
- Expire links in 15 minutes and make them single-use (Supabase default for OTP).
- Treat handle lookups as public; treat email lookups as never public.
- RLS, not the anon key, is what stops a visitor writing to someone else's page.

---

## 4. Endpoints

| Job | Call | Replaces |
|---|---|---|
| Load my page | `GET /rest/v1/pages?user_id=eq.<uid>&select=handle,onboarded,data` | `Store.load()` |
| Save my page | `POST /rest/v1/pages?on_conflict=user_id` + `Prefer: resolution=merge-duplicates` | `Store.commit()` |
| Upload avatar | `storage.from('avatars').upload(...)` | avatar data URL |
| Public page | `GET /u/:handle` -> Pages Function | `bioPage()` + `applyBioMeta()` |
| Click counter | `POST /rest/v1/rpc/increment_link_click` | local `clicks` only |

### The one function worth writing carefully

`/u/:handle` must return HTML whose `<head>` already contains the tags:

```html
<meta property="og:title"       content="…" />
<meta property="og:description" content="…" />
<meta property="og:image"       content="https://cdn…/avatar.jpg" />
<meta property="og:url"         content="https://linkey.app/u/handle" />
<meta name="twitter:card"       content="summary_large_image" />
```

Then it can either inline the links (fast, no JS needed to read the page) or boot
the existing SPA with the data preloaded. **Inline the links** — a bio page should
work with JavaScript disabled and should be crawlable.

Rules for that renderer:

- Escape every user string for both HTML text *and* attribute context.
- Apply the same URL allow-list as `Store.safeUrl()`; a bad row must render as
  text, not as a live `javascript:` link.
- Cache at the CDN for ~60s; purge on publish so edits appear immediately.
- Return a real 404 for unknown handles, not the demo page.
- Never echo the handle into a redirect or a URL without encoding.
- Read with the service role on the server only. That key never reaches the
  browser, and the function must not accept a user id from the request.

---

## 5. What you need to do

These are the parts that need a human, a card, or a decision — not code.

| # | Task | Why it's yours | Rough cost |
|---|---|---|---|
| 1 | Buy a domain | Handles and links live under it | $10–15 / yr |
| 2 | Create Supabase project | Account holder must be the legal entity | free -> $25 / mo |
| 3 | Create Google OAuth client | Needs your Google account and consent screen | free |
| 4 | Create Cloudflare account | Same | free -> $5 / mo |
| 5 | Set up email sending (Resend/Postmark) + SPF/DKIM DNS | Magic links land in spam without it | free -> $20 / mo |
| 6 | Decide handle policy | Who gets `shop`, `help`, `admin`; 3–30 chars; reserved list | — |
| 7 | Legal entity, address, contact + DMCA mailbox | Fills the `[bracketed]` placeholders in `legal.html` | — |
| 8 | Update the privacy policy | Data leaves the browser; name Supabase/Cloudflare/Resend as sub-processors | — |
| 9 | Decide moderation stance | Strangers publishing means an abuse mailbox and a report button | — |
| 10 | Decide free vs paid | If paid: Stripe (or Paddle/Lemon Squeezy as merchant of record for VAT) | 3–5% + fees |
| 11 | Approve the name | `LEGAL-REVIEW.md §1` — this is still the biggest risk | — |

**Total to be publicly live:** roughly **$0–45/month** plus the domain.

---

## 6. Phases

| Phase | Ships | State |
|---|---|---|
| 0 | Design rebuild, five-step onboarding, all link formats, local persistence | **done** |
| 1 | Cloud auth (PKCE), page save/restore, config gate, tests | **done, needs keys** |
| 2 | Server-rendered `/u/:handle` with OG tags, public read policy | next |
| 3 | Avatar upload to Storage, click counting with rate limits, handle claim RPC | next |
| 4 | Billing, moderation, analytics | later |

### Beta checklist (in order)

1. Supabase project created; `url` + `anon key` pasted into `config.js`.
2. `pages` table, indexes, RLS policies, and `reserved_handles` applied.
3. Google provider enabled; redirect URI and allow-list match the deployed URL.
4. Deploy to Cloudflare Pages (`_redirects` already handles `/u/*`).
5. Sign in with a fresh Google account on a phone; complete all five steps.
6. Open `/u/<handle>` in a private window and confirm it is not the demo page.
7. Sign in on a second device; confirm the page restores instead of onboarding.
8. Confirm a signed-out visitor cannot read the `pages` table with the anon key.
9. Only then invite testers.

---

## 7. Security checklist for this specific product

- **RLS on every table**, including future ones. A missing policy is a data leak,
  not a bug.
- **Server-side URL allow-list** — the `CHECK` constraints above. Never trust the
  client check.
- **Session storage**: the beta keeps tokens in `localStorage`, which is readable
  by any script on the origin. There are no third-party scripts, but production
  should move to httpOnly, `Secure`, `SameSite=Lax` cookies set by a Cloudflare
  Function. Everything else in `cloud.js` (PKCE, single-use verifier, timeout,
  `credentials: "omit"`) already assumes the stricter model.
- **SSRF**: if you ever fetch link titles or favicons, you are requesting arbitrary
  user-supplied URLs. Block private IP ranges, cap redirects, time out fast.
- **Uploads**: cap size, sniff real MIME (not the extension), re-encode images,
  reject SVG or strip scripts from it. The client already re-encodes to a 256 px
  JPEG and refuses `data:image/svg+xml`.
- **OG renderer**: escape for attribute context; a `"` in a bio must not break out
  of `content="…"`.
- **Handle squatting**: reserved list, case-insensitive uniqueness, and a policy for
  inactive accounts.
- **Click fraud**: rate-limit the increment function; consider ignoring requests
  with no referrer.
- **Secrets**: only the Supabase anon key may reach the browser — and only because
  RLS is on. The service-role key never leaves the server.
- **Deletion**: "Delete account data" in Settings must cascade (the schema does it
  via `on delete cascade`).

---

## 8. Decisions I need from you

1. **Domain** — which one, so the OAuth redirect URLs can be pinned.
2. **Auth** — Google only for the beta, or Google + email links from day one?
3. **Handles** — `linkey.app/<handle>` (short) or `/u/<handle>` (current)? Short is
   nicer but collides with app routes, so it needs the reserved list either way.
4. **Free tier or paid from day one?** It changes whether billing is Phase 4 or 2.
5. **Name** — rename before building on it, or proceed and clear it later?

Answer 1 and 2 and the beta is live; 3–5 can follow.
