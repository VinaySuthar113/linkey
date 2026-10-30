/* Linkey — page renderers */
(function (global) {
  const S = global.Store;
  const icon = global.icon;
  const esc = S.esc;

  /* ------------------------------------------------------------
     Shared bits
     ------------------------------------------------------------ */
  const ROUTES = {
    links: { title: "Links", group: "my-links", sub: "links" },    shop: { title: "Shop", group: "my-links", sub: "shop" },
    customize: { title: "Customize", group: "my-links", sub: "customize" },
    earn: { title: "Earn", group: "earn", sub: "earn" },
    earning: { title: "Earning", group: "earn", sub: "earning" },
    audience: { title: "Audience", group: "audience" },
    insight: { title: "Insight", group: "insight" },
    planner: { title: "Social planner", group: "planner" },
    autoreply: { title: "Auto reply", group: "autoreply" },
    shortener: { title: "Link shortener", group: "shortener" },
    ideas: { title: "Post ideas", group: "ideas" },
    profile: { title: "Profile", group: "profile" },
    settings: { title: "Settings", group: "settings" },
    notifications: { title: "Notifications", group: "notifications" },
    // Auth and setup render outside the app shell — no sidebar, no topbar.
    login: { title: "Log in" },
    signup: { title: "Sign up" },
    forgot: { title: "Forgot details" },
    setup: { title: "Set up your page" },
    welcome: { title: "You’re live" }
  };

  function navItem(key, label, iconName, opts) {
    opts = opts || {};
    const active = opts.active ? " nav__item--active" : "";
    const expanded = opts.expanded;
    const caret = opts.expandable ? '<span class="nav__caret">' + icon("chevronDown", 14) + "</span>" : "";
    const badge = opts.badge ? '<span class="badge-new">' + opts.badge + "</span>" : "";
    return (
      '<button class="nav__item' + active + '" data-route="' + key + '"' +
      (opts.expandable ? ' data-expand="' + key + '" aria-expanded="' + (expanded ? "true" : "false") + '"' : "") +
      ' title="' + esc(label) + '">' +
      icon(iconName, 16) +
      "<span>" + esc(label) + "</span>" + badge + caret +
      "</button>"
    );
  }

  function subItem(route, label, active, extra) {
    return '<button class="nav__subitem' + (active ? " nav__subitem--active" : "") + '" data-route="' + route + '">' + esc(label) + (extra || "") + "</button>";
  }

  function sidebar(route) {
    const meta = ROUTES[route] || {};
    const inGroup = (g) => meta.group === g;
    const ui = S.state.ui || {};
    const openLinks = ui.groups ? !!ui.groups.links : true;
    const openEarn = ui.groups ? !!ui.groups.earn : true;

    return (
      '<aside class="sidebar">' +
        '<div class="sidebar__head">' +
          '<button class="account" data-action="account-menu">' +
            '<span class="account__avatar"></span>' +
            '<span class="account__name">' + esc(S.state.user.name) + "</span>" +
            '<span class="account__caret">' + icon("chevronDown", 13) + "</span>" +
          "</button>" +
        "</div>" +
        '<div class="sidebar__scroll">' +
          '<nav class="nav">' +
            navItem("links", "My Links", "grid", { expandable: true, expanded: openLinks }) +
            '<div class="nav__sub" data-sub="links"' + (openLinks ? "" : " hidden") + ">" +
              subItem("links", "Links", inGroup("my-links") && meta.sub === "links") +
              subItem("shop", "Shop", inGroup("my-links") && meta.sub === "shop") +
              subItem("customize", "Customize", inGroup("my-links") && meta.sub === "customize") +
            "</div>" +

            navItem("earn", "Earn", "wallet", { expandable: true, expanded: openEarn }) +
            '<div class="nav__sub" data-sub="earn"' + (openEarn ? "" : " hidden") + ">" +
              subItem("earn", "Overview", inGroup("earn") && meta.sub === "earn") +
              subItem("earning", "Earning", inGroup("earn") && meta.sub === "earning", ' <span class="badge-new">NEW</span>') +
            "</div>" +

            navItem("audience", "Audience", "users", { active: meta.group === "audience" }) +
            navItem("insight", "Insight", "chart", { active: meta.group === "insight" }) +

            '<div class="nav__group"><div class="nav__label">Tools</div>' +
              navItem("planner", "Social planner", "calendar", { active: meta.group === "planner" }) +
              navItem("autoreply", "Auto reply", "message", { active: meta.group === "autoreply" }) +
              navItem("shortener", "Link shortner", "scissors", { active: meta.group === "shortener" }) +
              navItem("ideas", "Post Ideas", "bulb", { active: meta.group === "ideas" }) +
              '<button class="nav__add" data-action="growth-tools">' + icon("plus", 16) + "<span>Add growth tools</span></button>" +
            "</div>" +
          "</nav>" +
        "</div>" +
        '<div class="sidebar__foot">' +
          '<button class="nav__item" data-action="help">' + icon("help", 16) + "<span>Help &amp; Support</span></button>" +
        "</div>" +
      "</aside>"
    );
  }

  function topbar(route) {
    const meta = ROUTES[route] || { title: "Linkey" };
    const unread = S.unreadCount();
    const isLinks = route === "links";
    const view = (S.state.settings.viewMode || "list");

    return (
      '<header class="topbar">' +
        '<div class="topbar__left">' +
          '<h2 class="topbar__title">' + esc(meta.title) + "</h2>" +
        "</div>" +
        '<div class="topbar__right">' +
          '<button class="icon-btn' + (unread ? " icon-btn--badge" : "") + '" data-route="notifications" title="Notifications">' + icon("bell", 18) + "</button>" +
          (isLinks ? "" : '<button class="icon-btn" data-route="settings" title="Settings">' + icon("settings", 18) + "</button>") +
        "</div>" +
        (isLinks
          ? '<div class="topbar__rail">' +
              '<button class="chip" data-action="copy-public" title="Copy your public link">' +
                '<span class="chip__dot"></span><span>appname//' + esc(S.state.user.handle) + "</span>" +
                icon("share", 12) +
              "</button>" +
              '<div class="segmented" role="group" aria-label="View mode">' +
                '<button data-action="view-mode" data-mode="grid" aria-pressed="' + (view === "grid") + '" title="Grid view">' + icon("grid", 14) + "</button>" +
                '<button data-action="view-mode" data-mode="list" aria-pressed="' + (view === "list") + '" title="List view">' + icon("list", 14) + "</button>" +
              "</div>" +
            "</div>"
          : "") +
      "</header>"
    );
  }

  /* ------------------------------------------------------------
     Charts (inline SVG)
     ------------------------------------------------------------ */
  function barChart(values, opts) {
    opts = opts || {};
    const w = opts.width || 520, h = opts.height || 180, pad = 8;
    const max = Math.max.apply(null, values.concat([1]));
    const gap = 8;
    const bw = (w - pad * 2 - gap * (values.length - 1)) / values.length;
    let bars = "";
    values.forEach((v, i) => {
      const bh = Math.max(2, Math.round((v / max) * (h - 28)));
      const x = pad + i * (bw + gap);
      const y = h - 20 - bh;
      const highlight = opts.highlight === i;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="4" fill="' +
        (highlight ? "#ff5000" : "#f1f1f1") + '"><title>' + v + "</title></rect>";
    });
    let grid = "";
    for (let i = 1; i <= 3; i++) {
      const y = h - 20 - (i * (h - 28)) / 4;
      grid += '<line x1="' + pad + '" y1="' + y + '" x2="' + (w - pad) + '" y2="' + y + '" stroke="#f4f4f4" stroke-width="1"/>';
    }
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img">' + grid + bars + "</svg>";
  }

  function lineChart(values, opts) {
    opts = opts || {};
    const w = opts.width || 520, h = opts.height || 170, pad = 10;
    const max = Math.max.apply(null, values.concat([1]));
    const min = Math.min.apply(null, values.concat([0]));
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1 || 1);
    const pts = values.map((v, i) => [pad + i * step, h - 14 - ((v - min) / range) * (h - 34)]);
    const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = d + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (h - 14) + " L" + pts[0][0].toFixed(1) + " " + (h - 14) + " Z";
    return (
      '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img">' +
        '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#ff5000" stop-opacity=".18"/>' +
          '<stop offset="100%" stop-color="#ff5000" stop-opacity="0"/>' +
        "</linearGradient></defs>" +
        '<path d="' + area + '" fill="url(#lg)"/>' +
        '<path d="' + d + '" fill="none" stroke="#ff5000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        pts.map((p) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6" fill="#fff" stroke="#ff5000" stroke-width="1.6"/>').join("") +
      "</svg>"
    );
  }

  function statCard(label, value, delta, iconName, up) {
    return (
      '<div class="stat">' +
        '<div class="stat__label">' + icon(iconName || "chart", 13) + esc(label) + "</div>" +
        '<div class="stat__value">' + esc(value) + "</div>" +
        (delta
          ? '<div class="stat__delta ' + (up === false ? "stat__delta--down" : "stat__delta--up") + '">' +
              icon(up === false ? "chevronDown" : "chevronUp", 11) + esc(delta) +
            "</div>"
          : "") +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Preview / bio
     ------------------------------------------------------------ */
  /**
   * socialMark - the icon for one connected platform.
   *
   * Vectors that exist in the provider set are shown as images on a light
   * disc so a black logo stays legible on a dark theme; everything else
   * uses the theme-aware line icon.
   */
  function socialMark(platform, size) {
    const meta = S.SOCIAL_PLATFORMS[platform];
    if (!meta) return "";
    const s = size || 14;
    if (meta.logo) {
      return '<img class="soc-mark" src="assets/icons/providers/' + meta.logo + '" alt="" width="' + s + '" height="' + s +
        '" loading="lazy" decoding="async" style="width:' + s + "px;height:" + s + 'px;object-fit:contain;border-radius:4px;background:rgba(255,255,255,.92);padding:2px" />';
    }
    return icon(meta.icon, s);
  }

  /**
   * socialIconRow - the platform marks above the links.
   * `source` lets a read-only page pass someone else's socials and links
   * instead of reading this device's account.
   */
  function socialIconRow(theme, size, source) {
    const s = size || 14;
    const socials = source ? source.socials : S.state.profile.socials;
    const links = source ? source.links : S.state.links;
    return socials.map((p) => {
      const meta = S.SOCIAL_PLATFORMS[p];
      if (!meta) return "";
      const linked = links.find((l) => l.platform === p && l.active);
      return '<a href="' + (linked && linked.url ? esc(S.safeUrl(linked.url)) : "#") + '" target="_blank" rel="noopener" data-social="' + p + '" title="' + esc(meta.name) + '"' +
        (linked ? "" : ' style="opacity:.45"') + ' aria-label="' + esc(meta.name) + '">' + socialMark(p, s) + "</a>";
    }).join("");
  }

  /* ------------------------------------------------------------
     Brand
     One file, one constant. The mark lives at assets/brand/logo.svg
     and every surface that shows a brand mark reads it from here, so
     swapping the logo is a single-file change.
     ------------------------------------------------------------ */
  const BRAND = { mark: "assets/brand/logo.svg", name: "Linkey" };

  // A mask, not an <img>: an external SVG in an <img> cannot inherit
  // currentColor, so it would stay black on the dark themes. As a mask the
  // mark takes the colour of whatever it sits in, and the single-file rebrand
  // still holds — the mask points at BRAND.mark.
  function brandMark(size, cls) {
    return '<span class="brand-mark' + (cls ? " " + cls : "") + '" role="img" aria-label="' + BRAND.name +
      '" style="height:' + size + 'px"></span>';
  }

  /* ------------------------------------------------------------
     Layout tiles — shared by the editor preview and the public page
     ------------------------------------------------------------ */
  function spanStyle(plan) {
    return "--c:" + plan.col + ";--r:" + plan.row;
  }

  function linkIconName(l) {
    if (l.kind === "social" && l.platform && S.SOCIAL_PLATFORMS[l.platform]) return S.SOCIAL_PLATFORMS[l.platform].icon;
    return (S.LINK_TYPES[l.kind] || S.LINK_TYPES.link).icon;
  }

  /** isBlockLink - text and header tiles are content, not destinations. */
  function isBlockLink(l) {
    return !!l && (l.kind === "text" || l.kind === "header");
  }

  /** shortDate - "2026-11-04" → "4 Nov 2026"; anything odd is shown as typed. */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function shortDate(value) {
    const raw = String(value || "").trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m) return raw.slice(0, 32);
    const day = Number(m[3]);
    const month = MONTHS[Number(m[2]) - 1];
    if (!month || !day) return raw.slice(0, 32);
    return day + " " + month + " " + m[1];
  }

  /** priceLabel - "$24.00", or "" when no price was set. */
  function priceLabel(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return isFinite(n) && n >= 0 ? S.money(n) : "";
  }

  /**
   * tileNote - the second line of a tile, decided by kind.
   *
   * One function so the editor preview, the public page and the add-link
   * preview can only ever show the same thing. Returns "" when the tile
   * is too small to carry a second line, unless the tile is a block.
   */
  function tileNote(l, big) {
    const note = l.note ? String(l.note) : "";
    if (l.kind === "product") {
      const price = priceLabel(l.price);
      return [price, note].filter(Boolean).join(" · ");
    }
    if (l.kind === "event") {
      return [l.date ? shortDate(l.date) : "", note].filter(Boolean).join(" · ");
    }
    if (l.kind === "form") return note || "Subscribe";
    if (l.kind === "video") return big ? note : "";
    return big ? note : "";
  }

  // A tile always carries its label — hiding text by tile size would leave
  // screen readers with an icon and nothing else. The preview hides labels
  // in CSS instead, where it is a presentation choice.
  function tileInner(l, plan) {
    const big = plan.col * plan.row > 2;

    // Content blocks are their own line on the page: no glyph, no chevron.
    if (isBlockLink(l)) {
      return (
        '<span class="tile__text tile__text--block">' +
          '<span class="tile__title tile__title--block' + (l.kind === "header" ? " tile__title--head" : "") + '">' +
            esc(l.title) +
          "</span>" +
          (l.note ? '<span class="tile__note">' + esc(l.note) + "</span>" : "") +
        "</span>"
      );
    }

    const name = linkIconName(l);
    const note = tileNote(l, big);
    return (
      '<span class="tile__glyph">' + icon(name, big ? 20 : 16) +
        (l.kind === "video" ? '<span class="tile__play">' + icon("play", 10) + "</span>" : "") +
      "</span>" +
      '<span class="tile__text">' +
        '<span class="tile__title">' + esc(l.title) + "</span>" +
        (note ? '<span class="tile__note">' + esc(note) + "</span>" : "") +
      "</span>"
    );
  }

  /** tileKindClass - lets CSS style each link format without guessing. */
  function tileKindClass(l) {
    const kind = l && S.LINK_TYPES[l.kind] ? l.kind : "link";
    return " tile--k-" + kind;
  }

  function tileClass(plan) {
    return "tile--" + plan.col + "x" + plan.row;
  }

  /* The four thumbnails are the measured shapes from the design's
     "Layout style" panel: a 163.5 x 129 tile with 14px padding, 32px rows
     and 3.6px gaps, drawn here as percentages so they scale cleanly. */
  function layoutThumb(id) {
    const W = 163.5, H = 129;
    const at = (x, y, w, h) =>
      '<i style="left:' + ((x / W) * 100).toFixed(2) + "%;top:" + ((y / H) * 100).toFixed(2) +
      "%;width:" + ((w / W) * 100).toFixed(2) + "%;height:" + ((h / H) * 100).toFixed(2) + '%"></i>';

    if (id === "list") return at(14, 16, 134.8, 32) + at(14, 49, 134.8, 32) + at(14, 82, 134.8, 32);
    if (id === "bento") {
      return at(14, 16, 31.4, 32) + at(49, 16, 61.1, 32) + at(113, 16, 35.9, 67) +
        at(14, 51, 61.1, 32) + at(78, 51, 31.4, 32) + at(14, 86, 134.8, 32);
    }
    if (id === "grid") return at(14, 16, 64, 46) + at(82, 16, 64, 46) + at(14, 66, 64, 46) + at(82, 66, 64, 46);
    return at(14, 16, 64, 46) + at(14, 66, 64, 46) +
      '<i class="is-drag" style="left:' + ((82 / W) * 100).toFixed(2) + "%;top:" + ((16 / H) * 100).toFixed(2) +
      "%;width:" + ((64 / W) * 100).toFixed(2) + "%;height:" + ((46 / H) * 100).toFixed(2) + '%">' + icon("drag", 11) + "</i>";
  }

  function layoutCard() {
    const active = S.layout();
    const meta = S.LAYOUTS.find((l) => l.id === active) || S.LAYOUTS[0];
    return (
      '<section class="card layout-card">' +
        '<div class="card__head">' +
          "<div><div class=\"card__title\">Layout style</div>" +
          '<div class="card__sub">How your links stack on the public page.</div></div>' +
          '<div class="tag">' + esc(meta.name) + "</div>" +
        "</div>" +
        '<div class="layout-row">' +
          S.LAYOUTS.map((l) =>
            '<button class="layout-opt" data-action="set-layout" data-layout="' + l.id + '" aria-pressed="' + (active === l.id) + '">' +
              '<span class="layout-thumb">' + layoutThumb(l.id) + "</span>" +
              '<span class="layout-opt__name">' + esc(l.name) + "</span>" +
            "</button>").join("") +
        "</div>" +
        (active === "custom"
          ? '<p class="layout-hint">' + icon("help", 12) + " Use the tile button on any link to change its size.</p>"
          : "") +
      "</section>"
    );
  }

  function phoneMarkup(opts) {
    opts = opts || {};
    const t = S.theme();
    const u = S.state.user;
    const layout = S.layout();
    const links = S.buttonLinks();
    const plan = S.layoutPlan(links);
    const style = S.styleVars();

    const items = links.length
      ? links.map((l, i) => {
          const off = !l.active;
          const p = plan[i];
          const cls = "phone__link " + tileClass(p) + tileKindClass(l) +
            (off ? " phone__link--off" : "") + (isBlockLink(l) ? " phone__link--block" : "");
          // A text block has nowhere to go, so it is not a link.
          const tag = isBlockLink(l) ? "div" : "a";
          const attrs = isBlockLink(l)
            ? ' data-preview-link="' + l.id + '"'
            : ' data-preview-link="' + l.id + '" href="#"' +
              (off ? ' aria-disabled="true"' : ' title="' + esc(l.title) + '"');
          return "<" + tag + ' class="' + cls + '" style="' + spanStyle(p) + '"' + attrs + ">" +
            tileInner(l, p) + "</" + tag + ">";
        }).join("")
      : S.state.profile.socials.length
        ? ""
        : '<div class="phone__empty">No links yet</div>';

    return (
      '<div class="phone" data-tex="' + (t.tex ? "1" : "0") + '" data-shape="' + S.style().btnShape + '" data-align="' + S.style().align + '" data-avatar="' + S.style().avatar + '" style="' + style + '">' +
        '<div class="phone__avatar">' + (u.avatar ? '<img src="' + esc(u.avatar) + '" alt="">' : icon("user", 24)) + "</div>" +
        '<div class="phone__name">' + esc(S.state.profile.title || u.name) + "</div>" +
        '<div class="phone__bio">' + esc(S.state.profile.bio) + "</div>" +
        '<div class="phone__socials">' + socialIconRow(t, 13) + "</div>" +
        '<div class="phone__links" data-layout="' + layout + '">' + items + "</div>" +
      "</div>"
    );
  }

  function previewPanel(opts) {
    opts = opts || {};
    return (
      '<aside class="preview-rail' + (opts.inline ? " preview-rail--inline" : "") + '">' +
        phoneMarkup() +
      "</aside>"
    );
  }

  /* ------------------------------------------------------------
     Links page
     ------------------------------------------------------------ */
  function linkCard(l) {
    const kind = S.LINK_TYPES[l.kind] ? l.kind : "link";
    const isBlock = isBlockLink(l);
    const typeMeta = S.LINK_TYPES[kind];
    const iconName = l.kind === "social" && l.platform ? S.SOCIAL_PLATFORMS[l.platform].icon : typeMeta.icon;
    const clicks = l.clicks || 0;
    const facts = [];
    if (kind === "product" && priceLabel(l.price)) facts.push(priceLabel(l.price));
    if (kind === "event" && l.date) facts.push(shortDate(l.date));
    if (l.note) facts.push(l.note);
    const expanded = facts.length > 0;

    return (
      '<article class="link-card link-card--k-' + kind + (expanded ? " link-card--expanded" : "") + (l.active ? "" : " link-card--off") + '" data-id="' + l.id + '" draggable="true">' +
        '<div class="link-card__handle" title="Drag to reorder">' + icon("drag", 15) + "</div>" +
        '<div class="link-card__body">' +
          '<span class="link-card__accent"></span>' +
          '<div class="link-card__top">' +
            '<span class="link-card__kind">' + icon(iconName, 12) + esc(typeMeta.name) + "</span>" +
            '<span class="link-card__title">' + esc(l.title) + "</span>" +
            '<button class="link-card__edit" data-action="edit-link" data-id="' + l.id + '" title="Rename">' + icon("pencil", 12) + "</button>" +
            '<div class="link-card__actions">' +
              '<button class="meta-icon" data-action="copy-link" data-id="' + l.id + '" title="Share">' + icon("share", 14) + "</button>" +
              '<button class="switch" role="switch" aria-checked="' + (l.active ? "true" : "false") + '" data-action="toggle-link" data-id="' + l.id + '" title="' + (l.active ? "Disable" : "Enable") + '"></button>' +
            "</div>" +
          "</div>" +
          '<div class="link-card__url">' +
            (isBlock
              ? '<span class="link-card__block">' + (kind === "header" ? "Heading" : "Paragraph") + " — shown on your page, not clickable</span>"
              : '<input type="text" value="' + esc(l.url) + '" placeholder="URL" data-action="url-input" data-id="' + l.id + '" aria-label="URL for ' + esc(l.title) + '">') +
            '<button class="link-card__edit" data-action="edit-link" data-id="' + l.id + '" title="Edit link">' + icon("pencil", 12) + "</button>" +
          "</div>" +
          '<div class="link-card__meta">' +
            '<button class="meta-icon' + (l.kind === "social" ? " meta-icon--on" : "") + '" data-action="link-type" data-id="' + l.id + '" title="' + esc(typeMeta.name) + '">' + icon(iconName, 15) + "</button>" +
            '<button class="meta-icon" data-action="toast" data-msg="Thumbnail picker — coming soon" title="Thumbnail">' + icon("image", 15) + "</button>" +
            '<button class="meta-icon" data-action="toast" data-msg="Featured links — coming soon" title="Featured">' + icon("star", 15) + "</button>" +
            '<button class="meta-icon" data-action="add-collection" title="Save to collection">' + icon("bookmark", 15) + "</button>" +
            '<button class="meta-icon" data-action="toggle-link" data-id="' + l.id + '" title="Archive">' + icon("archive", 15) + "</button>" +
            '<button class="meta-icon" data-action="link-stats" data-id="' + l.id + '" title="Performance">' + icon("chart", 15) + "</button>" +
            (S.layout() === "custom" && !isBlock ? '<button class="meta-icon" data-action="cycle-span" data-id="' + l.id + '" title="Tile size">' + icon("grid", 15) + "</button>" : "") +
            '<span class="meta-count">' + (isBlock ? "content block" : S.fmtNum(clicks) + " clicked") + "</span>" +
            '<div class="link-card__meta-right">' +
              '<button class="meta-icon meta-icon--hover" data-action="move-link" data-id="' + l.id + '" data-dir="-1" title="Move up">' + icon("chevronUp", 14) + "</button>" +
              '<button class="meta-icon meta-icon--hover" data-action="move-link" data-id="' + l.id + '" data-dir="1" title="Move down">' + icon("chevronDown", 14) + "</button>" +
              '<button class="meta-icon" data-action="copy-link" data-id="' + l.id + '" title="Copy link">' + icon("copy", 14) + "</button>" +
            "</div>" +
          "</div>" +
        "</div>" +
        (expanded ? '<div class="link-card__note">' + facts.map(esc).join(" · ") + "</div>" : "") +
      "</article>"
    );
  }

  function linksPage() {
    const s = S.state;
    const view = s.settings.viewMode || "list";
    const list = s.links.length
      ? s.links.map(linkCard).join("")
      : '<div class="empty">' + icon("link", 22) + "<h3>No links yet</h3><p>Add your first link and it appears on your page instantly.</p>" +
        '<button class="btn btn--dark btn--sm" data-action="add-link">Add link</button></div>';

    return (
      '<div class="links-layout">' +
        '<div class="links-col">' +
          '<div class="profile-card">' +
            '<div class="profile-head">' +
              '<div class="profile-head__avatar">' + icon("user", 32) + "</div>" +
              '<div class="profile-head__stack">' +
                '<div class="profile-head__name">' + esc(s.profile.title) + "</div>" +
                '<div class="profile-head__bio">' + esc(s.profile.bio) + "</div>" +
                '<div class="socials">' +
                  s.profile.socials.map((p) => {
                    const meta = S.SOCIAL_PLATFORMS[p];
                    return meta ? '<button data-social="' + p + '" title="' + esc(meta.name) + '">' + icon(meta.icon, 15) + "</button>" : "";
                  }).join("") +
                  '<button data-action="add-social" title="Add social">' + icon("plus", 14) + "</button>" +
                "</div>" +
              "</div>" +
            "</div>" +
            '<button class="add-btn" data-action="add-link">' + icon("plus", 13) + " Add</button>" +
          "</div>" +

          '<div class="list-toolbar">' +
            '<button class="tool-link" data-action="add-collection">' + icon("folder", 14) + "Add Collection</button>" +
            '<button class="tool-link tool-link--plain" data-action="view-archive">' + icon("archive", 14) + "View Archive" + icon("chevronRight", 13) + "</button>" +
          "</div>" +

          '<div class="link-list' + (view === "grid" ? " link-list--grid" : "") + '" data-view="' + view + '">' + list + "</div>" +
          layoutCard() +
        "</div>" +
        previewPanel() +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Public address

     `/u/<handle>` needs a server rewrite (Cloudflare Pages, Vercel,
     Netlify). GitHub Pages has no rewrites, so the same page is reachable
     at `#/u/<handle>`; `LINKEY_CONFIG.linkBase` picks between them and
     defaults to hash on *.github.io. Copy always yields a URL that opens.
     ------------------------------------------------------------ */
  function publicLink(handle) {
    const cfg = global.LINKEY_CONFIG || {};
    const raw = handle == null || handle === "" ? S.state.user.handle : handle;
    const name = S.normalizeHandle(raw);
    const encoded = encodeURIComponent(name);
    if (typeof location === "undefined") return "https://linkey.app/" + name;
    if (location.protocol === "file:") return "https://linkey.app/" + name;
    const base = location.pathname.replace(/(?:u\/[^/]+\/?|[^/]*)$/, "") || "/";
    const configured = cfg.linkBase === "path" || cfg.linkBase === "hash" ? cfg.linkBase : "";
    const style = configured || (/\.github\.io$/i.test(location.hostname) ? "hash" : "path");
    return style === "hash"
      ? location.origin + base + "#/u/" + encoded
      : location.origin + base + "u/" + encoded;
  }

  /* ------------------------------------------------------------
     Customize
     ------------------------------------------------------------ */
  const STYLE_COPY = {
    font: "Typeface",
    size: "Text size",
    weight: "Text weight",
    align: "Alignment",
    accent: "Accent",
    fg: "Text colour",
    bg: "Background",
    overlay: "Darken",
    btnFill: "Button fill",
    btnShape: "Button shape",
    btnShadow: "Shadow",
    btnSize: "Button size",
    avatar: "Photo shape"
  };

  /** opt - one little choice button inside a style group. */
  function styleOpt(key, value, label, active, extra) {
    return '<button type="button" class="opt' + (active ? " is-on" : "") + '"' +
      ' data-action="set-style" data-key="' + esc(key) + '" data-value="' + esc(value) + '"' +
      ' aria-pressed="' + (active ? "true" : "false") + '"' + (extra || "") + ">" +
      label + "</button>";
  }

  function styleGroup(key, inner, hint) {
    return '<div class="style-group">' +
      '<div class="style-group__label">' + esc(STYLE_COPY[key] || key) + "</div>" +
      inner +
      (hint ? '<p class="style-group__hint">' + esc(hint) + "</p>" : "") +
    "</div>";
  }

  function typographyCard(st) {
    const fonts = S.FONTS.map((f) =>
      styleOpt("font", f.id, '<span style="font-family:' + f.stack.replace(/"/g, "&quot;") + '">' + esc(f.name) + "</span>", st.font === f.id)
    ).join("");
    const weights = S.STYLE_WEIGHTS.map((w) =>
      styleOpt("weight", String(w), String(w), st.weight === w)
    ).join("");
    return '<div class="card" style="margin-bottom:16px">' +
      '<div class="card__head"><div><div class="card__title">Typography</div>' +
        '<div class="card__sub">The typeface and weight used on your page.</div></div>' +
        '<div class="tag">' + esc((S.FONTS.find((f) => f.id === st.font) || S.FONTS[0]).name) + "</div></div>" +
      '<div class="style-groups">' +
        styleGroup("font", '<div class="opt-grid">' + fonts + "</div>") +
        styleGroup("size",
          '<div class="range-row">' +
            '<input class="range" type="range" min="12" max="20" step="1" value="' + st.size + '" data-style-input="size" aria-label="Text size" />' +
            '<output class="range-out">' + st.size + "px</output>" +
          "</div>") +
        styleGroup("weight", '<div class="opt-grid">' + weights + "</div>") +
        styleGroup("align",
          '<div class="opt-grid">' +
            styleOpt("align", "center", "Centred", st.align === "center") +
            styleOpt("align", "left", "Left", st.align === "left") +
          "</div>") +
      "</div>" +
    "</div>";
  }

  function coloursCard(st) {
    const accentSwatches = ["#ff5000", "#fbc02d", "#1f1f1f", "#ffffff", "#e1306c", "#1db954", "#1877f2", "#6d4aff"]
      .map((c) => '<button type="button" class="swatch' + (st.accent === c ? " is-on" : "") + '"' +
        ' data-action="set-style" data-key="accent" data-value="' + c + '"' +
        ' style="background:' + c + '" aria-label="Accent ' + c + '" aria-pressed="' + (st.accent === c) + '"></button>').join("");
    const gradients = S.GRADIENTS.map((g) =>
      '<button type="button" class="bg-swatch' + (st.bg === "gradient" && st.gradient === g.id ? " is-on" : "") + '"' +
        ' data-action="set-bg-gradient" data-value="' + g.id + '" title="' + esc(g.name) + '"' +
        ' style="background:' + g.css + '" aria-label="' + esc(g.name) + '"></button>').join("");
    return '<div class="card" style="margin-bottom:16px">' +
      '<div class="card__head"><div><div class="card__title">Colours</div>' +
        '<div class="card__sub">Accent, text and the page background.</div></div></div>' +
      '<div class="style-groups">' +
        styleGroup("accent",
          '<div class="swatches">' + accentSwatches +
            '<label class="swatch swatch--pick" title="Custom accent">' +
              '<input type="color" value="' + esc(st.accent) + '" data-style-input="accent" aria-label="Custom accent" />' +
            "</label>" +
          "</div>") +
        styleGroup("fg",
          '<div class="opt-grid">' +
            styleOpt("fg", "", "Follow theme", st.fg === "") +
            styleOpt("fg", "#1f1f1f", "Ink", st.fg === "#1f1f1f") +
            styleOpt("fg", "#ffffff", "White", st.fg === "#ffffff") +
            '<label class="opt opt--pick">Custom' +
              '<input type="color" value="' + esc(st.fg || "#1f1f1f") + '" data-style-input="fg" aria-label="Custom text colour" />' +
            "</label>" +
          "</div>") +
        styleGroup("bg",
          '<div class="opt-grid">' +
            styleOpt("bg", "theme", "Theme", st.bg === "theme") +
            styleOpt("bg", "solid", "Solid", st.bg === "solid") +
            styleOpt("bg", "gradient", "Gradient", st.bg === "gradient") +
            '<label class="opt opt--pick">Colour' +
              '<input type="color" value="' + esc(st.bgColor) + '" data-style-input="bgColor" aria-label="Background colour" />' +
            "</label>" +
          "</div>" +
          '<div class="bg-swatches">' + gradients + "</div>") +
        styleGroup("overlay",
          '<div class="range-row">' +
            '<input class="range" type="range" min="0" max="80" step="10" value="' + st.overlay + '" data-style-input="overlay" aria-label="Darken background" />' +
            '<output class="range-out">' + st.overlay + "%</output>" +
          "</div>") +
      "</div>" +
    "</div>";
  }

  function buttonsCard(st) {
    return '<div class="card" style="margin-bottom:16px">' +
      '<div class="card__head"><div><div class="card__title">Buttons</div>' +
        '<div class="card__sub">Shape, fill and weight of every link button.</div></div></div>' +
      '<div class="style-groups">' +
        styleGroup("btnShape",
          '<div class="opt-grid">' +
            styleOpt("btnShape", "square", "Square", st.btnShape === "square") +
            styleOpt("btnShape", "rounded", "Rounded", st.btnShape === "rounded") +
            styleOpt("btnShape", "pill", "Pill", st.btnShape === "pill") +
          "</div>") +
        styleGroup("btnFill",
          '<div class="opt-grid">' +
            styleOpt("btnFill", "theme", "Theme", st.btnFill === "theme") +
            styleOpt("btnFill", "solid", "Solid", st.btnFill === "solid") +
            styleOpt("btnFill", "soft", "Soft", st.btnFill === "soft") +
            styleOpt("btnFill", "outline", "Outline", st.btnFill === "outline") +
            styleOpt("btnFill", "glass", "Glass", st.btnFill === "glass") +
          "</div>") +
        styleGroup("btnShadow",
          '<div class="opt-grid">' +
            styleOpt("btnShadow", "none", "None", st.btnShadow === "none") +
            styleOpt("btnShadow", "soft", "Soft", st.btnShadow === "soft") +
            styleOpt("btnShadow", "strong", "Lifted", st.btnShadow === "strong") +
          "</div>") +
        styleGroup("btnSize",
          '<div class="opt-grid">' +
            styleOpt("btnSize", "compact", "Compact", st.btnSize === "compact") +
            styleOpt("btnSize", "regular", "Regular", st.btnSize === "regular") +
            styleOpt("btnSize", "large", "Large", st.btnSize === "large") +
          "</div>") +
        styleGroup("avatar",
          '<div class="opt-grid">' +
            styleOpt("avatar", "circle", "Circle", st.avatar === "circle") +
            styleOpt("avatar", "squircle", "Squircle", st.avatar === "squircle") +
            styleOpt("avatar", "square", "Square", st.avatar === "square") +
          "</div>") +
      "</div>" +
      '<div class="style-sample" style="' + S.styleVars() + '" aria-hidden="true">' +
        '<i class="style-sample__btn">Aa</i><i class="style-sample__btn">Aa</i>' +
      "</div>" +
    "</div>";
  }

  function customizePage() {
    const s = S.state;
    const st = S.style();
    const keys = Object.keys(S.THEMES);
    const tiles = keys.map((k) => {
      const t = S.THEMES[k];
      return '<div class="theme-tile">' +
        '<button class="theme-tile__swatch" style="background:' + t.swatch + '" data-action="set-theme" data-theme="' + k + '" aria-pressed="' + (s.profile.theme === k) + '" title="' + esc(t.name) + '">' +
          '<span>Aa</span>' +
          (s.profile.theme === k ? '<span style="position:absolute;top:6px;right:6px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#fff;color:#1f1f1f">' + icon("check", 11) + "</span>" : "") +
        "</button>" +
        '<div class="theme-tile__name">' + esc(t.name) + "</div>" +
      "</div>";
    }).join("");

    return (
      '<div class="page page--wide">' +
        '<div class="page-head">' +
          "<div><h1>Customize</h1><p>Theme, type, colours and buttons — every change lands on the phone as you make it.</p></div>" +
          '<div class="page-head__actions">' +
            '<button class="btn btn--ghost" data-action="reset-style">' + icon("arrowLeft", 14) + " Reset style</button>" +
            '<button class="btn btn--ghost" data-action="open-bio">' + icon("external", 14) + " Preview page</button>" +
            '<button class="btn btn--dark" data-action="copy-public">' + icon("copy", 14) + " Copy link</button>" +
          "</div>" +
        "</div>" +
        '<div class="grid customize-grid">' +
          "<div>" +
            '<div class="card" style="margin-bottom:16px">' +
              '<div class="card__head"><div><div class="card__title">Themes</div><div class="card__sub">' + keys.length + " curated looks · click to apply</div></div>" +
                '<div class="tag">' + esc(S.theme().name) + "</div></div>" +
              '<div class="theme-grid">' + tiles + "</div>" +
            "</div>" +

            layoutCard() +

            typographyCard(st) +
            coloursCard(st) +
            buttonsCard(st) +

            '<div class="card" style="margin-bottom:16px">' +
              '<div class="card__head"><div><div class="card__title">Profile</div><div class="card__sub">Shown at the top of your page</div></div></div>' +
              '<div class="form-stack">' +
                '<div class="form-row">' +
                  '<div class="field"><label>Display name</label><input class="input" id="f-profile-title" value="' + esc(s.profile.title) + '" maxlength="60"></div>' +
                  '<div class="field"><label>Handle</label><input class="input" id="f-profile-handle" value="' + esc(s.user.handle) + '" maxlength="30" data-handle-input></div>' +
                "</div>" +
                '<div class="field"><label>Bio</label><textarea class="input" id="f-profile-bio" maxlength="160" rows="2">' + esc(s.profile.bio) + "</textarea></div>" +
                '<div class="field"><label>Social icons</label><div class="row" style="flex-wrap:wrap;gap:8px">' +
                  Object.keys(S.SOCIAL_PLATFORMS).map((p) => {
                    const on = s.profile.socials.includes(p);
                    return '<button class="btn btn--sm ' + (on ? "btn--dark" : "btn--ghost") + '" data-action="toggle-social" data-platform="' + p + '">' +
                      icon(S.SOCIAL_PLATFORMS[p].icon, 14) + esc(S.SOCIAL_PLATFORMS[p].name) + "</button>";
                  }).join("") +
                "</div></div>" +
                '<div class="row" style="justify-content:flex-end"><button class="btn btn--dark btn--sm" data-action="save-profile">Save profile</button></div>' +
              "</div>" +
            "</div>" +

            '<div class="card" style="margin-bottom:16px">' +
              '<div class="card__head"><div><div class="card__title">Search &amp; social</div><div class="card__sub">What Google and social previews show for your link.</div></div></div>' +
              '<div class="form-stack">' +
                '<div class="field"><label>Page title</label><input class="input" id="f-seo-title" value="' + esc(s.settings.seoTitle) + '" maxlength="70"></div>' +
                '<div class="field"><label>Description</label><textarea class="input" id="f-seo-desc" maxlength="160" rows="2">' + esc(s.settings.seoDescription) + "</textarea></div>" +
                '<div class="field"><label>Your address</label>' +
                  '<div class="row" style="gap:8px"><input class="input" id="f-public-link" value="' + esc(publicLink()) + '" readonly>' +
                  '<button class="btn btn--ghost btn--sm" data-action="copy-public" title="Copy">' + icon("copy", 14) + "</button></div>" +
                  '<div class="muted small" style="margin-top:6px">Custom domains can be connected from Settings → Domain.</div>' +
                "</div>" +
                '<div class="row" style="justify-content:flex-end"><button class="btn btn--dark btn--sm" data-action="save-seo">Save search info</button></div>' +
              "</div>" +
            "</div>" +

            '<div class="card">' +
              '<div class="card__head"><div><div class="card__title">Page settings</div><div class="card__sub">How your public page behaves</div></div></div>' +
              '<div class="switch-row"><div><div class="switch-row__title">Hide Linkey branding</div><div class="switch-row__sub">Remove the small footer badge from your page.</div></div>' +
                '<button class="switch" role="switch" aria-checked="' + (s.settings.hideBranding ? "true" : "false") + '" data-action="toggle-setting" data-key="hideBranding"></button></div>' +
            "</div>" +
          "</div>" +
          '<div style="position:sticky;top:0">' + previewPanel({ inline: true }) +
            '<p class="muted small" style="text-align:center;margin-top:10px">Live preview · saved to this device</p>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Insight
     ------------------------------------------------------------ */
  function insightPage() {
    const s = S.state;
    const ctr = s.stats.views ? ((s.stats.clicks / s.stats.views) * 100).toFixed(1) : "0.0";
    // Growth chips have to come from the numbers on this device. The daily
    // series holds the last 14 days, so clicks can be compared week on week;
    // views and contacts cannot be, and get no chip rather than a guess.
    const daily = s.stats.daily || [];
    const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
    const thisWeek = sum(daily.slice(-7));
    const lastWeek = sum(daily.slice(0, 7));
    const weekDelta = lastWeek > 0
      ? (function () {
          const pct = ((thisWeek - lastWeek) / lastWeek) * 100;
          const n = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
          return (n > 0 ? "+" : "") + n + "% vs last week";
        })()
      : "";
    const month = S.today().slice(0, 7);
    const newContacts = s.contacts.filter((c) => String(c.joined || "").slice(0, 7) === month).length;
    // Nothing in the beta counts a stranger's visit, so an account with no
    // history gets a plain explanation instead of four zeroes and no context.
    const hasHistory = (s.stats.clicks || 0) + (s.stats.views || 0) > 0;
    const sources = s.stats.sources.length
      ? s.stats.sources.map((x) =>
          '<div style="margin-bottom:12px">' +
            '<div class="row row--between" style="font-size:11.5px;margin-bottom:6px"><span>' + esc(x.label) + "</span><span class=\"muted\">" + x.value + "%</span></div>" +
            '<div style="height:6px;background:#f4f4f4;border-radius:99px;overflow:hidden"><div style="width:' + x.value + '%;height:100%;background:#ff5000;border-radius:99px"></div></div>' +
          "</div>"
        ).join("")
      : '<p class="muted small" style="margin:4px 0 0">No traffic yet. Share your page and the sources appear here.</p>';

    const top = s.links.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map((l) =>
      "<tr><td class=\"table__title\">" + esc(l.title) + '</td><td class="muted">' + esc(S.hostOf(l.url)) + "</td><td>" + S.fmtNum(l.views) + "</td><td>" + S.fmtNum(l.clicks) + "</td>" +
      "<td>" + (l.active ? '<span class="pill pill--green">Live</span>' : '<span class="pill">Off</span>') + "</td></tr>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Insight</h1><p>Last 14 days · saved on this device</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--ghost" data-action="export-links">' + icon("download", 14) + " Export</button></div></div>" +

        (hasHistory ? "" : '<p class="muted small" style="margin:-6px 0 16px">Visit and click tracking is not switched on in the beta yet, so these numbers stay at zero. The link list below is your page, as published.</p>') +

        '<div class="grid grid--4" style="margin-bottom:16px">' +
          statCard("Page views", S.fmtNum(s.stats.views), "", "eye") +
          statCard("Clicks", S.fmtNum(s.stats.clicks), weekDelta, "chart", !(thisWeek >= lastWeek)) +
          statCard("Click-through", ctr + "%", "", "sparkles") +
          statCard("Contacts", S.fmtNum(s.contacts.length), newContacts ? "+" + newContacts + " this month" : "", "users") +
        "</div>" +

        '<div class="grid grid--2" style="margin-bottom:16px">' +
          '<div class="card"><div class="card__head"><div class="card__title">Clicks</div><div class="chart-legend"><span><i style="background:#ff5000"></i>Clicks</span></div></div>' +
            lineChart(s.stats.daily) + "</div>" +
          '<div class="card"><div class="card__head"><div class="card__title">Traffic sources</div><div class="tag">14 days</div></div>' + sources + "</div>" +
        "</div>" +

        '<div class="card"><div class="card__head"><div class="card__title">Top links</div><div class="tag">' + s.links.length + " links</div></div>" +
          '<table class="table"><thead><tr><th>Link</th><th>Destination</th><th>Views</th><th>Clicks</th><th>Status</th></tr></thead><tbody>' +
            (top || '<tr><td colspan="5" class="muted small">No links yet — add one and its numbers appear here.</td></tr>') +
          "</tbody></table>" +
        "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Audience
     ------------------------------------------------------------ */
  function audiencePage() {
    const s = S.state;
    const total = s.contacts.length;
    const subscribed = s.contacts.filter((c) => c.status === "subscribed").length;
    // Every number on this page comes from the contacts that exist. The demo
    // build showed "+4 this month", "75% of list" and a top source named after
    // a sample link even when the list was empty.
    const month = S.today().slice(0, 7);
    const added = s.contacts.filter((c) => String(c.joined || "").slice(0, 7) === month).length;
    const counts = {};
    s.contacts.forEach((c) => {
      const src = String(c.source || "Direct").trim() || "Direct";
      counts[src] = (counts[src] || 0) + 1;
    });
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
    const rows = s.contacts.map((c) =>
      "<tr><td><div class=\"row\"><span class=\"avatar-sm\">" + esc(S.initials(c.name)) + "</span><div><div class=\"table__title\">" + esc(c.name) + '</div><div class="muted small">' + esc(c.email) + "</div></div></div></td>" +
      "<td>" + esc(c.source) + "</td><td>" + esc(c.joined) + "</td>" +
      "<td>" + (c.status === "subscribed" ? '<span class="pill pill--green">Subscribed</span>' : '<span class="pill">Unsubscribed</span>') + "</td>" +
      '<td style="text-align:right"><button class="icon-btn" style="width:30px;height:30px" data-action="remove-contact" data-id="' + c.id + '" title="Remove">' + icon("trash", 14) + "</button></td></tr>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Audience</h1><p>Everyone who gave you an email through your page.</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--ghost" data-action="export-csv">' + icon("download", 14) + ' Export</button>' +
          '<button class="btn btn--dark" data-action="add-contact">' + icon("plus", 14) + " Add contact</button></div></div>" +

        '<div class="grid grid--3" style="margin-bottom:16px">' +
          statCard("Total contacts", String(total), total ? "+" + added + " this month" : "No signups yet", "users") +
          statCard("Subscribed", String(subscribed), total ? Math.round((subscribed / total) * 100) + "% of list" : "Nothing yet", "checkCircle") +
          statCard("Top source", top || "—", top ? Math.round((counts[top] / total) * 100) + "% of signups" : "No source yet", "sparkles") +
        "</div>" +

        '<div class="card"><div class="card__head"><div class="card__title">Contacts</div>' +
          '<div class="searchbox">' + icon("search", 14) + '<input placeholder="Search contacts" data-action="filter-contacts"></div></div>' +
          (rows ? '<table class="table"><thead><tr><th>Person</th><th>Source</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>"
                : '<div class="empty">' + icon("users", 20) + "<h3>No contacts yet</h3><p>Signup forms are not available in the beta yet, so nobody can subscribe from your page. You can add contacts by hand in the meantime.</p></div>") +
        "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Earn / Earning
     ------------------------------------------------------------ */
  function earnPage() {
    const s = S.state;
    const revenue = s.stats.revenue;
    // Derived from the products, so orders / revenue / average multiply out.
    const totals = S.productTotals(s.products);
    const orders = totals.orders;
    const avgOrder = totals.avgOrder;
    // The sample ledger belongs to the demo account; a new account has none.
    const tx = revenue > 0 ? [
      { label: "Vintage Type Pack", who: "Maya Kapoor", amount: 24, date: "2026-10-24", status: "Paid" },
      { label: "Creator Starter Kit", who: "Leo Martins", amount: 49, date: "2026-10-22", status: "Paid" },
      { label: "Vintage Type Pack", who: "Ada Chen", amount: 24, date: "2026-10-21", status: "Paid" },
      { label: "Poster — Halcyon", who: "Sam Okafor", amount: 18, date: "2026-10-19", status: "Pending" }
    ] : [];
    const rows = tx.map((t) =>
      "<tr><td class=\"table__title\">" + esc(t.label) + '</td><td class="muted">' + esc(t.who) + "</td><td>" + esc(t.date) + "</td><td>" + S.money(t.amount) + "</td>" +
      "<td>" + (t.status === "Paid" ? '<span class="pill pill--green">Paid</span>' : '<span class="pill pill--amber">Pending</span>') + "</td></tr>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Earn</h1><p>Turn the attention you already have into income.</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--dark" data-action="payout">' + icon("card", 14) + " Withdraw</button></div></div>" +

        '<div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:16px">' +
          '<div class="card" style="background:#1f1f1f;color:#fff;border-color:#1f1f1f">' +
            '<div class="row row--between"><div class="stat__label" style="color:#a9a9a9">' + icon("wallet", 13) + 'Available balance</div><span class="pill" style="background:#2e2e2e;color:#dcdcdc">USD</span></div>' +
            '<div style="font-size:38px;font-weight:700;letter-spacing:-.03em;margin:10px 0 4px">' + S.money(revenue) + "</div>" +
            '<div class="small" style="color:#a9a9a9">' + (revenue > 0 ? "Next payout · Nov 1 · Stripe" : "No payouts yet · connect Stripe to start") + "</div>" +
            '<div class="row" style="margin-top:18px;gap:8px"><button class="btn btn--accent btn--sm" data-action="payout">Withdraw</button>' +
              '<button class="btn btn--sm" style="background:#2e2e2e;color:#fff" data-action="payout-settings">Payout settings</button></div>' +
          "</div>" +
          '<div class="card"><div class="card__head"><div class="card__title">Revenue</div><div class="tag">' + (revenue > 0 ? "6 months" : "14 days") + '</div></div>' +
            lineChart(revenue > 0 ? [120, 180, 150, 240, 320, 486] : s.stats.daily, { height: 150 }) + "</div>" +
        "</div>" +

        '<div class="grid grid--3" style="margin-bottom:16px">' +
          statCard("Products live", String(s.products.filter((p) => p.status === "live").length), "", "cart") +
          statCard("Orders", String(orders), orders ? "+12 this week" : "", "tag") +
          statCard("Avg. order", S.money(avgOrder), orders ? "+3.1%" : "", "chart") +
        "</div>" +

        '<div class="card"><div class="card__head"><div class="card__title">Transactions</div><div class="tag">Last 30 days</div></div>' +
          '<table class="table"><thead><tr><th>Item</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="muted small">No sales yet. Add a product to start selling.</td></tr>') +
          "</tbody></table>" +
        "</div>" +
      "</div>"
    );
  }

  function earningPage() {
    const s = S.state;
    // These totals are the demo account's ledger. A new account has none.
    const hasSales = s.stats.revenue > 0;
    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Earning</h1><p>Every payout, fee and refund in one ledger.</p></div></div>' +
        '<div class="grid grid--4" style="margin-bottom:16px">' +
          statCard("Lifetime", S.money(hasSales ? 2841.6 : 0), "", "wallet") +
          statCard("This month", S.money(s.stats.revenue), hasSales ? "+22%" : "", "chart") +
          statCard("Pending", S.money(hasSales ? 18 : 0), hasSales ? "1 order" : "", "clock") +
          statCard("Fees", S.money(hasSales ? 84.3 : 0), hasSales ? "3.1% of sales" : "", "card") +
        "</div>" +
        '<div class="card"><div class="card__head"><div class="card__title">Payout history</div></div>' +
          '<table class="table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
            (hasSales
              ? "<tr><td>2026-10-01</td><td>Stripe · •••• 4242</td><td>" + S.money(184.2) + '</td><td><span class="pill pill--green">Sent</span></td></tr>' +
                "<tr><td>2026-09-01</td><td>Stripe · •••• 4242</td><td>" + S.money(142.8) + '</td><td><span class="pill pill--green">Sent</span></td></tr>' +
                "<tr><td>2026-08-01</td><td>Stripe · •••• 4242</td><td>" + S.money(96.5) + '</td><td><span class="pill pill--green">Sent</span></td></tr>'
              : '<tr><td colspan="4" class="muted small">No payouts yet. Sales through your shop appear here once you connect Stripe.</td></tr>') +
          "</tbody></table></div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Shop
     ------------------------------------------------------------ */
  function shopPage() {
    const s = S.state;
    // Everything on this page has to agree: the cards below show price × sold,
    // so revenue, orders and average order value all come from the same list.
    const totals = S.productTotals(s.products);
    const orders = totals.orders;
    const cards = s.products.map((p) =>
      '<div class="card" style="padding:0;overflow:hidden">' +
        '<div style="height:120px;background:linear-gradient(150deg,#f7f1dc,#e7dccb);display:grid;place-items:center;color:#8a7a5a">' + icon("image", 26) + "</div>" +
        '<div style="padding:14px 16px">' +
          '<div class="row row--between"><span class="tag">' + esc(p.type) + "</span>" +
            (p.status === "live" ? '<span class="pill pill--green">Live</span>' : '<span class="pill">Draft</span>') + "</div>" +
          '<div class="table__title" style="margin-top:10px;font-size:13.5px">' + esc(p.name) + "</div>" +
          '<div class="row row--between" style="margin-top:8px"><span class="muted small">' + S.money(p.price) + "</span><span class=\"muted small\">" + p.sales + " sold</span></div>" +
          '<div class="row" style="margin-top:12px;gap:6px"><span style="flex:1"></span>' +
            '<button class="btn btn--soft btn--sm" data-action="edit-product" data-id="' + p.id + '">Edit</button></div>' +
        "</div>" +
      "</div>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Shop</h1><p>Draft digital products, courses and physical goods for your page.</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--dark" data-action="add-product">' + icon("plus", 14) + " New product</button></div></div>" +
        '<p class="muted small" style="margin:-6px 0 16px">Checkout is not live in the beta. Products are saved on this device only and nothing is charged.</p>' +
        '<div class="grid grid--3" style="margin-bottom:16px">' +
          statCard("Revenue", S.money(totals.revenue), orders ? "+22% this month" : "", "wallet") +
          statCard("Orders", String(orders), orders ? "+12" : "", "cart") +
          statCard("Avg. order", S.money(totals.avgOrder), orders ? "Across all products" : "", "tag") +
        "</div>" +
        '<div class="grid grid--3">' +
          (cards || '<div class="empty" style="grid-column:1/-1">' + icon("cart", 22) +
            "<h3>No products yet</h3><p>Add a product to draft it here. It goes live once checkout exists.</p>" +
            '<button class="btn btn--dark btn--sm" data-action="add-product">New product</button></div>') +
        "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Planner
     ------------------------------------------------------------ */
  function plannerPage() {
    const s = S.state;
    const times = ["09:00", "12:00", "15:00", "18:00"];
    // The grid is the current week, not a frozen October. A post scheduled
    // for next Tuesday has to land on next Tuesday's cell.
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((n, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      return { label: n + " " + d.getDate(), date: iso(d) };
    });
    const days = week.map((d) => d.label);
    const slot = (di, t) => s.posts.filter((p) => p.date === week[di].date && String(p.time || "").slice(0, 2) === t.slice(0, 2));
    let grid = '<div class="week__cell week__head"></div>' + days.map((d) => '<div class="week__cell week__head">' + d + "</div>").join("");
    times.forEach((t, ti) => {
      grid += '<div class="week__cell week__time">' + t + "</div>";
      days.forEach((d, di) => {
        const posts = slot(di, t);
        grid += '<div class="week__cell">' + (posts.length
          ? posts.map((p) => '<div class="post-chip">' + esc(p.channel) + " · " + esc(p.title) + "</div>").join("")
          : "") + "</div>";
      });
    });

    const upcoming = s.posts.map((p) =>
      "<tr><td class=\"table__title\">" + esc(p.title) + '</td><td><span class="pill pill--accent">' + esc(p.channel) + "</span></td><td>" + esc(p.date) + " · " + esc(p.time) + "</td>" +
      "<td>" + (p.status === "scheduled" ? '<span class="pill pill--green">Scheduled</span>' : '<span class="pill">Draft</span>') + "</td></tr>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Social planner</h1><p>Plan your week, then post when you are ready.</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--ghost" data-action="connect-social">' + icon("share", 14) + ' Connect account</button>' +
          '<button class="btn btn--dark" data-action="new-post">' + icon("plus", 14) + " Schedule post</button></div></div>" +
        '<p class="muted small" style="margin:-6px 0 16px">Posts are saved to your planner. Publishing to a network needs that account connected — not available in the beta yet.</p>' +
        '<div class="card" style="margin-bottom:16px;padding:0;overflow:hidden"><div class="week">' + grid + "</div></div>" +
        '<div class="card"><div class="card__head"><div class="card__title">Upcoming</div><div class="tag">' + s.posts.length + " posts</div></div>" +
          '<table class="table"><thead><tr><th>Post</th><th>Channel</th><th>When</th><th>Status</th></tr></thead><tbody>' + upcoming + "</tbody></table></div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Auto reply / Shortener / Ideas
     ------------------------------------------------------------ */
  function autoreplyPage() {
    const s = S.state;
    const rows = s.rules.map((r) =>
      '<div class="card" style="margin-bottom:12px"><div class="row row--between">' +
        '<div class="row"><span class="avatar-sm">' + icon("message", 14) + '</span><div><div class="table__title">' + esc(r.trigger) + '</div><div class="muted small">' + esc(r.reply) + "</div></div></div>" +
        '<div class="row" style="gap:10px"><span class="pill ' + (r.active ? "pill--green" : "") + '">' + (r.active ? "Active" : "Paused") + "</span>" +
        '<button class="switch" role="switch" aria-checked="' + (r.active ? "true" : "false") + '" data-action="toggle-rule" data-id="' + r.id + '"></button></div>' +
      "</div></div>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Auto reply</h1><p>Answer DMs and comments automatically, 24/7.</p></div>' +
          '<div class="page-head__actions"><button class="btn btn--dark" data-action="add-rule">' + icon("plus", 14) + " New rule</button></div></div>" +
        rows +
        '<div class="empty" style="margin-top:8px">' + icon("message", 20) + "<h3>How it works</h3><p>Pick a trigger (new follower, keyword, story reply). Rules are saved here; delivering replies needs a connected channel, which is not available in the beta yet.</p></div>" +
      "</div>"
    );
  }

  function shortenerPage() {
    const s = S.state;
    const rows = s.shortLinks.map((l) =>
      "<tr><td class=\"table__title\">linkey.app/s/" + esc(l.slug) + "</td><td class=\"muted\">" + esc(l.target) + "</td><td>" + S.fmtNum(l.clicks) + "</td><td>" + esc(l.created) + "</td>" +
      '<td style="text-align:right"><button class="icon-btn" style="width:30px;height:30px" data-action="copy-short" data-id="' + l.id + '" title="Copy">' + icon("copy", 14) + "</button></td></tr>"
    ).join("");

    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Link shortener</h1><p>Short links you can keep track of.</p></div></div>' +
        '<p class="muted small" style="margin:-6px 0 16px">Links are saved to this account. Redirects need a custom domain, which the beta does not resolve yet — until then, use the destination URL itself.</p>' +
        '<div class="card" style="margin-bottom:16px"><div class="card__head"><div class="card__title">Create a short link</div></div>' +
          '<div class="row" style="gap:10px;flex-wrap:wrap">' +
            '<div class="field" style="flex:1;min-width:200px"><label>Destination URL</label><input class="input" id="f-short-target" placeholder="https://…"></div>' +
            '<div class="field" style="width:200px"><label>Custom slug</label><input class="input" id="f-short-slug" placeholder="vintage"></div>' +
            '<button class="btn btn--dark" style="align-self:flex-end" data-action="create-short">' + icon("scissors", 14) + " Shorten</button>" +
          "</div></div>" +
        '<div class="card"><div class="card__head"><div class="card__title">Your links</div><div class="tag">' + s.shortLinks.length + " total</div></div>" +
          '<table class="table"><thead><tr><th>Short link</th><th>Destination</th><th>Clicks</th><th>Created</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      "</div>"
    );
  }

  function ideasPage() {
    const ideas = [
      { t: "Show the messy middle", d: "Post the draft, not just the final. Process content is easy to save and easy to make.", tag: "Carousel" },
      { t: "3 tools I use daily", d: "A quick list post with one line per tool. Easy to film, easy to save.", tag: "Reel" },
      { t: "Answer a real DM", d: "Turn your most-asked question into a 20-second answer.", tag: "Story" },
      { t: "Before / after", d: "Same layout, two type systems. Let the difference do the talking.", tag: "Carousel" },
      { t: "What I'd tell my past self", d: "Short, personal, opinionated. Great for comments.", tag: "Text" },
      { t: "Behind the store drop", d: "Tease the product, link it in bio. Drive clicks while it's warm.", tag: "Reel" }
    ];
    return (
      '<div class="page">' +
        '<div class="page-head"><div><h1>Post ideas</h1><p>A starter library of prompts — pick one and schedule it.</p></div></div>' +
        '<div class="grid grid--3">' + ideas.map((i) =>
          '<div class="card"><div class="row row--between"><span class="tag">' + esc(i.tag) + "</span>" + icon("bulb", 15) + "</div>" +
          '<div class="table__title" style="margin-top:10px;font-size:13.5px">' + esc(i.t) + "</div>" +
          '<div class="muted small" style="margin-top:6px">' + esc(i.d) + "</div>" +
          '<button class="btn btn--soft btn--sm" style="margin-top:12px" data-action="use-idea" data-title="' + esc(i.t) + '">Use idea</button></div>'
        ).join("") + "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Profile / Settings / Notifications
     ------------------------------------------------------------ */
  function profilePage() {
    const s = S.state;
    return (
      '<div class="page" style="max-width:820px">' +
        '<div class="page-head"><div><h1>Profile</h1><p>Your account details and how you sign in.</p></div></div>' +

        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card__head"><div class="card__title">My information</div></div>' +
          '<div class="form-stack">' +
            '<div class="field"><label>Name</label><input class="input" id="f-user-name" value="' + esc(s.user.name) + '"></div>' +
            '<div class="field"><label>Username</label><input class="input" id="f-user-handle" value="' + esc(s.user.handle) + '">' +
              (s.user.handle ? '<div class="muted small" style="margin-top:4px">Your page lives at ' + esc(publicLink(s.user.handle)) + "</div>" : "") +
            "</div>" +
            '<div class="field"><label>Email</label><input class="input" id="f-user-email" value="' + esc(s.user.email) + '"' +
              (s.auth && s.auth.cloud ? " readonly" : "") + ">" +
              (s.auth && s.auth.cloud ? '<div class="muted small" style="margin-top:4px">This is the address you signed in with.</div>' : "") + "</div>" +
            '<div class="field"><label>Tagline</label><input class="input" id="f-user-tagline" value="' + esc(s.user.tagline) + '"></div>' +
            '<div><button class="btn btn--dark btn--sm" data-action="save-user">Save details</button></div>' +
          "</div>" +
        "</div>" +

        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card__head"><div class="card__title">Plan</div></div>' +
          '<div class="switch-row"><div><div class="switch-row__title">Linkey beta</div>' +
            '<div class="switch-row__sub">Every feature is switched on while we test. No card, no charges.</div></div>' +
            '<span class="pill">Free</span></div>' +
          (s.user.handle
            ? '<div class="switch-row"><div><div class="switch-row__title">Public username</div><div class="switch-row__sub">' +
              esc(s.user.handle) + '</div></div><span class="pill">' + (s.auth && s.auth.onboarded ? "Live" : "Draft") + "</span></div>"
            : "") +
        "</div>" +

        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card__head"><div class="card__title">Security and privacy</div></div>' +
          '<div class="switch-row"><div><div class="switch-row__title">' + (s.auth && s.auth.provider === "google" ? "Google" : "Sign-in email") + '</div>' +
            '<div class="switch-row__sub">' + esc(s.user.email || "No address on file") + '</div></div>' +
            '<span class="pill pill--green">' + icon("check", 11) + " Connected</span></div>" +
          '<div class="switch-row"><div><div class="switch-row__title">Multi-factor authentication</div>' +
            '<div class="switch-row__sub">Not available in the beta yet.</div></div>' +
            '<span class="pill">Not set up</span></div>' +
        "</div>" +
        '<div class="card">' +
          '<div class="card__head"><div class="card__title" style="color:var(--red)">Delete account</div></div>' +
          '<p class="muted small" style="margin:0 0 12px">This deletes your page, its links, and the copy saved on this device. It cannot be undone.</p>' +
          '<button class="btn btn--danger btn--sm" data-action="delete-account">Delete account</button>' +
        "</div>" +
      "</div>"
    );
  }

  function settingsPage() {
    const s = S.state;
    const toggle = (key, title, sub) =>
      '<div class="switch-row"><div><div class="switch-row__title">' + esc(title) + '</div><div class="switch-row__sub">' + esc(sub) + "</div></div>" +
      '<button class="switch" role="switch" aria-checked="' + (s.settings[key] ? "true" : "false") + '" data-action="toggle-setting" data-key="' + key + '"></button></div>';

    return (
      '<div class="page" style="max-width:820px">' +
        '<div class="page-head"><div><h1>Settings</h1><p>Domain, discovery and privacy.</p></div></div>' +
        '<div class="card" style="margin-bottom:16px"><div class="card__head"><div class="card__title">Your page</div></div>' +
          '<div class="form-stack">' +
            '<div class="field"><label>Public link</label>' +
              '<div class="row" style="gap:8px">' +
                '<input class="input" id="f-public-link" readonly value="' + esc(S.publicUrl()) + '">' +
                '<button class="btn btn--ghost btn--sm" data-action="copy-public" title="Copy link">' + icon("copy", 14) + " Copy</button>" +
                '<button class="btn btn--ghost btn--sm" data-action="open-bio" title="Open public page">' + icon("external", 14) + "</button>" +
              "</div>" +
              '<div class="muted small" style="margin-top:6px">Anyone with this link sees your published page — no login needed.</div>' +
            "</div>" +
            '<div class="field"><label>Linkey URL</label><input class="input" id="f-setting-domain" value="' + esc(s.settings.domain) + '"></div>' +
            '<div class="field"><label>Custom domain</label><input class="input" id="f-setting-custom" placeholder="links.yourdomain.com" value="' + esc(s.settings.customDomain) + '"></div>' +
            '<div class="field"><label>SEO title</label><input class="input" id="f-setting-seotitle" value="' + esc(s.settings.seoTitle) + '"></div>' +
            '<div class="field"><label>SEO description</label><textarea class="textarea" id="f-setting-seodesc">' + esc(s.settings.seoDescription) + "</textarea></div>" +
            '<div><button class="btn btn--dark btn--sm" data-action="save-settings">Save changes</button></div>' +
          "</div></div>" +
        '<div class="card"><div class="card__head"><div class="card__title">Preferences</div></div>' +
          toggle("hideBranding", "Hide branding", "Remove the Linkey badge from your page.") +
        "</div>" +
        '<div class="card" style="margin-top:16px"><div class="card__head"><div class="card__title">Legal</div></div>' +
          '<div class="list-rows">' +
            legalRow("Terms of service", "What you agree to when you use Linkey.", "legal.html#terms") +
            legalRow("Privacy policy", "What we store, where it lives, and your rights.", "legal.html#privacy") +
            legalRow("Acceptable use", "Content and links that aren’t allowed.", "legal.html#use") +
            legalRow("Trademarks & non-affiliation", "How third-party names and logos are used.", "legal.html#trademarks") +
            legalRow("Copyright / DMCA", "How to report infringing content.", "legal.html#dmca") +
            legalRow("Third-party licences", "Fonts, icons and open-source notices.", "legal.html#licences") +
          "</div>" +
          '<p class="muted small" style="margin:12px 0 0">Linkey is an independent product. It is not affiliated with, endorsed by, or sponsored by Instagram, TikTok, YouTube, Spotify, X or any other platform shown in the link picker. Those names and logos belong to their owners and are used only to identify the service a link points to.</p>' +
        "</div>" +
      "</div>"
    );
  }

  function legalRow(title, sub, href) {
    return '<a class="list-row" href="' + href + '" target="_blank" rel="noopener">' +
      '<div><div class="table__title">' + esc(title) + '</div><div class="muted small">' + esc(sub) + "</div></div>" +
      '<span class="muted">' + icon("chevronRight", 16) + "</span></a>";
  }

  function notificationsPage() {
    const s = S.state;
    const rows = s.notifications.map((n) =>
      '<div class="card" style="margin-bottom:10px;' + (n.unread ? "border-color:#ffd6c2;background:#fffaf7" : "") + '">' +
        '<div class="row row--between"><div class="row"><span class="avatar-sm">' + icon("bell", 14) + "</span>" +
        '<div><div class="table__title">' + esc(n.title) + '</div><div class="muted small">' + esc(n.body) + "</div></div></div>" +
        '<span class="muted small" style="white-space:nowrap">' + esc(n.time) + "</span></div></div>"
    ).join("");
    return (
      '<div class="page" style="max-width:820px">' +
        '<div class="page-head"><div><h1>Notifications</h1><p>' + s.notifications.length + " updates</p></div>" +
          '<div class="page-head__actions"><button class="btn btn--ghost" data-action="mark-read">' + icon("check", 14) + " Mark all read</button></div></div>" +
        rows +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Public bio page

     `view` renders someone else's page from a cloud row. Everything in
     it has already been through Store.publicView, but this function
     escapes it again: a renderer must never trust its input just
     because the caller did.
     ------------------------------------------------------------ */
  function bioPage(view) {
    const remote = !!view;
    const t = remote ? S.themeById(view.theme) : S.theme();
    const u = remote ? { name: view.name, avatar: view.avatar } : S.state.user;
    const profile = remote ? { title: view.name, bio: view.bio } : S.state.profile;
    const layout = remote ? view.layout : S.layout();
    const links = (remote ? view.links : S.buttonLinks()).filter((l) => l.active);
    const socials = remote ? view.socials : S.state.profile.socials;
    const plan = S.layoutPlan(links);
    const st = remote ? view.style : S.style();
    const style = remote ? S.styleVarsFor(view.style, t) : S.styleVars();
    // Settings → Hide branding. The badge is ours, not the owner's, so it
    // follows the switch; the legal links stay either way.
    const hideBrand = remote ? view.hideBranding === true : !!S.state.settings.hideBranding;

    return (
      '<div class="bio-page" data-layout="' + layout + '" data-shape="' + st.btnShape + '" data-align="' + st.align + '" data-avatar="' + st.avatar + '" data-tex="' + (t.tex ? "1" : "0") + '" style="' + style + '">' +
        // The way back is for the owner. A visitor arriving from a shared
        // link should see the page, not an editor they cannot enter.
        (S.isSignedIn() && !remote
          ? '<a class="bio-back btn btn--sm" style="background:rgba(255,255,255,.16);color:inherit;border-color:rgba(255,255,255,.25);backdrop-filter:blur(8px)" href="#/links">' +
            icon("arrowLeft", 14) + " Back to editor</a>"
          : "") +
        '<div class="bio-page__inner">' +
          '<div class="bio-page__avatar">' + (u.avatar ? '<img src="' + esc(u.avatar) + '" alt="">' : '<span style="font-size:26px;font-weight:700">' + esc(S.initials(u.name)) + "</span>") + "</div>" +
          '<div class="bio-page__name">' + esc(profile.title) + "</div>" +
          '<div class="bio-page__bio">' + esc(profile.bio) + "</div>" +
          '<div class="bio-page__socials">' + socialIconRow(t, 18, remote ? { socials: view.socials, links: view.links } : null) + "</div>" +
          '<div class="bio-page__links" data-layout="' + layout + '">' +
            (links.length
              ? links.map((l, i) => {
                  const p = plan[i];
                  const cls = "bio-link " + tileClass(p) + tileKindClass(l) +
                    (isBlockLink(l) ? " bio-link--block" : "");
                  if (isBlockLink(l)) {
                    return '<div class="' + cls + '" style="' + spanStyle(p) + '" data-bio-link="' + l.id + '">' +
                      tileInner(l, p) + "</div>";
                  }
                  return '<a class="' + cls + '" style="' + spanStyle(p) + '" href="' +
                    esc(S.safeUrl(l.url)) + '" target="_blank" rel="noopener" data-bio-link="' + l.id + '">' +
                    tileInner(l, p) + "</a>";
                }).join("")
              : socials.length
                ? ""
                : '<div style="opacity:.6;font-size:12px">No links yet</div>') +
          "</div>" +
          '<div class="bio-page__foot">' + (hideBrand ? "" : brandMark(16) + "Made with linkey") +
            '<span class="bio-page__legal"><a href="legal.html#terms" target="_blank" rel="noopener">Terms</a>' +
            '<a href="legal.html#privacy" target="_blank" rel="noopener">Privacy</a></span>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     A page that is not on this device

     Every account lives in this browser until it is published to a
     cloud row. Showing the visitor's own page under someone else's
     address would be a lie (and a leak), so an unknown handle gets an
     honest empty state instead.
     ------------------------------------------------------------ */
  function missingBioPage(handle) {
    const shown = String(handle || "").replace(/[^a-z0-9._-]/gi, "").slice(0, 40);
    return (
      '<div class="bio-page bio-missing">' +
        '<div class="bio-missing__card">' +
          '<div class="bio-missing__mark">' + brandMark(28) + "</div>" +
          "<h1>@" + esc(shown || "this page") + " hasn’t published here yet</h1>" +
          "<p>No page is published at this address. If it is yours, sign in and check the username in Settings — or create your page in a minute.</p>" +
          '<div class="bio-missing__actions">' +
            '<a class="btn btn--accent" href="#/signup">Create your page</a>' +
            '<a class="btn btn--ghost" href="#/login">Sign in</a>' +
          "</div>" +
          '<div class="bio-missing__foot">' + brandMark(14) + "Made with linkey</div>" +
        "</div>" +
      "</div>"
    );
  }

  function loadingBioPage() {
    return '<div class="bio-page bio-missing"><div class="bio-missing__card bio-missing__card--quiet">' +
      '<div class="bio-missing__mark">' + brandMark(28) + "</div>" +
      "<p>Loading page…</p></div></div>";
  }

  /* ------------------------------------------------------------
     Router → HTML
     ------------------------------------------------------------ */
  const PAGES = {
    links: linksPage,
    shop: shopPage,
    customize: customizePage,
    earn: earnPage,
    earning: earningPage,
    audience: audiencePage,
    insight: insightPage,
    planner: plannerPage,
    autoreply: autoreplyPage,
    shortener: shortenerPage,
    ideas: ideasPage,
    profile: profilePage,
    settings: settingsPage,
    notifications: notificationsPage
  };

  /* ------------------------------------------------------------
     Auth — Log in / Sign up / Forgot
     Geometry from the design's "Login/Sign Up" frame (86083):
     1440 x 1024, white; a 418px column at x=146; a 710px art pane
     at x=730 on #F4F4F4.
     ------------------------------------------------------------ */
  function oauthIcon(provider) {
    if (provider === "apple") {
      return '<svg class="auth__oauth-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
        '<path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';
    }
    return '<svg class="auth__oauth-icon" viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  }

  function authArt() {
    return (
      '<aside class="auth__art" aria-hidden="true">' +
        '<img class="auth__art-a" src="assets/img/auth/photo-1.webp" alt="" width="550" height="550" decoding="async" />' +
        '<img class="auth__art-b" src="assets/img/auth/photo-2.webp" alt="" width="250" height="250" decoding="async" />' +
      "</aside>"
    );
  }

  function authError(field) {
    return '<p class="auth__error" data-auth-error' + (field ? ' data-field="' + field + '"' : "") + " hidden></p>";
  }

  function authPage(mode) {
    const m = mode === "signup" || mode === "forgot" ? mode : "login";
    const copy = {
      login: {
        title: "Welcome back",
        sub: "Log in to your ID",
        cta: "Confirm",
        foot: 'Don’t have an account? <a href="#/signup">Sign Up</a>'
      },
      signup: {
        title: "Create your account",
        sub: "Your page, live in a minute",
        cta: "Create account",
        foot: 'Already have an account? <a href="#/login">Log in</a>'
      },
      forgot: {
        title: "Forgot your details?",
        sub: "Enter your email and we’ll send a sign-in link",
        cta: "Send link",
        foot: '<a href="#/login">Back to log in</a>'
      }
    }[m];

    let fields = "";
    if (m === "login") {
      fields =
        '<label class="auth__field">' +
          '<span class="sr-only">Email or username</span>' +
          '<input class="auth__input" type="text" name="identifier" placeholder="Enter your Email or Username" autocomplete="username" autocapitalize="none" spellcheck="false" required />' +
        "</label>";
    } else if (m === "signup") {
      fields =
        '<label class="auth__field">' +
          '<span class="sr-only">Your name</span>' +
          '<input class="auth__input" type="text" name="name" placeholder="Your name" autocomplete="name" maxlength="60" required />' +
        "</label>" +
        '<label class="auth__field">' +
          '<span class="sr-only">Email</span>' +
          '<input class="auth__input" type="email" name="email" placeholder="you@example.com" autocomplete="email" autocapitalize="none" spellcheck="false" required />' +
        "</label>" +
        '<label class="auth__field auth__field--handle">' +
          '<span class="auth__prefix">linkey.app/</span>' +
          '<input class="auth__input" type="text" name="handle" placeholder="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="30" data-handle-input required />' +
        "</label>" +
        '<p class="auth__hint" data-handle-hint></p>';
    } else {
      fields =
        '<label class="auth__field">' +
          '<span class="sr-only">Email</span>' +
          '<input class="auth__input" type="email" name="email" placeholder="you@example.com" autocomplete="email" autocapitalize="none" spellcheck="false" required />' +
        "</label>";
    }

    const cloudOn = !!(global.Cloud && global.Cloud.isConfigured());
    const googleLive = !!(global.Cloud && (cloudOn ? global.Cloud.flag("google") : global.Cloud.googleConfigured()));
    const authMode = (global.Cloud && global.Cloud.mode) ? global.Cloud.mode() : "demo";
    // A provider button is only shown when that provider can actually sign
    // you in. Apple's guidelines in particular do not allow a "Sign in with
    // Apple" button that does not start Apple sign-in, and cloud.js ships
    // with apple off by default.
    const providerOn = (id) => id === "google" ? true : !cloudOn || (global.Cloud && global.Cloud.flag(id));
    const oauthButtons = [
      providerOn("google")
        ? '<button class="auth__oauth" type="button" data-action="oauth" data-provider="google" data-live="' + (googleLive ? "1" : "0") + '">' +
          oauthIcon("google") + "<span>Continue with Google</span></button>"
        : "",
      providerOn("apple")
        ? '<button class="auth__oauth" type="button" data-action="oauth" data-provider="apple">' +
          oauthIcon("apple") + "<span>Continue with Apple</span></button>"
        : ""
    ].join("");
    // The demo notice is not decoration: without keys, Google cannot sign
    // anyone in, and silently creating a local account would look like a
    // successful Google login. Say what is happening, in the visitor's
    // words on a deployed site and in the developer's words on localhost.
    const localDemo = typeof S.demoAllowed === "function" ? S.demoAllowed() : true;
    const notice = cloudOn
      ? ""
      : googleLive
        ? '<p class="auth__note" data-google-note>Google sign-in runs in your browser. ' +
          "No password is stored on this device.</p>"
        : localDemo
          ? '<p class="auth__note auth__note--warn" data-demo-note>' +
            "<b>Google sign-in is not configured yet.</b> Add a public Google client id to " +
            "<code>assets/js/config.js</code> (no secret needed) and the button appears here. " +
            '<button type="button" class="auth__inline-link" data-action="google-help">How to set it up</button>' +
            "</p>"
          : '<p class="auth__note" data-demo-note>' +
            "Google sign-in isn’t connected on this beta yet. Create your account with your email above — " +
            "it works right away. " +
            '<button type="button" class="auth__inline-link" data-action="google-help">Owner setup</button>' +
            "</p>";
    const demoButton = !localDemo || m === "forgot" || cloudOn || googleLive
      ? ""
      : '<button class="auth__demo" type="button" data-action="demo-signin">Explore the demo account instead</button>';
    const socials = m === "forgot" || !oauthButtons
      ? notice + demoButton
      : '<div class="auth__or"><span>Or</span></div>' +
        '<div class="auth__oauths">' + oauthButtons + "</div>" +
        notice + demoButton;

    return (
      '<div class="auth" data-auth="' + m + '" data-cloud="' + (cloudOn ? "1" : "0") + '" data-mode="' + esc(authMode) + '" data-google="' + (googleLive ? "1" : "0") + '">' +
        '<section class="auth__pane">' +
          '<div class="auth__col">' +
            '<a class="auth__home" href="#/links" aria-label="Linkey home">' + brandMark(22) + "</a>" +
            '<h1 class="auth__title">' + esc(copy.title) + "</h1>" +
            '<p class="auth__sub">' + esc(copy.sub) + "</p>" +
            '<form class="auth__box" data-auth-form="' + m + '" novalidate>' +
              fields +
              authError() +
              '<button class="auth__submit" type="submit">' + esc(copy.cta) + "</button>" +
            "</form>" +
            socials +
            (m === "login"
              ? '<div class="auth__links"><a href="#/forgot">Forget Password?</a><a href="#/forgot">Forget Username?</a></div>'
              : "") +
            '<p class="auth__foot">' + copy.foot + "</p>" +
          "</div>" +
        "</section>" +
        authArt() +
      "</div>"
    );
  }

  /* ------------------------------------------------------------
     Setup — the five questions between signing up and a live page

     Geometry and copy from the design's Get_Started_1…5 frames:
       • step 1  goal (three cards)
       • step 2  theme
       • step 3  platforms (twelve chips, max five)
       • step 4  the handles for those platforms + extra URLs
       • step 5  profile image, display name, bio

     Every step offers Back and Skip. Skip advances without validating,
     which is what makes the wizard safe to drop someone into — a beta
     user can always get to a live page in five clicks.
     ------------------------------------------------------------ */
  const SETUP_STEPS = 5;

  /* The picker ships real brand vectors; reuse them here so a chip and the
     matching row in the add-link pop-up cannot show different marks. */
  const PLATFORM_LOGOS = {
    instagram: "instagram.svg",
    facebook: "facebook.svg",
    youtube: "youtube.svg",
    snapchat: "snapchat.svg",
    spotify: "spotify.svg",
    soundcloud: "soundcloud.svg",
    threads: "threads.svg",
    pinterest: "pinterest.svg",
    "youtube-music": "youtube-music.svg",
    tiktok: "tiktok.svg"
  };

  function platformMark(p, size) {
    const s = size || 20;
    const file = PLATFORM_LOGOS[p.id];
    if (file) {
      return '<span class="plat__icon"><img src="assets/icons/providers/' + file + '" alt="" width="' + s + '" height="' + s + '" loading="lazy" decoding="async"></span>';
    }
    if (p.id === "website") return '<span class="plat__icon">' + icon("globe", s - 2) + "</span>";
    // WhatsApp has no vector in the set yet: a tinted monogram, as the
    // add-link picker does for the services it has no mark for.
    return '<span class="plat__icon plat__icon--mono" style="background:#25D366;color:#fff">W</span>';
  }

  function setupDraft() {
    const s = S.state;
    const d = (s.ui && s.ui.setup) || {};
    const platforms = Array.isArray(d.platforms) ? d.platforms.filter((id) => S.platformById(id)) : [];
    return {
      step: Math.min(SETUP_STEPS, Math.max(1, Number(d.step) || 1)),
      handle: d.handle != null ? d.handle : s.user.handle,
      name: d.name != null ? d.name : s.user.name,
      bio: d.bio != null ? d.bio : s.profile.bio,
      avatar: d.avatar != null ? d.avatar : (s.user.avatar || ""),
      goal: d.goal || s.profile.goal || "",
      theme: d.theme || s.profile.theme,
      platforms: platforms.slice(0, S.MAX_PLATFORMS),
      values: d.values && typeof d.values === "object" ? d.values : {},
      extras: Array.isArray(d.extras) && d.extras.length ? d.extras.slice(0, S.MAX_EXTRA_LINKS) : ["", "", ""],
      layout: d.layout || s.profile.layout || "list"
    };
  }

  function setupProgress(step) {
    return '<div class="setup__bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + SETUP_STEPS +
      '" aria-valuenow="' + step + '" aria-label="Setup progress">' +
      Array.from({ length: SETUP_STEPS }, (_, i) => '<i class="' + (i < step ? "is-on" : "") + '"></i>').join("") +
    "</div>";
  }

  function setupNav(step, label) {
    return '<div class="setup__nav">' +
      (step > 1
        ? '<button type="button" class="setup__ghost" data-action="setup-back">' + icon("arrowLeft", 14) + "Back</button>"
        : '<span class="setup__ghost setup__ghost--quiet">Step 1</span>') +
      '<span class="setup__navgap"></span>' +
      '<button type="button" class="setup__skip" data-action="setup-skip">Skip</button>' +
      '<button class="auth__submit setup__primary" type="submit">' + esc(label) + "</button>" +
    "</div>";
  }

  function goalCards(draft) {
    return '<div class="goal-list" role="radiogroup" aria-label="Your goal">' +
      S.ONBOARD_GOALS.map((g) =>
        '<button type="button" class="goal' + (draft.goal === g.id ? " is-on" : "") + '"' +
          ' data-action="setup-goal" data-goal="' + g.id + '" role="radio" aria-checked="' + (draft.goal === g.id) + '">' +
          '<span class="goal__dot"></span>' +
          '<span class="goal__body">' +
            '<span class="goal__title">' + esc(g.title) + "</span>" +
            '<span class="goal__sub">' + esc(g.sub) + "</span>" +
          "</span>" +
        "</button>").join("") +
    "</div>";
  }

  function themeGrid(draft) {
    return '<div class="theme-grid" role="radiogroup" aria-label="Theme">' +
      Object.keys(S.THEMES).map((k) => {
        const t = S.THEMES[k];
        return '<button type="button" class="theme-card' + (draft.theme === k ? " is-on" : "") + '"' +
          ' data-action="setup-theme" data-theme="' + k + '" role="radio" aria-checked="' + (draft.theme === k) + '">' +
          '<span class="theme-card__art" style="background:' + t.swatch + ';color:' + t.fg + '">' +
            '<span class="theme-card__dot"></span><span class="theme-card__line"></span>' +
            '<span class="theme-card__line theme-card__line--short"></span>' +
          "</span>" +
          '<span class="theme-card__name">' + esc(t.name) + "</span>" +
        "</button>";
      }).join("") +
    "</div>";
  }

  function platformChips(draft) {
    const atMax = draft.platforms.length >= S.MAX_PLATFORMS;
    return '<div class="plat-grid" role="group" aria-label="Platforms">' +
      S.ONBOARD_PLATFORMS.map((p) => {
        const on = draft.platforms.indexOf(p.id) !== -1;
        return '<button type="button" class="plat' + (on ? " is-on" : "") + '"' +
          ' data-action="setup-platform" data-platform="' + p.id + '"' +
          ' aria-pressed="' + (on ? "true" : "false") + '"' +
          (atMax && !on ? " disabled" : "") + ">" +
          platformMark(p, 18) +
          "<span>" + esc(p.name) + "</span>" +
          '<span class="plat__check">' + icon("check", 12) + "</span>" +
        "</button>";
      }).join("") +
    "</div>" +
    '<p class="setup__hintline">' + draft.platforms.length + " of " + S.MAX_PLATFORMS + " selected</p>";
  }

  function linksStep(draft) {
    const chosen = draft.platforms.map((id) => S.platformById(id)).filter(Boolean);
    const rows = chosen.length
      ? chosen.map((p) => {
          const v = draft.values[p.id] || "";
          return '<label class="setup__row">' +
            platformMark(p, 16) +
            '<span class="setup__rowbody">' +
              '<span class="setup__rowlabel">' + esc(p.name) + " · " + esc(p.field) + "</span>" +
              '<input class="auth__input" type="text" name="link-' + p.id + '" value="' + esc(v) + '"' +
                ' placeholder="' + esc(p.hint) + '" autocapitalize="none" spellcheck="false" />' +
            "</span>" +
          "</label>";
        }).join("")
      : '<p class="setup__empty">No platforms picked. Add a link below, or go back and choose where you post.</p>';

    const extras = (draft.extras.length ? draft.extras : ["", "", ""]).slice(0, S.MAX_EXTRA_LINKS);
    return (
      '<div class="setup__section"><div class="setup__label">Selected Links</div>' + rows + "</div>" +
      '<div class="setup__section"><div class="setup__label">Additional Links</div>' +
        extras.map((v, i) =>
          '<label class="setup__row">' +
            '<span class="setup__rowicon">' + icon("link", 16) + "</span>" +
            '<span class="setup__rowbody">' +
              '<span class="setup__rowlabel">URL</span>' +
              '<input class="auth__input" type="url" name="extra-' + (i + 1) + '" value="' + esc(v) + '"' +
                ' placeholder="https://" autocapitalize="none" spellcheck="false" inputmode="url" />' +
            "</span>" +
          "</label>").join("") +
      "</div>"
    );
  }

  function profileStep(draft) {
    const initials = esc(S.initials(draft.name || "U"));
    return (
      '<div class="setup__avatar-row">' +
        '<div class="setup__avatar"' + (draft.avatar ? ' data-has-image="1"' : "") + ">" +
          (draft.avatar
            ? '<img src="' + esc(draft.avatar) + '" alt="" />'
            : "<span>" + initials + "</span>") +
          '<label class="setup__avatar-btn" title="Change photo">' + icon("image", 14) +
            '<input type="file" accept="image/png,image/jpeg,image/webp" data-avatar-input hidden />' +
          "</label>" +
        "</div>" +
        '<div class="setup__avatar-copy"><b>Profile image</b><span>PNG, JPG or WebP up to 2 MB.</span></div>' +
      "</div>" +
      '<label class="auth__field">' +
        '<span class="sr-only">Display name</span>' +
        '<input class="auth__input" type="text" name="name" value="' + esc(draft.name) + '" placeholder="Display Name" maxlength="60" />' +
      "</label>" +
      '<label class="auth__field auth__field--area">' +
        '<span class="sr-only">Bio</span>' +
        '<textarea class="auth__input" name="bio" rows="3" maxlength="160" placeholder="A line about you and what you make.">' + esc(draft.bio) + "</textarea>" +
      "</label>" +
      '<p class="auth__hint auth__hint--count" data-bio-count>' + draft.bio.length + " / 160</p>"
    );
  }

  function setupPage() {
    const d = setupDraft();
    const step = d.step;
    const copy = {
      1: { title: "Which best describes your goal for using this app.", sub: "This helps us personalise your experience." },
      2: { title: "Select a theme", sub: "Pick the style that feels right — you can change it later." },
      3: { title: "Which platform are you on?", sub: "Pick up to five to get started. You can update at any time." },
      4: { title: "Add your links", sub: "Complete the fields below to add your content to your new page." },
      5: { title: "Add profile details", sub: "Add your profile image, name, icon and bio." }
    }[step];

    let body = "";
    if (step === 1) body = goalCards(d);
    else if (step === 2) body = themeGrid(d);
    else if (step === 3) body = platformChips(d);
    else if (step === 4) body = linksStep(d);
    else body = profileStep(d);

    return (
      '<div class="setup" data-step="' + step + '">' +
        '<header class="setup__head">' + brandMark(22) + "<span>Linkey</span>" +
          '<button class="setup__signout" data-action="sign-out">Sign out</button>' +
        "</header>" +
        '<main class="setup__card">' +
          setupProgress(step) +
          '<div class="setup__kicker">Step ' + step + " of " + SETUP_STEPS + "</div>" +
          '<form data-setup-form="' + step + '" novalidate>' +
            '<h1 class="setup__title">' + esc(copy.title) + "</h1>" +
            '<p class="setup__sub">' + esc(copy.sub) + "</p>" +
            body +
            authError() +
            setupNav(step, step === SETUP_STEPS ? "Finish setup" : "Continue") +
          "</form>" +
        "</main>" +
      "</div>"
    );
  }

  /* The screen after the last setup step. It lives on its own route so the
     setup guard cannot bounce the owner away from their own "you're live". */
  function welcomePage() {
    return (
      '<div class="setup">' +
        '<header class="setup__head">' + brandMark(22) + "<span>Linkey</span></header>" +
        '<main class="setup__card setup__card--done">' +
          '<div class="setup__tick">' + icon("check", 22) + "</div>" +
          '<h1 class="setup__title">You’re live</h1>' +
          '<p class="setup__sub">Your page is ready. Add a link and it appears the moment you save it.</p>' +
          '<div class="setup__url"><code>' + esc(publicLink()) + "</code>" +
            '<button class="setup__copy" data-action="copy-public" title="Copy link">' + icon("copy", 15) + "</button></div>" +
          '<div class="setup__nav setup__nav--split">' +
            '<a class="setup__ghost" href="#/links">Go to dashboard</a>' +
            '<button class="auth__submit setup__primary" data-action="open-bio">View your page</button>' +
          "</div>" +
        "</main>" +
      "</div>"
    );
  }

  function render(route, ctx) {
    if (route === "bio") {
      if (ctx && ctx.view) return bioPage(ctx.view);
      if (ctx && ctx.missing) return missingBioPage(ctx.missing);
      if (ctx && ctx.loading) return loadingBioPage();
      return bioPage();
    }
    if (route === "login" || route === "signup" || route === "forgot") return authPage(route);
    if (route === "setup") return setupPage();
    if (route === "welcome") return welcomePage();
    const fn = PAGES[route] || linksPage;
    const body = fn();
    return (
      sidebar(route) +
      '<div class="main">' + topbar(route) +
        '<div class="scroller" id="scroller">' + body + "</div>" +
      "</div>"
    );
  }

  global.Pages = {
    render, phoneMarkup, PAGES, ROUTES, setupDraft, setupPage, bioPage, socialIconRow, publicLink,
    missingBioPage, loadingBioPage,
    // Exposed for tests only; not part of the app surface.
    tileInner, tileNote, tileKindClass, isBlockLink, shortDate, priceLabel
  };
})(window);
