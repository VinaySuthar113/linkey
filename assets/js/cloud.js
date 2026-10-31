/* Linkey — cloud auth (Supabase-compatible, first party)

   Why not supabase-js: the app needs four endpoints (authorize, token,
   logout, one REST read). A 10 KB first-party client avoids a CDN
   dependency, a third-party script on every page, and a supply-chain
   surface we cannot audit. Everything it stores is namespaced and
   documented.

   Flows implemented
     • Google OAuth  — PKCE redirect (tokens never appear in the URL)
     • Email link    — magic link / OTP with PKCE
     • Session       — refresh, hydrate, sign out
     • Page read     — optional, so a returning user on a new device
                       lands in their editor instead of onboarding again

   With no configuration (window.LINKEY_CONFIG empty) every call returns
   {ok:false, code:"unconfigured"} and the app falls back to the local
   demo account. Nothing throws.
*/
(function (global) {
  "use strict";

  const CFG = global.LINKEY_CONFIG || {};
  const RAW_URL = String(CFG.supabaseUrl || "").trim();
  const URL_ = RAW_URL.replace(/\/+$/, "");
  const KEY = String(CFG.supabaseAnonKey || "").trim();
  const FLAGS = Object.assign({ google: true, emailLink: true, apple: false }, CFG.auth || {});
  const STORE = "linkey.cloud.v1";
  const VERIFIER = "linkey.pkce.v1";
  const TIMEOUT = 15000;
  const SESSION_SKEW = 60; // refresh a minute before the token dies

  /* ---------------- configuration ---------------- */

  function urlAllowed(value) {
    if (!value) return false;
    try {
      const u = new URL(value);
      if (u.protocol === "https:") return true;
      // Plain http is only acceptable for a local Supabase stack.
      return u.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  const reason = !RAW_URL || !KEY ? "missing config" : !urlAllowed(URL_) ? "supabaseUrl must be https" : "";
  const configured = !reason;

  function isConfigured() { return configured; }
  function unavailable() { return { ok: false, code: "unconfigured", error: reason }; }

  function flag(name) { return configured && FLAGS[name] === true; }

  /* ---------------- small helpers ---------------- */

  function storage() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  function readJSON(key) {
    const s = storage();
    if (!s) return null;
    try {
      const raw = s.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeJSON(key, value) {
    const s = storage();
    if (!s) return false;
    try {
      if (value == null) s.removeItem(key);
      else s.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function base64url(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = "";
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    const b64 = typeof global.btoa === "function"
      ? global.btoa(s)
      : (typeof Buffer !== "undefined" ? Buffer.from(b).toString("base64") : "");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function webcrypto() {
    const c = global.crypto || global.msCrypto;
    return c && c.subtle && typeof c.getRandomValues === "function" ? c : null;
  }

  /** randomToken - 32 bytes of CSPRNG output, base64url. */
  function randomToken(size) {
    const c = webcrypto();
    if (!c) return "";
    const bytes = new Uint8Array(size || 32);
    c.getRandomValues(bytes);
    return base64url(bytes);
  }

  async function challengeFor(verifier) {
    const c = webcrypto();
    if (!c) return "";
    const digest = await c.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64url(digest);
  }

  /* ---------------- redirect plumbing ---------------- */

  function basePath() {
    const p = String(location.pathname || "/")
      .replace(/index\.html?$/i, "")
      .replace(/u\/[^/]+\/?$/i, "");
    return p.endsWith("/") ? p : p + "/";
  }

  /** redirectTo - the exact URL Supabase returns to. */
  function redirectTo() {
    const site = String(CFG.siteUrl || "").trim();
    if (site) return site.replace(/\/+$/, "") + "/";
    if (location.protocol === "file:") return "";
    return location.origin + basePath();
  }

  /**
   * parseRedirect - pull auth results out of the URL.
   *
   * Supabase puts ?code= on success (PKCE) and ?error=... on failure.
   * Some providers still use the hash for errors, so both are read. The
   * router owns "#/..." so anything that is not a route is treated as
   * an auth payload.
   */
  function parseRedirect(search, hash) {
    const q = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    const out = {
      code: q.get("code") || "",
      error: q.get("error") || "",
      errorDescription: q.get("error_description") || "",
      state: q.get("state") || ""
    };
    const h = String(hash || "").replace(/^#/, "");
    if (h && h.charAt(0) !== "/" && h.indexOf("=") !== -1) {
      const hq = new URLSearchParams(h);
      out.error = out.error || hq.get("error") || "";
      out.errorDescription = out.errorDescription || hq.get("error_description") || "";
      if (!out.code) out.code = hq.get("code") || "";
    }
    // A code is a short opaque string; anything else is not ours to send.
    if (out.code && !/^[A-Za-z0-9._~-]{8,512}$/.test(out.code)) out.code = "";
    return out;
  }

  function hasAuthParams() {
    const p = parseRedirect(location.search, location.hash);
    return !!(p.code || p.error);
  }

  function stripAuthParams() {
    try {
      const url = new URL(location.href);
      ["code", "error", "error_description", "state", "error_code"].forEach((k) => url.searchParams.delete(k));
      if (url.hash && url.hash.charAt(1) !== "/") url.hash = "";
      history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + (url.hash || ""));
    } catch (e) { /* history may be unavailable in a sandboxed frame */ }
  }

  /* ---------------- HTTP ---------------- */

  async function request(path, opts) {
    opts = opts || {};
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT) : null;
    const headers = { apikey: KEY, "Content-Type": "application/json" };
    if (opts.token) headers.Authorization = "Bearer " + opts.token;
    if (opts.headers) Object.assign(headers, opts.headers);
    const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
    try {
      const res = await fetch(URL_ + path + qs, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body == null ? undefined : JSON.stringify(opts.body),
        signal: ctl ? ctl.signal : undefined,
        credentials: "omit",
        cache: "no-store"
      });
      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text.slice(0, 200) }; } }
      if (!res.ok) {
        const msg = (data && (data.msg || data.message || data.error_description || data.error)) || "Request failed";
        return { ok: false, status: res.status, error: String(msg).slice(0, 200), data: data };
      }
      return { ok: true, status: res.status, data: data };
    } catch (e) {
      const aborted = e && e.name === "AbortError";
      return { ok: false, status: 0, error: aborted ? "The request timed out. Check your connection." : "Could not reach the server." };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /* ---------------- session ---------------- */

  function session() {
    const s = readJSON(STORE);
    if (!s || !s.access_token) return null;
    return s;
  }

  function isExpired(s, skew) {
    if (!s || !s.expires_at) return false;
    return Date.now() / 1000 >= s.expires_at - (skew || 0);
  }

  function saveSession(payload) {
    if (!payload || !payload.access_token) return null;
    const prev = session();
    const out = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || (prev && prev.refresh_token) || "",
      expires_at: payload.expires_in ? Math.floor(Date.now() / 1000) + Number(payload.expires_in) : 0,
      token_type: payload.token_type || "bearer",
      user: payload.user || (prev && prev.user) || null
    };
    writeJSON(STORE, out);
    return out;
  }

  /** refresh - swap the refresh token for a fresh access token. */
  async function refresh() {
    if (!configured) return unavailable();
    const s = session();
    if (!s || !s.refresh_token) return { ok: false, code: "no-session", error: "Not signed in." };
    const r = await request("/auth/v1/token", {
      method: "POST",
      query: { grant_type: "refresh_token" },
      body: { refresh_token: s.refresh_token }
    });
    if (!r.ok) {
      // A dead refresh token means the session is gone; drop it rather
      // than leaving a half-signed-in shell behind.
      if (r.status === 400 || r.status === 401) writeJSON(STORE, null);
      return r;
    }
    saveSession(r.data);
    return { ok: true, session: session() };
  }

  async function accessToken() {
    const s = session();
    if (!s) return "";
    if (!isExpired(s, SESSION_SKEW)) return s.access_token;
    const r = await refresh();
    return r.ok ? session().access_token : "";
  }

  /* ---------------- user ---------------- */

  /**
   * normalizeUser - one shape for the app, whatever the provider sent.
   * Google returns full_name/picture; Apple returns name only on the
   * first consent, so the email local part is the fallback.
   */
  function normalizeUser(u) {
    if (!u || typeof u !== "object") return null;
    const meta = u.user_metadata || u.raw_user_meta_data || {};
    const email = String(u.email || meta.email || "").trim();
    const rawName = meta.full_name || meta.name || meta.display_name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(" ") || "";
    const fallback = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "";
    let name = String(rawName || fallback || "").trim().replace(/\s+/g, " ");
    if (name.length > 60) name = name.slice(0, 60);
    const avatar = String(meta.avatar_url || meta.picture || "").trim();
    return {
      id: String(u.id || ""),
      email: email,
      name: name,
      avatar: /^https:\/\//i.test(avatar) ? avatar : "",
      provider: String((u.app_metadata && u.app_metadata.provider) || "email"),
      created: String(u.created_at || ""),
      lastSignIn: String(u.last_sign_in_at || "")
    };
  }

  function user() {
    const s = session();
    return s ? normalizeUser(s.user) : null;
  }

  /** isFresh - a user created in the last two minutes is a new signup. */
  function isFresh(u, now) {
    if (!u || !u.created) return false;
    const t = Date.parse(u.created);
    if (!t) return false;
    return Math.abs((now == null ? Date.now() : now) - t) < 120000;
  }

  /* ---------------- providers ---------------- */

  function authorizeUrl(provider, challenge, state) {
    const q = new URLSearchParams({
      provider: provider,
      redirect_to: redirectTo(),
      code_challenge: challenge,
      code_challenge_method: "s256"
    });
    if (state) q.set("state", state);
    if (provider === "google") q.set("scopes", "email profile");
    return URL_ + "/auth/v1/authorize?" + q.toString();
  }

  /**
   * signInWithOAuth - build the PKCE pair, remember the verifier, leave.
   * The browser navigates away, so there is no success return value.
   */
  async function signInWithOAuth(provider) {
    if (!configured) return unavailable();
    const p = String(provider || "google").toLowerCase();
    if (p !== "google" && p !== "apple") return { ok: false, code: "bad-provider", error: "Unknown provider." };
    if (!flag(p)) return { ok: false, code: "disabled", error: (p === "google" ? "Google" : "Apple") + " sign-in is switched off." };
    if (!webcrypto()) {
      return { ok: false, code: "insecure-context", error: "Sign-in needs a secure (https) page. Open the site over https or localhost." };
    }
    const verifier = randomToken(48);
    const challenge = await challengeFor(verifier);
    if (!verifier || !challenge) return { ok: false, code: "crypto", error: "Could not start a secure sign-in on this browser." };
    writeJSON(VERIFIER, { verifier: verifier, provider: p, at: Date.now(), from: location.pathname });
    const url = authorizeUrl(p, challenge, randomToken(16));
    try {
      location.assign(url);
      return { ok: true, redirecting: true };
    } catch (e) {
      return { ok: false, code: "navigation", error: "Could not open the sign-in page." };
    }
  }

  /* ---------------- email link ---------------- */

  async function sendEmailLink(email) {
    if (!configured) return unavailable();
    if (!flag("emailLink")) return { ok: false, code: "disabled", error: "Email sign-in is switched off." };
    const verifier = randomToken(48);
    const challenge = verifier ? await challengeFor(verifier) : "";
    if (!challenge) return { ok: false, code: "crypto", error: "Could not start a secure sign-in on this browser." };
    writeJSON(VERIFIER, { verifier: verifier, provider: "email", at: Date.now(), from: location.pathname });
    const r = await request("/auth/v1/otp", {
      method: "POST",
      query: { redirect_to: redirectTo() },
      body: {
        email: String(email || "").trim(),
        create_user: true,
        code_challenge: challenge,
        code_challenge_method: "s256"
      }
    });
    return r.ok ? { ok: true } : r;
  }

  /* ---------------- redirect back ---------------- */

  /**
   * completeRedirect - exchange ?code for a session.
   * Returns {ok, user, error, consumed}. Safe to call on every boot:
   * with no auth params it does nothing.
   */
  async function completeRedirect() {
    if (!configured) return { ok: false, consumed: false, code: "unconfigured" };
    const parsed = parseRedirect(location.search, location.hash);
    if (!parsed.code && !parsed.error) return { ok: false, consumed: false };

    if (parsed.error) {
      stripAuthParams();
      writeJSON(VERIFIER, null);
      const denied = /access_denied|cancel/i.test(parsed.error + " " + parsed.errorDescription);
      return {
        ok: false,
        consumed: true,
        code: denied ? "cancelled" : "provider",
        error: denied ? "Sign-in was cancelled." : (parsed.errorDescription || parsed.error).slice(0, 200)
      };
    }

    const saved = readJSON(VERIFIER);
    stripAuthParams();
    if (!saved || !saved.verifier) {
      return { ok: false, consumed: true, code: "no-verifier", error: "That sign-in link expired. Please try again." };
    }
    writeJSON(VERIFIER, null);

    const r = await request("/auth/v1/token", {
      method: "POST",
      query: { grant_type: "pkce" },
      body: { auth_code: parsed.code, code_verifier: saved.verifier }
    });
    if (!r.ok) return { ok: false, consumed: true, code: "exchange", error: r.error };
    const s = saveSession(r.data);
    return { ok: true, consumed: true, user: normalizeUser(s && s.user) };
  }

  /* ---------------- page row (optional) ---------------- */

  /**
   * loadPage - read this user's saved page.
   * Returns null when the table is absent or empty, so the app treats a
   * missing backend as "new account" rather than an error.
   */
  async function loadPage() {
    if (!configured) return null;
    const token = await accessToken();
    if (!token) return null;
    const u = user();
    if (!u || !u.id) return null;
    const r = await request("/rest/v1/pages", {
      method: "GET",
      token: token,
      query: { user_id: "eq." + u.id, select: "handle,onboarded,data", limit: "1" }
    });
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
    return r.data[0];
  }

  /**
   * loadPublicPage - another person's published page, read with the anon
   * key. Returns null when the project has no public read policy (the
   * beta default) or the handle has no row. Never throws.
   */
  async function loadPublicPage(handle) {
    if (!configured) return null;
    const h = String(handle || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(h)) return null;
    const r = await request("/rest/v1/pages", {
      method: "GET",
      query: { handle: "eq." + h, select: "handle,onboarded,data", limit: "1" }
    });
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
    return r.data[0];
  }

  async function savePage(row) {
    if (!configured) return { ok: false, code: "unconfigured" };
    const token = await accessToken();
    if (!token) return { ok: false, code: "no-session" };
    const u = user();
    if (!u || !u.id) return { ok: false, code: "no-user" };
    const body = Object.assign({ user_id: u.id }, row || {});
    const r = await request("/rest/v1/pages", {
      method: "POST",
      token: token,
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      query: { on_conflict: "user_id" },
      body: body
    });
    if (r.ok) return { ok: true };
    // Postgres unique_violation on pages_handle_key. Reported so the setup
    // form can say "taken" instead of silently failing to publish.
    if (r.status === 409 || (r.data && r.data.code === "23505")) {
      return { ok: false, code: "handle-taken", error: "That username is already taken." };
    }
    return r;
  }

  /**
   * handleTaken - is this public address free?
   *
   * Calls a SECURITY DEFINER function because RLS hides other people's
   * drafts from the anon role; a plain select would only see published
   * pages and would happily hand out a name that is already reserved.
   * Returns {ok:true, taken:false} when the check cannot run, so a missing
   * migration never blocks onboarding; the unique index is still the
   * backstop.
   */
  /**
   * deletePage - remove this account's published row.
   *
   * The owner delete policy allows it. The Supabase Auth user itself
   * survives, so signing in again starts a fresh, empty page rather than
   * resurrecting the deleted one.
   */
  async function deletePage() {
    if (!configured) return { ok: false, code: "unconfigured" };
    const token = await accessToken();
    if (!token) return { ok: false, code: "no-session" };
    const u = user();
    if (!u || !u.id) return { ok: false, code: "no-user" };
    const r = await request("/rest/v1/pages", {
      method: "DELETE",
      token: token,
      headers: { Prefer: "return=minimal" },
      query: { user_id: "eq." + u.id }
    });
    if (r.ok) return { ok: true };
    return r;
  }

  async function handleTaken(handle) {
    if (!configured) return { ok: true, taken: false, code: "unconfigured" };
    const h = String(handle || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/.test(h)) {
      return { ok: true, taken: false, code: "invalid" };
    }
    const token = await accessToken();
    if (!token) {
      // No session - can't check cloud. Uniqueness is enforced by the
      // database unique constraint on handle, so assume free.
      return { ok: true, taken: false, code: "no-session" };
    }
    const r = await request("/rest/v1/rpc/handle_taken", {
      method: "POST",
      token: token,
      body: { candidate: h }
    });
    if (!r.ok) {
      // 404 / PGRST202: schema.sql has not been applied yet.
      return { ok: false, taken: false, code: "unavailable", error: r.error, status: r.status };
    }
    return { ok: true, taken: r.data === true };
  }

  /* ---------------- contacts (form capture + owner list) ---------------- */

  /**
   * captureContact - a visitor signs up through a published page's form.
   * No session token: the anon role may only INSERT, and the RLS policy
   * requires the page_handle to belong to an onboarded page. Returns the
   * new contact id on success.
   */
  async function captureContact(pageHandle, name, email, source) {
    if (!configured) return { ok: false, code: "unconfigured" };
    const h = String(pageHandle || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(h)) {
      return { ok: false, code: "invalid-handle" };
    }
    const r = await request("/rest/v1/contacts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: { page_handle: h, name: String(name || "").trim(), email: String(email || "").trim(), source: String(source || "").trim() }
    });
    if (!r.ok) return r;
    return { ok: true, id: (Array.isArray(r.data) && r.data[0] && r.data[0].id) || null };
  }

  /**
   * loadContacts - this owner's captured signups.
   */
  async function loadContacts() {
    if (!configured) return { ok: false, code: "unconfigured", contacts: [] };
    const token = await accessToken();
    if (!token) return { ok: false, code: "no-session", contacts: [] };
    const u = user();
    if (!u || !u.id) return { ok: false, code: "no-user", contacts: [] };
    const r = await request("/rest/v1/contacts", {
      method: "GET",
      token: token,
      query: { user_id: "eq." + u.id, select: "id,name,email,source,created_at", order: "created_at.desc" }
    });
    if (!r.ok) return r;
    return { ok: true, contacts: Array.isArray(r.data) ? r.data : [] };
  }

  /**
   * saveContact - insert one contact for this owner (used when the owner
   * adds a contact by hand in the Audience page).
   */
  async function saveContact(contact) {
    if (!configured) return { ok: false, code: "unconfigured" };
    const token = await accessToken();
    if (!token) return { ok: false, code: "no-session" };
    const u = user();
    if (!u || !u.id) return { ok: false, code: "no-user" };
    const r = await request("/rest/v1/contacts", {
      method: "POST",
      token: token,
      headers: { Prefer: "return=representation" },
      body: Object.assign({ user_id: u.id }, contact || {})
    });
    if (!r.ok) return r;
    return { ok: true, id: (Array.isArray(r.data) && r.data[0] && r.data[0].id) || null };
  }

  /**
   * deleteContact - remove one of this owner's captured contacts.
   */
  async function deleteContact(id) {
    if (!configured) return { ok: false, code: "unconfigured" };
    const token = await accessToken();
    if (!token) return { ok: false, code: "no-session" };
    const u = user();
    if (!u || !u.id) return { ok: false, code: "no-user" };
    const r = await request("/rest/v1/contacts", {
      method: "DELETE",
      token: token,
      headers: { Prefer: "return=minimal" },
      query: { id: "eq." + id, user_id: "eq." + u.id }
    });
    if (!r.ok) return r;
    return { ok: true };
  }

  /* ---------------- Google Identity Services (no server) ---------------- */

  /*
   * `googleClientId` turns on real Google sign-in without Supabase and
   * without a secret. Google Identity Services returns a short-lived
   * access token for the signed-in Google account; the app reads the
   * profile from Google's userinfo endpoint over TLS. Nothing secret ever
   * reaches this page and no token is stored.
   *
   * The client id is not a secret, but it *is* origin-bound: Google only
   * serves it to an origin registered in the Cloud Console, so a copy of
   * this site on another domain cannot reuse it.
   */
  const GCLIENT = String(CFG.googleClientId || "").trim();
  const GIS_SRC = "https://accounts.google.com/gsi/client";
  const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
  const GIS_TIMEOUT = 120000;

  function googleConfigured() {
    if (!/^[0-9A-Za-z_-]{8,}\.apps\.googleusercontent\.com$/.test(GCLIENT)) return false;
    if (location.protocol === "https:") return true;
    // Google allows http only for local development origins.
    return location.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }

  let gisPromise = null;
  function loadGis() {
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const w = global;
      if (w.google && w.google.accounts && w.google.accounts.oauth2) return resolve(w.google);
      const el = global.document.createElement("script");
      el.src = GIS_SRC;
      el.async = true;
      el.defer = true;
      el.onload = () => {
        if (w.google && w.google.accounts && w.google.accounts.oauth2) resolve(w.google);
        else reject(new Error("Google sign-in did not start."));
      };
      el.onerror = () => reject(new Error("Could not reach Google sign-in."));
      global.document.head.appendChild(el);
    });
    return gisPromise;
  }

  /**
   * verifyGoogleProfile - accept only what Google actually returns.
   * Exposed so the unit tests can prove each rejection.
   */
  function verifyGoogleProfile(data) {
    if (!data || typeof data !== "object") return { ok: false, error: "Google did not return a profile." };
    const sub = String(data.sub || "");
    if (!/^[0-9]{6,32}$/.test(sub)) return { ok: false, error: "Google did not return an account id." };
    const email = String(data.email || "").trim().toLowerCase();
    if (data.email_verified !== true && data.verified_email !== true) {
      return { ok: false, error: "That Google address is not verified." };
    }
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) || email.length > 254) {
      return { ok: false, error: "Google did not return a usable email." };
    }
    const name = String(data.name || "").trim().replace(/\s+/g, " ").slice(0, 60) || email.split("@")[0];
    const picture = String(data.picture || "").trim();
    return {
      ok: true,
      user: {
        id: "google:" + sub,
        email: email,
        name: name,
        avatar: /^https:\/\//i.test(picture) && picture.length <= 500 ? picture : "",
        provider: "google"
      }
    };
  }

  async function fetchUserinfo(accessToken) {
    const res = await fetch(USERINFO, {
      headers: { Authorization: "Bearer " + accessToken },
      credentials: "omit",
      cache: "no-store"
    });
    if (!res.ok) throw new Error("Google rejected the sign-in.");
    return res.json();
  }

  /**
   * signInWithGoogle - show Google's account chooser, verify the result.
   * Resolves {ok, user} or {ok:false, code, error}. Never throws.
   */
  function signInWithGoogle() {
    if (!googleConfigured()) {
      return Promise.resolve({
        ok: false, code: "unconfigured",
        error: "Google sign-in is not configured. Add your Google client id in assets/js/config.js."
      });
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => finish({
        ok: false, code: "timeout", error: "Google sign-in timed out. Please try again."
      }), GIS_TIMEOUT);

      loadGis().then((g) => {
        let client;
        try {
          client = g.accounts.oauth2.initTokenClient({
            client_id: GCLIENT,
            scope: "openid email profile",
            prompt: "select_account",
            callback: async (resp) => {
              if (!resp || resp.error) {
                return finish({
                  ok: false, code: (resp && resp.error) || "cancelled",
                  error: (resp && resp.error === "access_denied")
                    ? "Sign-in was cancelled."
                    : "Google sign-in did not complete."
                });
              }
              try {
                const info = await fetchUserinfo(resp.access_token);
                const v = verifyGoogleProfile(info);
                finish(v.ok ? { ok: true, user: v.user } : { ok: false, code: "invalid", error: v.error });
              } catch (e) {
                finish({ ok: false, code: "userinfo", error: "Could not confirm your Google account. Check your connection." });
              }
            },
            error_callback: (err) => {
              const type = (err && err.type) || "popup";
              finish({
                ok: false,
                code: type,
                error: type === "popup_closed"
                  ? "Sign-in was cancelled."
                  : "Google sign-in could not open. Allow pop-ups for this site and try again."
              });
            }
          });
        } catch (e) {
          return finish({ ok: false, code: "init", error: "Could not start Google sign-in on this browser." });
        }
        try { client.requestAccessToken(); }
        catch (e) { finish({ ok: false, code: "popup", error: "Could not open Google sign-in. Allow pop-ups and try again." }); }
      }).catch((e) => finish({ ok: false, code: "network", error: e.message || "Could not reach Google." }));
    });
  }

  /** mode - which sign-in path this build can actually offer. */
  function mode() {
    if (configured) return "supabase";
    if (googleConfigured()) return "google";
    return "demo";
  }

  /* ---------------- sign out ---------------- */

  async function signOut() {
    const s = session();
    writeJSON(STORE, null);
    writeJSON(VERIFIER, null);
    if (configured && s && s.access_token) {
      // Best effort: a failed logout must not trap the user signed in.
      await request("/auth/v1/logout", { method: "POST", token: s.access_token });
    }
    return { ok: true };
  }

  /* ---------------- boot ---------------- */

  let readyPromise = null;

  /**
   * ready - run once per page load.
   * Returns {user, error, session} after any redirect has been exchanged
   * and an existing session refreshed. Never rejects.
   */
  function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (!configured) return { configured: false, user: null };
        const out = { configured: true, user: null, error: "" };
        try {
          const redirect = await completeRedirect();
          if (redirect.consumed && !redirect.ok) out.error = redirect.error || "Sign-in failed.";
          let s = session();
          if (s && isExpired(s, SESSION_SKEW)) {
            const r = await refresh();
            s = r.ok ? session() : null;
            if (!r.ok && r.status === 400 && !out.error) out.error = "Your session expired. Please sign in again.";
          }
          out.user = s ? normalizeUser(s.user) : null;
          out.session = s;
        } catch (e) {
          out.error = "Sign-in could not be completed.";
        }
        return out;
      })();
    }
    return readyPromise;
  }

  global.Cloud = {
    isConfigured, flag, reason,
    ready, session, user, refresh, normalizeUser, isFresh, isExpired,
    signInWithOAuth, sendEmailLink, signOut,
    completeRedirect, parseRedirect, hasAuthParams, stripAuthParams, redirectTo, authorizeUrl,
    loadPage, savePage, loadPublicPage, handleTaken, deletePage,
    captureContact, loadContacts, saveContact, deleteContact,
    googleConfigured, signInWithGoogle, mode, verifyGoogleProfile,
    // Exposed for tests only; not part of the app surface.
    _internals: { base64url, challengeFor, randomToken, urlAllowed, basePath, readJSON, writeJSON, STORE, VERIFIER, GCLIENT, USERINFO }
  };
})(window);
