# Deploy Linkey

Linkey is a static site: HTML, CSS, JS and a handful of images. There is no
build step and no server code. Deploying means copying the folder to a host and,
optionally, setting two values in `assets/js/config.js`.

Everything below is free at beta scale.

| Step | Time | Needed for |
|---|---|---|
| 1. GitHub Pages | 2 min | a public URL where signup and onboarding work |
| 2. Google client id | 5 min | real "Continue with Google" |
| 3. Cloudflare Pages (optional) | 5 min | pretty `/u/<handle>` links |
| 4. Supabase (optional) | 10 min | accounts that survive a new browser, working shared links |

---

## 1. GitHub Pages

From the `linkey/` folder:

```bash
git init -b main
git add .
git commit -m "Linkey beta"
gh repo create linkey --public --source=. --push
```

Then enable Pages for the `main` branch, root folder:

```bash
gh api -X POST repos/:owner/linkey/pages \
  -f "source[branch]=main" -f "source[path]=/" -F build_type=legacy
# or: Settings -> Pages -> Source: Deploy from a branch -> main / (root)
```

The site appears at `https://<user>.github.io/linkey/` within a minute or two.

**Links on GitHub Pages use the hash form** (`…/linkey/#/u/<handle>`) because
Pages cannot rewrite `/u/<handle>` to `index.html`. `publicLink()` detects
`*.github.io` and does that automatically, so copied links always open. If you
later move to a host with rewrites, set `linkBase: "path"` (or leave `"auto"`).

`404.html` catches any stray path and sends the visitor back to the app.

> Editing `assets/js/config.js` after deploy: commit and push. If a change does
> not appear within a minute, bump `?v=` on the asset tags in `index.html` and
> `legal.html` — that query string is the cache-buster the whole project uses.

---

## 2. Real Google sign-in (no server, no secret)

This path talks to Google directly from the browser. There is no client secret,
no backend and no token storage: the access token is used once to read the
profile and then dropped.

1. Open <https://console.cloud.google.com/apis/credentials>.
2. **Create credentials → OAuth client ID → Web application**.
3. **Authorised JavaScript origins** — origins only, no paths:
   - `https://<user>.github.io`
   - `http://localhost:5200` (for the local dev server)
4. Copy the client id (it ends in `.apps.googleusercontent.com`) into
   `assets/js/config.js`:

   ```js
   googleClientId: "1234567890-abc123.apps.googleusercontent.com",
   ```

5. Commit and push. On the login page the Google button now opens Google's
   account chooser.

If the button still explains "not configured", the id did not load — check the
quote marks, then hard-reload once.

What this does **not** do: the account is created in the browser
(`localStorage`). Signing in on a different device creates a separate account
until step 4.

### If you also want Supabase

Leave `googleClientId` empty and use Supabase's own Google provider instead
(step 4 and `BACKEND.md §2`). Supabase then owns the callback
(`https://<project>.supabase.co/auth/v1/callback`), so the origins above are
replaced by that callback URL.

---

## 3. Cloudflare Pages (optional, pretty links)

Cloudflare Pages serves the same folder and **does** support rewrites, so
`/u/<handle>` works as a real path.

1. Push the repo to GitHub (step 1).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Framework preset: **None**. Build command: empty. Output directory: `/`.
4. Deploy. `_redirects` (already in the repo) makes every route fall back to
   `index.html`.

`publicLink()` notices the host is not `*.github.io` and switches to
`https://<site>/u/<handle>` with no configuration.

Vercel and Netlify work the same way; `vercel.json` is included.

---

## 4. Supabase (optional, cross-device accounts)

Without this, an account lives in one browser. With it, the same Google account
(or email link) restores the same page anywhere, and shared links resolve for
other people.

1. Create a free project at <https://supabase.com>.
2. **Project Settings → API**: copy the **Project URL** and the **anon public**
   key into `assets/js/config.js`:

   ```js
   supabaseUrl: "https://abcdefgh.supabase.co",
   supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
   ```

   The anon key is public by design; RLS is what protects the data. Never paste
   a service-role key into a browser file.

3. **SQL editor** — the table, the owner-only policies, and a read-only public
   projection:

   ```sql
   create table if not exists public.pages (
     user_id    uuid primary key references auth.users (id) on delete cascade,
     handle     text unique not null check (handle ~ '^[a-z0-9._-]{3,30}$'),
     onboarded  boolean not null default false,
     data       jsonb not null default '{}'::jsonb,
     updated_at timestamptz not null default now()
   );

   alter table public.pages enable row level security;

   create policy pages_owner_read   on public.pages for select using (auth.uid() = user_id);
   create policy pages_owner_write  on public.pages for insert with check (auth.uid() = user_id);
   create policy pages_owner_update on public.pages for update using (auth.uid() = user_id);
   create policy pages_owner_delete on public.pages for delete using (auth.uid() = user_id);

   -- Visitors may read published pages, and only these three columns.
   create policy pages_public_read on public.pages
     for select to anon using (onboarded = true and handle is not null);

   revoke select on public.pages from anon;
   grant select (handle, onboarded, data) on public.pages to anon;
   ```

4. **Authentication → Providers → Google**: enable it, paste the client id and
   secret from step 2, and add `https://<project>.supabase.co/auth/v1/callback`
   to the Google client's **Authorised redirect URIs**.
5. **Authentication → URL configuration**: Site URL is your deployed URL; add
   `https://<user>.github.io/linkey/` and `http://localhost:5200/` to the
   redirect allow-list.
6. Commit and push. The login page switches to the cloud flow and the account
   is saved after each change.

Test it: sign in on a phone with a fresh browser, open the shared link on a
laptop, and confirm the page (not the empty state) appears. Then open the same
link while signed out and confirm you see the owner's page but no editor.

To confirm the data is still protected, call the REST endpoint with the anon key
and no session and check that you only get published rows:

```bash
curl "https://<project>.supabase.co/rest/v1/pages?select=handle,data" \
  -H "apikey: <anon key>"
```

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Old build loads after a deploy | browser cache | bump `?v=` in `index.html` / `legal.html` |
| Google button opens the setup modal | `googleClientId` empty or wrong shape | step 2 |
| Google says "origin mismatch" | JS origin missing the deployed domain | add the origin (no path), no trailing slash |
| "hasn't published here yet" on your own link | you are on another browser and step 4 is not configured | steps 1 and 4 |
| Signup works, refresh loses the account | same | step 4 |
| `/u/<handle>` 404s | host has no rewrites | use `linkBase: "hash"`, or Cloudflare Pages |
| Everything is the demo page | stale `linkey.state.v1` from an older build | sign out, or clear site data |
