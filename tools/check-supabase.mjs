#!/usr/bin/env node
/* Linkey · Supabase connection check
 *
 * Usage:  node tools/check-supabase.mjs
 *
 * Reads the public url + anon key from assets/js/config.js and verifies the
 * things a browser needs, in the order a visitor hits them:
 *
 *   1. the project answers with this anon key
 *   2. the auth server is up and at least one sign-in method is enabled
 *   3. the pages table exists and a visitor can read the public projection
 *   4. a visitor cannot read user_id, and cannot write at all
 *
 * It only ever sends GETs plus one deliberately invalid POST probe. It
 * never prints the key, and it never touches a real page.
 *
 * Exit code is 0 when every critical check passes, 1 otherwise.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "assets", "js", "config.js");

const bold = (s) => (process.stdout.isTTY ? `\u001b[1m${s}\u001b[22m` : s);
const green = (s) => (process.stdout.isTTY ? `\u001b[32m${s}\u001b[39m` : s);
const red = (s) => (process.stdout.isTTY ? `\u001b[31m${s}\u001b[39m` : s);
const yellow = (s) => (process.stdout.isTTY ? `\u001b[33m${s}\u001b[39m` : s);

const results = [];
let failed = 0;
let warned = 0;

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`${green("PASS")}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail, fix) {
  failed++;
  process.exitCode = 1;
  results.push({ ok: false, name, detail, fix });
  console.log(`${red("FAIL")}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (fix) console.log(`      ${yellow("fix:")} ${fix}`);
}

function warn(name, detail, fix) {
  warned++;
  console.log(`${yellow("WARN")}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (fix) console.log(`      ${yellow("fix:")} ${fix}`);
}

function readConfig() {
  let text;
  try {
    text = readFileSync(CONFIG, "utf8");
  } catch (e) {
    fail("read assets/js/config.js", e.message);
    return {};
  }
  const pick = (name) => {
    const m = text.match(new RegExp(`${name}\\s*:\\s*["']([^"']*)["']`));
    return m ? m[1].trim() : "";
  };
  return {
    url: pick("supabaseUrl").replace(/\/+$/, ""),
    key: pick("supabaseAnonKey"),
    googleClientId: pick("googleClientId")
  };
}

async function request(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text.slice(0, 300); }
    return { status: res.status, ok: res.ok, body };
  } finally {
    clearTimeout(timer);
  }
}

function messageOf(body) {
  if (!body) return "";
  if (typeof body === "string") return body;
  return body.message || body.msg || body.error_description || body.error || body.hint || "";
}

function codeOf(body) {
  return body && typeof body === "object" ? body.code || "" : "";
}

function jwtRole(key) {
  // A JWT's payload is public; decode only to catch a service-role key being
  // pasted into a browser config by mistake.
  try {
    const part = key.split(".")[1];
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role || "";
  } catch {
    return "";
  }
}

async function main() {
  console.log(bold("Linkey · Supabase connection check"));
  const cfg = readConfig();

  if (!cfg.url) {
    fail("supabaseUrl is set", "empty in assets/js/config.js",
      "Project Settings → API → Project URL, e.g. https://abcdefgh.supabase.co");
    return;
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url)) {
    fail("supabaseUrl is a project URL", cfg.url,
      "Use the exact https://<ref>.supabase.co URL, with no path or query.");
    return;
  }
  pass("supabaseUrl", cfg.url);

  if (!cfg.key) {
    fail("supabaseAnonKey is set", "empty in assets/js/config.js",
      "Project Settings → API → Project API keys → anon public. Never the service_role key.");
    return;
  }
  if (cfg.key.length < 100) {
    fail("supabaseAnonKey looks complete", `only ${cfg.key.length} characters`,
      "Copy the whole anon public key (three dot-separated parts).");
    return;
  }
  const role = jwtRole(cfg.key);
  if (role === "service_role") {
    fail("key is the anon public key", "this is a service_role key",
      "Remove it and paste the anon public key. A service key in a browser file bypasses every RLS rule.");
    return;
  }
  pass("anon key", `role ${role || "anon"}`);

  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    Accept: "application/json"
  };

  // 1. auth server + enabled providers -----------------------------------
  try {
    const r = await request(`${cfg.url}/auth/v1/settings`, { headers });
    if (!r.ok) {
      fail("auth server reachable", `HTTP ${r.status} ${messageOf(r.body)}`,
        "Check the project URL and that the project is not paused.");
    } else {
      pass("auth server reachable", "HTTP 200");
      const ext = (r.body && r.body.external) || {};
      const methods = ["google", "email", "apple"].filter((k) => ext[k]);
      if (methods.length) pass("sign-in method enabled", methods.join(", "));
      else {
        fail("at least one sign-in method enabled", "google, email and apple are all off",
          "Authentication → Providers: enable Google (client id + secret) or Email.");
      }
      if (ext.google) pass("Google provider", "enabled in Supabase");
      else warn("Google provider", "off",
        "Enable it only if you plan to use Supabase Google sign-in; the no-server GIS path needs googleClientId instead.");
      if (ext.email && r.body && r.body.mailer_autoconfirm === false) {
        warn("email delivery", "confirmations are on; Supabase's built-in SMTP is rate-limited",
          "Authentication → Emails: configure custom SMTP before inviting real users.");
      }
      if (r.body && r.body.disable_signup) {
        warn("new signups", "disabled",
          "Authentication → Sign In / Providers: allow new users to sign up.");
      }
    }
  } catch (e) {
    fail("auth server reachable", e.name === "AbortError" ? "timed out" : e.message);
  }

  // 2. public projection --------------------------------------------------
  const base = `${cfg.url}/rest/v1/pages`;
  try {
    const r = await request(`${base}?select=handle,onboarded,data&limit=1`, { headers });
    if (r.ok && Array.isArray(r.body)) {
      pass("pages table readable", "public projection OK");
      if (!r.body.length) {
        warn("no published pages yet", "the query returned an empty list",
          "Publish one page, then run this check again to see a row.");
      }
    } else if (r.status === 404 || codeOf(r.body) === "PGRST205") {
      fail("pages table exists", messageOf(r.body) || `HTTP ${r.status}`,
        "Run supabase/schema.sql in the SQL editor.");
    } else if (r.status === 401 || r.status === 403) {
      fail("pages table readable with the anon key", `HTTP ${r.status} ${messageOf(r.body)}`,
        "Re-run supabase/schema.sql so the anon grant and pages_public_read policy exist.");
    } else {
      fail("pages table readable", `HTTP ${r.status} ${messageOf(r.body)}`);
    }
  } catch (e) {
    fail("pages table readable", e.name === "AbortError" ? "timed out" : e.message);
  }

  // 2b. handle availability RPC -----------------------------------------
  try {
    const probe = `checker_probe_${Date.now().toString(36)}`;
    const r = await request(`${cfg.url}/rest/v1/rpc/handle_taken`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ candidate: probe })
    });
    if (r.ok && r.body === false) {
      pass("handle availability rpc", `${probe} is free`);
    } else if (r.ok) {
      fail("handle availability rpc", `unexpected answer ${JSON.stringify(r.body)}`);
    } else if (r.status === 404 || codeOf(r.body) === "PGRST202") {
      fail("handle availability rpc", "handle_taken is missing",
        "Re-run supabase/schema.sql; signup uses this to reserve a username.");
    } else {
      fail("handle availability rpc", `HTTP ${r.status} ${messageOf(r.body)}`,
        "Re-run supabase/schema.sql so anon can execute handle_taken.");
    }
  } catch (e) {
    fail("handle availability rpc", e.name === "AbortError" ? "timed out" : e.message);
  }

  // 3. the public projection cannot include user_id ----------------------
  try {
    const r = await request(`${base}?select=user_id&limit=1`, { headers });
    if (r.ok) {
      fail("user_id is not public", "the anon key can read user_id",
        "Re-run the grant section of supabase/schema.sql; keep only handle,onboarded,data for anon.");
    } else {
      pass("user_id is not public", `HTTP ${r.status}`);
    }
  } catch (e) {
    fail("user_id is not public", e.name === "AbortError" ? "timed out" : e.message);
  }

  // 4. a visitor cannot write -------------------------------------------
  try {
    const r = await request(base, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: "00000000-0000-0000-0000-000000000000",
        handle: "checker_probe",
        onboarded: false,
        data: {}
      })
    });
    if (r.status === 401 || r.status === 403) {
      pass("anon cannot write", `HTTP ${r.status}`);
    } else if (r.ok || r.status === 409) {
      fail("anon cannot write", `the write reached the table (HTTP ${r.status})`,
        "Revoke INSERT/UPDATE/DELETE from anon and re-run supabase/schema.sql.");
    } else {
      pass("anon cannot write", `HTTP ${r.status} ${messageOf(r.body)}`);
    }
  } catch (e) {
    fail("anon cannot write", e.name === "AbortError" ? "timed out" : e.message);
  }

  // 5. the page the browser will actually build -------------------------
  try {
    const r = await request(`${base}?select=handle,onboarded,data&onboarded=eq.true&limit=3`, { headers });
    if (r.ok && Array.isArray(r.body)) {
      const handles = r.body.map((row) => `/${row.handle}`).join(", ");
      pass("published-page lookup", r.body.length ? handles : "no published rows yet");
    } else {
      warn("published-page lookup", `HTTP ${r.status} ${messageOf(r.body)}`);
    }
  } catch (e) {
    warn("published-page lookup", e.name === "AbortError" ? "timed out" : e.message);
  }

  console.log("");
  if (failed) {
    console.log(red(`${failed} check${failed === 1 ? "" : "s"} failed.`), "Fix the items above, then run this again.");
    process.exitCode = 1;
  } else {
    console.log(green("All critical checks passed."), warned ? `${warned} warning(s).` : "");
    if (!cfg.googleClientId) {
      console.log("Next: set googleClientId in assets/js/config.js if you want no-server Google sign-in.");
    }
  }
}

main().catch((e) => {
  console.error(red(`checker crashed: ${e.message}`));
  process.exitCode = 1;
});
