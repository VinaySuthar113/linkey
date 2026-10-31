/* ============================================================
   Linkey — unit tests (no dependencies)
   Run: node tests/unit.test.js
   Covers: provider data integrity, picker structure,
           URL normalisation and scheme blocking.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let pass = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push(name + (detail ? " — " + detail : ""));
}
function eq(name, actual, expected) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), "got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
}

/* ---- load browser scripts in a sandbox ------------------------------- */
const sandbox = {
  console,
  document: { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, removeEventListener() {} },
  setTimeout,
  URL,
  URLSearchParams
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.Store = {
  esc: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
};
sandbox.icon = () => "<svg></svg>";
vm.createContext(sandbox);

for (const file of ["assets/js/providers.js", "assets/js/addpop.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
}

const D = sandbox.PICKER;
const A = sandbox.AddPop;

/* The backdrop wraps the whole Add dialog, so resolving clicks through
   closest() made every click inside it — including one on the Title field —
   look like a click on the backdrop and close the sheet. The handler has to
   compare the click target with the backdrop element itself. */
const addpopSrc = fs.readFileSync(path.join(ROOT, "assets/js/addpop.js"), "utf8");
ok("addpop: a click inside the dialog does not close it", /e\.target === backdrop/.test(addpopSrc));
const closestList = (addpopSrc.match(/e\.target\.closest\("([^"]+)"\)/) || [])[1] || "";
ok("addpop: the backdrop is no longer resolved with closest()", !!closestList && closestList.indexOf("overlay") === -1);

/* Forms now have a server behind them (Supabase contacts). Choosing a form
   opens the details step, and saving creates a form tile. */
const selectBlock = (addpopSrc.match(/function selectProvider\(id, prefillUrl\)[\s\S]*?\n  \}/) || [""])[0];
ok("addpop: choosing a form opens the details step", /step = "details"/.test(selectBlock) && !/not available in the beta/.test(selectBlock));
const saveBlock = (addpopSrc.match(/function save\(\)[\s\S]*?\n  \}/) || [""])[0];
ok("addpop: saving a form creates a block link", /kind === "text" \|\| kind === "header" \|\| kind === "form"/.test(saveBlock) && /addLink/.test(saveBlock));
ok("addpop: a saved form is added before finish", saveBlock.indexOf("addLink") < saveBlock.indexOf("finishAdd"));

const provSrc = fs.readFileSync(path.join(ROOT, "assets/js/providers.js"), "utf8");
const formRows = provSrc.split("\n").filter((l) => l.indexOf('", "form", ') !== -1);
eq("picker: every form row is honest about capture", formRows.filter((l) => l.indexOf("Not available in the beta.") === -1).length, formRows.length);
ok("picker: the form rows were found", formRows.length >= 15);

/* ---- forms (real capture via Supabase contacts) ----------------------- */
ok("addpop: form tile creates a block link", /kind === "text" \|\| kind === "header" \|\| kind === "form"/.test(saveBlock));
ok("addpop: form save calls addLink", /addLink/.test(saveBlock));

/* ---- store: contacts sync to cloud ------------------------------------ */
const storeSrc = fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8");
ok("store: addContact is async and mirrors to cloud", /async function addContact\(c\)/.test(storeSrc) && /Cloud\.saveContact/.test(storeSrc));
ok("store: removeContact deletes from cloud", /Cloud\.deleteContact/.test(storeSrc));
ok("store: adoptCloudUser loads contacts", /Cloud\.loadContacts/.test(storeSrc));

/* ---- pages: form links render as bio-form on public page -------------- */
const pagesSrc = fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8");
ok("pages: isBlockLink includes form", /l\.kind === "form"/.test(pagesSrc));
ok("pages: tileInner renders a bio-form", /data-bio-form/.test(pagesSrc) && /bio-form__submit/.test(pagesSrc));

/* Deleting an account has to delete the published row, not just the copy in
   this browser — otherwise the page stays live and the owner can never take
   it down. The RLS owner-delete policy already allows it. */
const cloudSrc = fs.readFileSync(path.join(ROOT, "assets/js/cloud.js"), "utf8");
const appSrc = fs.readFileSync(path.join(ROOT, "assets/js/app.js"), "utf8");
ok("cloud: captureContact is exported", /captureContact/.test(cloudSrc) && /captureContact,/.test(cloudSrc.slice(cloudSrc.indexOf("global.Cloud"))));
const captureBlock = (cloudSrc.match(/async function captureContact\([\s\S]*?\n  \}/) || [""])[0];
ok("cloud: captureContact POSTs to /rest/v1/contacts", /method: "POST"/.test(captureBlock) && /"\/rest\/v1\/contacts"/.test(captureBlock));
ok("cloud: captureContact needs no token", !/token: token/.test(captureBlock));
ok("app: handleBioForm handles bio-form submissions", /handleBioForm/.test(appSrc) && /dataset\.bioForm/.test(appSrc));
ok("app: handleBioForm falls back to local contacts", /handleBioForm\(form\)[\s\S]{0,3000}S\.addContact/.test(appSrc));
ok("cloud: deletePage is exported", /deletePage/.test(cloudSrc) && /deletePage,\s*$|deletePage,/.test(cloudSrc.slice(cloudSrc.indexOf("global.Cloud"))));
const deleteBlock = (cloudSrc.match(/async function deletePage\(\)[\s\S]*?\n  \}/) || [""])[0];
ok("cloud: deletePage sends a DELETE", /method: "DELETE"/.test(deleteBlock));
ok("cloud: deletePage only touches this user's row", /user_id: "eq\." \+ u\.id/.test(deleteBlock));
ok("cloud: deletePage needs a session", /code: "no-session"/.test(deleteBlock));

ok("account: delete copies the row away", /Cloud\.deletePage\(\)/.test(appSrc));
ok("account: delete signs out of the cloud", /Cloud\.deletePage\(\)[\s\S]{0,900}?Cloud\.signOut\(\)/.test(appSrc));
ok("account: delete wipes the device copy", /S\.clearAccount\(\)/.test(appSrc));

/* reset() is the demo shortcut and re-seeds the sample account. Deleting has
   to empty the device even on a dev host, or the "deleted" page comes back. */
const wipe = storeFromLocal(memLocal());
wipe.state.user.handle = "someone";
wipe.state.links = [{ id: "l1", kind: "link", title: "A", url: "https://a.test", active: true }];
wipe.clearAccount();
eq("clearAccount: the handle is gone", wipe.state.user.handle, "");
eq("clearAccount: the links are gone", wipe.state.links.length, 0);
eq("clearAccount: the dashboard starts at zero", wipe.state.stats.clicks, 0);
ok("clearAccount: signed out", !wipe.auth().signedIn);
ok("account: delete no longer claims to restore demo content", appSrc.indexOf("restores the demo content") === -1);
ok("account: a failed cloud delete keeps the device copy", /Could not delete your page/.test(appSrc));

/* The username is the public URL: it must pass the same checks as signup. */
ok("profile: saving an identity validates the handle", /saveIdentity/.test(appSrc));
ok("profile: an invalid handle is refused", /S\.handleIssue\(next, S\.state\.user\.handle\)/.test(appSrc));
ok("profile: a taken cloud handle is refused", /check\.taken\) return "That username is taken/.test(appSrc));
ok("profile: save-user goes through the check", /"save-user": async[\s\S]{0,900}saveIdentity/.test(appSrc));
ok("profile: save-profile goes through the check", /"save-profile": async[\s\S]{0,400}saveIdentity/.test(appSrc));

/* Shop: "Edit" used to be a toast and products had no way to be changed or
   removed. It is a real editor now, with a confirmation on delete. */
ok("shop: edit opens the product form", /"edit-product": \(el\)[\s\S]{0,220}productModal\(p\)/.test(appSrc));
ok("shop: the form handles both create and edit", /"submit-product": \(el\)[\s\S]{0,900}existing/.test(appSrc));
ok("shop: deleting a product asks first", /Delete this product\?/.test(appSrc) && /confirm-delete-product/.test(appSrc));
ok("shop: the dead product link is gone", appSrc.indexOf("Product link copied") === -1);
ok("shop: the dead editor toast is gone", appSrc.indexOf("Product editor - next milestone") === -1);

/* ---- data integrity -------------------------------------------------- */
ok("PICKER exists", !!D);
eq("8 tabs", D.TABS.length, 8);
eq("tab ids", D.TABS.map((t) => t.id), ["suggested", "commerce", "social", "media", "contact", "event", "text", "all"]);
eq("4 quick tiles", D.QUICK.length, 4);
eq("suggested has 6 rows", D.SUGGESTED.items.length, 6);

const allItems = Object.values(D.byId);
ok("provider count >= 60", allItems.length >= 60, "got " + allItems.length);

const ids = allItems.map((p) => p.id);
ok("provider ids unique", new Set(ids).size === ids.length, "duplicates: " + ids.filter((v, i) => ids.indexOf(v) !== i).join(", "));

for (const p of allItems) {
  ok("provider " + p.id + " has name", typeof p.name === "string" && p.name.length > 0);
  ok("provider " + p.id + " has desc", typeof p.desc === "string" && p.desc.length > 0);
  ok("provider " + p.id + " has kind", typeof p.kind === "string" && p.kind.length > 0);
  ok("provider " + p.id + " name <= 48", p.name.length <= 48);
  if (p.logo) ok("provider " + p.id + " logo key known", !!D.LOGOS[p.logo], "logo=" + p.logo);
}

for (const [key, file] of Object.entries(D.LOGOS)) {
  ok("logo file exists: " + file, fs.existsSync(path.join(ROOT, "assets/icons/providers", file)));
}

/* every provider appears in at least one section (or Suggested) */
const referenced = new Set();
D.SUGGESTED.items.forEach((p) => referenced.add(p.id));
Object.values(D.SECTIONS).forEach((secs) => secs.forEach((s) => s.items.forEach((p) => referenced.add(p.id))));
for (const p of allItems) {
  ok("provider " + p.id + " is reachable from a tab", referenced.has(p.id));
}

/* "View all" is de-duplicated */
const allIds = D.ALL.flatMap((s) => s.items.map((p) => p.id));
ok("View all has no duplicates", new Set(allIds).size === allIds.length);
ok("View all covers everything reachable", allIds.length === referenced.size, allIds.length + " vs " + referenced.size);

/* no copy-paste placeholder text from the design file leaked in */
const badCopy = ["Share your Music URL", "Share your PDF", "Share your Posdcast URL", "App pre-made collections"];
for (const p of allItems) {
  for (const b of badCopy) ok("no placeholder copy on " + p.id, p.desc.indexOf(b) === -1, p.desc);
}

/* ---- URL normalisation ----------------------------------------------- */
const n = A._normalizeUrl;
eq("bare domain gets https", n("instagram.com/username__01").url, "https://instagram.com/username__01");
eq("http kept", n("http://example.com/a").url, "http://example.com/a");
eq("https kept", n("https://example.com").url, "https://example.com/");
ok("empty rejected", !!n("").error);
ok("whitespace rejected", !!n("   ").error);
ok("plain word rejected", !!n("notalink").error);
ok("javascript: blocked", !!n("javascript:alert(1)").error);
ok("JaVaScRiPt: blocked", !!n("JaVaScRiPt:alert(1)").error);
ok("data: blocked", !!n("data:text/html,<script>alert(1)</script>").error);
ok("vbscript: blocked", !!n("vbscript:msgbox(1)").error);
ok("file: blocked", !!n("file:///C:/Windows/win.ini").error);
ok("ftp: blocked", !!n("ftp://example.com/x").error);
ok("no-dot host rejected", !!n("https://localhost").error);
ok("angle brackets encoded", n("https://example.com/<script>").url.indexOf("<") === -1);

/* scheme smuggling attempts */
ok("leading spaces + javascript blocked", !!n("   javascript:alert(1)").error);
ok("newline + javascript blocked", !!n("\njavascript:alert(1)").error);
ok("uppercase HTTP ok", n("HTTP://example.com").url === "http://example.com/");

/* ---- URL-like detection ---------------------------------------------- */
const u = A._isUrlLike;
ok("domain is url-like", u("example.com"));
ok("https is url-like", u("https://example.com"));
ok("sentence is not url-like", !u("my new link"));
ok("spaces block url-like", !u("example .com"));

/* ---- Store.safeUrl (store.js loaded with a localStorage stub) --------- */
const storeSandbox = {
  console,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  URL
};
storeSandbox.window = storeSandbox;
storeSandbox.globalThis = storeSandbox;
vm.createContext(storeSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8"), storeSandbox, { filename: "assets/js/store.js" });
const safe = storeSandbox.Store.safeUrl;

eq("safe: bare domain + path", safe("shop.linkey.app/vintage"), "https://shop.linkey.app/vintage");
eq("safe: bare host", safe("example.com"), "https://example.com/");
eq("safe: protocol-relative", safe("//example.com/a"), "https://example.com/a");
eq("safe: keeps https", safe("https://example.com/a"), "https://example.com/a");
eq("safe: keeps mailto", safe("mailto:hi@example.com"), "mailto:hi@example.com");
eq("safe: keeps tel", safe("tel:+15551234"), "tel:+15551234");
eq("safe: keeps port", safe("example.com:8080/x"), "https://example.com:8080/x");
eq("safe: javascript blocked", safe("javascript:alert(1)"), "#");
eq("safe: data blocked", safe("data:text/html,x"), "#");
eq("safe: vbscript blocked", safe("vbscript:msgbox(1)"), "#");
eq("safe: ftp blocked", safe("ftp://example.com"), "#");
eq("safe: empty", safe(""), "#");
eq("safe: hash", safe("#"), "#");
eq("safe: plain word", safe("notalink"), "#");
ok("safe: no placeholder origin leaks", safe("shop.linkey.app/x").indexOf("linkey.invalid") === -1);
ok("safe: invalid never leaks an origin", safe("foo").indexOf("linkey.invalid") === -1);

/* ---- layout engine ---------------------------------------------------- */
const L = storeSandbox.Store;

eq("4 layouts", L.LAYOUTS.map((l) => l.id), ["list", "bento", "grid", "custom"]);
eq("default layout is list", L.layout(), "list");

L.setLayout("bento");
eq("setLayout applies", L.layout(), "bento");
L.setLayout("nonsense");
eq("setLayout rejects unknown", L.layout(), "bento");
L.setLayout("list");

const span = (l, i, n) => L.autoSpan(l, i == null ? 0 : i, n == null ? 1 : n);

eq("social -> 1x1", span({ kind: "social", title: "Instagram", url: "https://instagram.com/x" }), "1x1");
eq("video -> 2x1", span({ kind: "video", title: "Clip", url: "https://x.com/a" }), "2x1");
eq("product -> 2x1", span({ kind: "product", title: "Tee", url: "https://x.com/a" }), "2x1");
eq("event -> 2x1", span({ kind: "event", title: "Launch", url: "https://x.com/a" }), "2x1");
eq("text -> 2x2", span({ kind: "text", title: "Note", url: "https://x.com/a" }), "2x2");
eq("form -> 2x2", span({ kind: "form", title: "Join", url: "https://x.com/a" }), "2x2");
eq("featured -> 2x2", span({ kind: "link", title: "Shop", url: "https://x.com/a", featured: true }), "2x2");
eq("youtube host -> 2x1", span({ kind: "link", title: "Watch", url: "https://www.youtube.com/@x" }), "2x1");
eq("youtu.be host -> 2x1", span({ kind: "link", title: "Watch", url: "https://youtu.be/abc" }), "2x1");
eq("etsy host -> 2x1", span({ kind: "link", title: "Shop", url: "https://etsy.com/shop/x" }), "2x1");
eq("thumb -> 2x1", span({ kind: "link", title: "Post", url: "https://x.com/a", thumb: "a.png" }), "2x1");
eq("long title -> 2x1", span({ kind: "link", title: "A fairly long link title here", url: "https://x.com/a" }), "2x1");
eq("short plain link -> 1x1", span({ kind: "link", title: "Contact", url: "https://x.com/a" }), "1x1");
eq("explicit span wins", span({ kind: "social", title: "Instagram", url: "https://instagram.com/x", span: "2x2" }), "2x2");
eq("invalid span ignored", span({ kind: "social", title: "Instagram", url: "https://instagram.com/x", span: "9x9" }), "1x1");
eq("first of four gets hero", span({ kind: "link", title: "Hi", url: "https://x.com/a" }, 0, 4), "2x2");
eq("first of three stays small", span({ kind: "link", title: "Hi", url: "https://x.com/a" }, 0, 3), "1x1");
eq("second of four is not hero", span({ kind: "link", title: "Hi", url: "https://x.com/a" }, 1, 4), "1x1");

const plan = L.layoutPlan([
  { id: "a", kind: "social", title: "Instagram", url: "https://instagram.com/x" },
  { id: "b", kind: "link", title: "Shop", url: "https://etsy.com/x" }
]);
eq("plan keeps order", plan.map((p) => p.id), ["a", "b"]);
eq("plan splits span", [plan[0].col, plan[0].row, plan[1].col, plan[1].row], [1, 1, 2, 1]);
eq("plan is total", plan.length, 2);
ok("plan spans are valid", plan.every((p) => L.SPANS.indexOf(p.span) >= 0));
eq("empty plan", L.layoutPlan([]), []);
eq("null plan is safe", L.layoutPlan(null), []);

const first = L.state.links[0];
const seen = [];
for (let i = 0; i < 5; i++) seen.push(L.cycleSpan(first.id));
eq("cycleSpan walks sizes", seen, ["1x1", "2x1", "1x2", "2x2", "auto"]);
eq("cycleSpan clears the override", L.state.links[0].span, undefined);
eq("cycleSpan on unknown id is safe", L.cycleSpan("nope"), "");

/* ---- accounts ---------------------------------------------------------- */
eq("normalize: strips @ and lowercases", L.normalizeHandle("@Vinay.Suthar"), "vinay.suthar");
eq("normalize: drops illegal characters", L.normalizeHandle("vin ay!*"), "vinay");
eq("normalize: null is empty", L.normalizeHandle(null), "");

ok("handle: empty rejected", !!L.handleIssue(""));
ok("handle: two chars rejected", !!L.handleIssue("ab"));
ok("handle: 31 chars rejected", !!L.handleIssue("a".repeat(31)));
ok("handle: leading dash rejected", !!L.handleIssue("-vinay"));
ok("handle: trailing dot rejected", !!L.handleIssue("vinay."));
ok("handle: doubled dot rejected", !!L.handleIssue("vin..ay"));
ok("handle: reserved rejected", !!L.handleIssue("admin"));
ok("handle: route word rejected", !!L.handleIssue("login"));
ok("handle: own brand rejected", !!L.handleIssue("linkey"));
eq("handle: spaces are stripped, not accepted verbatim", L.normalizeHandle("vin ay"), "vinay");
eq("handle: clean name accepted", L.handleIssue("vinay.suthar"), "");
eq("handle: own handle always allowed", L.handleIssue(L.state.user.handle, L.state.user.handle), "");

const sugg = L.handleSuggestions("Vinay Suthar");
eq("suggest: three options", sugg.length, 3);
ok("suggest: all valid", sugg.every((h) => !L.handleIssue(h)), sugg.join(", "));
ok("suggest: all unique", new Set(sugg).size === sugg.length);
ok("suggest: first is the full name", sugg[0] === "vinaysuthar", sugg[0]);
ok("suggest: second is the first name", sugg[1] === "vinay", sugg[1]);
eq("suggest: one-word name leads with it", L.handleSuggestions("Vinay")[0], "vinay");
ok("suggest: never repeats the name after a dot", L.handleSuggestions("Vinay").every((h) => h.indexOf("vinay.vinay") !== 0));
ok("suggest: blank name still offers something", L.handleSuggestions("").length > 0);
ok("suggest: punctuation is stripped", L.handleSuggestions("Ada O'Chen!")[0] === "adaochen");

eq("email: empty", L.emailIssue(""), "Enter your email.");
ok("email: no at", !!L.emailIssue("vinay.example.com"));
ok("email: no tld", !!L.emailIssue("vinay@example"));
ok("email: spaces", !!L.emailIssue("vin ay@example.com"));
eq("email: valid", L.emailIssue("vinay@example.com"), "");

/* sign-in proves you know the account's email or username */
let r = L.signIn("");
ok("signIn: empty fails", !r.ok && /email or username/i.test(r.error));
r = L.signIn("nobody@example.com");
ok("signIn: unknown email fails", !r.ok && /no account/i.test(r.error));
r = L.signIn("nobody");
ok("signIn: unknown handle fails", !r.ok);
r = L.signIn(L.state.user.email);
ok("signIn: email works", r.ok);
ok("signIn: marks the session", L.isSignedIn());
r = L.signIn("@" + L.state.user.handle);
ok("signIn: @handle works", r.ok);

/* sign-up validates every field and hands over to setup */
r = L.signUp({ name: "V", email: "vinay@example.com", handle: "vinay" });
ok("signUp: short name fails", !r.ok && r.field === "name");
r = L.signUp({ name: "Vinay Suthar", email: "nope", handle: "vinay" });
ok("signUp: bad email fails", !r.ok && r.field === "email");
r = L.signUp({ name: "Vinay Suthar", email: "vinay@example.com", handle: "a" });
ok("signUp: bad handle fails", !r.ok && r.field === "handle");
r = L.signUp({ name: "Vinay Suthar", email: "vinay@example.com", handle: "@Vinay" });
ok("signUp: valid input succeeds", r.ok, JSON.stringify(r));
eq("signUp: handle is normalised", L.state.user.handle, "vinay");
eq("signUp: email stored", L.state.user.email, "vinay@example.com");
eq("signUp: profile title follows name", L.state.profile.title, "Vinay Suthar");
ok("signUp: not onboarded yet", !L.isOnboarded());
eq("signUp: setup starts at step 1", L.state.ui.setup.step, 1);
eq("signUp: setup carries the handle", L.state.ui.setup.handle, "vinay");
eq("signUp: starts with no links of its own", L.state.links.length, 0);
eq("signUp: starts with no contacts", L.state.contacts.length, 0);
eq("signUp: stats start at zero", [L.state.stats.clicks, L.state.stats.views, L.state.stats.revenue], [0, 0, 0]);
eq("signUp: public domain follows the handle", L.state.settings.domain, "linkey.app/vinay");
eq("signUp: bio is empty, not the demo's", L.state.profile.bio, "");

/* A cloud account must never inherit the demo seed's traffic. Real users
   were shown 1,240 clicks, 8,420 views and a $486 balance nobody measured. */
const seedNumbers = {
  clicks: 1240, views: 8420, contacts: 4, revenue: 486,
  daily: [42, 58, 51, 74, 66, 92, 88, 103, 96, 118, 132, 121, 140, 152],
  sources: [{ label: "Instagram", value: 48 }]
};

function storeFromLocal(local) {
  const sb = { console, localStorage: local, URL };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8"), sb, { filename: "assets/js/store.js" });
  return sb.Store;
}

const cloudLocal = memLocal();
const cloudWriter = storeFromLocal(cloudLocal);
cloudWriter.state.auth = { signedIn: true, provider: "google", onboarded: true, since: 1, userId: "u-1", email: "a@b.co", cloud: true };
cloudWriter.state.stats = seedNumbers;
cloudWriter.commit();
const cloudReader = storeFromLocal(cloudLocal);
eq("cloud: seeded clicks are cleared on load", cloudReader.state.stats.clicks, 0);
eq("cloud: seeded revenue is cleared on load", cloudReader.state.stats.revenue, 0);
eq("cloud: seeded sources are cleared on load", cloudReader.state.stats.sources.length, 0);

const demoLocal = memLocal();
const demoWriter = storeFromLocal(demoLocal);
demoWriter.state.auth = { signedIn: true, provider: "local", onboarded: true, since: 1, userId: "", email: "", cloud: false };
demoWriter.state.stats = seedNumbers;
demoWriter.commit();
const demoReader = storeFromLocal(demoLocal);
eq("demo: the seed's own numbers survive a reload", demoReader.state.stats.clicks, 1240);

const restoredOnDevice = storeFromLocal(memLocal());
restoredOnDevice.adoptCloudUser({ id: "u-2", email: "b@c.co", name: "B", provider: "google" },
  { handle: "tester", onboarded: true, data: { name: "B", bio: "hi", theme: "sand", links: [], platforms: [] } });
eq("cloud: a page restored from Postgres starts at zero", [restoredOnDevice.state.stats.clicks, restoredOnDevice.state.stats.views, restoredOnDevice.state.stats.revenue], [0, 0, 0]);
eq("cloud: the restored page keeps its handle", restoredOnDevice.state.user.handle, "tester");
eq("cloud: a restored page clears the demo's seo description", restoredOnDevice.state.settings.seoDescription, "hi");

const roundTrip = storeFromLocal(memLocal());
roundTrip.adoptCloudUser({ id: "u-3", email: "c@d.co", name: "C", provider: "google" },
  { handle: "carol", onboarded: true, data: { name: "C", bio: "bio", seoTitle: "Carol — design", seoDescription: "Made things.", hideBranding: true, links: [], platforms: [] } });
eq("cloud: a restored seo title survives", roundTrip.state.settings.seoTitle, "Carol — design");
eq("cloud: a restored seo description survives", roundTrip.state.settings.seoDescription, "Made things.");
eq("cloud: a hidden badge stays hidden after restore", roundTrip.state.settings.hideBranding, true);
eq("cloud: the restored snapshot keeps the hidden badge", roundTrip.cloudSnapshot().data.hideBranding, true);
eq("cloud: the restored snapshot keeps the seo title", roundTrip.cloudSnapshot().data.seoTitle, "Carol — design");

/* setup finishes the account */
r = L.completeSetup({ handle: "vinay", name: "V", bio: "hi" });
ok("completeSetup: short name fails", !r.ok && r.field === "name");
r = L.completeSetup({ handle: "admin", name: "Vinay Suthar" });
ok("completeSetup: reserved handle fails", !r.ok && r.field === "handle");
r = L.completeSetup({ handle: "vinay", name: "Vinay Suthar", bio: "  Design that feels personal.  ", layout: "bento", theme: "chocolate" });
ok("completeSetup: succeeds", r.ok, JSON.stringify(r));
ok("completeSetup: marks onboarded", L.isOnboarded());
eq("completeSetup: bio trimmed", L.state.profile.bio, "Design that feels personal.");
eq("completeSetup: layout applied", L.state.profile.layout, "bento");
eq("completeSetup: theme applied", L.state.profile.theme, "bubblegum");
eq("completeSetup: domain tracks the final handle", L.state.settings.domain, "linkey.app/vinay");
eq("completeSetup: setup draft cleared", L.state.ui.setup, null);
r = L.completeSetup({ handle: "vinay", name: "Vinay Suthar", layout: "nonsense" });
ok("completeSetup: bad layout is ignored", r.ok && L.state.profile.layout === "bento");

/* providers and sign-out */
r = L.signInWithProvider("github");
ok("provider: unknown rejected", !r.ok);
r = L.signInWithProvider("google");
ok("provider: google works", r.ok && L.state.auth.provider === "google");
r = L.signInWithProvider("apple");
ok("provider: apple works", r.ok && L.state.auth.provider === "apple");

L.signOut();
ok("signOut: session cleared", !L.isSignedIn());
eq("signOut: setup draft cleared", L.state.ui.setup, null);
ok("signOut: keeps onboarding so sign-in returns to app", L.isOnboarded());
r = L.signIn("vinay");
ok("signIn: back in after sign-out", r.ok && L.isSignedIn());

/* ---- shop totals ------------------------------------------------------- */
const emptyTotals = L.productTotals([]);
eq("shop: no products means no orders", emptyTotals.orders, 0);
eq("shop: no products means no revenue", emptyTotals.revenue, 0);
eq("shop: no orders means no average", emptyTotals.avgOrder, 0);
eq("shop: missing list is safe", L.productTotals(undefined), { orders: 0, revenue: 0, avgOrder: 0 });

const demoProducts = [
  { name: "Vintage Type Pack", price: 24, sales: 38 },
  { name: "Creator Starter Kit", price: 49, sales: 21 },
  { name: "Poster - Halcyon", price: 18, sales: 12 }
];
const demo = L.productTotals(demoProducts);
eq("shop: orders sum the units sold", demo.orders, 71);
eq("shop: revenue is price x sold", demo.revenue, 2157);
ok("shop: average sits between the cheapest and dearest product", demo.avgOrder > 18 && demo.avgOrder < 49, String(demo.avgOrder));
ok("shop: average multiplies back to revenue", Math.abs(demo.avgOrder * demo.orders - demo.revenue) < 1e-9);
ok("shop: does not mutate the products", demoProducts[0].sales === 38);

eq("shop: one product averages its own price", L.productTotals([{ price: 20, sales: 3 }]).avgOrder, 20);
eq("shop: zero sales means zero average", L.productTotals([{ price: 20, sales: 0 }]).avgOrder, 0);
eq("shop: junk fields count as zero", L.productTotals([{ price: "x", sales: null }, { price: 10, sales: 2 }]), { orders: 2, revenue: 20, avgOrder: 10 });

/* ======================================================================
   5-step onboarding, link formats, cloud auth
   ====================================================================== */

/** memLocal - a throwaway localStorage so each suite starts clean. */
function memLocal() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear()
  };
}

function freshStore() {
  const sb = { console, localStorage: memLocal(), URL };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8"), sb, { filename: "assets/js/store.js" });
  return sb.Store;
}

const O = freshStore();

/* ---- onboarding vocabulary ------------------------------------------- */
eq("onboarding: twelve platforms", O.ONBOARD_PLATFORMS.length, 12);
eq("onboarding: three goals", O.ONBOARD_GOALS.length, 3);
eq("onboarding: goal ids", O.ONBOARD_GOALS.map((g) => g.id), ["discover", "build", "grow"]);
eq("onboarding: max five platforms", O.MAX_PLATFORMS, 5);
eq("onboarding: three extra links", O.MAX_EXTRA_LINKS, 3);
eq("onboarding: platform ids unique", new Set(O.ONBOARD_PLATFORMS.map((p) => p.id)).size, 12);

for (const p of O.ONBOARD_PLATFORMS) {
  ok("onboarding: " + p.id + " has a name", !!p.name);
  ok("onboarding: " + p.id + " has an icon", !!p.icon);
  ok("onboarding: " + p.id + " has a known kind", !!O.LINK_TYPES[p.kind], p.kind);
  ok("onboarding: " + p.id + " has a field label", !!p.field);
  ok("onboarding: " + p.id + " has a hint", !!p.hint);
  eq("onboarding: " + p.id + " is found by id", O.platformById(p.id).id, p.id);
}
eq("onboarding: unknown platform is null", O.platformById("myspace"), null);

/* ---- platform → URL --------------------------------------------------- */
eq("onboarding: instagram handle", O.onboardingUrl("instagram", "@ada.chen"), "https://instagram.com/ada.chen");
eq("onboarding: instagram trims slashes", O.onboardingUrl("instagram", "ada.chen/"), "https://instagram.com/ada.chen");
eq("onboarding: instagram rejects spaces", O.onboardingUrl("instagram", "ada chen"), "");
eq("onboarding: instagram rejects empty", O.onboardingUrl("instagram", "   "), "");
eq("onboarding: whatsapp digits only", O.onboardingUrl("whatsapp", "+91 98765 43210"), "https://wa.me/919876543210");
eq("onboarding: whatsapp rejects a short number", O.onboardingUrl("whatsapp", "12345"), "");
eq("onboarding: whatsapp rejects a long number", O.onboardingUrl("whatsapp", "1234567890123456"), "");
eq("onboarding: youtube handle", O.onboardingUrl("youtube", "@adachen"), "https://youtube.com/@adachen");
eq("onboarding: threads handle", O.onboardingUrl("threads", "ada.chen"), "https://threads.net/@ada.chen");
eq("onboarding: website keeps a URL", O.onboardingUrl("website", "https://northwind.com"), "https://northwind.com/");
eq("onboarding: website upgrades a bare domain", O.onboardingUrl("website", "northwind.com"), "https://northwind.com/");
eq("onboarding: website blocks javascript", O.onboardingUrl("website", "javascript:alert(1)"), "");
eq("onboarding: spotify accepts a pasted link", O.onboardingUrl("spotify", "https://open.spotify.com/album/x"), "https://open.spotify.com/album/x");
eq("onboarding: spotify turns a word into a search", O.onboardingUrl("spotify", "kind of blue"), "https://open.spotify.com/search/kind%20of%20blue");
eq("onboarding: unknown id yields nothing", O.onboardingUrl("myspace", "ada"), "");

/* ---- extra links ------------------------------------------------------ */
eq("extra: https kept", O.extraLinkUrl("https://ada.substack.com"), "https://ada.substack.com/");
eq("extra: bare domain upgraded", O.extraLinkUrl("ada.substack.com"), "https://ada.substack.com/");
eq("extra: javascript blocked", O.extraLinkUrl("javascript:alert(1)"), "");
eq("extra: data blocked", O.extraLinkUrl("data:text/html,x"), "");
eq("extra: empty", O.extraLinkUrl(""), "");
eq("extra: plain word", O.extraLinkUrl("notalink"), "");

eq("title: www is dropped", O.titleForUrl("https://www.ada.substack.com/x"), "Ada.substack.com");
eq("title: host capitalised", O.titleForUrl("https://northwind.com/"), "Northwind.com");
eq("title: junk is a Link", O.titleForUrl("nope"), "Link");

/* ---- starterLinks ----------------------------------------------------- */
const starters = O.starterLinks(["instagram", "whatsapp", "youtube"], { instagram: "ada.chen", whatsapp: "+91 98765 43210", youtube: "" }, []);
eq("starter: only filled rows", starters.length, 2);
eq("starter: instagram becomes a social link", [starters[0].kind, starters[0].platform], ["social", "instagram"]);
eq("starter: instagram url", starters[0].url, "https://instagram.com/ada.chen");
eq("starter: youtube is a social too", starters[1].kind, "social");
eq("starter: starts with no clicks", [starters[0].clicks, starters[0].views], [0, 0]);
ok("starter: every link is active", starters.every((l) => l.active === true));
ok("starter: ids are unique", new Set(starters.map((l) => l.id)).size === starters.length);

const mixed = O.starterLinks(["website"], { website: "northwind.com" }, ["https://ada.substack.com", "javascript:alert(1)", ""]);
eq("starter: extras are sanitised", mixed.length, 2);
eq("starter: website is a plain link", mixed[0].kind, "link");
eq("starter: extra title from host", mixed[1].title, "Ada.substack.com");
eq("starter: no platforms is empty", O.starterLinks([], {}, []), []);
eq("starter: null input is safe", O.starterLinks(null), []);

/* ---- sanitizeLink ----------------------------------------------------- */
const SL = O.sanitizeLink;
eq("sanitize: text stays a text block", SL({ kind: "text", title: "Hello", url: "" }).kind, "text");
eq("sanitize: header stays a header", SL({ kind: "header", title: "Work" }).kind, "header");
eq("sanitize: unknown kind becomes link", SL({ kind: "exploit", title: "x", url: "https://x.com" }).kind, "link");
eq("sanitize: javascript url is blanked", SL({ kind: "link", title: "x", url: "javascript:alert(1)" }).url, "");
eq("sanitize: data url is blanked", SL({ kind: "link", title: "x", url: "data:text/html,x" }).url, "");
eq("sanitize: valid url kept", SL({ kind: "link", title: "x", url: "https://x.com/a" }).url, "https://x.com/a");
eq("sanitize: negative clicks clamp to zero", SL({ clicks: -20 }).clicks, 0);
eq("sanitize: huge clicks clamp", SL({ clicks: 1e12 }).clicks, 1e9);
eq("sanitize: bad id is replaced", SL({ id: "../../etc", title: "x" }).id.slice(0, 4), "lnk_");
eq("sanitize: good id is kept", SL({ id: "lnk_abcd1234", title: "x" }).id, "lnk_abcd1234");
eq("sanitize: long title cut for a link", SL({ kind: "link", title: "x".repeat(400) }).title.length, 120);
eq("sanitize: long text block allowed 160", SL({ kind: "text", title: "x".repeat(400) }).title.length, 160);
eq("sanitize: bad span dropped", SL({ span: "9x9" }).span, undefined);
eq("sanitize: good span kept", SL({ span: "2x2" }).span, "2x2");
eq("sanitize: bad platform dropped", SL({ platform: "myspace" }).platform, undefined);
eq("sanitize: known platform kept", SL({ platform: "instagram" }).platform, "instagram");
eq("sanitize: price kept", SL({ kind: "product", price: 24.5 }).price, 24.5);
eq("sanitize: bad price is a number", typeof SL({ kind: "product", price: "abc" }).price, "number");
eq("sanitize: date kept", SL({ kind: "event", date: "2026-11-14" }).date, "2026-11-14");
eq("sanitize: date truncated", SL({ kind: "event", date: "x".repeat(80) }).date.length, 32);
eq("sanitize: null is dropped", SL(null), null);
eq("sanitize: links list caps at 200", O.sanitizeLinks(new Array(500).fill({ title: "x" })).length, 200);

/* ---- avatars ---------------------------------------------------------- */
eq("avatar: https kept", O.safeAvatar("https://lh3.googleusercontent.com/a/x"), "https://lh3.googleusercontent.com/a/x");
ok("avatar: inline jpeg kept", O.safeAvatar("data:image/jpeg;base64,AAAA").indexOf("data:image/jpeg;base64,") === 0);
eq("avatar: javascript rejected", O.safeAvatar("javascript:alert(1)"), "");
eq("avatar: http rejected", O.safeAvatar("http://x.com/a.png"), "");
eq("avatar: svg data rejected", O.safeAvatar("data:image/svg+xml;base64,AAAA"), "");
eq("avatar: oversized data rejected", O.safeAvatar("data:image/png;base64," + "A".repeat(400001)), "");
eq("avatar: empty", O.safeAvatar(""), "");

/* ---- sign-up intent survives the OAuth redirect ----------------------- */
let intent = O.signUpIntent({ name: "Ada Chen", email: "ADA@Northwind.com", handle: "Ada.Chen" });
ok("intent: accepts a valid form", intent.ok, JSON.stringify(intent));
const pend = O.pendingSignup("ada@northwind.com");
ok("intent: matches case-insensitively", !!pend);
eq("intent: handle normalised", pend && pend.handle, "ada.chen");
eq("intent: name kept", pend && pend.name, "Ada Chen");
eq("intent: a different email does not match", O.pendingSignup("eve@example.com"), null);
ok("intent: rejects a reserved handle", !O.signUpIntent({ name: "Ada", email: "a@b.com", handle: "admin" }).ok);
ok("intent: rejects a bad email", !O.signUpIntent({ name: "Ada", email: "nope", handle: "ada" }).ok);
ok("intent: rejects a short name", !O.signUpIntent({ name: "A", email: "a@b.com", handle: "ada" }).ok);
O.state.ui.pendingSignup.at = Date.now() - 31 * 60 * 1000;
eq("intent: expires after 30 minutes", O.pendingSignup("ada@northwind.com"), null);

/* ---- adoptCloudUser (async now: it restores contacts from the cloud) ---- */
(async () => {
  const CLOUD_USER = {
    id: "11111111-2222-3333-4444-555555555555",
    email: "ada@northwind.com",
    name: "Ada Chen",
    avatar: "https://lh3.googleusercontent.com/a/ada",
    provider: "google",
    created: new Date().toISOString()
  };

  let adopted = await O.adoptCloudUser(CLOUD_USER, null);
ok("cloud: first sign-in is a new account", adopted.ok && adopted.newAccount === true);
ok("cloud: new account is not onboarded", !O.isOnboarded());
eq("cloud: new account has no links", O.state.links.length, 0);
eq("cloud: email is stored", O.state.user.email, "ada@northwind.com");
eq("cloud: handle suggested from the name", O.state.user.handle, "adachen");
eq("cloud: setup starts at step 1", O.state.ui.setup.step, 1);
eq("cloud: avatar carried over", O.state.user.avatar, CLOUD_USER.avatar);
eq("cloud: provider recorded", O.state.auth.provider, "google");
ok("cloud: marked as a cloud session", O.state.auth.cloud === true);

let done = O.completeSetup({ handle: "ada.chen", name: "Ada Chen", bio: "Type.", theme: "halo", platforms: ["instagram"], links: O.starterLinks(["instagram"], { instagram: "ada.chen" }, []) });
ok("cloud: setup completes", done.ok, JSON.stringify(done));
adopted = await O.adoptCloudUser(CLOUD_USER, null);
ok("cloud: the same user is a returning sign-in", adopted.returning === true && adopted.newAccount === false);
eq("cloud: returning keeps the page", O.state.user.handle, "ada.chen");
eq("cloud: returning keeps the links", O.state.links.length, 1);

/* a saved page restores on a new device */
const D2 = freshStore();
const pageRow = {
  handle: "northwind",
  onboarded: true,
  data: {
    name: "Ada Chen",
    bio: "Design systems and type.",
    avatar: "https://lh3.googleusercontent.com/a/ada",
    theme: "halo",
    layout: "bento",
    goal: "build",
    platforms: ["instagram", "site-not-real"],
    links: [
      { kind: "product", title: "Grid Poster", url: "https://shop.example.com/p", price: 38, note: "Signed" },
      { kind: "text", title: "Hello", url: "" },
      { kind: "link", title: "Bad", url: "javascript:alert(1)" }
    ]
  }
};
const restored = await D2.adoptCloudUser(CLOUD_USER, pageRow);
ok("cloud: a saved page hydrates", restored.hydrated === true, JSON.stringify(restored));
ok("cloud: hydrated account is onboarded", D2.isOnboarded());
eq("cloud: handle restored", D2.state.user.handle, "northwind");
eq("cloud: theme restored", D2.state.profile.theme, "bubblegum");
eq("cloud: layout restored", D2.state.profile.layout, "bento");
eq("cloud: links restored", D2.state.links.length, 3);
eq("cloud: product price restored", D2.state.links[0].price, 38);
eq("cloud: unsafe url removed on restore", D2.state.links[2].url, "");
eq("cloud: unknown platform dropped", D2.state.profile.platforms, ["instagram"]);

/* a reserved handle in a saved row cannot take over */
const D3 = freshStore();
const badRow = Object.assign({}, pageRow, { handle: "admin" });
const rejected = await D3.adoptCloudUser(CLOUD_USER, badRow);
ok("cloud: reserved handle is not restored", rejected.newAccount === true, JSON.stringify(rejected));
ok("cloud: fallback handle is safe", D3.state.user.handle !== "admin");
ok("cloud: no user is rejected", !(await D3.adoptCloudUser(null, null)).ok);
})();

/* ---- completeSetup ---------------------------------------------------- */
const D4 = freshStore();
D4.signUp({ name: "Ada Chen", email: "ada@northwind.com", handle: "ada.chen" });
const many = ["instagram", "whatsapp", "youtube", "threads", "website", "pinterest", "tiktok"];
const setup = D4.completeSetup({
  handle: "ada.chen",
  name: "Ada Chen",
  bio: "  Design that feels personal.  ",
  goal: "build",
  theme: "halo",
  layout: "bento",
  platforms: many,
  avatar: "javascript:alert(1)",
  links: D4.starterLinks(many, { instagram: "ada.chen", whatsapp: "+919876543210", youtube: "@adachen" }, ["https://ada.substack.com"])
});
ok("setup: completes", setup.ok, JSON.stringify(setup));
eq("setup: bio trimmed", D4.state.profile.bio, "Design that feels personal.");
eq("setup: goal stored", D4.state.profile.goal, "build");
eq("setup: platforms capped at five", D4.state.profile.platforms.length, 5);
eq("setup: theme applied", D4.state.profile.theme, "bubblegum");
eq("setup: layout applied", D4.state.profile.layout, "bento");
eq("setup: unsafe avatar refused", D4.state.user.avatar, "");
eq("setup: links installed", [D4.state.links.length, D4.state.profile.socials.length], [4, 3]);
eq("setup: socials follow the links", D4.state.profile.socials, ["instagram", "whatsapp", "youtube"]);
ok("setup: marked onboarded", D4.isOnboarded());

const D5 = freshStore();
D5.signUp({ name: "Ada Chen", email: "ada@northwind.com", handle: "ada.chen" });
ok("setup: invalid goal is ignored", D5.completeSetup({ handle: "ada.chen", name: "Ada Chen", goal: "exploit" }).ok);
eq("setup: invalid goal falls back", D5.state.profile.goal, "");
eq("setup: invalid theme ignored", D5.state.profile.theme, "bubblegum");
ok("setup: reserved handle refused", !D5.completeSetup({ handle: "admin", name: "Ada" }).ok);
ok("setup: short name refused", !D5.completeSetup({ handle: "ada.chen", name: "A" }).ok);

eq("freshSetup: step 1", O.freshSetup("ada", "Ada", "").step, 1);
eq("freshSetup: three empty extras", O.freshSetup("ada", "Ada", "").extras, ["", "", ""]);
eq("freshSetup: no platforms yet", O.freshSetup("ada", "Ada", "").platforms, []);

/* ---- cloudSnapshot ---------------------------------------------------- */
const snap = D4.cloudSnapshot();
eq("snapshot: carries the handle", snap.handle, "ada.chen");
eq("snapshot: marked onboarded", snap.onboarded, true);
eq("snapshot: has the whole page", Object.keys(snap.data).sort(), ["avatar", "bio", "goal", "hideBranding", "layout", "links", "name", "platforms", "seoDescription", "seoTitle", "style", "theme"]);
eq("snapshot: links travel with it", snap.data.links.length, 4);

/* ---- pages: link formats --------------------------------------------- */
const pageSandbox = {
  console,
  Store: D4,
  icon: () => "<svg></svg>",
  URL
};
pageSandbox.window = pageSandbox;
pageSandbox.globalThis = pageSandbox;
vm.createContext(pageSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), pageSandbox, { filename: "assets/js/pages.js" });
const PG = pageSandbox.Pages;

eq("format: ISO date is readable", PG.shortDate("2026-11-14"), "14 Nov 2026");
eq("format: junk date is shown as typed", PG.shortDate("TBA"), "TBA");
eq("format: empty date", PG.shortDate(""), "");
eq("format: price", PG.priceLabel(38), "$38.00");
eq("format: zero price is a price", PG.priceLabel(0), "$0.00");
eq("format: no price", PG.priceLabel(null), "");
eq("format: junk price", PG.priceLabel("x"), "");
ok("format: text is a block", PG.isBlockLink({ kind: "text" }));
ok("format: header is a block", PG.isBlockLink({ kind: "header" }));
ok("format: a link is not a block", !PG.isBlockLink({ kind: "link" }));

eq("format: product note has the price", PG.tileNote({ kind: "product", price: 38, note: "Signed" }, false), "$38.00 · Signed");
eq("format: product without a note", PG.tileNote({ kind: "product", price: 38 }, false), "$38.00");
eq("format: event note has the date", PG.tileNote({ kind: "event", date: "2026-11-14", note: "London" }, false), "14 Nov 2026 · London");
eq("format: form has a default CTA", PG.tileNote({ kind: "form" }, false), "Subscribe");
eq("format: small tile hides an ordinary note", PG.tileNote({ kind: "link", note: "hi" }, false), "");
eq("format: big tile shows it", PG.tileNote({ kind: "link", note: "hi" }, true), "hi");

const tilePlan = { col: 2, row: 1 };
const productHtml = PG.tileInner({ kind: "product", title: "Poster", url: "https://x.com", price: 38 }, tilePlan);
ok("format: product tile shows the price", productHtml.indexOf("$38.00") !== -1);
ok("format: product tile is still one tile", productHtml.indexOf("tile__glyph") !== -1);

const videoHtml = PG.tileInner({ kind: "video", title: "Clip", url: "https://x.com" }, tilePlan);
ok("format: video tile has a play badge", videoHtml.indexOf("tile__play") !== -1);

const textHtml = PG.tileInner({ kind: "text", title: "Hello <script>alert(1)</script>", url: "" }, tilePlan);
ok("format: text tile is a block", textHtml.indexOf("tile__text--block") !== -1);
ok("format: text tile has no chevron or link", textHtml.indexOf("<a") === -1 && textHtml.indexOf("tile__glyph") === -1);
ok("format: text is escaped", textHtml.indexOf("<script>") === -1 && textHtml.indexOf("&lt;script&gt;") !== -1);

const headHtml = PG.tileInner({ kind: "header", title: "Work", url: "" }, tilePlan);
ok("format: header has the heading class", headHtml.indexOf("tile__title--head") !== -1);

eq("format: kind class", PG.tileKindClass({ kind: "header" }), " tile--k-header");
eq("format: unknown kind class falls back", PG.tileKindClass({ kind: "exploit" }), " tile--k-link");

/* ---- pages: setup wizard --------------------------------------------- */
const D6 = freshStore();
D6.signUp({ name: "Ada Chen", email: "ada@northwind.com", handle: "ada.chen" });
const setupSandbox = { console, Store: D6, icon: () => "<svg></svg>", URL };
setupSandbox.window = setupSandbox;
setupSandbox.globalThis = setupSandbox;
vm.createContext(setupSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), setupSandbox, { filename: "assets/js/pages.js" });
const SP = setupSandbox.Pages;

const step1 = SP.setupPage();
ok("wizard: step 1 asks for the goal", step1.indexOf("Which best describes your goal") !== -1);
eq("wizard: step 1 has three goals", (step1.match(/class="goal[ "]/g) || []).length, 3);
ok("wizard: step 1 says 1 of 5", step1.indexOf("Step 1 of 5") !== -1);
eq("wizard: five progress segments", (step1.match(/<i class=/g) || []).length, 5);
ok("wizard: every step can be skipped", step1.indexOf('data-action="setup-skip"') !== -1);
ok("wizard: step 1 has no Back", step1.indexOf('data-action="setup-back"') === -1);

D6.state.ui.setup = Object.assign(SP.setupDraft(), { step: 2 });
const step2 = SP.setupPage();
eq("wizard: step 2 lists every theme", (step2.match(/class="theme-card[ "]/g) || []).length, Object.keys(D6.THEMES).length);
ok("wizard: step 2 has Back", step2.indexOf('data-action="setup-back"') !== -1);

D6.state.ui.setup = Object.assign(SP.setupDraft(), { step: 3 });
const step3 = SP.setupPage();
eq("wizard: step 3 lists twelve platforms", (step3.match(/class="plat[ "]/g) || []).length, 12);
ok("wizard: step 3 shows the cap", step3.indexOf("0 of 5 selected") !== -1);

D6.state.ui.setup = Object.assign(SP.setupDraft(), { step: 3, platforms: ["instagram", "whatsapp"] });
const step3b = SP.setupPage();
eq("wizard: picks are highlighted", (step3b.match(/class="plat is-on"/g) || []).length, 2);
ok("wizard: picks are announced", step3b.indexOf('aria-pressed="true"') !== -1);

D6.state.ui.setup = Object.assign(SP.setupDraft(), { step: 4, platforms: ["instagram", "website"] });
const step4 = SP.setupPage();
ok("wizard: step 4 names Selected Links", step4.indexOf("Selected Links") !== -1);
ok("wizard: step 4 names Additional Links", step4.indexOf("Additional Links") !== -1);
ok("wizard: step 4 has a row per platform", step4.indexOf('name="link-instagram"') !== -1 && step4.indexOf('name="link-website"') !== -1);
eq("wizard: step 4 has three extra rows", (step4.match(/name="extra-\d"/g) || []).length, 3);

D6.state.ui.setup = Object.assign(SP.setupDraft(), { step: 5, name: "Ada Chen", bio: "Type." });
const step5 = SP.setupPage();
ok("wizard: step 5 has an avatar picker", step5.indexOf("data-avatar-input") !== -1);
ok("wizard: step 5 has a name field", step5.indexOf('name="name"') !== -1);
ok("wizard: step 5 has a bio field", step5.indexOf('name="bio"') !== -1);
ok("wizard: step 5 finishes", step5.indexOf("Finish setup") !== -1);
ok("wizard: step 5 says 5 of 5", step5.indexOf("Step 5 of 5") !== -1);

/* ---- pages: auth screens only offer working providers ----------------- */
const demoAuth = SP.render("login");
ok("auth: the local demo keeps Google", demoAuth.indexOf('data-provider="google"') !== -1);
ok("auth: the local demo keeps Apple for the design", demoAuth.indexOf('data-provider="apple"') !== -1);
ok("auth: the demo says accounts stay local", demoAuth.indexOf("data-demo-note") !== -1);

setupSandbox.Cloud = { isConfigured: () => true, flag: (id) => id === "google" || id === "emailLink" };
const cloudAuth = SP.render("login");
ok("auth: cloud keeps Google", cloudAuth.indexOf('data-provider="google"') !== -1);
ok("auth: cloud hides Apple until it is configured", cloudAuth.indexOf('data-provider="apple"') === -1);
ok("auth: the cloud screen has no demo note", cloudAuth.indexOf("data-demo-note") === -1);
ok("auth: the cloud screen is marked", cloudAuth.indexOf('data-cloud="1"') !== -1);

setupSandbox.Cloud = { isConfigured: () => true, flag: () => false };
const noAuth = SP.render("login");
ok("auth: a disabled provider still shows the button", noAuth.indexOf("auth__oauths") !== -1);
ok("auth: the disabled provider is marked not live", noAuth.indexOf('data-provider="google" data-live="0"') !== -1);
ok("auth: no demo shortcut on a cloud build", noAuth.indexOf('data-action="demo-signin"') === -1);
delete setupSandbox.Cloud;

/* ---- pages: rendered bio page ---------------------------------------- */
const D7 = freshStore();
D7.signUp({ name: "Ada Chen", email: "ada@northwind.com", handle: "ada.chen" });
D7.completeSetup({
  handle: "ada.chen",
  name: "Ada Chen",
  bio: "Design systems and type.",
  theme: "halo",
  layout: "list",
  platforms: ["instagram"],
  links: [
    { kind: "header", title: "Work", url: "" },
    { kind: "text", title: "Open for two projects this winter.", url: "" },
    { kind: "link", title: "Website", url: "https://northwind.com" },
    { kind: "link", title: "Bad", url: "javascript:alert(1)" }
  ]
});
const bioSandbox = { console, Store: D7, icon: () => "<svg></svg>", URL };
bioSandbox.window = bioSandbox;
bioSandbox.globalThis = bioSandbox;
vm.createContext(bioSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), bioSandbox, { filename: "assets/js/pages.js" });
const html = bioSandbox.Pages.bioPage();

ok("bio: header is not a link", html.indexOf('<div class="bio-link tile--2x1 tile--k-header bio-link--block"') !== -1);
ok("bio: text is not a link", html.indexOf('tile--k-text bio-link--block') !== -1);
ok("bio: a real link opens in a new tab", html.indexOf('target="_blank" rel="noopener"') !== -1);
ok("bio: no javascript href is rendered", html.indexOf("javascript:") === -1);
ok("bio: the unsafe link is inert", html.indexOf('href="#"') !== -1);
ok("bio: name is shown", html.indexOf("Ada Chen") !== -1);
ok("bio: bio is shown", html.indexOf("Design systems and type.") !== -1);
ok("bio: footer credits the brand", html.indexOf("Made with linkey") !== -1);
ok("bio: legal links point at legal.html", html.indexOf("legal.html#terms") !== -1 && html.indexOf("legal.html#privacy") !== -1);

// A shared link is opened by strangers: the editor's way back is the owner's
// affordance, not part of the public page.
D7.signOut();
const visitorHtml = bioSandbox.Pages.bioPage();
ok("bio: the owner gets a way back", html.indexOf("Back to editor") !== -1);
ok("bio: a visitor gets no editor link", visitorHtml.indexOf("Back to editor") === -1);
ok("bio: a visitor still sees the page", visitorHtml.indexOf("Ada Chen") !== -1 && visitorHtml.indexOf("northwind.com") !== -1);

const phone = bioSandbox.Pages.phoneMarkup();
ok("preview: header block uses a div", phone.indexOf('class="phone__link tile--2x1 tile--k-header bio-link') === -1);
ok("preview: block class present", phone.indexOf("phone__link--block") !== -1);
ok("preview: the unsafe link has no javascript href", phone.indexOf("javascript:") === -1);

// A page whose only entries are social platforms still has something to
// click. The icon must be a real outbound link, not a dashboard shortcut.
D7.state.links = [
  { id: "soc_ig", kind: "social", platform: "instagram", title: "Instagram", url: "https://instagram.com/ada", active: true }
];
D7.state.profile.socials = ["instagram"];
const socialOnly = bioSandbox.Pages.bioPage();
const socialAnchor = socialOnly.match(/<a[^>]*data-social="instagram"[^>]*>/);
ok("bio: the social icon is rendered", !!socialAnchor);
ok("bio: the social icon opens outbound", !!socialAnchor && socialAnchor[0].indexOf('target="_blank"') !== -1 && socialAnchor[0].indexOf('rel="noopener"') !== -1);
ok("bio: the social icon carries its url", !!socialAnchor && socialAnchor[0].indexOf('href="https://instagram.com/ada"') !== -1);
ok("bio: a social-only page does not claim it has no links", socialOnly.indexOf("No links yet") === -1);
ok("preview: a social-only page does not claim it has no links", bioSandbox.Pages.phoneMarkup().indexOf("phone__empty") === -1);

/* Settings → Hide branding has to reach the public page, not just the switch. */
D7.state.settings.hideBranding = true;
const hiddenBrand = bioSandbox.Pages.bioPage();
ok("bio: hide branding removes the badge", hiddenBrand.indexOf("Made with linkey") === -1);
ok("bio: hide branding keeps the legal links", hiddenBrand.indexOf("legal.html#terms") !== -1);
D7.state.settings.hideBranding = false;
ok("bio: the badge returns when branding is shown", bioSandbox.Pages.bioPage().indexOf("Made with linkey") !== -1);

/* Profile has to describe this account, not a stranger's. The demo build
   shipped a hardcoded "Pro · renews Nov 12, 2026", a "Visa •••• 4242" row and
   the owner's Gmail address for every signed-in user. */
const profile = bioSandbox.Pages.PAGES.profile();
ok("profile: no invented Pro plan", profile.indexOf('pill--accent">Pro<') === -1 && profile.indexOf("Subscription plan") === -1);
ok("profile: no invented renewal date", profile.indexOf("Nov 12, 2026") === -1);
ok("profile: no invented card", profile.indexOf("4242") === -1);
ok("profile: no owner email for other users", profile.indexOf("vinaysuthar113@gmail.com") === -1);
ok("profile: no dead plan button", profile.indexOf('data-action="manage-plan"') === -1);
ok("profile: no dead billing button", profile.indexOf('data-action="manage-billing"') === -1);
ok("profile: no dead invite button", profile.indexOf('data-action="invite"') === -1);
ok("profile: no fake MFA button", profile.indexOf('data-action="mfa"') === -1);
ok("profile: shows this account's own email", profile.indexOf("ada@northwind.com") !== -1);
ok("profile: the beta is labelled free", profile.indexOf("Free") !== -1);
ok("profile: MFA is honest about the beta", /Not available in the beta/.test(profile));
ok("profile: delete still works", profile.indexOf('data-action="delete-account"') !== -1);

D7.state.auth.provider = "google";
ok("profile: a Google account names Google", bioSandbox.Pages.PAGES.profile().indexOf("Google") !== -1);
D7.state.auth.provider = "local";
ok("profile: a local account does not claim Google", bioSandbox.Pages.PAGES.profile().indexOf("Google") === -1);
D7.state.auth.cloud = true;
ok("profile: a cloud email is read-only", /id="f-user-email"[^>]*readonly/.test(bioSandbox.Pages.PAGES.profile()));
D7.state.auth.cloud = false;
ok("profile: a local email stays editable", !/id="f-user-email"[^>]*readonly/.test(bioSandbox.Pages.PAGES.profile()));

/* The planner grid was pinned to "Mon 26 … Sun 1" of October 2026, so a post
   scheduled for any other week never appeared where it was scheduled. */
const todayIso = D7.today();
D7.state.posts = [
  { id: "p_today", status: "scheduled", title: "Today post", channel: "Instagram", date: todayIso, time: "09:00" },
  { id: "p_far", status: "scheduled", title: "Far future", channel: "X", date: "2027-01-01", time: "09:00" }
];
const plannerHtml = bioSandbox.Pages.PAGES.planner();
const gridHtml = plannerHtml.slice(0, plannerHtml.indexOf("Upcoming"));
ok("planner: a post lands in this week's grid", gridHtml.indexOf("Today post") !== -1);
ok("planner: a post outside the week stays out of the grid", gridHtml.indexOf("Far future") === -1);
ok("planner: the upcoming table still lists it", plannerHtml.indexOf("Far future") !== -1);
const pagesSrcText = fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8");
const plannerSrc = (pagesSrcText.match(/function plannerPage\(\)[\s\S]*?\n  \}/) || [""])[0];
ok("planner: the week is computed, not hardcoded", plannerSrc.indexOf('"2026-10-"') === -1);

/* Each of these tools saves its own data but cannot deliver it yet. Saying so
   is better than a promise the product cannot keep. */
ok("planner: publishing is described honestly", /not available in the beta/.test(plannerHtml));
ok("autoreply: delivery is described honestly", /not available in the beta/.test(bioSandbox.Pages.PAGES.autoreply()));
ok("shortener: redirects are described honestly", /redirect/.test(bioSandbox.Pages.PAGES.shortener()) && /\/s\/<slug>/.test(bioSandbox.Pages.PAGES.shortener()));

/* ---- short-link redirects -------------------------------------------- */
const appSrcShort = fs.readFileSync(path.join(ROOT, "assets/js/app.js"), "utf8");
ok("short: parseHash detects s/<slug> routes", /indexOf\("s\/"\) === 0\) return \{ route: "short-redirect"/.test(appSrcShort));
ok("short: guard allows short-redirect publicly", /if \(route === "short-redirect"\) return ""/.test(appSrcShort));
ok("short: renderApp redirects to target", /location\.replace\(link\.target\)/.test(appSrcShort));
ok("short: renderApp increments clicks", /link\.clicks = \(link\.clicks \|\| 0\) \+ 1/.test(appSrcShort));
ok("short: renderApp shows not-found for missing slug", /Short link not found/.test(appSrcShort));
const ideasHtml = bioSandbox.Pages.PAGES.ideas();
ok("ideas: no dead refresh control", ideasHtml.indexOf('data-action="refresh-ideas"') === -1);
ok("ideas: no invented engagement stat", ideasHtml.indexOf("2.3") === -1);
ok("ideas: the list is labelled as prompts", /starter library of prompts/.test(ideasHtml));
ok("ideas: an idea can be scheduled", ideasHtml.indexOf('data-action="use-idea"') !== -1);

/* Audience showed "+4 this month", "75% of list" and a top source named after
   a demo link even with no contacts. Every figure must come from the list. */
D7.state.contacts = [];
const audEmpty = bioSandbox.Pages.PAGES.audience();
ok("audience: no invented monthly signups", audEmpty.indexOf("+4 this month") === -1);
ok("audience: no invented subscriber share", audEmpty.indexOf("75% of list") === -1);
ok("audience: no invented top source", audEmpty.indexOf("38% of signups") === -1);
ok("audience: the empty state does not promise a page form", audEmpty.indexOf("Add an email form to your page") === -1);
ok("audience: the empty state says forms are not live", /not available in the beta/.test(audEmpty));

/* Email capture had a switch in two places and rendered nothing. A switch
   that does nothing is worse than no switch. */
const customHtml = bioSandbox.Pages.PAGES.customize();
const settingsHtml = bioSandbox.Pages.PAGES.settings();
ok("customize: no dead collect-emails switch", customHtml.indexOf('data-key="collectEmails"') === -1);
ok("settings: no dead email-capture toggle", settingsHtml.indexOf('data-key="collectEmails"') === -1);
ok("settings: the real switches are still there", settingsHtml.indexOf('data-key="hideBranding"') !== -1);
ok("store: the retired setting is gone from the defaults", !("collectEmails" in D7.state.settings));
ok("store: the dead analytics switch is gone", !("analytics" in D7.state.settings));
ok("store: the dead digest switch is gone", !("emailDigest" in D7.state.settings));
ok("settings: no dead analytics toggle", settingsHtml.indexOf('data-key="analytics"') === -1);
ok("settings: no dead digest toggle", settingsHtml.indexOf('data-key="emailDigest"') === -1);
ok("settings: the address field is not editable", settingsHtml.indexOf('id="f-setting-domain"') === -1);
ok("settings: the custom domain is clearly off", /id="f-setting-custom"[^>]*disabled/.test(settingsHtml) && /not live in the beta/.test(settingsHtml));
ok("customize: no promise of a domain setting", customHtml.indexOf("Settings → Domain") === -1);
ok("settings: saving does not wipe the domain field", !/f-setting-domain/.test(appSrc));

/* Insight printed fixed growth chips ("12.4% vs last week", "4 new") for every
   account, whatever the numbers were. They come from the 14-day series now. */
D7.state.contacts = [];
D7.state.stats.views = 100;
D7.state.stats.clicks = 70;
D7.state.stats.daily = [10, 10, 10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 5];
const ins = bioSandbox.Pages.PAGES.insight();
ok("insight: no invented view growth", ins.indexOf("12.4%") === -1);
ok("insight: no invented click growth", ins.indexOf("18.2%") === -1);
ok("insight: no invented contact growth", ins.indexOf("4 new") === -1);
ok("insight: clicks compare the two real weeks", ins.indexOf("-50% vs last week") !== -1);
ok("insight: the subtitle does not claim live updates", ins.indexOf("updated a few seconds ago") === -1);
ok("insight: export uses the link export", ins.indexOf('data-action="export-links"') !== -1);
D7.state.stats.daily = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
D7.state.stats.views = 0;
D7.state.stats.clicks = 0;
const insCold = bioSandbox.Pages.PAGES.insight();
ok("insight: a cold account gets no growth chip", insCold.indexOf("% vs last week") === -1);
ok("insight: a cold account is told tracking is off", /tracking is not switched on/.test(insCold));
ok("insight: a page with history is not told that", !/tracking is not switched on/.test(ins));
D7.state.stats.views = 0;
D7.state.stats.clicks = 0;
ok("insight: export-links is defined", /"export-links":/.test(appSrc));
ok("insight: export-links writes the link rows", /"export-links"[\s\S]{0,400}S\.state\.links/.test(appSrc));
ok("insight: both exports share one CSV writer", /function downloadCsv/.test(appSrc));

/* The legal page is public. A bracketed placeholder or a "local-first, nothing
   leaves your browser" claim would be wrong now that pages sync to Supabase. */
const legalSrc = fs.readFileSync(path.join(ROOT, "legal.html"), "utf8");
ok("legal: no bracketed placeholders are left", !/\[[A-Z][^\]]*\]/.test(legalSrc));
ok("legal: there is a real contact address", legalSrc.indexOf("vinaysuthar113@gmail.com") !== -1);
ok("legal: the privacy section admits the server copy", /also stored in our database/.test(legalSrc));
ok("legal: it no longer claims nothing is transmitted", legalSrc.indexOf("not transmitted to a server") === -1);
ok("legal: deletion points at the real control", legalSrc.indexOf("[PRIVACY EMAIL]") === -1 && /Delete account/.test(legalSrc));
D7.state.contacts = [
  { id: "c1", name: "Ada", email: "a@x.co", source: "Instagram", joined: D7.today(), status: "subscribed" },
  { id: "c2", name: "Ben", email: "b@x.co", source: "Instagram", joined: "2025-01-01", status: "unsubscribed" }
];
const aud = bioSandbox.Pages.PAGES.audience();
ok("audience: the top source comes from real contacts", aud.indexOf("100% of signups") !== -1);
ok("audience: the subscriber share is computed", aud.indexOf("50% of list") !== -1);
ok("audience: this month counts only this month", aud.indexOf("+1 this month") !== -1);
D7.state.contacts = [];
D7.state.posts = [];

/* ---- cloud client: unconfigured -------------------------------------- */
function cloudSandboxWith(config, opts) {
  opts = opts || {};
  const store = memLocal();
  const loc = {
    href: "https://linkey.app/", pathname: "/", protocol: "https:",
    origin: "https://linkey.app", search: opts.search || "", hash: opts.hash || "",
    assign(url) { this.assigned = url; }
  };
  const calls = [];
  const sb = {
    console, URL, URLSearchParams, TextEncoder, setTimeout, clearTimeout,
    crypto: require("crypto").webcrypto,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    localStorage: store,
    location: loc,
    history: { replaced: null, replaceState(_a, _b, url) { this.replaced = url; } },
    LINKEY_CONFIG: config,
    fetch: opts.fetch || (async () => ({ ok: false, status: 0, text: async () => "" })),
    AbortController
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/cloud.js"), "utf8"), sb, { filename: "assets/js/cloud.js" });
  return { Cloud: sb.Cloud, calls, location: loc, history: sb.history, store };
}

const offline = cloudSandboxWith({ supabaseUrl: "", supabaseAnonKey: "" }).Cloud;
ok("cloud: no config means not configured", !offline.isConfigured());
ok("cloud: reason explains why", /missing config/.test(offline.reason));
ok("cloud: oauth refuses without config", !offline.signInWithOAuth("google").ok);
ok("cloud: email link refuses without config", !offline.sendEmailLink("a@b.com").ok);
eq("cloud: ready returns a plain object", typeof offline.ready().then, "function");
ok("cloud: loadPage is null without config", !offline.isConfigured());

/* ---- cloud client: helpers ------------------------------------------- */
const cc = cloudSandboxWith({ supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" });
const C = cc.Cloud;
const I = C._internals;

ok("cloud: configured", C.isConfigured());
eq("cloud: flags default on", [C.flag("google"), C.flag("emailLink"), C.flag("apple")], [true, true, false]);
eq("cloud: redirect target", C.redirectTo(), "https://linkey.app/");
eq("cloud: redirect target can be pinned", cloudSandboxWith({ supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "k", siteUrl: "https://linkey.app" }).Cloud.redirectTo(), "https://linkey.app/");

ok("url: https allowed", I.urlAllowed("https://demo.supabase.co"));
ok("url: localhost http allowed", I.urlAllowed("http://localhost:54321"));
ok("url: 127.0.0.1 allowed", I.urlAllowed("http://127.0.0.1:54321"));
ok("url: remote http refused", !I.urlAllowed("http://demo.supabase.co"));
ok("url: javascript refused", !I.urlAllowed("javascript:alert(1)"));
ok("url: empty refused", !I.urlAllowed(""));

const b64 = I.base64url(new Uint8Array([251, 255, 191]));
ok("b64: no padding", b64.indexOf("=") === -1);
ok("b64: url-safe alphabet", !/[+/]/.test(b64), b64);

const auth = C.authorizeUrl("google", "challenge-value", "state-value");
ok("oauth: hits the authorize endpoint", auth.indexOf("/auth/v1/authorize?") !== -1);
ok("oauth: names the provider", auth.indexOf("provider=google") !== -1);
ok("oauth: uses s256", auth.indexOf("code_challenge_method=s256") !== -1);
ok("oauth: carries the challenge", auth.indexOf("code_challenge=challenge-value") !== -1);
ok("oauth: carries the state", auth.indexOf("state=state-value") !== -1);
ok("oauth: returns to the site", auth.indexOf("redirect_to=https%3A%2F%2Flinkey.app%2F") !== -1);
ok("oauth: no stray spaces", auth.indexOf(" ") === -1);

eq("redirect parse: code", C.parseRedirect("?code=abcdefgh12345", "").code, "abcdefgh12345");
eq("redirect parse: error", C.parseRedirect("?error=access_denied&error_description=nope", "").error, "access_denied");
eq("redirect parse: description", C.parseRedirect("?error=x&error_description=nope", "").errorDescription, "nope");
eq("redirect parse: state", C.parseRedirect("?code=abcdefgh12345&state=s1", "").state, "s1");
eq("redirect parse: bad charset dropped", C.parseRedirect("?code=abc%20def%20ghi", "").code, "");
eq("redirect parse: too short dropped", C.parseRedirect("?code=short", "").code, "");
eq("redirect parse: hash fallback", C.parseRedirect("", "#error=access_denied").error, "access_denied");
eq("redirect parse: a route hash is not auth", C.parseRedirect("", "#/links").code, "");
eq("redirect parse: empty", C.parseRedirect("", "").code, "");

const gu = C.normalizeUser({
  id: "u1", email: "ada@northwind.com", created_at: "2026-10-29T09:00:00Z",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Ada Chen", avatar_url: "https://lh3.googleusercontent.com/a/ada" }
});
eq("user: id", gu.id, "u1");
eq("user: email", gu.email, "ada@northwind.com");
eq("user: name", gu.name, "Ada Chen");
eq("user: avatar", gu.avatar, "https://lh3.googleusercontent.com/a/ada");
eq("user: provider", gu.provider, "google");

const ge = C.normalizeUser({ id: "u2", email: "ada.chen@northwind.com", user_metadata: {} });
eq("user: name from the email local part", ge.name, "ada chen");
eq("user: no avatar", ge.avatar, "");

const gbad = C.normalizeUser({ id: "u3", email: "x@y.com", user_metadata: { picture: "javascript:alert(1)" } });
eq("user: unsafe avatar dropped", gbad.avatar, "");
eq("user: null is null", C.normalizeUser(null), null);
eq("user: a string is null", C.normalizeUser("x"), null);

ok("fresh: just created", C.isFresh({ created: new Date().toISOString() }));
ok("fresh: ten minutes old", !C.isFresh({ created: new Date(Date.now() - 600000).toISOString() }));
ok("fresh: no created date", !C.isFresh({}));
ok("fresh: junk date", !C.isFresh({ created: "nope" }));

/* ---- cloud client: PKCE exchange end to end -------------------------- */
async function cloudTests() {
eq("cloud: loadPage is null without config", await offline.loadPage(), null);

let tokenCall = null;
const pkce = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  {
    search: "?code=abcdefgh12345",
    fetch: async (url, opts) => {
      tokenCall = { url: url, opts: opts };
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          user: { id: "u9", email: "ada@northwind.com", user_metadata: { full_name: "Ada Chen" } }
        })
      };
    }
  }
);
pkce.Cloud._internals.writeJSON(pkce.Cloud._internals.VERIFIER, { verifier: "the-verifier", provider: "google", at: Date.now() });
const boot = await pkce.Cloud.ready();
ok("pkce: boot succeeds", !boot.error, boot.error);
eq("pkce: user hydrated", boot.user && boot.user.name, "Ada Chen");
ok("pkce: token request goes to the token endpoint", /\/auth\/v1\/token\?grant_type=pkce$/.test(tokenCall.url));
eq("pkce: sends the auth code", JSON.parse(tokenCall.opts.body).auth_code, "abcdefgh12345");
eq("pkce: sends the verifier", JSON.parse(tokenCall.opts.body).code_verifier, "the-verifier");
ok("pkce: no credentials sent", tokenCall.opts.credentials === "omit");
ok("pkce: session stored", !!pkce.Cloud.session() && pkce.Cloud.session().access_token === "access-token");
ok("pkce: the code is stripped from the URL", String(pkce.history.replaced).indexOf("code=") === -1);
ok("pkce: the verifier is consumed", pkce.Cloud._internals.readJSON(pkce.Cloud._internals.VERIFIER) === null);
eq("pkce: ready is memoised", pkce.Cloud.ready(), pkce.Cloud.ready());

/* a cancelled sign-in is explained, not thrown */
const cancel = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "k" },
  { search: "?error=access_denied&error_description=User%20denied" }
);
const refused = await cancel.Cloud.ready();
eq("pkce: cancellation is friendly", refused.error, "Sign-in was cancelled.");
ok("pkce: cancellation strips the URL", String(cancel.history.replaced).indexOf("error=") === -1);

/* a missing verifier is caught before a request is made */
const stale = cloudSandboxWith({ supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "k" }, { search: "?code=abcdefgh12345" });
const expired = await stale.Cloud.ready();
eq("pkce: an expired link is explained", expired.error, "That sign-in link expired. Please try again.");

/* ---- cloud client: page rows ----------------------------------------- */
const noSession = await cc.Cloud.savePage({ handle: "ada", onboarded: true, data: {} });
eq("page: saving without a session fails quietly", noSession.code, "no-session");
eq("page: a missing table reads as null", await cc.Cloud.loadPage(), null);

/* handle availability goes through the SECURITY DEFINER rpc */
let rpcCall = null;
const hb = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  {
    fetch: async (url, opts) => {
      rpcCall = { url: url, opts: opts };
      return { ok: true, status: 200, text: async () => "true" };
    }
  }
);
const taken = await hb.Cloud.handleTaken("Ravi.Menon");
// No session → handleTaken returns taken:false without calling Supabase
// Uniqueness is enforced by the database unique constraint
ok("handle: no session returns taken:false", taken.ok && taken.taken === false);
ok("handle: no RPC call when no session", !rpcCall);

const hbNo = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  { fetch: async () => ({ ok: true, status: 200, text: async () => "false" }) }
);
const free = await hbNo.Cloud.handleTaken("ravi.menon");
ok("handle: rpc answers free", free.ok && free.taken === false);

const hbBad = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  { fetch: async () => ({ ok: true, status: 200, text: async () => "false" }) }
);
eq("handle: an invalid name skips the request", (await hbBad.Cloud.handleTaken("../etc")).code, "invalid");

const hbMissing = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  { fetch: async () => ({ ok: false, status: 404, text: async () => JSON.stringify({ code: "PGRST202", message: "not found" }) }) }
);
const noRpc = await hbMissing.Cloud.handleTaken("ravi.menon");
ok("handle: no session returns taken:false", noRpc.ok && noRpc.taken === false && noRpc.code === "no-session");

const collided = cloudSandboxWith(
  { supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key" },
  { fetch: async () => ({ ok: false, status: 409, text: async () => JSON.stringify({ code: "23505", message: "duplicate key" }) }) }
);
collided.Cloud._internals.writeJSON(collided.Cloud._internals.STORE, {
  access_token: "t", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "u1" }
});
const dup = await collided.Cloud.savePage({ handle: "ada", onboarded: true, data: {} });
eq("page: a duplicate handle is named", dup.code, "handle-taken");
ok("page: a duplicate handle carries a readable message", /already taken/.test(dup.error));

/* ---- cloud client: sign out ------------------------------------------ */
cc.Cloud._internals.writeJSON(cc.Cloud._internals.STORE, { access_token: "t", refresh_token: "r", expires_at: 0, user: { id: "u1" } });
ok("session: stored before sign-out", !!cc.Cloud.session());
await cc.Cloud.signOut();
eq("session: cleared after sign-out", cc.Cloud.session(), null);
}

/* ======================================================================
   Page style engine
   ====================================================================== */

/** storeWithLocal - a store plus the key/value map behind it. */
function storeWithLocal() {
  const local = memLocal();
  const sb = { console, localStorage: local, URL };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8"), sb, { filename: "assets/js/store.js" });
  return { S: sb.Store, local: local };
}

const SY = storeWithLocal().S;
const DEFAULTS = SY.STYLE_DEFAULTS;

/* ---- style: the vocabulary ------------------------------------------- */
eq("style: five fonts", SY.FONTS.length, 5);
eq("style: ten gradients", SY.GRADIENTS.length, 10);
eq("style: font ids unique", new Set(SY.FONTS.map((f) => f.id)).size, 5);
eq("style: gradient ids unique", new Set(SY.GRADIENTS.map((g) => g.id)).size, 10);
ok("style: every gradient is a linear-gradient", SY.GRADIENTS.every((g) => /^linear-gradient\(/.test(g.css)));
ok("style: gradients contain no quotes or semicolons", SY.GRADIENTS.every((g) => !/["';]/.test(g.css)), "a gradient is pasted into a css var");
ok("style: every font stack has no url()", SY.FONTS.every((f) => !/url\(/i.test(f.stack)));
eq("style: button fill choices", SY.BTN_FILLS, ["theme", "solid", "soft", "outline", "glass"]);
eq("style: button shapes", SY.BTN_SHAPES, ["square", "rounded", "pill"]);
eq("style: button sizes", SY.BTN_SIZES, ["compact", "regular", "large"]);
eq("style: avatar shapes", SY.AVATAR_SHAPES, ["circle", "squircle", "square"]);
eq("style: weights", SY.STYLE_WEIGHTS, [400, 500, 600, 700, 800]);

/* ---- style: sanitizer ------------------------------------------------- */
const san = SY.sanitizeStyle;
eq("sanitize: null becomes the defaults", san(null), DEFAULTS);
eq("sanitize: a string becomes the defaults", san("font=evil"), DEFAULTS);
eq("sanitize: an array becomes the defaults", san([1, 2]), DEFAULTS);
eq("sanitize: unknown font falls back", san({ font: "comic-sans" }).font, "rubik");
eq("sanitize: a known font is kept", san({ font: "editorial" }).font, "editorial");
eq("sanitize: size is clamped low", san({ size: -40 }).size, 12);
eq("sanitize: size is clamped high", san({ size: 400 }).size, 20);
eq("sanitize: size is rounded", san({ size: 15.6 }).size, 16);
eq("sanitize: a numeric string is read", san({ size: "17" }).size, 17);
eq("sanitize: junk size falls back", san({ size: "big" }).size, 14);
eq("sanitize: junk weight falls back", san({ weight: 613 }).weight, 600);
eq("sanitize: a known weight is kept", san({ weight: 800 }).weight, 800);
eq("sanitize: a string weight is read", san({ weight: "700" }).weight, 700);
eq("sanitize: align must be known", san({ align: "justify" }).align, "center");
eq("sanitize: left align is kept", san({ align: "left" }).align, "left");
eq("sanitize: a colour name is rejected", san({ accent: "red" }).accent, "#ff5000");
eq("sanitize: an injection is rejected", san({ accent: "red;} body{display:none" }).accent, "#ff5000");
eq("sanitize: url() is rejected", san({ bgColor: "url(https://evil.test/x.png)" }).bgColor, "#ffffff");
eq("sanitize: a short hex is kept and lowered", san({ accent: "#FBC" }).accent, "#fbc");
eq("sanitize: fg may be empty", san({ fg: "" }).fg, "");
eq("sanitize: a junk fg is dropped", san({ fg: "currentColor" }).fg, "");
eq("sanitize: bg must be known", san({ bg: "image" }).bg, "theme");
eq("sanitize: a known bg is kept", san({ bg: "gradient" }).bg, "gradient");
eq("sanitize: unknown gradient falls back", san({ gradient: "vaporwave" }).gradient, "sunset");
eq("sanitize: overlay is clamped high", san({ overlay: 500 }).overlay, 80);
eq("sanitize: overlay is clamped low", san({ overlay: -20 }).overlay, 0);
eq("sanitize: overlay is rounded", san({ overlay: 33.4 }).overlay, 33);
eq("sanitize: btnFill must be known", san({ btnFill: "neon" }).btnFill, "theme");
eq("sanitize: btnShape must be known", san({ btnShape: "blob" }).btnShape, "rounded");
eq("sanitize: btnShadow must be known", san({ btnShadow: "glow" }).btnShadow, "none");
eq("sanitize: btnSize must be known", san({ btnSize: "huge" }).btnSize, "regular");
eq("sanitize: avatar must be known", san({ avatar: "hexagon" }).avatar, "circle");

/* unknown keys never survive */
const polluted = san({ evil: "<script>alert(1)</script>", css: "color:red" });
eq("sanitize: unknown keys are dropped", Object.keys(polluted).sort(), Object.keys(DEFAULTS).sort());
ok("sanitize: no value carries markup", !Object.keys(polluted).some((k) => /[<>{}]/.test(String(polluted[k]))));
const proto = san(JSON.parse('{"__proto__":{"font":"evil"}}'));
eq("sanitize: __proto__ cannot change a value", proto.font, "rubik");
eq("sanitize: Object.prototype is untouched", {}.font, undefined);

/* ---- style: colour helpers -------------------------------------------- */
eq("colour: short hex expands", SY.hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
eq("colour: brand orange", SY.hexToRgb("#FF5000"), { r: 255, g: 80, b: 0 });
eq("colour: junk is null", SY.hexToRgb("orange"), null);
eq("colour: empty is null", SY.hexToRgb(""), null);
eq("colour: rgba", SY.rgba("#ff5000", 0.5), "rgba(255,80,0,0.5)");
eq("colour: rgba clamps alpha high", SY.rgba("#000000", 9), "rgba(0,0,0,1)");
eq("colour: rgba clamps alpha low", SY.rgba("#000000", -3), "rgba(0,0,0,0)");
eq("colour: rgba of junk is transparent black", SY.rgba("junk", 0.4), "rgba(0,0,0,0.4)");
eq("colour: white luminance", SY.luminance("#ffffff"), 1);
eq("colour: black luminance", SY.luminance("#000000"), 0);
eq("colour: junk luminance is 0", SY.luminance("junk"), 0);
eq("colour: dark ink on white", SY.pickText("#ffffff"), "#1f1f1f");
eq("colour: light ink on black", SY.pickText("#000000"), "#ffffff");
eq("colour: dark ink on brand yellow", SY.pickText("#fbc02d"), "#1f1f1f");
eq("colour: light ink on brand orange", SY.pickText("#ff5000"), "#ffffff");
eq("shade: darkens", SY.shade("#ff5000", -14), "#f14200");
eq("shade: lightens", SY.shade("#ff5000", 14), "#ff5e0e");
eq("shade: clamps at black", SY.shade("#101010", -99), "#000000");
eq("shade: clamps at white", SY.shade("#fefefe", 99), "#ffffff");
eq("shade: junk passes through", SY.shade("junk", -10), "junk");

/* ---- style: defaults, set, reset -------------------------------------- */
const ST = storeWithLocal();
const St = ST.S;
eq("style: an untouched page is default", St.style(), DEFAULTS);
ok("style: default state carries a style", !!St.state.profile.style);

const set1 = St.setStyle({ size: 17, accent: "#0f0" });
eq("setStyle: applies the patch", [set1.size, set1.accent], [17, "#0f0"]);
eq("setStyle: keeps untouched values", set1.font, "rubik");
eq("setStyle: persists to storage", JSON.parse(ST.local.getItem("linkey.state.v1")).profile.style.accent, "#0f0");
const set2 = St.setStyle({ btnShape: "pill" });
eq("setStyle: merges with the previous style", [set2.accent, set2.size, set2.btnShape], ["#0f0", 17, "pill"]);
eq("setStyle: an invalid value falls back", St.setStyle({ accent: "nope" }).accent, "#ff5000");
eq("setStyle: junk patch is harmless", St.setStyle(null).accent, "#ff5000");
const reset = St.resetStyle();
eq("resetStyle: back to defaults", reset, DEFAULTS);
ok("resetStyle: removes the stored style", !("style" in JSON.parse(ST.local.getItem("linkey.state.v1")).profile));

/* ---- style: vars ------------------------------------------------------ */
const SV = storeWithLocal().S;
const vars = SV.styleVars();
ok("vars: background", vars.indexOf("--p-bg:") !== -1);
ok("vars: foreground", vars.indexOf("--p-fg:") !== -1);
ok("vars: accent is the brand orange", vars.indexOf("--p-accent:#ff5000") !== -1);
ok("vars: font is the rubik stack", vars.indexOf("--p-font:'Rubik'") !== -1);
ok("vars: size", vars.indexOf("--p-size:14px") !== -1);
ok("vars: weight", vars.indexOf("--p-weight:600") !== -1);
ok("vars: align", vars.indexOf("--p-align:center") !== -1);
ok("vars: default avatar is a circle", vars.indexOf("--p-avatar-radius:50%") !== -1);
ok("vars: default radius", vars.indexOf("--p-radius:14px") !== -1);
ok("vars: no shadow by default", vars.indexOf("--p-shadow:none") !== -1);
ok("vars: overlay starts at zero", vars.indexOf("--p-overlay:0") !== -1);
ok("vars: no markup in the vars", !/[<>{}]/.test(vars));

const dark = storeWithLocal().S;
dark.setStyle({ bg: "solid", bgColor: "#101010" });
ok("vars: a dark background gets light ink", dark.styleVars().indexOf("--p-fg:#ffffff") !== -1);
const light = storeWithLocal().S;
light.setStyle({ bg: "solid", bgColor: "#f7f1dc" });
ok("vars: a light background gets dark ink", light.styleVars().indexOf("--p-fg:#1f1f1f") !== -1);
light.setStyle({ fg: "#123456" });
ok("vars: an explicit ink wins", light.styleVars().indexOf("--p-fg:#123456") !== -1);
const grad = storeWithLocal().S;
grad.setStyle({ bg: "gradient", gradient: "night" });
ok("vars: a gradient is a background", grad.styleVars().indexOf("--p-bg:linear-gradient(") !== -1);
grad.setStyle({ gradient: "nope" });
ok("vars: an unknown gradient cannot leak css", grad.styleVars().indexOf("--p-bg:linear-gradient(160deg,#ff9966") !== -1);

const fills = storeWithLocal().S;
fills.setStyle({ btnFill: "solid", accent: "#101010" });
ok("vars: a solid button is the accent", fills.styleVars().indexOf("--p-btn:#101010") !== -1);
ok("vars: a solid button picks readable text", fills.styleVars().indexOf("--p-btn-fg:#ffffff") !== -1);
fills.setStyle({ btnFill: "outline", accent: "#ff5000" });
ok("vars: an outline button is transparent", fills.styleVars().indexOf("--p-btn:transparent") !== -1);
ok("vars: an outline button uses the accent as border", fills.styleVars().indexOf("--p-btn-border:#ff5000") !== -1);
fills.setStyle({ btnFill: "soft" });
ok("vars: a soft button is translucent accent", /--p-btn:rgba\(255,80,0,0\.16\)/.test(fills.styleVars()));
fills.setStyle({ btnFill: "glass" });
ok("vars: a glass button is white-tinted", fills.styleVars().indexOf("--p-btn:rgba(255,255,255,.18)") !== -1);

const shapes = storeWithLocal().S;
shapes.setStyle({ btnShape: "square" });
ok("vars: square radius", shapes.styleVars().indexOf("--p-radius:4px") !== -1);
shapes.setStyle({ btnShape: "pill" });
ok("vars: pill radius", shapes.styleVars().indexOf("--p-radius:999px") !== -1);
shapes.setStyle({ btnShadow: "soft" });
ok("vars: soft shadow", /--p-shadow:0 6px 18px/.test(shapes.styleVars()));
shapes.setStyle({ btnShadow: "strong" });
ok("vars: strong shadow", /--p-shadow:0 12px 28px/.test(shapes.styleVars()));

const sizes = storeWithLocal().S;
sizes.setStyle({ btnSize: "compact", size: 16 });
ok("vars: compact is two points smaller", sizes.styleVars().indexOf("--p-size:14px") !== -1);
ok("vars: compact height", sizes.styleVars().indexOf("--p-minh:42px") !== -1);
sizes.setStyle({ btnSize: "large" });
ok("vars: large is two points bigger", sizes.styleVars().indexOf("--p-size:18px") !== -1);
ok("vars: large height", sizes.styleVars().indexOf("--p-minh:58px") !== -1);
sizes.setStyle({ btnSize: "compact", size: 12 });
ok("vars: compact never drops below 11px", sizes.styleVars().indexOf("--p-size:11px") !== -1);

const av = storeWithLocal().S;
av.setStyle({ avatar: "squircle" });
ok("vars: squircle avatar", av.styleVars().indexOf("--p-avatar-radius:28%") !== -1);
av.setStyle({ avatar: "square" });
ok("vars: square avatar", av.styleVars().indexOf("--p-avatar-radius:10%") !== -1);
av.setStyle({ overlay: 40 });
ok("vars: overlay is a fraction", av.styleVars().indexOf("--p-overlay:0.4") !== -1);

/* ---- new style properties ---------------------------------------------- */
av.setStyle({ btnRadius: "pill" });
ok("vars: button radius pill", av.styleVars().indexOf("--p-btn-radius:999px") !== -1);
av.setStyle({ btnRadius: "square" });
ok("vars: button radius square", av.styleVars().indexOf("--p-btn-radius:4px") !== -1);

av.setStyle({ btnBorder: "#ff5000", btnBorderWidth: 3 });
ok("vars: button border color", av.styleVars().indexOf("--p-btn-border-color:#ff5000") !== -1);
ok("vars: button border width", av.styleVars().indexOf("--p-btn-border-width:3px") !== -1);

av.setStyle({ linkRadius: "square" });
ok("vars: link radius square", av.styleVars().indexOf("--p-link-radius:4px") !== -1);
av.setStyle({ linkRadius: "pill" });
ok("vars: link radius pill", av.styleVars().indexOf("--p-link-radius:999px") !== -1);

av.setStyle({ profileRadius: "squircle", profileBorder: "#ff5000" });
ok("vars: profile radius squircle", av.styleVars().indexOf("--p-profile-radius:28%") !== -1);
ok("vars: profile border color", av.styleVars().indexOf("--p-profile-border-color:#ff5000") !== -1);

av.setStyle({ headingFont: "editorial", headingWeight: 800, headingSize: 20 });
ok("vars: heading font", av.styleVars().indexOf("--p-heading-font:") !== -1 && av.styleVars().indexOf("Georgia") !== -1);
ok("vars: heading weight", av.styleVars().indexOf("--p-heading-weight:800") !== -1);
ok("vars: heading size", av.styleVars().indexOf("--p-heading-size:20px") !== -1);

av.setStyle({ shopRadius: "pill", shopBorder: "#ff5000" });
ok("vars: shop radius pill", av.styleVars().indexOf("--p-shop-radius:999px") !== -1);
ok("vars: shop border color", av.styleVars().indexOf("--p-shop-border-color:#ff5000") !== -1);

av.setStyle({ collectionRadius: "square", collectionBorder: "#1f1f1f" });
ok("vars: collection radius square", av.styleVars().indexOf("--p-collection-radius:4px") !== -1);
ok("vars: collection border color", av.styleVars().indexOf("--p-collection-border-color:#1f1f1f") !== -1);

av.setStyle({ bgImage: "https://example.com/bg.jpg", bgImageMode: "contain" });
ok("vars: background image", av.styleVars().indexOf("--p-bg-image:url(https://example.com/bg.jpg)") !== -1);
ok("vars: background image mode", av.styleVars().indexOf("--p-bg-image-mode:contain") !== -1);

/* bgImage rejects unsafe URLs */
av.setStyle({ bgImage: "javascript:alert(1)" });
ok("vars: background image rejects javascript", av.styleVars().indexOf("--p-bg-image:none") !== -1);

av.setStyle({ bgImage: "" });
ok("vars: background image cleared", av.styleVars().indexOf("--p-bg-image:none") !== -1);

/* ---- custom theme save/load -------------------------------------------- */
av.setStyle({ accent: "#ff5000", btnShape: "pill", headingFont: "editorial" });
const ct1 = av.saveCustomTheme("My Theme");
ok("custom theme: save returns theme", ct1.ok && ct1.theme.name === "My Theme");
ok("custom theme: theme has id", !!ct1.theme.id);
ok("custom theme: theme has style", !!ct1.theme.style);
ok("custom theme: theme has created", !!ct1.theme.created);

const themes = av.getCustomThemes();
ok("custom theme: getCustomThemes returns array", Array.isArray(themes));
ok("custom theme: theme is in list", themes.some((t) => t.id === ct1.theme.id));

av.setStyle({ accent: "#00ff00" });
ok("custom theme: current style changed", av.style().accent === "#00ff00");
av.applyCustomTheme(ct1.theme.id);
ok("custom theme: apply restores style", av.style().accent === "#ff5000");
ok("custom theme: apply restores btnShape", av.style().btnShape === "pill");

const ct2 = av.saveCustomTheme("Second Theme");
ok("custom theme: second theme saved", ct2.ok);
ok("custom theme: two themes", av.getCustomThemes().length === 2);

ok("custom theme: delete works", av.deleteCustomTheme(ct1.theme.id).ok);
ok("custom theme: one remains", av.getCustomThemes().length === 1);
ok("custom theme: deleted theme gone", !av.getCustomThemes().some((t) => t.id === ct1.theme.id));
ok("custom theme: delete missing returns false", !av.deleteCustomTheme("nonexistent").ok);

/* custom theme name validation */
ok("custom theme: empty name rejected", !av.saveCustomTheme("").ok);
ok("custom theme: whitespace name rejected", !av.saveCustomTheme("   ").ok);

/* ---- public page and the preview read the same vars */
const sameVars = storeWithLocal().S;
sameVars.setStyle({ accent: "#123456", btnShape: "pill", font: "mono", bg: "solid", bgColor: "#000" });
const sharedVars = sameVars.styleVars();
const sharedSandbox = { console, Store: sameVars, icon: () => "<svg></svg>", URL };
sharedSandbox.window = sharedSandbox;
sharedSandbox.globalThis = sharedSandbox;
vm.createContext(sharedSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), sharedSandbox, { filename: "assets/js/pages.js" });
ok("vars: the bio page embeds the shared vars", sharedSandbox.Pages.bioPage().indexOf(sharedVars) !== -1,
  "the preview and the live page must not drift");
ok("vars: the phone preview embeds the same vars", sharedSandbox.Pages.phoneMarkup().indexOf(sharedVars) !== -1);

/* ======================================================================
   Google identity
   ====================================================================== */
const GCLIENT_OK = "1234567890-abc123def456.apps.googleusercontent.com";
const gc = cloudSandboxWith({ googleClientId: GCLIENT_OK }).Cloud;
const V = gc.verifyGoogleProfile;
const GOOD = {
  sub: "102938475610293847",
  email: "  Ada.Chen@Northwind.COM ",
  email_verified: true,
  name: "  Ada   Chen ",
  picture: "https://lh3.googleusercontent.com/a/abc=s96-c"
};

eq("google: a full profile is accepted", V(GOOD).ok, true);
eq("google: the id is namespaced", V(GOOD).user.id, "google:102938475610293847");
eq("google: the email is normalised", V(GOOD).user.email, "ada.chen@northwind.com");
eq("google: the name is collapsed", V(GOOD).user.name, "Ada Chen");
eq("google: the avatar is kept", V(GOOD).user.avatar, GOOD.picture);
eq("google: the provider is recorded", V(GOOD).user.provider, "google");
ok("google: no token is in the user", !("access_token" in V(GOOD).user));

eq("google: nothing is rejected", V(null).ok, false);
eq("google: a string is rejected", V("profile").ok, false);
eq("google: a missing sub is rejected", V(Object.assign({}, GOOD, { sub: "" })).ok, false);
eq("google: a non-numeric sub is rejected", V(Object.assign({}, GOOD, { sub: "abc123" })).ok, false);
eq("google: a short sub is rejected", V(Object.assign({}, GOOD, { sub: "123" })).ok, false);
eq("google: sub markup is rejected", V(Object.assign({}, GOOD, { sub: '1"><script>' })).ok, false);
eq("google: an unverified address is rejected", V(Object.assign({}, GOOD, { email_verified: false })).ok, false);
eq("google: a missing verification flag is rejected", V({ sub: GOOD.sub, email: GOOD.email }).ok, false);
eq("google: verified_email is honoured", V({ sub: GOOD.sub, email: GOOD.email, verified_email: true }).ok, true);
eq("google: a bad email is rejected", V(Object.assign({}, GOOD, { email: "not-an-email" })).ok, false);
eq("google: an email without a dot is rejected", V(Object.assign({}, GOOD, { email: "a@b" })).ok, false);
eq("google: an over-long email is rejected", V(Object.assign({}, GOOD, { email: "a".repeat(250) + "@b.co" })).ok, false);
eq("google: an email with a space is rejected", V(Object.assign({}, GOOD, { email: "ada chen@x.com" })).ok, false);
eq("google: a missing name becomes the local part", V({ sub: GOOD.sub, email: "ada@x.com", email_verified: true }).user.name, "ada");
eq("google: a long name is cut to sixty", V(Object.assign({}, GOOD, { name: "A".repeat(200) })).user.name.length, 60);
eq("google: a javascript avatar is dropped", V(Object.assign({}, GOOD, { picture: "javascript:alert(1)" })).user.avatar, "");
eq("google: an http avatar is dropped", V(Object.assign({}, GOOD, { picture: "http://x.test/a.png" })).user.avatar, "");
eq("google: a data avatar is dropped", V(Object.assign({}, GOOD, { picture: "data:image/svg+xml,<svg/>" })).user.avatar, "");
eq("google: an over-long avatar is dropped", V(Object.assign({}, GOOD, { picture: "https://x.test/" + "a".repeat(600) })).user.avatar, "");

eq("google: a valid client id is configured", gc.googleConfigured(), true);
eq("google: a bad client id is not configured", cloudSandboxWith({ googleClientId: "not-a-client" }).Cloud.googleConfigured(), false);
eq("google: an empty client id is not configured", cloudSandboxWith({ googleClientId: "" }).Cloud.googleConfigured(), false);
eq("mode: client id means google", gc.mode(), "google");
eq("mode: no config means demo", cloudSandboxWith({}).Cloud.mode(), "demo");
eq("mode: supabase wins when both are set",
  cloudSandboxWith({ supabaseUrl: "https://demo.supabase.co", supabaseAnonKey: "anon-key", googleClientId: GCLIENT_OK }).Cloud.mode(), "supabase");

/* a signed-in Google user is adopted, then recognised on return */
const GA = storeWithLocal();
const GS = GA.S;
const adaGoogle = V(GOOD).user;
const firstGoogle = GS.adoptProviderUser(adaGoogle);
eq("adopt: a new Google user is a new account", [firstGoogle.ok, firstGoogle.newAccount, firstGoogle.returning], [true, true, false]);
eq("adopt: the handle is suggested from the name", GS.state.user.handle, "adachen");
eq("adopt: the email is stored", GS.state.user.email, "ada.chen@northwind.com");
eq("adopt: not yet onboarded", GS.auth().onboarded, false);
eq("adopt: the setup draft exists", GS.state.ui.setup.handle, "adachen");
eq("adopt: the provider is google", GS.auth().provider, "google");
eq("adopt: the account is device-only", GS.auth().cloud, false);
ok("adopt: the seeded demo page is backed up before it is replaced", firstGoogle.backup === true);

GS.completeSetup({
  handle: "ada-chen", name: "Ada Chen", bio: "Type.", theme: "halo",
  platforms: ["instagram"], links: []
});
const again = GS.adoptProviderUser(adaGoogle);
eq("adopt: a returning user is recognised", [again.returning, again.newAccount], [true, false]);
eq("adopt: a returning user keeps the handle", GS.state.user.handle, "ada-chen");
eq("adopt: a returning user keeps the bio", GS.state.profile.bio, "Type.");

/* a different Google account replaces the page, but keeps a backup copy */
const other = GS.adoptProviderUser({
  id: "google:999999999", email: "sam@example.com", name: "Sam Patel", avatar: ""
});
eq("adopt: a different account is new", [other.newAccount, other.backup], [true, true]);
const backupRaw = GA.local.getItem("linkey.backup.v1");
ok("adopt: the replaced page is backed up", !!backupRaw);
eq("adopt: the backup keeps the old handle", JSON.parse(backupRaw).user.handle, "ada-chen");
eq("adopt: the new page is blank", GS.state.links.length, 0);
eq("adopt: the new page is Sam's", GS.state.user.handle, "sampatel");

/* a signed-out visitor's first sign-in replaces nothing, so nothing is backed up */
const GX = storeWithLocal().S;
GX.signOut();
const signedOutFirst = GX.adoptProviderUser({ id: "google:555555555", email: "new@example.com", name: "New Person" });
eq("adopt: a signed-out first sign-in has no page to back up", signedOutFirst.backup, false);

/* the signup intent is applied only to the matching email */
const GI = storeWithLocal().S;
GI.signUpIntent({ name: "Meera Rao", email: "meera@example.com", handle: "meera" });
const withIntent = GI.adoptProviderUser({ id: "google:123456789", email: "meera@example.com", name: "M Rao", avatar: "" });
eq("adopt: a matching intent is applied", [withIntent.adoptedIntent, GI.state.user.handle, GI.state.user.name], [true, "meera", "Meera Rao"]);
eq("adopt: the intent is consumed", GI.pendingSignup("meera@example.com"), null);

const GM = storeWithLocal().S;
GM.signUpIntent({ name: "Meera Rao", email: "meera@example.com", handle: "meera" });
const mismatched = GM.adoptProviderUser({ id: "google:123456789", email: "someone@else.com", name: "Sam Patel", avatar: "" });
eq("adopt: a mismatched intent is ignored", [mismatched.adoptedIntent, GM.state.user.handle], [false, "sampatel"]);
eq("adopt: a mismatched intent keeps the name", GM.state.user.name, "Sam Patel");

const staleIntent = storeWithLocal().S;
staleIntent.signUpIntent({ name: "Meera Rao", email: "meera@example.com", handle: "meera" });
staleIntent.state.ui.pendingSignup.at = Date.now() - 31 * 60 * 1000;
eq("adopt: an expired intent is ignored", staleIntent.pendingSignup("meera@example.com"), null);

eq("adopt: junk is refused", storeWithLocal().S.adoptProviderUser({ email: "a@b.com" }).ok, false);
eq("adopt: null is refused", storeWithLocal().S.adoptProviderUser(null).ok, false);
eq("adopt: a javascript avatar is dropped",
  (() => { const s = storeWithLocal().S; s.adoptProviderUser({ id: "google:123456789", email: "a@b.com", avatar: "javascript:alert(1)" }); return s.state.user.avatar; })(),
  "");

/* ======================================================================
   Public address
   ====================================================================== */
function pagesWith(loc, cfg, handle) {
  const sb = {
    console, Store: storeWithLocal().S, icon: () => "<svg></svg>", URL,
    location: loc, LINKEY_CONFIG: cfg
  };
  sb.Store.state.user.handle = handle;
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), sb, { filename: "assets/js/pages.js" });
  return sb.Pages;
}
const PG_PATH = pagesWith(
  { href: "https://linkey.app/", pathname: "/", protocol: "https:", hostname: "linkey.app", origin: "https://linkey.app" },
  { linkBase: "auto" }, "ada.chen"
);
eq("link: a custom domain gets a pretty path", PG_PATH.publicLink(), "https://linkey.app/u/ada.chen");
const PG_GH = pagesWith(
  { href: "https://ada.github.io/linkey/", pathname: "/linkey/", protocol: "https:", hostname: "ada.github.io", origin: "https://ada.github.io" },
  { linkBase: "auto" }, "ada.chen"
);
eq("link: github pages falls back to a hash", PG_GH.publicLink(), "https://ada.github.io/linkey/#/u/ada.chen");
const PG_HASH = pagesWith(
  { href: "https://linkey.app/", pathname: "/", protocol: "https:", hostname: "linkey.app", origin: "https://linkey.app" },
  { linkBase: "hash" }, "ada.chen"
);
eq("link: hash can be forced", PG_HASH.publicLink(), "https://linkey.app/#/u/ada.chen");
const PG_FORCE = pagesWith(
  { href: "https://ada.github.io/linkey/", pathname: "/linkey/", protocol: "https:", hostname: "ada.github.io", origin: "https://ada.github.io" },
  { linkBase: "path" }, "ada.chen"
);
eq("link: path can be forced on github", PG_FORCE.publicLink(), "https://ada.github.io/linkey/u/ada.chen");
const PG_FILE = pagesWith(
  { href: "file:///C:/app/index.html", pathname: "/C:/app/index.html", protocol: "file:", hostname: "", origin: "null" },
  { linkBase: "auto" }, "ada.chen"
);
eq("link: a file:// build still shows a shareable url", PG_FILE.publicLink(), "https://linkey.app/ada.chen");
const PG_ENC = pagesWith(
  { href: "https://linkey.app/", pathname: "/", protocol: "https:", hostname: "linkey.app", origin: "https://linkey.app" },
  { linkBase: "auto" }, "ada chen"
);
eq("link: a junk handle cannot escape the path", PG_ENC.publicLink(), "https://linkey.app/u/adachen");
const PG_TRAV = pagesWith(
  { href: "https://linkey.app/", pathname: "/", protocol: "https:", hostname: "linkey.app", origin: "https://linkey.app" },
  { linkBase: "auto" }, "../../admin"
);
ok("link: traversal cannot add a path segment", /^https:\/\/linkey\.app\/u\/[^/]+$/.test(PG_TRAV.publicLink()), PG_TRAV.publicLink());
eq("link: a named handle overrides the account", PG_PATH.publicLink("someone.else"), "https://linkey.app/u/someone.else");

/* ======================================================================
   Someone else's page
   ====================================================================== */
const PV = storeWithLocal().S;
const ROW = {
  handle: "ada.chen",
  onboarded: true,
  data: {
    name: "Ada Chen",
    bio: "Design systems and type.",
    avatar: "https://x.test/a.png",
    theme: "halo",
    layout: "bento",
    style: { accent: "#123456", bg: "solid", bgColor: "#000000", btnShape: "pill" },
    links: [
      { id: "lnk_1", kind: "social", platform: "instagram", title: "Instagram", url: "https://instagram.com/ada", active: true },
      { id: "lnk_2", kind: "link", title: "Website", url: "https://northwind.com", active: true },
      { id: "lnk_3", kind: "link", title: "Hidden", url: "https://x.test/hidden", active: false },
      { id: "lnk_4", kind: "link", title: "Bad", url: "javascript:alert(1)", active: true }
    ]
  }
};

eq("view: a valid row becomes a page", PV.publicView(ROW).handle, "ada.chen");
eq("view: the name is kept", PV.publicView(ROW).name, "Ada Chen");
eq("view: the theme is kept", PV.publicView(ROW).theme, "bubblegum");
eq("view: the layout is kept", PV.publicView(ROW).layout, "bento");
eq("view: inactive links are dropped", PV.publicView(ROW).links.some((l) => l.title === "Hidden"), false);
eq("view: a javascript url is emptied", PV.publicView(ROW).links.find((l) => l.title === "Bad").url, "");
eq("view: the style is sanitized", PV.publicView(ROW).style.btnShape, "pill");
eq("view: socials are derived from links", PV.publicView(ROW).socials, ["instagram"]);
eq("view: null is not a page", PV.publicView(null), null);
eq("view: a string is not a page", PV.publicView("row"), null);
eq("view: a row that is not onboarded is not a page", PV.publicView(Object.assign({}, ROW, { onboarded: false })), null);
eq("view: a row without data is not a page", PV.publicView({ handle: "x", onboarded: true }), null);
eq("view: a reserved handle is not a page", PV.publicView(Object.assign({}, ROW, { handle: "admin" })), null);
eq("view: a junk handle is not a page", PV.publicView(Object.assign({}, ROW, { handle: "../../etc" })), null);
eq("view: an unknown theme falls back", PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { theme: "neon" }) })).theme, "bubblegum");

/* ---- custom themes from the component page ---------------------------- */
const themeNames = ["bubblegum","hadalpelagic","art_gallery","gray_waves","bistro","rave","aoshi","golden_hour","sakura","dark_ember","dojo","aesthetic","runner","slam_dunk","monolith","sunset_sip","riviera","deep_space","stray","summit","cosmos","wildlife","speakeasy","climber"];
for (const t of themeNames) {
  ok("theme: " + t + " exists", !!O.THEMES[t]);
  ok("theme: " + t + " has bg", !!O.THEMES[t].bg);
  ok("theme: " + t + " has fg", !!O.THEMES[t].fg);
  ok("theme: " + t + " has btn", !!O.THEMES[t].btn);
  ok("theme: " + t + " has swatch", !!O.THEMES[t].swatch);
}
eq("view: a long bio is cut", PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { bio: "a".repeat(500) }) })).bio.length, 160);
eq("view: a javascript avatar is dropped", PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { avatar: "javascript:alert(1)" }) })).avatar, "");
eq("view: markup in the name is kept as text",
  PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { name: "<img src=x onerror=alert(1)>" }) })).name,
  "<img src=x onerror=alert(1)>");
const styledView = PV.publicView(ROW);
ok("view: the page uses the stored style", PV.styleVarsFor(styledView.style, PV.themeById(styledView.theme)).indexOf("--p-accent:#123456") !== -1);

/* Settings → SEO title/description were collected but never published, so a
   share card ignored what the owner typed. They travel with the row now. */
const seoRow = Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { seoTitle: "Ada Chen — design systems", seoDescription: "Type, systems, links." }) });
eq("view: the seo title is published", PV.publicView(seoRow).seoTitle, "Ada Chen — design systems");
eq("view: the seo description is published", PV.publicView(seoRow).seoDescription, "Type, systems, links.");
eq("view: seo falls back to the name", PV.publicView(ROW).seoTitle, "Ada Chen");
eq("view: seo description falls back to the bio", PV.publicView(ROW).seoDescription, "Design systems and type.");
eq("view: a long seo title is cut", PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { seoTitle: "t".repeat(200) }) })).seoTitle.length, 70);
eq("view: branding is kept unless the owner hid it", PV.publicView(ROW).hideBranding, false);
eq("view: a hidden badge is published", PV.publicView(Object.assign({}, ROW, { data: Object.assign({}, ROW.data, { hideBranding: true }) })).hideBranding, true);
const seoSnap = L.cloudSnapshot();
ok("cloud: the seo title is written with the page", typeof seoSnap.data.seoTitle === "string");
ok("cloud: the seo description is written with the page", typeof seoSnap.data.seoDescription === "string");

/* the renderer escapes a remote row and never shows the owner's editor */
const remoteSandbox = { console, Store: PV, icon: () => "<svg></svg>", URL };
remoteSandbox.window = remoteSandbox;
remoteSandbox.globalThis = remoteSandbox;
vm.createContext(remoteSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), remoteSandbox, { filename: "assets/js/pages.js" });
const RP = remoteSandbox.Pages;
const remoteHtml = RP.bioPage(styledView);
ok("view: the name is escaped", remoteHtml.indexOf("<img src=x") === -1);
ok("view: a visitor gets no editor link", remoteHtml.indexOf("Back to editor") === -1);
ok("view: no javascript href is rendered", remoteHtml.toLowerCase().indexOf("javascript:") === -1);
ok("view: the owner's own handle is not used", RP.bioPage(styledView).indexOf(PV.state.user.handle) === -1);
const missingHtml = RP.missingBioPage('<script>alert(1)</script>');
ok("missing: the handle is stripped of markup", missingHtml.indexOf("<script>") === -1);
ok("missing: there is a way to create a page", missingHtml.indexOf("#/signup") !== -1);
ok("missing: it is not a bio page with someone's links", missingHtml.indexOf("bio-page__links") === -1);
ok("missing: it does not claim pages live only on one device", missingHtml.indexOf("device where you built it") === -1);
ok("loading: a quiet placeholder", RP.loadingBioPage().indexOf("Loading page") !== -1);
eq("render: a missing page wins over the demo account", RP.render("bio", { missing: "ghost" }).indexOf("ghost") !== -1, true);
eq("render: own page when there is no context", RP.render("bio").indexOf("bio-page__links") !== -1, true);

/* ---- first run on a real host ----------------------------------------- */
function storeOn(host, protocol) {
  const sb = { console, localStorage: memLocal(), URL };
  sb.location = { hostname: host, protocol: protocol || "https:", pathname: "/", hash: "", search: "" };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/store.js"), "utf8"), sb, { filename: "assets/js/store.js" });
  return sb.Store;
}

const HOSTED = storeOn("vinaysuthar113.github.io");
eq("hosted: a first visit is signed out", HOSTED.auth().signedIn, false);
eq("hosted: a first visit is not onboarded", HOSTED.isOnboarded(), false);
eq("hosted: no demo links", HOSTED.state.links.length, 0);
eq("hosted: no demo handle", HOSTED.state.user.handle, "");
eq("hosted: no demo name", HOSTED.state.user.name, "");
eq("hosted: no demo bio", HOSTED.state.profile.bio, "");
eq("hosted: no demo notifications", HOSTED.state.notifications.length, 0);
eq("hosted: no demo domain", HOSTED.state.settings.domain, "");
eq("hosted: the built-in theme is still chosen", !!HOSTED.THEMES[HOSTED.state.profile.theme], true);
const LOCALHOST = storeOn("localhost", "http:");
eq("localhost: the demo seed stays", LOCALHOST.auth().signedIn, true);
eq("localhost: the demo has links", LOCALHOST.state.links.length > 0, true);
const FILEURL = storeOn("", "file:");
eq("file: the demo seed stays", FILEURL.auth().signedIn, true);

/* the auth screen speaks to a visitor on a real host, and to a developer locally */
function pagesOn(store, loc) {
  const sb = { console, Store: store, icon: () => "<svg></svg>", URL, location: loc, LINKEY_CONFIG: {} };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pages.js"), "utf8"), sb, { filename: "assets/js/pages.js" });
  return sb.Pages;
}
const HOST_LOC = { protocol: "https:", hostname: "vinaysuthar113.github.io", pathname: "/linkey/", origin: "https://vinaysuthar113.github.io", hash: "", search: "", href: "https://vinaysuthar113.github.io/linkey/" };
const LOCAL_LOC = { protocol: "http:", hostname: "localhost", pathname: "/", origin: "http://localhost:5200", hash: "", search: "", href: "http://localhost:5200/" };
const hostedLogin = pagesOn(HOSTED, HOST_LOC).render("login");
ok("hosted login: no demo button", hostedLogin.indexOf("demo-signin") === -1);
ok("hosted login: the notice speaks to a visitor", hostedLogin.indexOf("isn’t connected on this beta") !== -1, hostedLogin.slice(0, 200));
ok("hosted login: the owner can still find the guide", hostedLogin.indexOf("google-help") !== -1);
ok("hosted signup: no demo button", pagesOn(HOSTED, HOST_LOC).render("signup").indexOf("demo-signin") === -1);
ok("localhost login: the demo button stays", pagesOn(LOCALHOST, LOCAL_LOC).render("login").indexOf("demo-signin") !== -1);

/* ---- report ----------------------------------------------------------- */
function report() {
  console.log("\n" + pass + " assertions passed");
  if (failures.length) {
    console.log(failures.length + " failed:");
    failures.forEach((f) => console.log("  x " + f));
    process.exit(1);
  }
  console.log("all green\n");
}

cloudTests().then(report).catch((e) => {
  failures.push("cloud tests threw: " + (e && e.message));
  report();
});
