/* Linkey — router, interactions, modals */
(function () {
  const S = window.Store;
  const P = window.Pages;
  const icon = window.icon;
  const Cloud = window.Cloud;
  const app = document.getElementById("app");
  const overlay = document.getElementById("overlay-root");
  const toastRoot = document.getElementById("toast-root");

  let lastRoute = null;

  /* ---------------- public link ---------------- */
  // Works both as /u/<handle> (server rewrite) and #/u/<handle> (hash fallback).
  function pathHandle() {
    const m = location.pathname.match(/\/u\/([^/?#]+)\/?$/i);
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }
  function publicLink() {
    return P.publicLink();
  }
  function setMeta(attr, key, value) {
    let el = document.head.querySelector("meta[" + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value || "");
  }
  function applyBioMeta(ctx, handle) {
    if (ctx && ctx.missing) {
      document.title = "Page not found — Linkey";
      setMeta("name", "description", "This Linkey page isn’t available here.");
      setMeta("property", "og:title", "Page not found — Linkey");
      setMeta("property", "og:description", "This Linkey page isn’t available here.");
      setMeta("property", "og:url", P.publicLink(ctx.missing));
      return;
    }
    if (ctx && ctx.loading) { document.title = "Linkey"; return; }
    const view = ctx && ctx.view;
    const u = view ? { name: view.name, avatar: view.avatar } : S.state.user;
    const p = view ? { title: view.name, bio: view.bio } : S.state.profile;
    const settings = view ? { seoTitle: view.seoTitle, seoDescription: view.seoDescription } : S.state.settings;
    // Settings → SEO title/description win when they are filled in; the
    // name and bio are the fallback so a share card is never blank.
    const seoTitle = String((settings && settings.seoTitle) || "").trim() || p.title;
    const seoDesc = String((settings && settings.seoDescription) || "").trim() || p.bio;
    const url = P.publicLink(handle || (view ? view.handle : ""));
    document.title = seoTitle + " — Linkey";
    setMeta("name", "description", seoDesc);
    setMeta("property", "og:type", "profile");
    setMeta("property", "og:title", seoTitle);
    setMeta("property", "og:description", seoDesc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", "Linkey");
    if (u.avatar) setMeta("property", "og:image", u.avatar);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", seoTitle);
    setMeta("name", "twitter:description", seoDesc);
  }

  /* ---------------- routing ---------------- */
  const AUTH_ROUTES = { login: 1, signup: 1, forgot: 1 };
  function parseHash() {
    const h = (location.hash || "").replace(/^#\/?/, "");
    if (h && h.indexOf("u/") !== 0) return { route: h.split("?")[0] };
    const ph = pathHandle();
    if (ph) return { route: "bio", handle: ph };
    if (h.indexOf("u/") === 0) return { route: "bio", handle: safeHandle(h.slice(2)) };
    return { route: "links" };
  }
  function navigate(route) {
    if (("#/" + route) === location.hash) return;
    location.hash = "#/" + route;
  }

  /* ---------------- someone else's page ---------------- */
  // A handle that is not this device's account is looked up in the cloud.
  // With no backend (the default beta build) there is nothing to read, so
  // the visitor gets an honest empty state instead of the wrong page.
  const BIO_TTL = 60 * 1000;
  const bioCache = Object.create(null);
  const bioPending = Object.create(null);

  function safeHandle(raw) {
    const v = String(raw || "").split(/[?#]/)[0];
    try { return decodeURIComponent(v); } catch (e) { return v; }
  }

  function bioContext(handle) {
    const want = safeHandle(handle).trim().toLowerCase();
    const own = String(S.state.user.handle || "").trim().toLowerCase();
    if (!want || want === own) return null;
    const hit = bioCache[want];
    if (hit && Date.now() - hit.at < BIO_TTL) {
      return hit.view ? { view: hit.view, handle: want } : { missing: want };
    }
    const cloud = Cloud;
    if (cloud && cloud.loadPublicPage && !bioPending[want]) {
      bioPending[want] = true;
      Promise.resolve()
        .then(() => cloud.loadPublicPage(want))
        .then((row) => { bioCache[want] = { at: Date.now(), view: S.publicView(row) }; })
        .catch(() => { bioCache[want] = { at: Date.now(), view: null }; })
        .then(() => {
          delete bioPending[want];
          if (parseHash().route === "bio") refresh();
        });
    }
    return { loading: true };
  }

  /**
   * guard - one place that decides whether a route may render.
   * Returns the route to render instead, or "" to carry on.
   *
   * The public page (/u/<handle>) is never gated, so a shared link
   * keeps working after the owner signs out.
   */
  function guard(route) {
    if (route === "bio") return "";
    const inApp = S.isSignedIn();
    if (!inApp) return AUTH_ROUTES[route] ? "" : "login";
    if (AUTH_ROUTES[route]) return S.isOnboarded() ? "links" : "setup";
    if (route === "welcome") return S.isOnboarded() ? "" : "setup";
    if (!S.isOnboarded() && route !== "setup") return "setup";
    if (S.isOnboarded() && route === "setup") return "links";
    return "";
  }
  function syncPublicField() {
    const el = document.getElementById("f-public-link");
    if (el) el.value = publicLink();
  }
  /* Routes that draw their own full-bleed layout instead of the app shell. */
  const BARE = { bio: 1, login: 1, signup: 1, forgot: 1, setup: 1, welcome: 1 };

  function renderApp() {
    const parsed = parseHash();
    const route = parsed.route;
    const to = guard(route);
    if (to) {
      // replace, not push: a guarded bounce should not fill the back stack.
      const next = "#/" + to;
      if (location.hash !== next) location.replace(location.pathname + location.search + next);
      return;
    }
    const ctx = route === "bio" ? bioContext(parsed.handle) : null;
    const scroller = document.getElementById("scroller");
    const keep = lastRoute === route && scroller ? scroller.scrollTop : 0;
    app.className = BARE[route] ? "" : "app-root";
    app.innerHTML = P.render(route, ctx);
    const next = document.getElementById("scroller");
    if (next) next.scrollTop = keep;
    lastRoute = route;
    syncPublicField();
    paintFormHints();
    if (route === "bio") applyBioMeta(ctx, parsed.handle);
    else document.title = "Linkey — " + (P.ROUTES[route] || {}).title;
  }

  function refresh() {
    const parsed = parseHash();
    const route = parsed.route;
    const to = guard(route);
    if (to) { renderApp(); return; }
    const ctx = route === "bio" ? bioContext(parsed.handle) : null;
    const scroller = document.getElementById("scroller");
    const top = scroller ? scroller.scrollTop : 0;
    app.className = BARE[route] ? "" : "app-root";
    app.innerHTML = P.render(route, ctx);
    const next = document.getElementById("scroller");
    if (next) next.scrollTop = top;
    syncPublicField();
    paintFormHints();
    if (route === "bio") applyBioMeta(ctx, parsed.handle);
  }

  /* Paint the state of a freshly rendered form: handle availability and the
     bio counter. Without this the hint only appears after the first keystroke,
     which reads like an empty field even when it is pre-filled. */
  function paintFormHints() {
    document.querySelectorAll("[data-handle-input]").forEach((input) => paintHandleHint(input));
    document.querySelectorAll('[data-setup-form] [name="bio"]').forEach((area) => {
      const count = area.form && area.form.querySelector("[data-bio-count]");
      if (count) count.textContent = area.value.length + " / 160";
    });
  }

  function updatePreview() {
    document.querySelectorAll(".phone").forEach((el) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = P.phoneMarkup();
      el.replaceWith(wrap.firstElementChild);
    });
  }

  /* ---------------- toast ---------------- */
  function toast(msg, opts) {
    opts = opts || {};
    const el = document.createElement("div");
    el.className = "toast" + (opts.accent ? " toast--accent" : "");
    el.innerHTML = (opts.icon ? icon(opts.icon, 14) : "") + "<span>" + S.esc(msg) + "</span>";
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .2s, transform .2s";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 220);
    }, 2200);
  }

  /* ---------------- clipboard ---------------- */
  function copy(text, label) {
    const done = () => toast(label || "Copied to clipboard", { icon: "check" });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
    done();
  }

  /* ---------------- modal ---------------- */
  function openModal(cfg) {
    overlay.innerHTML =
      '<div class="overlay" data-overlay>' +
        '<div class="modal' + (cfg.wide ? " modal--wide" : "") + '" role="dialog" aria-modal="true" aria-label="' + S.esc(cfg.title) + '">' +
          '<div class="modal__head"><div class="modal__title">' + S.esc(cfg.title) + "</div>" +
            '<button class="icon-btn" data-action="close-modal" aria-label="Close">' + icon("x", 18) + "</button></div>" +
          '<div class="modal__body">' + cfg.body + "</div>" +
          (cfg.foot ? '<div class="modal__foot">' + cfg.foot + "</div>" : "") +
        "</div>" +
      "</div>";
    const first = overlay.querySelector("input,textarea,select");
    if (first) first.focus();
  }
  function closeModal() { overlay.innerHTML = ""; }
  function closeDropdown() {
    document.querySelectorAll("[data-dropdown]").forEach((el) => el.remove());
  }
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

  /**
   * googleHelp - what to do when Google sign-in has no client id.
   *
   * The old build quietly created a local account and toasted "Signed in
   * with Google (demo)", which looks identical to success. This modal
   * replaces that: it states exactly what is missing, and leaves the demo
   * as an explicit choice.
   */
  function googleHelp() {
    const origin = location.protocol === "file:" ? "http://localhost:5200" : location.origin;
    openModal({
      title: "Turn on Google sign-in",
      wide: true,
      body:
        '<p class="muted small" style="margin-top:0">One-time setup — no server, no secret key, no cost. ' +
          "The Google button signs people in with their real Google account once this is done.</p>" +
        '<ol class="help-steps">' +
          "<li>Open Google Cloud Console → <b>Credentials</b> and create an OAuth client id of type <b>Web application</b> " +
            '(<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">open it</a>).</li>' +
          "<li>Under <b>Authorised JavaScript origins</b> add <code>" + S.esc(origin) + "</code>.</li>" +
          "<li>Copy the client id (ends in <code>.apps.googleusercontent.com</code>) into " +
            "<code>googleClientId</code> in <code>assets/js/config.js</code>.</li>" +
          "<li>Reload the page. “Continue with Google” now opens Google’s account chooser.</li>" +
        "</ol>" +
        '<p class="muted small">Prefer cloud sync and email links too? Connect Supabase as well — see <code>BACKEND.md</code> §2b.</p>',
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Close</button>' +
            '<button class="btn btn--dark btn--sm" data-action="demo-signin">Explore the demo instead</button>'
    });
  }


  /* ---------------- actions ---------------- */

  /**
   * saveIdentity - change the public username with the same checks as signup.
   *
   * The username is the public URL, so a typo is expensive: it must be
   * normalised, must not be reserved or malformed, and must not already be
   * published by another account. Returns "" when saved, otherwise the
   * sentence to show the owner.
   */
  async function saveIdentity(rawHandle, patch) {
    const next = S.normalizeHandle(rawHandle);
    if (!next) return "Pick a username.";
    const issue = S.handleIssue(next, S.state.user.handle);
    if (issue) return issue;

    const a = S.auth();
    if (next !== S.state.user.handle && a.cloud && Cloud && Cloud.isConfigured() && Cloud.handleTaken) {
      let check = null;
      try { check = await Cloud.handleTaken(next); } catch (e) { check = null; }
      // A failed check is not proof the handle is free, but refusing to save
      // because the network blinked would trap the owner. The write itself is
      // still guarded by pages_handle_key.
      if (check && check.ok && check.taken) return "That username is taken. Try another.";
    }
    S.updateUser(Object.assign({}, patch, { handle: next }));
    return "";
  }

  /**
   * productModal - one form for creating and editing a shop draft.
   * `p` is the product being edited, or null for a new one.
   */
  function productModal(p) {
    const editing = !!p;
    const types = ["Digital", "Course", "Physical"];
    openModal({
      title: editing ? "Edit product" : "New product",
      body: '<div class="field"><label>Name</label><input class="input" id="f-product-name" placeholder="Product name" maxlength="80" value="' + S.esc(editing ? p.name : "") + '"></div>' +
            '<div class="form-row"><div class="field"><label>Price (USD)</label><input class="input" id="f-product-price" type="number" min="0" step="1" value="' + (editing ? (Number(p.price) || 0) : 24) + '"></div>' +
            '<div class="field"><label>Type</label><select class="select" id="f-product-type">' +
              types.map((t) => "<option" + (editing && p.type === t ? " selected" : "") + ">" + t + "</option>").join("") +
            "</select></div></div>",
      foot: (editing
          ? '<button class="btn btn--danger btn--sm" data-action="delete-product" data-id="' + p.id + '">' + icon("trash", 14) + " Delete</button>"
          : "") +
        "<span style=\"flex:1\"></span>" +
        '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn--dark btn--sm" data-action="submit-product"' + (editing ? ' data-id="' + p.id + '"' : "") + ">" +
        (editing ? "Save" : "Create") + "</button>"
    });
  }

  /**
   * downloadCsv - save rows as a real CSV file in the browser.
   * `rows` is an array of arrays; the first is the header.
   */
  function downloadCsv(filename, rows) {
    const csv = rows.map((r) => r.map((x) => '"' + String(x == null ? "" : x).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const ACTIONS = {
    "close-modal": closeModal,
    "account-menu": (el) => {
      const u = S.state.user;
      const r = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 268));
      const top = Math.min(r.bottom + 6, window.innerHeight - 360);
      closeDropdown();
      const wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="dropdown" data-dropdown style="top:' + top + 'px;left:' + left + 'px">' +
          '<div class="dropdown__head">' +
            '<span class="account__avatar" style="width:30px;height:30px"></span>' +
            "<div><div class=\"dropdown__name\">" + S.esc(u.handle) + "</div>" +
            '<div class="dropdown__mail">' + S.esc(u.email) + "</div></div>" +
          "</div>" +
          '<button class="nav__item" data-action="create-account">' + icon("plus", 15) + "<span>Create new account</span></button>" +
          '<button class="nav__item" data-route="profile">' + icon("user", 15) + "<span>Account</span></button>" +
          '<button class="nav__item" data-route="notifications">' + icon("bell", 15) + "<span>Notifications</span></button>" +
          '<button class="nav__item" data-action="toast" data-msg="Ask a question — demo">' + icon("message", 15) + "<span>Ask a question</span></button>" +
          '<button class="nav__item" data-action="toast" data-msg="Share feedback — demo">' + icon("sparkles", 15) + "<span>Share feedback</span></button>" +
          '<button class="nav__item" data-action="help">' + icon("help", 15) + "<span>Help topics</span></button>" +
          '<div class="hr" style="margin:6px 8px"></div>' +
          '<button class="nav__item" data-action="logout" style="color:var(--red)">' + icon("logout", 15) + "<span>Log out</span></button>" +
        "</div>";
      document.body.appendChild(wrap.firstElementChild);
    },

    "add-link": () => { window.AddPop.open(); },
    "submit-add-link": () => {
      const title = val("f-link-title") || "Untitled link";
      const url = val("f-link-url");
      const kind = val("f-link-kind") || "link";
      if (!url) { toast("Add a URL first", { icon: "alert" }); return; }
      S.addLink({ title, url, kind });
      closeModal();
      refresh();
      toast("Link added", { icon: "check", accent: true });
    },

    "edit-link": (el) => {
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      const kind = S.LINK_TYPES[l.kind] ? l.kind : "link";
      const isBlock = kind === "text" || kind === "header";
      openModal({
        title: "Edit " + (S.LINK_TYPES[kind] || S.LINK_TYPES.link).name.toLowerCase(),
        body:
          '<div class="field"><label>' + (isBlock ? "Text" : "Title") + "</label>" +
            (isBlock
              ? '<textarea class="textarea" id="f-edit-title" rows="3" maxlength="160">' + S.esc(l.title) + "</textarea>"
              : '<input class="input" id="f-edit-title" value="' + S.esc(l.title) + '" maxlength="48">') +
          "</div>" +
          (isBlock
            ? ""
            : '<div class="field"><label>URL</label><input class="input" id="f-edit-url" inputmode="url" value="' + S.esc(l.url) + '"></div>') +
          (kind === "product"
            ? '<div class="field"><label>Price (USD)</label><input class="input" id="f-edit-price" type="number" min="0" step="0.01" value="' +
              S.esc(l.price != null ? l.price : "") + '"></div>'
            : "") +
          (kind === "event"
            ? '<div class="field"><label>Date</label><input class="input" id="f-edit-date" type="date" value="' + S.esc(l.date || "") + '"></div>'
            : "") +
          '<div class="field"><label>' + (kind === "product" ? "Short note" : kind === "event" ? "Location or note" : "Second line") +
            '</label><input class="input" id="f-edit-note" maxlength="90" placeholder="' +
            (kind === "form" ? "Subscribe" : kind === "video" ? "Watch on YouTube" : "Optional") + '" value="' + S.esc(l.note || "") + '"></div>' +
          '<div class="switch-row"><div><div class="switch-row__title">Visible on my page</div><div class="switch-row__sub">Turn off to hide without deleting.</div></div>' +
            '<button class="switch" role="switch" aria-checked="' + (l.active ? "true" : "false") + '" data-action="toggle-link" data-id="' + l.id + '"></button></div>',
        foot: '<button class="btn btn--danger btn--sm" data-action="delete-link" data-id="' + l.id + '">' + icon("trash", 14) + " Delete</button>" +
              '<span style="flex:1"></span>' +
              '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
              '<button class="btn btn--dark btn--sm" data-action="submit-edit-link" data-id="' + l.id + '">Save</button>'
      });
    },
    "submit-edit-link": (el) => {
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      const kind = S.LINK_TYPES[l.kind] ? l.kind : "link";
      const isBlock = kind === "text" || kind === "header";
      const patch = { title: val("f-edit-title") || "Untitled link" };
      if (patch.title.length > 160) patch.title = patch.title.slice(0, 160);

      if (!isBlock) {
        const raw = val("f-edit-url");
        const safe = S.safeUrl(raw);
        if (raw && safe === "#") { toast("Only http, https, mailto or tel links are allowed", { icon: "alert" }); return; }
        patch.url = raw ? safe : "";
      }
      const note = val("f-edit-note").trim().slice(0, 90);
      patch.note = note || "";
      if (kind === "product") {
        const rawPrice = val("f-edit-price");
        if (rawPrice !== "") {
          const n = Number(rawPrice);
          if (!isFinite(n) || n < 0) { toast("Enter a price of 0 or more", { icon: "alert" }); return; }
          patch.price = Math.round(n * 100) / 100;
        } else {
          patch.price = null;
        }
      }
      if (kind === "event") {
        const d = val("f-edit-date");
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast("Pick a valid date", { icon: "alert" }); return; }
        patch.date = d;
      }
      S.updateLink(el.dataset.id, patch);
      closeModal(); refresh(); toast("Saved", { icon: "check" });
    },
    "delete-link": (el) => {
      // Deleting is permanent and there is no server copy of a link, so a
      // stray tap must not be enough. Hiding stays the one-tap option.
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      openModal({
        title: "Delete this link?",
        body: '<p class="muted" style="margin:0 0 6px">“' + S.esc(l.title) + '” will be removed from your page for good. This cannot be undone.</p>' +
          '<p class="muted small" style="margin:0">Only want it off the page for now? Use “Visible on my page” instead — hidden links wait in the archive.</p>',
        foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Keep it</button>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn--danger btn--sm" data-action="confirm-delete-link" data-id="' + l.id + '">' + icon("trash", 14) + " Delete</button>"
      });
    },
    "confirm-delete-link": (el) => {
      S.deleteLink(el.dataset.id);
      closeModal(); refresh(); toast("Link deleted", { icon: "trash" });
    },
    "toggle-link": (el) => {
      const id = el.dataset.id;
      S.toggleLink(id);
      const l = S.state.links.find((x) => x.id === id);
      if (!l) return;
      const card = el.closest(".link-card");
      if (card) {
        card.classList.toggle("link-card--off", !l.active);
        const sw = card.querySelector(".switch");
        if (sw) sw.setAttribute("aria-checked", String(l.active));
      }
      updatePreview();
      toast(l.active ? "Link enabled" : "Link hidden", { icon: "check" });
    },
    "move-link": (el) => { S.moveLink(el.dataset.id, Number(el.dataset.dir)); refresh(); },
    "copy-link": (el) => {
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      const safe = S.safeUrl(l.url);
      if (safe === "#") { toast("This link has no valid URL yet", { icon: "alert" }); return; }
      copy(safe, "Link copied");
    },
    "link-stats": (el) => {
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      const series = [12, 18, 15, 24, 21, 30, 27, 34, 31, 40];
      openModal({
        title: l.title,
        body:
          '<div class="grid grid--3">' +
            '<div class="stat" style="padding:12px"><div class="stat__label">Views</div><div class="stat__value" style="font-size:20px">' + S.fmtNum(l.views || 0) + "</div></div>" +
            '<div class="stat" style="padding:12px"><div class="stat__label">Clicks</div><div class="stat__value" style="font-size:20px">' + S.fmtNum(l.clicks || 0) + "</div></div>" +
            '<div class="stat" style="padding:12px"><div class="stat__label">CTR</div><div class="stat__value" style="font-size:20px">' + (l.views ? ((l.clicks / l.views) * 100).toFixed(0) : 0) + "%</div></div>" +
          "</div>" +
          '<div class="card" style="padding:12px">' + '<div class="card__title" style="margin-bottom:8px">Last 10 days</div>' + lineChartInline(series) + "</div>" +
          '<div class="muted small">' + S.esc(l.url || "No URL") + "</div>"
      });
    },
    "connect-instagram": () => {
      const l = S.state.links.find((x) => x.kind === "social" && x.platform === "instagram");
      const handle = ((l && l.url) || "").split("/").filter(Boolean).pop() || S.state.user.handle;
      openModal({
        title: "Connect Instagram",
        body:
          '<div class="field"><label>Instagram handle</label><input class="input" id="f-ig-handle" placeholder="username_01" value="' + S.esc(handle) + '"></div>' +
          '<p class="muted small" style="margin:0">Connecting pulls your latest posts into a visual grid at the top of your page.</p>',
        foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
              '<button class="btn btn--dark btn--sm" data-action="submit-instagram">Connect</button>'
      });
    },
    "submit-instagram": () => {
      const handle = (val("f-ig-handle") || "").replace(/^@/, "").replace(/\s+/g, "");
      if (!handle) { toast("Add your handle first", { icon: "alert" }); return; }
      const url = "https://www.instagram.com/" + handle;
      let l = S.state.links.find((x) => x.kind === "social" && x.platform === "instagram");
      if (l) S.updateLink(l.id, { url, note: null });
      else S.addLink({ kind: "social", platform: "instagram", title: "Instagram", url });
      if (S.state.profile.socials.indexOf("instagram") < 0) { S.state.profile.socials.push("instagram"); S.commit(); }
      closeModal(); refresh();
      toast("Instagram connected", { icon: "instagram", accent: true });
    },
    "add-social": () => {
      openModal({
        title: "Social icons",
        body:
          '<p class="muted small" style="margin:0">Choose which icons appear under your name.</p>' +
          '<div class="row" style="flex-wrap:wrap;gap:8px">' +
            Object.keys(S.SOCIAL_PLATFORMS).map((p) => {
              const on = S.state.profile.socials.indexOf(p) >= 0;
              return '<button class="btn btn--sm ' + (on ? "btn--dark" : "btn--ghost") + '" data-action="toggle-social" data-platform="' + p + '">' +
                icon(S.SOCIAL_PLATFORMS[p].icon, 14) + S.esc(S.SOCIAL_PLATFORMS[p].name) + "</button>";
            }).join("") +
          "</div>"
      });
    },
    "link-type": (el) => {
      const l = S.state.links.find((x) => x.id === el.dataset.id);
      if (!l) return;
      openModal({
        title: "Link type",
        body: '<div class="row" style="flex-wrap:wrap;gap:8px">' +
          Object.keys(S.LINK_TYPES).map((k) => {
            const on = l.kind === k;
            return '<button class="btn btn--sm ' + (on ? "btn--dark" : "btn--ghost") + '" data-action="set-link-kind" data-id="' + l.id + '" data-kind="' + k + '">' +
              icon(S.LINK_TYPES[k].icon, 14) + S.esc(S.LINK_TYPES[k].name) + "</button>";
          }).join("") + "</div>"
      });
    },
    "set-link-kind": (el) => {
      S.updateLink(el.dataset.id, { kind: el.dataset.kind, platform: el.dataset.kind === "social" ? "instagram" : null });
      closeModal(); refresh(); toast("Link type updated", { icon: "check" });
    },

    "add-collection": () => {
      openModal({
        title: "New collection",
        body: '<div class="field"><label>Collection name</label><input class="input" id="f-collection" placeholder="e.g. Launches"></div>' +
              '<p class="muted small" style="margin:0">Collections group links under a heading on your page.</p>',
        foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
              '<button class="btn btn--dark btn--sm" data-action="submit-collection">Create</button>'
      });
    },
    "submit-collection": () => {
      const name = val("f-collection");
      if (!name) { toast("Name it first", { icon: "alert" }); return; }
      S.state.collections.push({ id: S.uid("col"), name, count: 0 });
      S.commit(); closeModal(); toast("Collection created", { icon: "folder" });
    },
    "view-archive": () => {
      const off = S.state.links.filter((l) => !l.active);
      openModal({
        title: "Archive",
        body: off.length
          ? off.map((l) => '<div class="row row--between" style="padding:10px 0;border-bottom:1px solid var(--line)"><div><div class="table__title">' + S.esc(l.title) + '</div><div class="muted small">' + S.esc(l.url) + "</div></div>" +
              '<button class="btn btn--ghost btn--sm" data-action="restore-link" data-id="' + l.id + '">Restore</button></div>').join("")
          : '<div class="empty">' + icon("archive", 20) + "<h3>Nothing archived</h3><p>Hidden links show up here.</p></div>"
      });
    },
    "restore-link": (el) => { S.updateLink(el.dataset.id, { active: true }); closeModal(); refresh(); toast("Restored", { icon: "check" }); },
    "view-mode": (el) => { S.updateSettings({ viewMode: el.dataset.mode }); refresh(); },
    "set-layout": (el) => {
      S.setLayout(el.dataset.layout);
      const meta = S.LAYOUTS.find((l) => l.id === el.dataset.layout);
      refresh();
      toast((meta ? meta.name : "Layout") + " applied", { icon: "grid" });
    },
    "cycle-span": (el) => {
      const span = S.cycleSpan(el.dataset.id);
      refresh();
      toast(span === "auto" ? "Tile size: auto" : "Tile size " + span.replace("x", " × "), { icon: "grid" });
    },
    "set-theme": (el) => { S.setTheme(el.dataset.theme); refresh(); toast(S.theme().name + " applied", { icon: "palette" }); },
    "set-style": (el) => {
      const key = el.dataset.key;
      const value = el.dataset.value;
      const numeric = key === "size" || key === "weight" || key === "overlay";
      const patch = {};
      patch[key] = numeric ? Number(value) : value;
      S.setStyle(patch);
      refresh();
    },
    "set-bg-gradient": (el) => {
      S.setStyle({ bg: "gradient", gradient: el.dataset.value });
      refresh();
    },
    "reset-style": () => {
      S.resetStyle();
      refresh();
      toast("Style reset to the theme", { icon: "arrowLeft" });
    },
    "save-seo": () => {
      const title = val("f-seo-title").slice(0, 70);
      const desc = val("f-seo-desc").slice(0, 160);
      if (title.length < 2) return toast("Add a page title", { icon: "alert" });
      S.updateSettings({ seoTitle: title, seoDescription: desc });
      refresh();
      toast("Search info saved", { icon: "check" });
    },
    "toggle-social": (el) => {
      const p = el.dataset.platform;
      const arr = S.state.profile.socials;
      const i = arr.indexOf(p);
      if (i >= 0) arr.splice(i, 1); else arr.push(p);
      S.commit(); refresh();
      const now = S.state.profile.socials.indexOf(p) >= 0;
      el.classList.toggle("btn--dark", now);
      el.classList.toggle("btn--ghost", !now);
    },
    "save-profile": async () => {
      const handleField = val("f-profile-handle");
      if (handleField) {
        const err = await saveIdentity(handleField, {});
        if (err) return toast(err, { icon: "alert" });
      }
      S.updateProfile({ title: val("f-profile-title") || S.state.user.name, bio: val("f-profile-bio") });
      refresh(); toast("Profile saved", { icon: "check" });
    },
    "save-user": async () => {
      const name = String(val("f-user-name") || "").replace(/\s+/g, " ").trim();
      if (name.length < 2) return toast("Add your name", { icon: "alert" });
      const a = S.auth();
      // A Google account's address belongs to Google, not to this form, so
      // it is shown read-only and never overwritten by typing.
      const email = a.cloud ? (a.email || S.state.user.email) : String(val("f-user-email") || "").trim();
      const err = await saveIdentity(val("f-user-handle"), { name: name, email: email, tagline: val("f-user-tagline") });
      if (err) return toast(err, { icon: "alert" });
      refresh(); toast("Details saved", { icon: "check" });
    },
    "save-settings": () => {
      // The page's address is derived from the username, not typed here, and
      // custom domains are not live yet, so only the search copy is saved.
      const title = val("f-setting-seotitle").slice(0, 70);
      const desc = val("f-setting-seodesc").slice(0, 160);
      if (title.length < 2) return toast("Add a page title", { icon: "alert" });
      S.updateSettings({ seoTitle: title, seoDescription: desc });
      refresh();
      toast("Settings saved", { icon: "check" });
    },
    "toggle-setting": (el) => {
      const k = el.dataset.key;
      const next = !S.state.settings[k];
      S.updateSettings({ [k]: next });
      el.setAttribute("aria-checked", String(next));
      toast((P.ROUTES[parseHash().route] || {}).title + " updated", { icon: "check" });
    },
    "copy-public": () => copy(publicLink(), "Public link copied"),
    "open-bio": () => { location.hash = "#/u/" + S.state.user.handle; },
    "growth-tools": () => {
      const tools = [
        ["planner", "Social planner", "Draft posts into your week"],
        ["autoreply", "Auto reply", "Save reply rules for later"],
        ["shortener", "Link shortener", "Keep a list of short links"],
        ["ideas", "Post ideas", "A starter library of prompts"]
      ];
      openModal({
        title: "Growth tools",
        body: '<div style="display:flex;flex-direction:column;gap:6px;margin:-6px -8px">' + tools.map((t) =>
          '<button class="nav__item" data-route="' + t[0] + '" data-close="1">' + icon("sparkles", 15) +
          "<span><b>" + t[1] + "</b><br><span class=\"muted small\">" + t[2] + "</span></span></button>").join("") + "</div>"
      });
    },
    help: () => openModal({
      title: "Help & support",
      body: '<p class="muted small" style="margin:0">Linkey is in beta. Links, themes and settings are saved to your account, and to this browser so the editor opens fast.</p>' +
            '<div class="card" style="padding:12px"><div class="table__title">Quick tips</div><ul class="muted small" style="margin:8px 0 0;padding-left:18px">' +
            "<li>Click <b>Add</b> to create a link — it appears in the phone preview instantly.</li>" +
            "<li>Drag a card, or use the up/down arrows, to reorder.</li>" +
            "<li>The toggle hides a link without deleting it.</li>" +
            "<li><b>Customize</b> swaps themes live.</li></ul></div>"
    }),
    logout: async () => {
      closeModal();
      if (Cloud) await Cloud.signOut();
      S.signOut();
      navigate("login");
      toast("Signed out", { icon: "logout" });
    },
    "create-account": () => openModal({
      title: "Create a new account?",
      body: '<p class="muted small" style="margin:0">This signs you out. If you finish signing up, the new account starts empty and replaces the data stored on this device. Signing back in before that keeps everything as it is.</p>',
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn--dark btn--sm" data-action="confirm-create-account">Sign out &amp; continue</button>'
    }),
    "confirm-create-account": async () => {
      closeModal();
      if (Cloud) await Cloud.signOut();
      S.signOut();
      navigate("signup");
    },
    "sign-out": async () => {
      if (Cloud) await Cloud.signOut();
      S.signOut();
      navigate("login");
      toast("Signed out", { icon: "logout" });
    },
    oauth: async (el) => {
      const provider = el.dataset.provider;
      if (provider !== "google" && provider !== "apple") return toast("Unknown provider", { icon: "alert" });
      const form = el.closest("form") || document.querySelector("[data-auth-form]");

      // Which real path can serve this provider?
      const viaCloud = !!(Cloud && Cloud.isConfigured() && Cloud.flag(provider));
      const viaGoogle = !!(Cloud && provider === "google" && Cloud.googleConfigured());
      if (!viaCloud && !viaGoogle) {
        // Never pretend. Explain what is missing and offer the demo instead.
        return googleHelp();
      }

      el.disabled = true;
      el.classList.add("is-busy");
      const done = () => { el.disabled = false; el.classList.remove("is-busy"); };

      let r;
      try {
        r = viaCloud ? await Cloud.signInWithOAuth(provider) : await Cloud.signInWithGoogle();
      } catch (e) {
        r = { ok: false, error: "Could not complete sign-in. Please try again." };
      }
      if (viaCloud && r && r.ok && r.redirecting) return; // browser is leaving
      if (!r || !r.ok) {
        done();
        const msg = (r && r.error) || "Sign-in did not complete.";
        if (form) return formError(form, msg);
        return toast(msg, { icon: "alert" });
      }

      // Google verified in the browser: turn it into the local account.
      const adopted = S.adoptProviderUser(r.user);
      done();
      if (!adopted.ok) {
        if (form) return formError(form, adopted.error);
        return toast(adopted.error, { icon: "alert" });
      }
      const target = S.isOnboarded() ? "links" : "setup";
      navigate(target);
      if (location.hash === "#/" + target) refresh();
      toast(adopted.returning ? "Welcome back" : "Signed in as " + r.user.email, { icon: "check" });
      if (adopted.backup) {
        toast("The page on this device was backed up before switching accounts", { icon: "archive" });
      }
    },

    /** demo-signin - the explicit, labelled way into the demo account. */
    "demo-signin": () => {
      const r = S.signInWithProvider("google");
      if (!r.ok) return toast(r.error, { icon: "alert" });
      navigate("links");
      if (location.hash === "#/links") refresh();
      toast("Demo account — no Google account was used", { icon: "user" });
    },

    "google-help": () => googleHelp(),
    "setup-back": () => {
      const d = P.setupDraft();
      S.state.ui.setup = Object.assign(d, { step: Math.max(1, d.step - 1) });
      S.commit();
      refresh();
    },
    "setup-skip": () => {
      const d = P.setupDraft();
      if (d.step >= 5) {
        finishSetup(d, null).then((r) => {
          if (!r || r.ok) return;
          const form = document.querySelector('[data-setup-form="5"]');
          if (form) formError(form, r.error, r.field);
        }).catch(() => {});
        return;
      }
      S.state.ui.setup = Object.assign(d, { step: d.step + 1 });
      S.commit();
      refresh();
    },
    "setup-goal": (el) => {
      const d = P.setupDraft();
      S.state.ui.setup = Object.assign(d, { goal: el.dataset.goal });
      S.commit();
      refresh();
    },
    "setup-platform": (el) => {
      const d = P.setupDraft();
      const id = el.dataset.platform;
      if (!S.platformById(id)) return;
      const has = d.platforms.indexOf(id) !== -1;
      if (!has && d.platforms.length >= S.MAX_PLATFORMS) {
        return toast("Pick up to " + S.MAX_PLATFORMS + " platforms", { icon: "alert" });
      }
      const platforms = has ? d.platforms.filter((x) => x !== id) : d.platforms.concat(id);
      const values = Object.assign({}, d.values);
      if (has) delete values[id];
      S.state.ui.setup = Object.assign(d, { platforms: platforms, values: values });
      S.commit();
      refresh();
    },
    "setup-theme": (el) => {
      const d = P.setupDraft();
      S.state.ui.setup = Object.assign(d, { theme: el.dataset.theme });
      S.commit();
      refresh();
    },
    "setup-add": () => {
      navigate("links");
      setTimeout(() => window.AddPop.open(), 60);
    },

    "add-contact": () => openModal({
      title: "Add contact",
      body: '<div class="field"><label>Name</label><input class="input" id="f-contact-name" placeholder="Full name"></div>' +
            '<div class="field"><label>Email</label><input class="input" id="f-contact-email" placeholder="name@email.com"></div>' +
            '<div class="field"><label>Source</label><input class="input" id="f-contact-source" placeholder="Design tips"></div>',
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn--dark btn--sm" data-action="submit-contact">Add</button>'
    }),
    "submit-contact": () => {
      const email = val("f-contact-email");
      if (!email) { toast("Email required", { icon: "alert" }); return; }
      S.addContact({ name: val("f-contact-name") || email.split("@")[0], email, source: val("f-contact-source") || "Manual" });
      closeModal(); refresh(); toast("Contact added", { icon: "users" });
    },
    "remove-contact": (el) => { S.removeContact(el.dataset.id); refresh(); toast("Contact removed", { icon: "trash" }); },
    "export-csv": () => {
      downloadCsv("linkey-contacts.csv",
        [["name", "email", "source", "joined", "status"]]
          .concat(S.state.contacts.map((c) => [c.name, c.email, c.source, c.joined, c.status])));
      toast("CSV exported", { icon: "download" });
    },
    "export-links": () => {
      // What the Insight page actually measures: this device's per-link numbers.
      downloadCsv("linkey-links.csv",
        [["title", "url", "views", "clicks", "status"]]
          .concat(S.state.links.map((l) => [l.title, l.url || "", l.views || 0, l.clicks || 0, l.active ? "live" : "off"])));
      toast("CSV exported", { icon: "download" });
    },
    "add-product": () => productModal(null),
    "edit-product": (el) => {
      const p = S.state.products.find((x) => x.id === el.dataset.id);
      if (p) productModal(p);
    },
    "submit-product": (el) => {
      const name = String(val("f-product-name") || "").replace(/\s+/g, " ").trim();
      if (!name) { toast("Name required", { icon: "alert" }); return; }
      const price = Math.max(0, Number(val("f-product-price")) || 0);
      const type = val("f-product-type") || "Digital";
      const existing = el.dataset.id ? S.state.products.find((x) => x.id === el.dataset.id) : null;
      if (existing) {
        Object.assign(existing, { name: name.slice(0, 80), price: price, type: type });
        S.commit(); closeModal(); refresh(); toast("Product saved", { icon: "check" });
        return;
      }
      S.state.products.push({ id: S.uid("prd"), name: name.slice(0, 80), price: price, sales: 0, status: "draft", type: type });
      S.commit(); closeModal(); refresh(); toast("Product created", { icon: "cart" });
    },
    "delete-product": (el) => {
      const p = S.state.products.find((x) => x.id === el.dataset.id);
      if (!p) return;
      openModal({
        title: "Delete this product?",
        body: '<p class="muted" style="margin:0">“' + S.esc(p.name) + '” will be removed from this shop draft for good.</p>',
        foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Keep it</button>' +
              '<span style="flex:1"></span>' +
              '<button class="btn btn--danger btn--sm" data-action="confirm-delete-product" data-id="' + p.id + '">' + icon("trash", 14) + " Delete</button>"
      });
    },
    "confirm-delete-product": (el) => {
      S.state.products = S.state.products.filter((x) => x.id !== el.dataset.id);
      S.commit(); closeModal(); refresh(); toast("Product deleted", { icon: "trash" });
    },

    "new-post": () => openModal({
      title: "Schedule post",
      body: '<div class="field"><label>Caption</label><input class="input" id="f-post-title" placeholder="What are you posting?"></div>' +
            '<div class="form-row"><div class="field"><label>Channel</label><select class="select" id="f-post-channel"><option>Instagram</option><option>TikTok</option><option>X</option><option>YouTube</option></select></div>' +
            '<div class="field"><label>Date</label><input class="input" id="f-post-date" type="date" value="' + S.today() + '"></div></div>' +
            '<div class="field"><label>Time</label><input class="input" id="f-post-time" type="time" value="10:30"></div>',
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn--dark btn--sm" data-action="submit-post">Schedule</button>'
    }),
    "submit-post": () => {
      const title = val("f-post-title");
      if (!title) { toast("Add a caption", { icon: "alert" }); return; }
      S.addPost({ title, channel: val("f-post-channel"), date: val("f-post-date"), time: val("f-post-time") });
      closeModal(); refresh(); toast("Post scheduled", { icon: "calendar" });
    },
    "connect-social": () => toast("OAuth connection — needs platform approval", { icon: "share" }),
    "use-idea": (el) => {
      openModal({
        title: "Schedule from idea",
        body: '<div class="field"><label>Caption</label><input class="input" id="f-post-title" value="' + S.esc(el.dataset.title) + '"></div>' +
              '<div class="form-row"><div class="field"><label>Channel</label><select class="select" id="f-post-channel"><option>Instagram</option><option>TikTok</option><option>X</option></select></div>' +
              '<div class="field"><label>Date</label><input class="input" id="f-post-date" type="date" value="' + S.today() + '"></div></div>' +
              '<div class="field"><label>Time</label><input class="input" id="f-post-time" type="time" value="10:30"></div>',
        foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
              '<button class="btn btn--dark btn--sm" data-action="submit-post">Schedule</button>'
      });
    },

    "add-rule": () => openModal({
      title: "New auto reply",
      body: '<div class="field"><label>Trigger</label><input class="input" id="f-rule-trigger" placeholder="e.g. Keyword: PRICE"></div>' +
            '<div class="field"><label>Reply</label><textarea class="textarea" id="f-rule-reply" placeholder="What should Linkey send back?"></textarea></div>',
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn--dark btn--sm" data-action="submit-rule">Create rule</button>'
    }),
    "submit-rule": () => {
      if (!val("f-rule-trigger") || !val("f-rule-reply")) { toast("Fill both fields", { icon: "alert" }); return; }
      S.addRule(val("f-rule-trigger"), val("f-rule-reply"));
      closeModal(); refresh(); toast("Rule created", { icon: "message" });
    },
    "toggle-rule": (el) => { S.toggleRule(el.dataset.id); refresh(); },

    "create-short": () => {
      const target = val("f-short-target");
      const slug = val("f-short-slug") || Math.random().toString(36).slice(2, 7);
      if (!target) { toast("Destination required", { icon: "alert" }); return; }
      S.addShortLink(slug.replace(/\s+/g, "-").toLowerCase(), target);
      refresh(); toast("linkey.app/s/" + slug + " created", { icon: "scissors", accent: true });
    },
    "copy-short": (el) => {
      const l = S.state.shortLinks.find((x) => x.id === el.dataset.id);
      if (l) copy("https://linkey.app/s/" + l.slug, "Short link copied");
    },

    "mark-read": () => { S.markNotificationsRead(); refresh(); toast("All caught up", { icon: "check" }); },
    payout: () => toast("Payouts need Stripe Connect onboarding", { icon: "card" }),
    "payout-settings": () => toast("Payout settings — demo", { icon: "settings" }),
    "delete-account": () => openModal({
      title: "Delete your Linkey page?",
      body: '<p class="muted" style="margin:0 0 8px">This deletes your public page, every link, and the copy saved on this device. It cannot be undone, and the username is freed for someone else.</p>' +
        '<p class="muted small" style="margin:0">' +
        (S.auth().cloud
          ? "Your Google account is not deleted — you can create a fresh page with the same address later."
          : "You can create a new account with the same email later.") +
        "</p>",
      foot: '<button class="btn btn--ghost btn--sm" data-action="close-modal">Keep my page</button>' +
            '<span style="flex:1"></span>' +
            '<button class="btn btn--danger btn--sm" data-action="confirm-delete">' + icon("trash", 14) + " Delete everything</button>"
    }),
    "confirm-delete": async (el) => {
      const a = S.auth();
      const cloud = !!(a.cloud && Cloud && Cloud.isConfigured());
      if (cloud) {
        el.disabled = true;
        el.textContent = "Deleting…";
        let gone = null;
        try { gone = await Cloud.deletePage(); } catch (e) { gone = null; }
        if (!gone || !gone.ok) {
          // Never wipe the device while the published page still exists:
          // the owner would lose the only copy they can edit.
          el.disabled = false;
          el.textContent = "Delete everything";
          return toast("Could not delete your page. Check your connection and try again.", { icon: "alert" });
        }
        try { await Cloud.signOut(); } catch (e) { /* local state still clears */ }
      }
      S.clearAccount();
      S.signOut();
      closeModal();
      location.hash = "#/signup";
      refresh();
      toast(cloud ? "Page deleted" : "Local data reset", { icon: "trash" });
    },
    toast: (el) => toast(el.dataset.msg || "Done", { icon: "check" })
  };

  function lineChartInline(values) {
    const w = 420, h = 120, pad = 8;
    const max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * step, h - 12 - ((v - min) / range) * (h - 28)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="#ff5000" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  /* ---------------- click handling ---------------- */
  document.addEventListener("click", (e) => {
    const inDropdown = e.target.closest("[data-dropdown]");
    if (!inDropdown && !e.target.closest('[data-action="account-menu"]')) closeDropdown();

    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const name = actionEl.dataset.action;
      const fn = ACTIONS[name];
      if (fn) {
        e.preventDefault();
        fn(actionEl, e);
        if (actionEl.dataset.close) closeModal();
        if (actionEl.closest("[data-dropdown]")) closeDropdown();
        return;
      }
    }

    const expandEl = e.target.closest("[data-expand]");
    if (expandEl) {
      const group = expandEl.dataset.expand;
      const sub = document.querySelector('[data-sub="' + group + '"]');
      const current = parseHash().route;
      const meta = P.ROUTES[current] || {};
      if (meta.group !== group) {
        if (sub) sub.removeAttribute("hidden");
        expandEl.setAttribute("aria-expanded", "true");
        S.state.ui = S.state.ui || { groups: {} };
        S.state.ui.groups = S.state.ui.groups || {};
        S.state.ui.groups[group] = true;
        S.commit();
        const target = expandEl.dataset.route;
        if (target && target !== current) navigate(target);
        return;
      }
      const willOpen = sub && sub.hasAttribute("hidden");
      if (sub) {
        sub.toggleAttribute("hidden", !willOpen);
        expandEl.setAttribute("aria-expanded", String(willOpen));
      }
      S.state.ui = S.state.ui || { groups: {} };
      S.state.ui.groups = S.state.ui.groups || {};
      S.state.ui.groups[group] = !!willOpen;
      S.commit();
      return;
    }

    const routeEl = e.target.closest("[data-route]");
    if (routeEl) {
      e.preventDefault();
      closeModal();
      closeDropdown();
      navigate(routeEl.dataset.route);
      return;
    }

    if (e.target.closest("[data-overlay]") && !e.target.closest(".modal")) { closeModal(); return; }

    const previewLink = e.target.closest("[data-preview-link]");
    if (previewLink) {
      e.preventDefault();
      toast("This is the live preview — open your page to test it", { icon: "external" });
      return;
    }

    const social = e.target.closest("[data-social]");
    if (social) {
      // On a public bio page the icon is a real outbound link. The editor
      // and phone preview use the same markup for a shortcut, so only the
      // page inside .bio-page is allowed through.
      const href = social.getAttribute("href") || "";
      if (social.closest(".bio-page") && href && href !== "#") return;
      e.preventDefault();
      toast("Social connections — connect in Settings", { icon: "share" });
    }
  });

  /* ---------------- auth & setup ---------------- */
  function formError(form, message, field) {
    const box = form.querySelector("[data-auth-error]");
    if (box) {
      box.hidden = !message;
      box.textContent = message || "";
      box.classList.remove("is-ok");
    }
    if (message && field) {
      const el = form.elements[field];
      if (el && el.focus) el.focus();
    }
  }

  async function submitAuth(form) {
    const mode = form.dataset.authForm;
    const fd = new FormData(form);
    formError(form, "");
    const cloud = !!(Cloud && Cloud.isConfigured());

    if (mode === "login") {
      const id = String(fd.get("identifier") || "").trim();
      if (!cloud) {
        const r = S.signIn(id);
        if (!r.ok) return formError(form, r.error, "identifier");
        navigate(S.isOnboarded() ? "links" : "setup");
        return;
      }
      // With a real backend there are no passwords to check on the device:
      // an email becomes a sign-in link, a username points at Google.
      if (id.indexOf("@") === -1) {
        return formError(form, "Sign in with the email on your account, or continue with Google.", "identifier");
      }
      const issue = S.emailIssue(id);
      if (issue) return formError(form, issue, "identifier");
      return sendLink(form, id, "If that email has an account, a sign-in link is on its way.");
    }

    if (mode === "signup") {
      const input = { name: fd.get("name"), email: fd.get("email"), handle: fd.get("handle") };
      if (!cloud) {
        const r = S.signUp(input);
        if (!r.ok) return formError(form, r.error, r.field);
        navigate("setup");
        return;
      }
      // Remember the choices across the redirect, then prove the email.
      const intent = S.signUpIntent(input);
      if (!intent.ok) return formError(form, intent.error, intent.field);
      // The address is public; reserve it before sending a sign-in link.
      let taken = null;
      try { taken = await Cloud.handleTaken(input.handle); } catch (e) { taken = null; }
      if (taken && taken.ok && taken.taken) {
        return formError(form, "That username is already taken. Try another.", "handle");
      }
      return sendLink(form, String(input.email || "").trim(), "Check your inbox — we sent a link to finish creating your account.", true);
    }

    const email = String(fd.get("email") || "").trim();
    const issue = S.emailIssue(email);
    if (issue) return formError(form, issue, "email");
    if (cloud) return sendLink(form, email, "If that email has an account, a sign-in link is on its way.");
    const box = form.querySelector("[data-auth-error]");
    box.hidden = false;
    box.textContent = "If that email has an account, a sign-in link is on its way.";
    box.classList.add("is-ok");
  }

  /** sendLink - one place for the magic-link button state and errors. */
  async function sendLink(form, email, okText, clearIntent) {
    const btn = form.querySelector('button[type="submit"]');
    const label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    let r;
    try {
      r = await Cloud.sendEmailLink(email);
    } catch (e) {
      r = { ok: false, error: "Could not send the link. Try again." };
    }
    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!r.ok) {
      if (clearIntent) { S.state.ui.pendingSignup = null; S.commit(); }
      return formError(form, r.error || "Could not send the link.", "email");
    }
    const box = form.querySelector("[data-auth-error]");
    if (!box) return;
    box.hidden = false;
    box.textContent = okText;
    box.classList.add("is-ok");
  }

  /**
   * finishSetup - write the five answers to the account and go live.
   * Returns the Store result so a form can point at the bad field.
   */
  async function finishSetup(d, links) {
    const list = Array.isArray(links) ? links : S.starterLinks(d.platforms, d.values, d.extras);
    // One handle is one page. Check before the local account goes live so a
    // collision is an error on the form, not a page that silently never
    // reaches the server.
    if (Cloud && Cloud.isConfigured()) {
      let check = null;
      try { check = await Cloud.handleTaken(d.handle); } catch (e) { check = null; }
      if (check && check.ok && check.taken) {
        return { ok: false, field: "handle", error: "That username is already taken. Go back and choose another." };
      }
    }
    const r = S.completeSetup({
      handle: d.handle,
      name: d.name,
      bio: d.bio,
      avatar: d.avatar,
      goal: d.goal,
      theme: d.theme,
      layout: d.layout,
      platforms: d.platforms,
      links: list
    });
    if (!r.ok) return r;
    if (Cloud && Cloud.isConfigured()) {
      // Best effort: a failed cloud write must not block a live page.
      Cloud.savePage(S.cloudSnapshot()).then((saved) => {
        if (saved && !saved.ok && saved.code === "handle-taken") {
          toast("That username was taken while you finished. Choose another in Settings.", { icon: "alert" });
        }
      }).catch(() => {});
    }
    navigate("welcome");
    toast("Your page is live", { icon: "check" });
    return r;
  }

  async function submitSetup(form) {
    const step = Number(form.dataset.setupForm);
    const d = P.setupDraft();
    const fd = new FormData(form);
    formError(form, "");

    if (step < 4) {
      // Steps 1–3 are chosen with buttons; Continue just advances.
      S.state.ui.setup = Object.assign(d, { step: step + 1 });
      S.commit();
      refresh();
      const next = document.querySelector('[data-setup-form="' + (step + 1) + '"]');
      if (next) next.scrollTop = 0;
      return;
    }

    if (step === 4) {
      const values = {};
      for (let i = 0; i < d.platforms.length; i++) {
        const id = d.platforms[i];
        const raw = String(fd.get("link-" + id) || "").trim();
        if (!raw) { values[id] = ""; continue; }
        if (!S.onboardingUrl(id, raw)) {
          const p = S.platformById(id) || { name: "that platform", field: "link" };
          return formError(form, "That does not look like a valid " + p.name + " " + String(p.field || "link").toLowerCase() + ".", "link-" + id);
        }
        values[id] = raw;
      }
      const extras = [];
      for (let i = 1; i <= S.MAX_EXTRA_LINKS; i++) {
        const raw = String(fd.get("extra-" + i) || "").trim();
        if (raw && !S.extraLinkUrl(raw)) {
          return formError(form, "Use a full link starting with https://", "extra-" + i);
        }
        extras.push(raw);
      }
      S.state.ui.setup = Object.assign(d, { step: 5, values: values, extras: extras });
      S.commit();
      refresh();
      const name = document.querySelector('[data-setup-form="5"] [name="name"]');
      if (name) name.focus();
      return;
    }

    // Step 5 — profile details, then live.
    const name = String(fd.get("name") || "").trim();
    if (name.length < 2) return formError(form, "Tell us your name.", "name");
    const bio = String(fd.get("bio") || "").trim().slice(0, 160);
    const r = await finishSetup(Object.assign({}, d, { name: name, bio: bio }), null);
    if (!r.ok) return formError(form, r.error, r.field);
  }

  function paintHandleHint(input) {
    const hint = input.form && input.form.querySelector("[data-handle-hint]");
    if (!hint) return;
    const h = S.normalizeHandle(input.value);
    const issue = h ? S.handleIssue(h, "") : "";
    hint.classList.toggle("is-bad", !!issue);
    hint.classList.toggle("is-good", !issue && h.length >= S.HANDLE_MIN);
    hint.textContent = !h
      ? "Letters, numbers, dots, dashes or underscores."
      : issue || "linkey.app/" + h + " looks good";
  }

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form || !form.dataset) return;
    if (form.dataset.authForm) { e.preventDefault(); submitAuth(form); }
    else if (form.dataset.setupForm) {
      e.preventDefault();
      submitSetup(form).catch(() => formError(form, "Something went wrong. Try again."));
    }
  });

  /* ---------------- inputs ---------------- */

  /**
   * applyStyleInput - live style changes (colour pickers, sliders).
   *
   * No full re-render: the native colour picker stays open while dragging
   * and the phone updates underneath it.
   */
  function applyStyleInput(el) {
    const key = el.dataset.styleInput;
    if (!key) return;
    const numeric = key === "size" || key === "overlay";
    const patch = {};
    patch[key] = numeric ? Number(el.value) : el.value;
    const next = S.setStyle(patch);
    updatePreview();
    const out = el.closest(".range-row") && el.closest(".range-row").querySelector(".range-out");
    if (out) out.textContent = key === "overlay" ? next.overlay + "%" : next.size + "px";
  }

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-avatar-input]")) { pickAvatar(el); return; }
    if (el.matches('[data-action="url-input"]')) {
      const raw = el.value.trim();
      const safe = S.safeUrl(raw);
      if (raw && safe === "#") {
        el.value = (S.state.links.find((x) => x.id === el.dataset.id) || {}).url || "";
        toast("Only http, https, mailto or tel links are allowed", { icon: "alert" });
        return;
      }
      el.value = raw ? safe : "";
      S.updateLink(el.dataset.id, { url: raw ? safe : "" });
      updatePreview();
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("[data-style-input]")) { applyStyleInput(el); return; }
    if (el.matches("[data-handle-input]")) paintHandleHint(el);
    if (el.matches('[data-setup-form] [name="bio"]')) {
      const count = el.form && el.form.querySelector("[data-bio-count]");
      if (count) count.textContent = el.value.length + " / 160";
    }
    if (el.matches('[data-action="filter-contacts"]')) {
      const q = el.value.toLowerCase();
      document.querySelectorAll(".table tbody tr").forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const search = document.querySelector('[data-action="filter-contacts"]');
      if (search) search.focus();
    }
  });

  /* ---------------- drag & drop reorder ---------------- */
  let dragId = null;
  document.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".link-card");
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add("link-card--dragging");
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); }
  });
  document.addEventListener("dragend", (e) => {
    const card = e.target.closest(".link-card");
    if (card) card.classList.remove("link-card--dragging");
    dragId = null;
  });
  document.addEventListener("dragover", (e) => {
    if (!dragId) return;
    const card = e.target.closest(".link-card");
    if (card) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    const card = e.target.closest(".link-card");
    if (!card || !dragId || card.dataset.id === dragId) return;
    e.preventDefault();
    const from = S.state.links.findIndex((l) => l.id === dragId);
    const to = S.state.links.findIndex((l) => l.id === card.dataset.id);
    if (from < 0 || to < 0) return;
    const [moved] = S.state.links.splice(from, 1);
    S.state.links.splice(to, 0, moved);
    S.commit();
    dragId = null;
    refresh();
  });

  /** readAvatar - decode, square-free resize and compress, all locally. */
  function readAvatar(file) {
    return new Promise((resolve) => {
      if (!file) return resolve({ error: "Choose an image." });
      if (!/^image\/(png|jpeg|webp)$/i.test(file.type || "")) {
        return resolve({ error: "Choose a PNG, JPG or WebP image." });
      }
      if (file.size > 2 * 1024 * 1024) {
        return resolve({ error: "Keep the image under 2 MB." });
      }
      const reader = new FileReader();
      reader.onerror = () => resolve({ error: "Could not read that image." });
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve({ error: "That image could not be opened." });
        img.onload = () => {
          try {
            const side = 256;
            const scale = Math.min(1, side / Math.max(img.width || 1, img.height || 1));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
            canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({ data: canvas.toDataURL("image/jpeg", 0.82) });
          } catch (err) {
            resolve({ error: "Could not process that image." });
          }
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  async function pickAvatar(input) {
    const file = input.files && input.files[0];
    const res = await readAvatar(file);
    if (res.error) {
      toast(res.error, { icon: "alert" });
      input.value = "";
      return;
    }
    const d = P.setupDraft();
    S.state.ui.setup = Object.assign(d, { avatar: res.data });
    S.commit();
    // Swap the picture in place so the name and bio being typed are kept.
    const box = input.closest(".setup__avatar");
    if (!box) return refresh();
    const btn = box.querySelector(".setup__avatar-btn");
    box.innerHTML = "";
    box.setAttribute("data-has-image", "1");
    const img = document.createElement("img");
    img.src = res.data;
    img.alt = "";
    box.appendChild(img);
    if (btn) box.appendChild(btn);
    toast("Photo updated", { icon: "check" });
  }

  /* ---------------- cloud autosave ---------------- */

  /*
   * Every local change already lands in localStorage through Store.commit().
   * With a cloud account the same commit must reach Postgres, or the page on
   * another device stays frozen at onboarding. Store.subscribe() fires after
   * each commit, so one debounced writer covers every editor path (links,
   * theme, style, profile) without sprinkling save calls through the UI.
   */
  let cloudSaveTimer = 0;
  let cloudSaving = false;
  let cloudResave = false;
  let cloudLastError = "";

  function cloudCanSave() {
    if (!Cloud || typeof Cloud.isConfigured !== "function" || !Cloud.isConfigured()) return false;
    const a = S.auth ? S.auth() : null;
    return !!(a && a.signedIn && a.cloud && a.onboarded);
  }

  function scheduleCloudSave() {
    if (!cloudCanSave()) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(flushCloudSave, 1200);
  }

  function flushCloudSave() {
    if (!cloudCanSave()) return;
    if (cloudSaving) { cloudResave = true; return; }
    cloudSaving = true;
    let work;
    try {
      work = Cloud.savePage(S.cloudSnapshot());
    } catch (e) {
      work = Promise.resolve({ ok: false, code: "exception" });
    }
    Promise.resolve(work).then((r) => {
      cloudSaving = false;
      if (r && !r.ok) {
        if (r.code === "handle-taken") {
          toast("That username is taken. Pick another in Settings.", { icon: "alert" });
        } else if (r.code !== "no-session" && r.code !== "unconfigured" && cloudLastError !== (r.code || "error")) {
          cloudLastError = r.code || "error";
          toast("Saved on this device; cloud sync will retry.", { icon: "alert" });
        }
      } else {
        cloudLastError = "";
      }
      if (cloudResave) { cloudResave = false; flushCloudSave(); }
    }, () => {
      cloudSaving = false;
      if (cloudResave) { cloudResave = false; flushCloudSave(); }
    });
  }

  /* ---------------- boot ---------------- */
  S.subscribe(scheduleCloudSave);
  window.addEventListener("hashchange", renderApp);
  if (!location.hash && !pathHandle()) location.hash = "#/links";

  (async function boot() {
    let notice = "";
    if (Cloud && Cloud.isConfigured()) {
      const r = await Cloud.ready();
      notice = r.error || "";
      if (r.user) {
        let page = null;
        try { page = await Cloud.loadPage(); } catch (e) { page = null; }
        S.adoptCloudUser(r.user, page);
      } else if (!S.auth().userId) {
        // A configured deployment never runs on the seeded demo session.
        S.signOut();
      }
    }
    renderApp();
    if (notice) toast(notice, { icon: "alert" });
  })();

  /* Bridges for the add-link pop-up (addpop.js). */
  window.ACTIONS = ACTIONS;
  window.toast = toast;
  window.refresh = refresh;
})();
