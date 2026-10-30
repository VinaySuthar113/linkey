/* ============================================================
   Linkey — "Add" pop-up
   Faithful rebuild of the design's Add component:
   header + search + category rail + tiles + provider rows,
   then a details step (the design stops at the picker).

   Security notes
   - every interpolated value is escaped with S.esc
   - URLs are scheme-checked (http/https only) before saving
   ============================================================ */
(function (global) {
  const S = global.Store;
  const D = global.PICKER;

  let root = null;
  let tab = "suggested";
  let query = "";
  let step = "picker";     // picker | details
  let chosen = null;       // provider object
  let returnFocus = null;

  /* ---------------- helpers ---------------- */
  function logoHtml(p, cls) {
    const file = p.logo && D.LOGOS[p.logo];
    if (file) {
      return '<span class="' + (cls || "addpop__logo") + '"><img src="' + D.LOGO + file + '" alt="" loading="lazy" decoding="async"></span>';
    }
    const color = D.BRAND_COLORS[p.id] || "#FF5000";
    const initial = S.esc((p.name || "?").trim().charAt(0).toUpperCase());
    return '<span class="' + (cls || "addpop__logo") + '"><span class="addpop__mono" style="background:' + color +
      '14;color:' + color + '">' + initial + "</span></span>";
  }

  function rowHtml(p) {
    return '<button type="button" class="addpop__row" data-pick="' + S.esc(p.id) + '">' +
      '<span class="addpop__row-left">' + logoHtml(p) +
        '<span class="addpop__row-text">' +
          '<span class="addpop__row-title">' + S.esc(p.name) + "</span>" +
          '<span class="addpop__row-desc">' + S.esc(p.desc) + "</span>" +
        "</span>" +
      "</span>" +
      '<span class="addpop__row-chev">' + icon("chevronRight", 24) + "</span>" +
    "</button>";
  }

  function sectionHtml(sec) {
    return '<div class="addpop__section">' +
      (sec.title ? '<p class="addpop__section-label">' + S.esc(sec.title) + "</p>" : "") +
      '<div class="addpop__rows">' + sec.items.map(rowHtml).join("") + "</div>" +
    "</div>";
  }

  function matches(p, q) {
    const s = (p.name + " " + p.desc + " " + p.kind).toLowerCase();
    return s.indexOf(q) !== -1;
  }

  function isUrlLike(v) {
    const s = v.trim();
    if (!s || /\s/.test(s)) return false;
    return /^(https?:\/\/)/i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s);
  }

  /* ---------------- views ---------------- */
  function pickerBody() {
    const q = query.trim().toLowerCase();

    if (q) {
      const hits = Object.keys(D.byId).map((k) => D.byId[k]).filter((p) => matches(p, q));
      let html = "";
      if (isUrlLike(query)) {
        html += '<div class="addpop__section"><div class="addpop__rows">' +
          '<button type="button" class="addpop__row" data-pick="__url">' +
            '<span class="addpop__row-left">' +
              '<span class="addpop__logo"><span class="addpop__mono" style="background:#FF500014;color:#FF5000">' + icon("link", 22) + "</span></span>" +
              '<span class="addpop__row-text">' +
                '<span class="addpop__row-title">Add this link</span>' +
                '<span class="addpop__row-desc">' + S.esc(query.trim()) + "</span>" +
              "</span>" +
            "</span>" +
            '<span class="addpop__row-chev">' + icon("chevronRight", 24) + "</span>" +
          "</button></div></div>";
      }
      html += hits.length
        ? '<div class="addpop__section"><p class="addpop__section-label">Results</p><div class="addpop__rows">' + hits.map(rowHtml).join("") + "</div></div>"
        : (isUrlLike(query) ? "" : '<p class="addpop__empty">Nothing matches “' + S.esc(query.trim()) + '”.</p>');
      return html;
    }

    if (tab === "all") {
      return '<p class="addpop__panel-title addpop__panel-title--lg">All categories</p>' +
        D.ALL.map(sectionHtml).join("");
    }

    if (tab === "suggested") {
      const tiles = '<div class="addpop__tiles">' + D.QUICK.map((t) =>
        '<button type="button" class="addpop__tile" data-tile="' + t.id + '" style="background:' + t.color + '1A;color:#1F1F1F">' +
          "<span>" + S.esc(t.label) + "</span>" +
          '<span style="color:' + t.color + '">' + icon(t.icon, 24) + "</span>" +
        "</button>").join("") + "</div>";
      return tiles + sectionHtml(D.SUGGESTED);
    }

    const sections = D.SECTIONS[tab] || [];
    const label = (D.TABS.find((t) => t.id === tab) || {}).label || "";
    return '<p class="addpop__panel-title">' + S.esc(label) + "</p>" + sections.map((sec) => {
      /* don't repeat the panel title as the first section heading */
      const same = sec.title && label && sec.title.toLowerCase() === label.toLowerCase();
      return sectionHtml(same ? { title: "", items: sec.items } : sec);
    }).join("");
  }

  function detailsBody() {
    const p = chosen;
    const kind = p.kind || "link";
    const isBlock = kind === "text" || kind === "header" || kind === "form";
    const kindLabel = kind === "text" ? "text block" : kind === "header" ? "heading" : kind + " link";

    const extra =
      (kind === "product"
        ? '<div class="field"><label for="addpop-price">Price (USD)</label>' +
          '<input class="input" id="addpop-price" type="number" min="0" step="0.01" placeholder="24.00"></div>'
        : "") +
      (kind === "event"
        ? '<div class="field"><label for="addpop-date">Date</label>' +
          '<input class="input" id="addpop-date" type="date"></div>'
        : "") +
      (isBlock
        ? '<div class="field"><label for="addpop-body">' + (kind === "header" ? "Heading" : kind === "form" ? "Sign-up form" : "Text") + "</label>" +
          '<textarea class="textarea" id="addpop-body" rows="3" maxlength="160" placeholder="' +
          (kind === "header" ? "Work" : kind === "form" ? "What should the form say? (e.g. Newsletter signup)" : "A short note for your visitors…") + '"></textarea></div>'
        : '<div class="field"><label for="addpop-note">Second line <span class="addpop__optional">optional</span></label>' +
          '<input class="input" id="addpop-note" maxlength="90" placeholder="' +
          (kind === "product" ? "Limited run" : kind === "event" ? "Berlin · 7pm" : kind === "form" ? "Subscribe" : "A short label") + '"></div>');

    return '<div class="addpop__form">' +
      '<div class="addpop__form-head">' + logoHtml(p, "addpop__form-logo") +
        "<div><div class=\"addpop__form-name\">" + S.esc(p.name) + "</div>" +
        '<div class="addpop__form-kind">' + S.esc(kindLabel) + "</div></div>" +
      "</div>" +
      (isBlock ? "" :
        '<div class="field"><label for="addpop-title">Title</label>' +
          '<input class="input" id="addpop-title" maxlength="48" value="' + S.esc(p.name) + '"></div>') +
      (isBlock ? "" :
        '<div class="field"><label for="addpop-url">URL</label>' +
          '<input class="input" id="addpop-url" inputmode="url" placeholder="https://…" value="' + S.esc(p.prefill || "") + '">' +
          '<p class="addpop__hint">Paste the full address. We’ll add https:// if you leave it off.</p></div>') +
      extra +
      '<div class="addpop__preview">' +
        '<p class="addpop__preview-label">Preview</p>' +
        '<div class="addpop__preview-row">' +
          logoHtml(p, "addpop__preview-logo") +
          '<span class="addpop__preview-text">' +
            '<span class="addpop__preview-title" data-preview-title>' + S.esc(p.name) + "</span>" +
            '<span class="addpop__preview-url" data-preview-url>' + S.esc(isBlock ? "Shown on your page" : (p.prefill || "https://…")) + "</span>" +
          "</span>" +
          (isBlock ? "" : '<span class="addpop__preview-chev">' + icon("chevronRight", 16) + "</span>") +
        "</div>" +
      "</div>" +
      '<div class="addpop__foot">' +
        '<button class="btn btn--ghost btn--sm" data-addpop-back>' + icon("arrowLeft", 14) + " Back</button>" +
        '<span style="flex:1"></span>' +
        '<button class="btn btn--dark btn--sm" data-addpop-save>' + icon("plus", 14) + " Add link</button>" +
      "</div>" +
    "</div>";
  }

  function render() {
    if (!root) return;
    const head = step === "details"
      ? '<header class="addpop__head">' +
          '<button class="addpop__back" data-addpop-back>' + icon("arrowLeft", 22) +
            '<h2 class="addpop__title">Add ' + S.esc(chosen.name) + "</h2></button>" +
          '<button class="addpop__close" data-addpop-close aria-label="Close">' + icon("x", 10) + "</button>" +
        "</header>"
      : '<header class="addpop__head">' +
          '<h2 class="addpop__title">Add</h2>' +
          '<button class="addpop__close" data-addpop-close aria-label="Close">' + icon("x", 10) + "</button>" +
        "</header>";

    const search = step === "details" ? "" :
      '<label class="addpop__search">' +
        '<span class="addpop__search-left">' + icon("search", 24) +
          '<input id="addpop-q" type="text" autocomplete="off" spellcheck="false" placeholder="Paste or search a link" value="' + S.esc(query) + '">' +
        "</span>" +
        (query ? '<button type="button" class="addpop__search-clear" data-addpop-clear aria-label="Clear search">' + icon("x", 10) + "</button>" : '<span class="addpop__search-clear" aria-hidden="true" style="opacity:.35">' + icon("x", 10) + "</span>") +
      "</label>";

    const rail = step === "details" ? "" :
      '<nav class="addpop__rail" aria-label="Categories">' + D.TABS.map((t) =>
        '<button type="button" class="addpop__tab' + (t.id === tab ? " is-active" : "") + '" data-tab="' + t.id + '">' +
          icon(t.icon, 24) + "<span>" + S.esc(t.label) + "</span>" +
        "</button>").join("") + "</nav>";

    const body = step === "details"
      ? '<div class="addpop__body"><div class="addpop__panel">' + detailsBody() + "</div></div>"
      : '<div class="addpop__body">' + rail + '<div class="addpop__panel">' + pickerBody() + "</div></div>";

    root.innerHTML =
      '<div class="overlay" data-addpop-overlay>' +
        '<div class="addpop" role="dialog" aria-modal="true" aria-label="Add a link">' +
          head + search + body +
        "</div>" +
      "</div>";

    if (step === "details") {
      const u = root.querySelector("#addpop-url") || root.querySelector("#addpop-body");
      if (u) { u.focus(); try { u.setSelectionRange(u.value.length, u.value.length); } catch (err) {} }
    }
  }

  /* ---------------- behaviour ---------------- */
  function normalizeUrl(raw) {
    let v = String(raw || "").trim();
    if (!v) return { error: "Add a URL first." };
    if (/^(javascript|data|vbscript|file):/i.test(v)) return { error: "That link type isn’t allowed." };
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
    let u;
    try { u = new URL(v); } catch (e) { return { error: "That doesn’t look like a link." }; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return { error: "Only http and https links are allowed." };
    if (!u.hostname || u.hostname.indexOf(".") === -1) return { error: "That doesn’t look like a link." };
    return { url: u.toString() };
  }

  function selectProvider(id, prefillUrl) {
    if (id === "__url") {
      chosen = { id: "link", name: "Link", kind: "link", prefill: query.trim(), logo: null };
    } else {
      chosen = Object.assign({}, D.byId[id] || { id: "link", name: "Link", kind: "link" }, { prefill: prefillUrl || "" });
    }
    step = "details";
    render();
  }

  function save() {
    const p = chosen;
    const kind = p.kind || "link";
    const isBlock = kind === "text" || kind === "header" || kind === "form";
    const title = String((root.querySelector("#addpop-title") || {}).value || p.name).trim();
    const body = String((root.querySelector("#addpop-body") || {}).value || "").trim();

    if (isBlock) {
      if (body.length < 2) { global.toast && global.toast("Add some text first.", { icon: "alert" }); return; }
      S.addLink({
        title: body.slice(0, 160),
        url: "",
        kind: kind,
        provider: p.id,
        logo: p.logo || null,
        note: title ? title.slice(0, 90) : String((root.querySelector("#addpop-note") || {}).value || "").trim().slice(0, 90)
      });
      finishAdd();
      return;
    }

    const raw = (root.querySelector("#addpop-url") || {}).value || "";
    const res = normalizeUrl(raw);
    if (res.error) { global.toast && global.toast(res.error, { icon: "alert" }); return; }

    const extra = {};
    if (kind === "product") {
      const rawPrice = String((root.querySelector("#addpop-price") || {}).value || "").trim();
      if (rawPrice) {
        const n = Number(rawPrice);
        if (!isFinite(n) || n < 0) { global.toast && global.toast("Enter a price of 0 or more.", { icon: "alert" }); return; }
        extra.price = Math.round(n * 100) / 100;
      }
    }
    if (kind === "event") {
      const d = String((root.querySelector("#addpop-date") || {}).value || "").trim();
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) { global.toast && global.toast("Pick a valid date.", { icon: "alert" }); return; }
      extra.date = d;
    }
    const note = String((root.querySelector("#addpop-note") || {}).value || "").trim().slice(0, 90);
    if (note) extra.note = note;

    S.addLink(Object.assign({
      title: title.slice(0, 48) || p.name,
      url: res.url,
      kind: kind,
      provider: p.id,
      logo: p.logo || null
    }, extra));
    finishAdd();
  }

  function finishAdd() {
    close();
    if (global.refresh) global.refresh();
    global.toast && global.toast("Link added", { icon: "check", accent: true });
  }

  function onClick(e) {
    // The backdrop matches [data-addpop-overlay] and wraps the whole dialog,
    // so closest() would resolve every click inside the pop-up — including a
    // click on the Title field — to the backdrop and close it. Only a click
    // on the backdrop itself counts as "outside".
    const backdrop = root && root.querySelector("[data-addpop-overlay]");
    if (backdrop && e.target === backdrop) { close(); return; }

    const el = e.target.closest("[data-tab],[data-tile],[data-pick],[data-addpop-close],[data-addpop-back],[data-addpop-save],[data-addpop-clear]");
    if (!el) return;

    if (el.hasAttribute("data-addpop-close")) { close(); return; }
    if (el.hasAttribute("data-addpop-clear")) { query = ""; render(); const i = root.querySelector("#addpop-q"); if (i) i.focus(); return; }
    if (el.hasAttribute("data-addpop-back")) { step = "picker"; chosen = null; render(); return; }
    if (el.hasAttribute("data-addpop-save")) { save(); return; }
    if (el.dataset.tab) {
      tab = el.dataset.tab; query = ""; step = "picker"; render();
      return;
    }
    if (el.dataset.tile) {
      const t = el.dataset.tile;
      if (t === "collection") { close(); if (global.ACTIONS && global.ACTIONS["add-collection"]) global.ACTIONS["add-collection"](); return; }
      // Through selectProvider so the tile obeys the same rules as a row —
      // including the form refusal.
      selectProvider(t);
      return;
    }
    if (el.dataset.pick) { selectProvider(el.dataset.pick); return; }
  }

  function onInput(e) {
    if (e.target.id === "addpop-title" || e.target.id === "addpop-url") {
      const titleEl = root.querySelector("#addpop-title");
      const urlEl = root.querySelector("#addpop-url");
      const t = root.querySelector("[data-preview-title]");
      const u = root.querySelector("[data-preview-url]");
      if (t) t.textContent = (titleEl.value || chosen.name).slice(0, 48);
      if (u) u.textContent = urlEl.value || "https://…";
      return;
    }
    if (e.target.id !== "addpop-q") return;
    query = e.target.value;
    const caret = e.target.selectionStart;
    render();
    const i = root.querySelector("#addpop-q");
    if (i) { i.focus(); try { i.setSelectionRange(caret, caret); } catch (err) {} }
  }

  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key === "Enter" && step === "details" && e.target.classList.contains("input")) { e.preventDefault(); save(); }
  }

  function open() {
    if (root) close();
    returnFocus = document.activeElement;
    tab = "suggested"; query = ""; step = "picker"; chosen = null;
    root = document.createElement("div");
    document.body.appendChild(root);
    render();
    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKey, true);
    const i = root.querySelector("#addpop-q");
    if (i) i.focus();
  }

  function close() {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("input", onInput);
    document.removeEventListener("keydown", onKey, true);
    if (root) { root.remove(); root = null; }
    if (returnFocus && returnFocus.focus) { try { returnFocus.focus(); } catch (e) {} }
    returnFocus = null;
  }

  global.AddPop = { open, close, _normalizeUrl: normalizeUrl, _isUrlLike: isUrlLike };
})(window);
