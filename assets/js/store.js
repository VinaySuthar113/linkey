/* Linkey — state, themes and persistence */
(function (global) {
  const KEY = "linkey.state.v1";
  const SEED_VERSION = 2;

  const THEMES = {
    bubblegum: {
      name: "Bubblegum",
      bg: "linear-gradient(160deg,#C5B3FA 0%,#2B1EFF 29%,#EF38AB 74%,#FFD2F7 100%)",
      tex: 1,
      fg: "#F9FBFF",
      btn: "#9354C1", btnBorder: "#9354C1", btnFg: "#FFFFFF", btnHover: "#b778dd",
      swatch: "linear-gradient(160deg,#C5B3FA,#2B1EFF,#EF38AB,#FFD2F7)",
      overlay: "none", overlayOp: 0
    },
    hadalpelagic: {
      name: "Hadalpelagic",
      bg: "#1A1A1A", fg: "#F5F5F5",
      btn: "rgba(255,255,255,.08)", btnBorder: "rgba(255,255,255,.16)", btnFg: "#f5f5f5", btnHover: "rgba(255,255,255,.16)",
      swatch: "linear-gradient(160deg,#2c2c2c,#111)", overlay: "none", overlayOp: 0
    },
    art_gallery: {
      name: "Art Gallery",
      bg: "#212121", fg: "#EDEDED",
      btn: "rgba(255,255,255,.08)", btnBorder: "rgba(255,255,255,.16)", btnFg: "#ededed", btnHover: "rgba(255,255,255,.16)",
      swatch: "linear-gradient(160deg,#2c2c2c,#111)", overlay: "none", overlayOp: 0
    },
    gray_waves: {
      name: "Gray Waves",
      bg: "linear-gradient(160deg,#161B3A 0%,#595E77 50%,#171B32 100%)", fg: "#F0F0F0",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(255,255,255,.3)", btnFg: "#f0f0f0", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#161B3A,#171B32)", overlay: "none", overlayOp: 0
    },
    bistro: {
      name: "Bistro",
      bg: "#666666", fg: "#FFA030",
      btn: "rgba(255,255,255,.22)", btnBorder: "rgba(102,102,102,.16)", btnFg: "#ffa030", btnHover: "rgba(255,255,255,.34)",
      swatch: "linear-gradient(150deg,#8a8a8a,#666666)", overlay: "none", overlayOp: 0
    },
    rave: {
      name: "Rave",
      bg: "#EFEFEF", fg: "#212121",
      btn: "#e8e8e8", btnBorder: "#dcdcdc", btnFg: "#212121", btnHover: "#dddddd",
      swatch: "linear-gradient(135deg,#fff 0 50%,#212121 50% 100%)", overlay: "none", overlayOp: 0
    },
    aoshi: {
      name: "Aoshi",
      bg: "#1a1a1a", fg: "#212121",
      btn: "rgba(255,255,255,.08)", btnBorder: "rgba(255,255,255,.16)", btnFg: "#f5f5f5", btnHover: "rgba(255,255,255,.16)",
      swatch: "linear-gradient(160deg,#2c2c2c,#111)", overlay: "none", overlayOp: 0
    },
    golden_hour: {
      name: "Golden hour",
      bg: "linear-gradient(160deg,#ffb347 0%,#ff7b54 55%,#c2410c 100%)", fg: "#fff6ee",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(255,255,255,.3)", btnFg: "#fff6ee", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#ffb347,#c2410c)", overlay: "none", overlayOp: 0
    },
    sakura: {
      name: "Sakura",
      bg: "linear-gradient(160deg,#FFDCF9 0%,#FF97EE 50%,#FF6AE6 100%)", fg: "#5a2337",
      btn: "rgba(255,255,255,.6)", btnBorder: "rgba(90,35,55,.1)", btnFg: "#5a2337", btnHover: "#fff",
      swatch: "linear-gradient(170deg,#FFDCF9,#FF6AE6)", overlay: "none", overlayOp: 0
    },
    dark_ember: {
      name: "Dark Ember",
      bg: "#2a1a1a", fg: "#FF4A00",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(42,26,26,.16)", btnFg: "#ff4a00", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#4a1a1a,#2a1a1a)", overlay: "none", overlayOp: 0
    },
    dojo: {
      name: "Dojo",
      bg: "linear-gradient(160deg,#548D5D 0%,#DEEFE1 100%)", fg: "#262626",
      btn: "rgba(255,255,255,.5)", btnBorder: "rgba(20,83,45,.12)", btnFg: "#262626", btnHover: "rgba(255,255,255,.72)",
      swatch: "linear-gradient(150deg,#548D5D,#DEEFE1)", overlay: "none", overlayOp: 0
    },
    aesthetic: {
      name: "Aesthetic",
      bg: "#f2efe6", fg: "#552328",
      btn: "#e8dfc4", btnBorder: "#d8d3c5", btnFg: "#552328", btnHover: "#ead6b0",
      swatch: "linear-gradient(150deg,#f2efe6,#d8d3c5)", overlay: "none", overlayOp: 0
    },
    runner: {
      name: "Runner",
      bg: "#1f1f1f", fg: "#D9D9D9",
      btn: "rgba(255,255,255,.08)", btnBorder: "rgba(255,255,255,.16)", btnFg: "#d9d9d9", btnHover: "rgba(255,255,255,.16)",
      swatch: "linear-gradient(160deg,#2c2c2c,#111)", overlay: "none", overlayOp: 0
    },
    slam_dunk: {
      name: "Slam Dunk",
      bg: "#f4f4f4", fg: "#212121",
      btn: "#e8e8e8", btnBorder: "#dcdcdc", btnFg: "#212121", btnHover: "#dddddd",
      swatch: "linear-gradient(135deg,#fff 0 50%,#212121 50% 100%)", overlay: "none", overlayOp: 0
    },
    monolith: {
      name: "Monolith",
      bg: "#2a2a2a", fg: "#999999",
      btn: "rgba(255,255,255,.08)", btnBorder: "rgba(255,255,255,.16)", btnFg: "#999999", btnHover: "rgba(255,255,255,.16)",
      swatch: "linear-gradient(160deg,#3c3c3c,#1a1a1a)", overlay: "none", overlayOp: 0
    },
    sunset_sip: {
      name: "Sunset Sip",
      bg: "#212121", fg: "#FFC92B",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(34,34,34,.16)", btnFg: "#ffc92b", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#3a3a3a,#212121)", overlay: "none", overlayOp: 0
    },
    riviera: {
      name: "Riviera",
      bg: "#f5f5f5", fg: "#1652AA",
      btn: "#e8e8e8", btnBorder: "#dcdcdc", btnFg: "#1652aa", btnHover: "#dddddd",
      swatch: "linear-gradient(135deg,#fff 0 50%,#1652aa 50% 100%)", overlay: "none", overlayOp: 0
    },
    deep_space: {
      name: "Deep Space",
      bg: "#007BD7", fg: "#020202",
      btn: "rgba(255,255,255,.34)", btnBorder: "rgba(255,255,255,.55)", btnFg: "#020202", btnHover: "rgba(255,255,255,.5)",
      swatch: "linear-gradient(160deg,#1a8fe3,#007BD7)", overlay: "none", overlayOp: 0
    },
    stray: {
      name: "Stray",
      bg: "#212121", fg: "#FFC92B",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(34,34,34,.16)", btnFg: "#ffc92b", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#3a3a3a,#212121)", overlay: "none", overlayOp: 0
    },
    summit: {
      name: "Summit",
      bg: "#e9e5da", fg: "#47B989",
      btn: "rgba(255,255,255,.55)", btnBorder: "rgba(51,48,42,.12)", btnFg: "#47b989", btnHover: "#fff",
      swatch: "linear-gradient(150deg,#f2efe6,#d8d3c5)", overlay: "none", overlayOp: 0
    },
    cosmos: {
      name: "Cosmos",
      bg: "#1a1a2e", fg: "#CCB689",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(26,26,46,.16)", btnFg: "#ccb689", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#2a2a4e,#1a1a2e)", overlay: "none", overlayOp: 0
    },
    wildlife: {
      name: "Wildlife",
      bg: "#2d2d2d", fg: "#FF8636",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(45,45,45,.16)", btnFg: "#ff8636", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#3f3f3f,#2d2d2d)", overlay: "none", overlayOp: 0
    },
    speakeasy: {
      name: "Speakeasy",
      bg: "#361507", fg: "#FBFBFB",
      btn: "rgba(255,255,255,.18)", btnBorder: "rgba(54,21,7,.16)", btnFg: "#fbfbfb", btnHover: "rgba(255,255,255,.3)",
      swatch: "linear-gradient(160deg,#4a1f0b,#361507)", overlay: "none", overlayOp: 0
    },
    climber: {
      name: "Climber",
      bg: "linear-gradient(160deg,#D6CAFE 0%,#9E81FE 100%)", fg: "#3a1c5a",
      btn: "rgba(255,255,255,.6)", btnBorder: "rgba(58,28,90,.1)", btnFg: "#3a1c5a", btnHover: "#fff",
      swatch: "linear-gradient(160deg,#D6CAFE,#9E81FE)", overlay: "none", overlayOp: 0
    }
  };

  const SOCIAL_PLATFORMS = {
    instagram: { name: "Instagram", icon: "instagram", color: "#E1306C" },
    tiktok: { name: "TikTok", icon: "tiktok", color: "#111111" },
    youtube: { name: "YouTube", icon: "youtube", color: "#FF0000" },
    x: { name: "X", icon: "xSocial", color: "#111111" },
    facebook: { name: "Facebook", icon: "facebook", color: "#1877F2" },
    spotify: { name: "Spotify", icon: "spotify", color: "#1DB954" },
    // The onboarding platforms that also belong in the icon row. `logo`
    // points at the vector the add-link picker uses, so both surfaces
    // show the same mark. `icon` stays as a fallback that inherits the
    // theme colour.
    threads: { name: "Threads", icon: "link", color: "#111111", logo: "threads.svg" },
    whatsapp: { name: "WhatsApp", icon: "phone", color: "#25D366" },
    snapchat: { name: "Snapchat", icon: "link", color: "#FFFC00", logo: "snapchat.svg" },
    pinterest: { name: "Pinterest", icon: "link", color: "#E60023", logo: "pinterest.svg" },
    soundcloud: { name: "SoundCloud", icon: "link", color: "#FF5500", logo: "soundcloud.svg" },
    "youtube-music": { name: "YouTube Music", icon: "play", color: "#FF0000", logo: "youtube-music.svg" }
  };

  const LINK_TYPES = {
    link: { name: "Link", icon: "link" },
    social: { name: "Social", icon: "instagram" },
    product: { name: "Product", icon: "cart" },
    video: { name: "Video", icon: "play" },
    text: { name: "Text", icon: "type" },
    header: { name: "Header", icon: "type" },
    form: { name: "Form", icon: "mail" },
    event: { name: "Event", icon: "calendar" }
  };

  /* ------------------------------------------------------------
     Onboarding vocabulary

     The five setup steps in the design ask for a goal, a theme,
     up to five platforms, the handles for those platforms plus a
     few extra URLs, and finally the profile. The three lists below
     are the single source for the cards, the chips and the starter
     links, so the wizard, the tests and the seeded account cannot
     disagree about what "Instagram" means.
     ------------------------------------------------------------ */
  const ONBOARD_GOALS = [
    {
      id: "discover",
      title: "I’m here to discover content and creators",
      sub: "I want to see what people are sharing."
    },
    {
      id: "build",
      title: "I’m building my link in bio.",
      sub: "I want to set up my page and start sharing it."
    },
    {
      id: "grow",
      title: "I want to grow my audience.",
      sub: "I want tools to build and understand my following across platforms."
    }
  ];

  /**
   * ONBOARD_PLATFORMS - the twelve chips from the design's step 3.
   *
   * `field` is the label above the input on step 4 ("Username", "Number",
   * "Playlist link"), `kind` is the Linkey link kind it becomes, and
   * `build` turns whatever the owner typed into a safe URL. Returning ""
   * means the value cannot be turned into a valid link, so the row is
   * skipped instead of storing a broken href.
   */
  const ONBOARD_PLATFORMS = [
    { id: "instagram", name: "Instagram", icon: "instagram", kind: "social", field: "Username", hint: "yourname", build: (v) => at("instagram.com/", v) },
    { id: "whatsapp", name: "WhatsApp", icon: "whatsapp", kind: "social", field: "Number", hint: "+91 98765 43210", build: (v) => {
        const digits = String(v || "").replace(/[^\d]/g, "");
        return digits.length >= 6 && digits.length <= 15 ? "https://wa.me/" + digits : "";
      } },
    { id: "facebook", name: "Facebook", icon: "facebook", kind: "social", field: "Username", hint: "yourname", build: (v) => at("facebook.com/", v) },
    { id: "youtube", name: "YouTube", icon: "youtube", kind: "social", field: "Username", hint: "@yourchannel", build: (v) => at("youtube.com/@", v) },
    { id: "snapchat", name: "Snapchat", icon: "snapchat", kind: "social", field: "Username", hint: "yourname", build: (v) => at("snapchat.com/add/", v) },
    { id: "spotify", name: "Spotify", icon: "spotify", kind: "video", field: "Playlist link", hint: "https://open.spotify.com/…", build: (v) => media("https://open.spotify.com/search/", v) },
    { id: "soundcloud", name: "SoundCloud", icon: "soundcloud", kind: "video", field: "Playlist link", hint: "https://soundcloud.com/…", build: (v) => media("https://soundcloud.com/search?q=", v) },
    { id: "threads", name: "Threads", icon: "threads", kind: "social", field: "Username", hint: "yourname", build: (v) => at("threads.net/@", v) },
    { id: "website", name: "Personal Website", icon: "globe", kind: "link", field: "Website", hint: "https://your.site", build: (v) => media("", v) },
    { id: "pinterest", name: "Pinterest", icon: "pinterest", kind: "social", field: "Username", hint: "yourname", build: (v) => at("pinterest.com/", v) },
    { id: "youtube-music", name: "YouTube Music", icon: "youtube-music", kind: "video", field: "Playlist link", hint: "https://music.youtube.com/…", build: (v) => media("https://music.youtube.com/search?q=", v) },
    { id: "tiktok", name: "TikTok", icon: "tiktok", kind: "social", field: "Username", hint: "yourname", build: (v) => at("tiktok.com/@", v) }
  ];

  const MAX_PLATFORMS = 5;
  const MAX_EXTRA_LINKS = 3;

  /** at - "instagram.com/" + "@name " -> https://instagram.com/name */
  function at(prefix, value) {
    const h = String(value || "").trim().replace(/^@+/, "").replace(/\/+$/, "");
    if (!h || /\s/.test(h) || h.length > 80) return "";
    return "https://" + prefix + encodeURIComponent(h).replace(/%2F/gi, "/");
  }

  /** media - accept a pasted URL, otherwise treat the value as a search. */
  function media(prefix, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) {
      const safe = safeUrl(raw);
      return safe === "#" ? "" : safe;
    }
    // No search prefix means the field is a plain address: upgrade a bare
    // domain ("northwind.com") instead of searching for it.
    if (!prefix) {
      const safe = safeUrl(raw);
      return safe === "#" ? "" : safe;
    }
    return prefix + encodeURIComponent(raw);
  }

  function platformById(id) {
    const key = String(id || "");
    return ONBOARD_PLATFORMS.find((p) => p.id === key) || null;
  }

  /** onboardingUrl - safe URL for one platform row, "" when unusable. */
  function onboardingUrl(platformId, value) {
    const p = platformById(platformId);
    if (!p) return "";
    const built = p.build(value);
    return built && safeUrl(built) !== "#" ? built : "";
  }

  /** extraLinkUrl - the "Additional Links" rows: any http(s) URL. */
  function extraLinkUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const safe = safeUrl(raw);
    return safe === "#" ? "" : safe;
  }

  /**
   * starterLinks - the links step 4 creates.
   *
   * `values` is {platformId: typedValue}; `extras` is an array of URLs.
   * Empty rows are skipped, so a half-filled step never saves a dead link.
   */
  function starterLinks(platforms, values, extras) {
    const list = Array.isArray(platforms) ? platforms : [];
    const v = values || {};
    const out = [];
    list.forEach((id) => {
      const p = platformById(id);
      if (!p) return;
      const url = onboardingUrl(p.id, v[p.id]);
      if (!url) return;
      out.push({
        id: uid("lnk"),
        kind: p.kind,
        platform: p.id,
        title: p.name,
        url: url,
        active: true,
        clicks: 0,
        views: 0
      });
    });
    (Array.isArray(extras) ? extras : []).forEach((raw) => {
      const url = extraLinkUrl(raw);
      if (!url) return;
      out.push({
        id: uid("lnk"),
        kind: "link",
        title: titleForUrl(url),
        url: url,
        active: true,
        clicks: 0,
        views: 0
      });
    });
    return out;
  }

  /** titleForUrl - a readable label from a pasted URL. */
  function titleForUrl(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      return host.charAt(0).toUpperCase() + host.slice(1);
    } catch (e) {
      return "Link";
    }
  }

  /* ------------------------------------------------------------
     Layout engine

     The public page can be a List, a Bento-Grid, a plain Grid or a
     Custom grid the owner arranges by hand. Tile spans are decided
     here and only here, so the editor preview and the public page can
     never disagree about how a page looks.

     No network calls, no model, no per-render cost: a link's shape is
     inferred from facts we already hold (kind, host, title length,
     explicit override).
     ------------------------------------------------------------ */
  const LAYOUTS = [
    { id: "list", name: "List" },
    { id: "bento", name: "Bento-Grid" },
    { id: "grid", name: "Grid" },
    { id: "custom", name: "Custom" }
  ];

  const SPANS = ["1x1", "2x1", "1x2", "2x2"];

  /* ------------------------------------------------------------
     Page style — the Customize panel

     A theme is a starting point (background, text, buttons). The style
     object is the owner's on top of it: typeface, size, accent, button
     shape/fill/shadow, background and avatar shape. Every value is
     validated here so a tampered localStorage payload cannot inject CSS
     or an off-site font.

     `styleVars()` is the only place that turns a style into CSS custom
     properties. The public page and the editor preview both call it, so
     they cannot drift.
     ------------------------------------------------------------ */

  // Only stacks that are already on the device: no webfont request, no
  // third-party CSS, nothing to fail offline.
  const FONTS = [
    { id: "rubik", name: "Rubik", stack: "'Rubik', system-ui, -apple-system, 'Segoe UI', sans-serif" },
    { id: "grotesk", name: "Grotesk", stack: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" },
    { id: "editorial", name: "Editorial", stack: "Georgia, 'Iowan Old Style', 'Times New Roman', serif" },
    { id: "mono", name: "Mono", stack: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" },
    { id: "rounded", name: "Rounded", stack: "ui-rounded, 'Segoe UI', 'Trebuchet MS', sans-serif" }
  ];

  const GRADIENTS = [
    { id: "sunset", name: "Sunset", css: "linear-gradient(160deg,#ff9966 0%,#ff5e62 55%,#c0392b 100%)" },
    { id: "ocean", name: "Ocean", css: "linear-gradient(170deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
    { id: "citrus", name: "Citrus", css: "linear-gradient(150deg,#fbc02d 0%,#ff5000 100%)" },
    { id: "lavender", name: "Lavender", css: "linear-gradient(155deg,#e0c3fc 0%,#8ec5fc 100%)" },
    { id: "forest", name: "Forest", css: "linear-gradient(165deg,#134e4a 0%,#0f172a 100%)" },
    { id: "candy", name: "Candy", css: "linear-gradient(150deg,#ffd9e8 0%,#d9f2ff 100%)" },
    { id: "night", name: "Night", css: "linear-gradient(180deg,#0b1020 0%,#1b2a4a 55%,#33507a 100%)" },
    { id: "sand", name: "Sand", css: "linear-gradient(160deg,#e7d3b1 0%,#cdae80 100%)" },
    { id: "mono", name: "Mono", css: "linear-gradient(160deg,#3f3f46 0%,#111113 100%)" },
    { id: "bloom", name: "Bloom", css: "linear-gradient(150deg,#d9f99d 0%,#a7f3d0 100%)" }
  ];

  const STYLE_DEFAULTS = {
    font: "rubik",
    size: 14,
    weight: 600,
    align: "center",
    accent: "#ff5000",
    fg: "",
    bg: "theme",
    bgColor: "#ffffff",
    gradient: "sunset",
    overlay: 0,
    btnFill: "theme",
    btnShape: "rounded",
    btnShadow: "none",
    btnSize: "regular",
    avatar: "circle"
  };

  const BTN_FILLS = ["theme", "solid", "soft", "outline", "glass"];
  const BTN_SHAPES = ["square", "rounded", "pill"];
  const BTN_SHADOWS = ["none", "soft", "strong"];
  const BTN_SIZES = ["compact", "regular", "large"];
  const AVATAR_SHAPES = ["circle", "squircle", "square"];
  const STYLE_SIZES = { min: 12, max: 20 };
  const STYLE_WEIGHTS = [400, 500, 600, 700, 800];
  const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

  function base64Encode(str) {
    if (typeof btoa === "function") return btoa(str);
    // Manual base64 for environments without btoa (Node.js tests).
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    for (let i = 0; i < str.length; i += 3) {
      const b1 = str.charCodeAt(i);
      const b2 = str.charCodeAt(i + 1);
      const b3 = str.charCodeAt(i + 2);
      out += chars[(b1 >> 2) & 63];
      out += chars[((b1 & 3) << 4) | ((b2 !== undefined ? b2 : 0) >> 4)];
      out += b2 !== undefined ? chars[((b2 & 15) << 2) | ((b3 !== undefined ? b3 : 0) >> 6)] : "=";
      out += b3 !== undefined ? chars[b3 & 63] : "=";
    }
    return out;
  }

  function hexToRgb(hex) {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    if (!c) return "rgba(0,0,0," + alpha + ")";
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  /** luminance - 0 (black) … 1 (white). Used to pick readable text. */
  function luminance(hex) {
    const c = hexToRgb(hex);
    if (!c) return 0;
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function pickText(hex) {
    return luminance(hex) > 0.55 ? "#1f1f1f" : "#ffffff";
  }

  function shade(hex, amount) {
    const c = hexToRgb(hex);
    if (!c) return hex;
    const move = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
    const h = (v) => v.toString(16).padStart(2, "0");
    return "#" + h(move(c.r)) + h(move(c.g)) + h(move(c.b));
  }

  /** firstHex - the first colour inside a gradient, for contrast picking. */
  function firstHex(css) {
    const m = String(css || "").match(/#[0-9a-f]{3,6}/i);
    return m ? m[0] : "";
  }

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  /** sanitizeStyle - drop unknown keys, clamp numbers, validate choices. */
  function sanitizeStyle(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const pick = (key, list, fallback) => (list.indexOf(r[key]) >= 0 ? r[key] : fallback);
    const hexOr = (value, fallback) => (HEX.test(String(value || "")) ? String(value).toLowerCase() : fallback);
    return {
      font: (FONTS.find((f) => f.id === r.font) || FONTS[0]).id,
      size: Math.round(clamp(Number(r.size) || STYLE_DEFAULTS.size, STYLE_SIZES.min, STYLE_SIZES.max)),
      weight: STYLE_WEIGHTS.indexOf(Number(r.weight)) >= 0 ? Number(r.weight) : STYLE_DEFAULTS.weight,
      align: pick("align", ["left", "center"], STYLE_DEFAULTS.align),
      accent: hexOr(r.accent, STYLE_DEFAULTS.accent),
      fg: hexOr(r.fg, ""),
      bg: pick("bg", ["theme", "solid", "gradient"], STYLE_DEFAULTS.bg),
      bgColor: hexOr(r.bgColor, STYLE_DEFAULTS.bgColor),
      gradient: (GRADIENTS.find((g) => g.id === r.gradient) || GRADIENTS[0]).id,
      overlay: Math.round(clamp(Number(r.overlay) || 0, 0, 80)),
      btnFill: pick("btnFill", BTN_FILLS, STYLE_DEFAULTS.btnFill),
      btnShape: pick("btnShape", BTN_SHAPES, STYLE_DEFAULTS.btnShape),
      btnShadow: pick("btnShadow", BTN_SHADOWS, STYLE_DEFAULTS.btnShadow),
      btnSize: pick("btnSize", BTN_SIZES, STYLE_DEFAULTS.btnSize),
      avatar: pick("avatar", AVATAR_SHAPES, STYLE_DEFAULTS.avatar)
    };
  }

  /** style - the active page style, always complete and valid. */
  function style() {
    return sanitizeStyle(state.profile && state.profile.style);
  }

  /** setStyle - merge one or more validated values and persist. */
  function setStyle(patch) {
    const next = sanitizeStyle(Object.assign({}, style(), patch || {}));
    state.profile.style = next;
    commit();
    return next;
  }

  function resetStyle() {
    if (state.profile) delete state.profile.style;
    commit();
    return style();
  }

  /** themeById - a theme object from an id, falling back to the default. */
  function themeById(id) {
    return THEMES[id] || THEMES.bubblegum;
  }

  /**
   * styleVars - the CSS custom properties for a page.
   *
   * Background and text are resolved together: choosing a background
   * also picks a readable ink unless the owner set one explicitly.
   */
  function styleVars() {
    return styleVarsFor(style(), theme());
  }

  /**
   * styleVarsFor - the same computation for a style + theme pair.
   * The public page may be rendering someone else's page from a cloud
   * row, so this must not read the device's own state.
   */
  function styleVarsFor(st, t) {
    st = sanitizeStyle(st);
    t = t || THEMES.bubblegum;
    const accent = st.accent;
    const font = (FONTS.find((f) => f.id === st.font) || FONTS[0]).stack;

    let bg = t.bg;
    let ink = st.fg || t.fg;
    if (st.bg === "solid") {
      bg = st.bgColor;
      if (!st.fg) ink = pickText(st.bgColor);
    } else if (st.bg === "gradient") {
      const g = GRADIENTS.find((x) => x.id === st.gradient) || GRADIENTS[0];
      bg = g.css;
      if (!st.fg) ink = pickText(firstHex(g.css));
    }

    let btn = t.btn, border = t.btnBorder, btnFg = t.btnFg, hover = t.btnHover;
    if (st.btnFill === "solid") {
      btn = accent; btnFg = pickText(accent); border = "transparent"; hover = shade(accent, -14);
    } else if (st.btnFill === "soft") {
      btn = rgba(accent, 0.16); btnFg = accent; border = rgba(accent, 0.32); hover = rgba(accent, 0.24);
    } else if (st.btnFill === "outline") {
      btn = "transparent"; btnFg = accent; border = accent; hover = rgba(accent, 0.12);
    } else if (st.btnFill === "glass") {
      btn = "rgba(255,255,255,.18)"; btnFg = ink; border = "rgba(255,255,255,.38)"; hover = "rgba(255,255,255,.28)";
    }

    const radius = { square: "4px", rounded: "14px", pill: "999px" }[st.btnShape];
    const shadow = {
      none: "none",
      soft: "0 6px 18px rgba(0,0,0,.10)",
      strong: "0 12px 28px rgba(0,0,0,.22)"
    }[st.btnShadow];
    const sizing = {
      compact: { size: Math.max(11, st.size - 2), pad: "8px 14px", min: "42px" },
      regular: { size: st.size, pad: "12px 16px", min: "50px" },
      large: { size: st.size + 2, pad: "16px 20px", min: "58px" }
    }[st.btnSize];
    const avatar = {
      circle: "50%",
      squircle: "28%",
      square: "10%"
    }[st.avatar];

    return [
      "--p-bg:" + bg,
      "--p-fg:" + ink,
      "--p-accent:" + accent,
      "--p-btn:" + btn,
      "--p-btn-border:" + border,
      "--p-btn-fg:" + btnFg,
      "--p-btn-hover:" + hover,
      "--p-radius:" + radius,
      "--p-shadow:" + shadow,
      "--p-font:" + font,
      "--p-size:" + sizing.size + "px",
      "--p-pad:" + sizing.pad,
      "--p-minh:" + sizing.min,
      "--p-weight:" + st.weight,
      "--p-align:" + st.align,
      "--p-avatar-radius:" + avatar,
      "--p-overlay:" + (st.overlay / 100),
      "--p-tex:" + (t.tex ? "1" : "0")
    ].join(";");
  }

  // Hosts that almost always want a wide media tile.
  const MEDIA_HOSTS = [
    "youtube.com", "youtu.be", "vimeo.com", "spotify.com", "soundcloud.com",
    "twitch.tv", "podcasts.apple.com", "open.spotify.com"
  ];
  // Hosts that want a wide commerce tile.
  const SHOP_HOSTS = [
    "etsy.com", "gumroad.com", "myshopify.com", "shopify.com", "lemonsqueezy.com",
    "payhip.com", "ko-fi.com", "buymeacoffee.com", "stripe.com"
  ];

  function spanOf(link) {
    return link && SPANS.indexOf(link.span) >= 0 ? link.span : "";
  }

  /**
   * autoSpan - the shape a link deserves when the owner has not chosen one.
   *
   * Rules, in priority order. They are deliberately boring: a wrong guess
   * costs one drag, and every rule is testable.
   */
  function autoSpan(link, index, total) {
    const explicit = spanOf(link);
    if (explicit) return explicit;

    const kind = (link && link.kind) || "link";
    const title = String((link && link.title) || "");
    const host = hostOf(link && link.url).toLowerCase();

    if (link && link.featured) return "2x2";
    if (kind === "header") return "2x1";
    if (kind === "text" || kind === "form") return "2x2";
    if (kind === "social") return "1x1";
    if (kind === "video") return "2x1";
    if (kind === "product") return "2x1";
    if (kind === "event") return "2x1";

    const hasArt = !!(link && (link.thumb || link.cover || link.media));
    if (hasArt) return "2x1";
    if (MEDIA_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "2x1";
    if (SHOP_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "2x1";
    if (title.length > 24) return "2x1";

    // A page with enough material gets a hero tile so the grid has an anchor.
    if (index === 0 && total >= 4) return "2x2";

    return "1x1";
  }

  /**
   * layoutPlan - the whole page as tiles: {id, span, col, row}.
   * Pure: same input, same output, no DOM, no state.
   */
  function layoutPlan(links) {
    const list = Array.isArray(links) ? links : [];
    return list.map((l, i) => {
      const span = autoSpan(l, i, list.length);
      const parts = span.split("x");
      return { id: l.id, span: span, col: Number(parts[0]), row: Number(parts[1]) };
    });
  }

  /** layout - the active layout id, always a known one. */
  function layout() {
    const id = state.profile && state.profile.layout;
    return LAYOUTS.some((l) => l.id === id) ? id : "list";
  }

  function setLayout(key) {
    if (!LAYOUTS.some((l) => l.id === key)) return;
    state.profile.layout = key;
    commit();
  }

  /** cycleSpan - Custom mode: 1x1 -> 2x1 -> 1x2 -> 2x2 -> auto. */
  function cycleSpan(id) {
    const l = state.links.find((x) => x.id === id);
    if (!l) return "";
    const order = ["1x1", "2x1", "1x2", "2x2", ""];
    const cur = order.indexOf(spanOf(l));
    l.span = order[(cur + 1) % order.length] || undefined;
    if (!l.span) delete l.span;
    commit();
    return l.span || "auto";
  }

  const uid = (p) => (p || "id") + "_" + Math.random().toString(36).slice(2, 9);

  function defaultState() {
    return {
      version: 1,
      user: {
        name: "Vinay Suthar",
        handle: "username_01",
        email: "example@gmail.com",
        tagline: "Design that feels personal.",
        avatar: ""
      },
      profile: {
        title: "Username_01",
        bio: "All my work, in one place.",
        theme: "bubblegum",
        layout: "list",
        style: {},
        socials: ["instagram", "tiktok", "youtube", "x"]
      },
      links: [
        { id: uid("lnk"), kind: "social", platform: "instagram", title: "Instagram", url: "https://www.instagram.com/username__01", active: true, clicks: 0, views: 0, note: "Looking for a more visual display?" },
        { id: uid("lnk"), kind: "link", title: "Vintage Store", url: "https://shop.linkey.app/vintage", active: true, clicks: 128, views: 940 },
        { id: uid("lnk"), kind: "link", title: "Featured clip series", url: "https://youtube.com/@username_01", active: true, clicks: 86, views: 612 },
        { id: uid("lnk"), kind: "link", title: "Design tips", url: "https://linkey.app/tips", active: true, clicks: 54, views: 388 },
        { id: uid("lnk"), kind: "link", title: "Contact", url: "mailto:hello@linkey.app", active: true, clicks: 31, views: 204 }
      ],
      collections: [
        { id: uid("col"), name: "Launches", count: 0 },
        { id: uid("col"), name: "Freebies", count: 0 }
      ],
      products: [
        { id: uid("prd"), name: "Vintage Type Pack", price: 24, sales: 38, status: "live", type: "Digital" },
        { id: uid("prd"), name: "Creator Starter Kit", price: 49, sales: 21, status: "live", type: "Course" },
        { id: uid("prd"), name: "Poster — Halcyon", price: 18, sales: 12, status: "draft", type: "Physical" }
      ],
      contacts: [
        { id: uid("cnt"), email: "maya@studio.co", name: "Maya Kapoor", source: "Design tips", joined: "2026-09-12", status: "subscribed" },
        { id: uid("cnt"), email: "leo@framecraft.io", name: "Leo Martins", source: "Vintage Store", joined: "2026-09-28", status: "subscribed" },
        { id: uid("cnt"), email: "ada@northwind.com", name: "Ada Chen", source: "Contact", joined: "2026-10-04", status: "subscribed" },
        { id: uid("cnt"), email: "sam@hillside.fm", name: "Sam Okafor", source: "Featured clip", joined: "2026-10-17", status: "unsubscribed" }
      ],
      posts: [
        { id: uid("pst"), title: "Behind the poster series", channel: "Instagram", date: "2026-10-27", time: "10:30", status: "scheduled" },
        { id: uid("pst"), title: "3 type pairings I keep reusing", channel: "X", date: "2026-10-28", time: "16:00", status: "scheduled" },
        { id: uid("pst"), title: "Studio tour, 60 seconds", channel: "TikTok", date: "2026-10-30", time: "09:00", status: "draft" }
      ],
      shortLinks: [
        { id: uid("sln"), slug: "vintage", target: "https://shop.linkey.app/vintage", clicks: 412, created: "2026-08-02" },
        { id: uid("sln"), slug: "kit", target: "https://linkey.app/creator-kit", clicks: 187, created: "2026-09-14" }
      ],
      rules: [
        { id: uid("rul"), trigger: "New follower", reply: "Hey! Thanks for following — here are my free design resources: linkey.app/tips", active: true },
        { id: uid("rul"), trigger: "Keyword: SHOP", reply: "Here's the store: shop.linkey.app/vintage", active: true }
      ],
      notifications: [
        { id: uid("ntf"), title: "Your weekly insights are ready", body: "Clicks are up 18% compared with last week.", time: "2h ago", unread: true },
        { id: uid("ntf"), title: "New contact captured", body: "Maya Kapoor joined from “Design tips”.", time: "5h ago", unread: true },
        { id: uid("ntf"), title: "Payout sent", body: "$184.20 is on its way to your bank.", time: "1d ago", unread: false }
      ],
      ui: {
        groups: { links: true, earn: true },
        setup: null
      },
      // The seed is a signed-in, already-set-up account so the demo opens on
      // the dashboard. Sign out from the account menu to see the auth flow.
      auth: {
        signedIn: true, provider: "local", onboarded: true, since: 0,
        userId: "", email: "", cloud: false
      },
      settings: {
        domain: "linkey.app/username_01",
        customDomain: "",
        seoTitle: "Username_01 — links",
        seoDescription: "All my work, in one place.",
        viewMode: "list",
        hideBranding: false
      },
      stats: {
        clicks: 1240, views: 8420, contacts: 4, revenue: 486,
        daily: [42, 58, 51, 74, 66, 92, 88, 103, 96, 118, 132, 121, 140, 152],
        sources: [
          { label: "Instagram", value: 48 },
          { label: "Direct", value: 22 },
          { label: "TikTok", value: 15 },
          { label: "X", value: 9 },
          { label: "Other", value: 6 }
        ]
      }
    };
  }

  let state = load();

  /**
   * demoAllowed - the seeded demo account is a development fixture.
   *
   * On a real deployment a first-time visitor must land on sign-up, not on
   * "Vinay Suthar"'s demo dashboard with sample links. The seed stays
   * available on localhost, on file:// and in the node tests.
   */
  function demoAllowed() {
    if (typeof location === "undefined") return true;
    if (location.protocol === "file:") return true;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(location.hostname || ""));
  }

  /** zeroStats - a measurement of nothing. Used wherever an account must
   *  start without the demo seed's numbers. */
  function zeroStats() {
    return {
      clicks: 0, views: 0, contacts: 0, revenue: 0,
      daily: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      sources: []
    };
  }

  /** isSeedStats - true for the exact numbers in defaultState().stats. */
  function isSeedStats(st) {
    return !!st && st.clicks === 1240 && st.views === 8420 && st.contacts === 4 && st.revenue === 486;
  }

  /** emptyState - a first-run account with nothing of anyone else in it. */
  function emptyState() {
    const s = defaultState();
    s.user = { name: "", handle: "", email: "", tagline: "", avatar: "" };
    s.profile = {
      title: "", bio: "", theme: s.profile.theme, layout: "list",
      style: {}, socials: [], goal: "", platforms: []
    };
    s.links = [];
    s.collections = [];
    s.products = [];
    s.contacts = [];
    s.posts = [];
    s.shortLinks = [];
    s.rules = [];
    s.notifications = [];
    s.auth = { signedIn: false, provider: "local", onboarded: false, since: 0, userId: "", email: "", cloud: false };
    s.settings = Object.assign({}, s.settings, { domain: "", seoTitle: "", seoDescription: "" });
    s.ui = Object.assign({}, s.ui, { setup: null });
    // The seed's traffic, contacts and revenue belong to the demo account.
    // A real account must never inherit them.
    s.stats = zeroStats();
    return s;
  }

  function firstRun() {
    return demoAllowed() ? defaultState() : emptyState();
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return firstRun();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      if (parsed.seedVersion !== SEED_VERSION) return firstRun();
      const merged = {
        ...base,
        ...parsed,
        user: { ...base.user, ...(parsed.user || {}) },
        profile: { ...base.profile, ...(parsed.profile || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
        ui: { ...base.ui, ...(parsed.ui || {}), groups: { ...base.ui.groups, ...((parsed.ui || {}).groups || {}) } },
        auth: { ...base.auth, ...(parsed.auth || {}) },
        stats: { ...base.stats, ...(parsed.stats || {}) }
      };
      // Earlier builds saved the seed's traffic and revenue into cloud
      // accounts. Clear that once, on load, so the dashboard stops claiming
      // numbers nobody measured.
      if (merged.auth && merged.auth.cloud && isSeedStats(merged.stats)) merged.stats = zeroStats();
      return merged;
    } catch (e) {
      return firstRun();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, seedVersion: SEED_VERSION })); } catch (e) { /* ignore quota */ }
  }

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function commit() { save(); listeners.forEach((fn) => fn(state)); }

  function reset() { state = demoAllowed() ? defaultState() : emptyState(); commit(); }

  /**
   * clearAccount - remove this device's copy for good.
   *
   * reset() is the demo shortcut: on a dev host it re-seeds the sample
   * account. Deleting an account must not do that, so it wipes to the
   * empty first-run state everywhere.
   */
  function clearAccount() {
    state = emptyState();
    commit();
  }

  /* ---------- selectors ---------- */
  const theme = () => THEMES[state.profile.theme] || THEMES.bubblegum;
  const activeLinks = () => state.links.filter((l) => l.active);
  const socialLinks = () => state.links.filter((l) => l.kind === "social");
  const buttonLinks = () => state.links.filter((l) => l.kind !== "social");
  const publicUrl = () => "linkey.app/" + state.user.handle;

  /* ---------- mutations ---------- */
  function addLink(partial) {
    const { url, ...rest } = partial || {};
    const raw = String(url || "").trim();
    const safe = safeUrl(raw);
    const link = {
      id: uid("lnk"),
      kind: "link",
      title: "Untitled link",
      active: true,
      clicks: 0,
      views: 0,
      ...rest,
      url: raw && safe !== "#" ? safe : ""
    };
    state.links.push(link);
    commit();
    return link;
  }
  function updateLink(id, patch) {
    const l = state.links.find((x) => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    commit();
  }
  function addCollection(name, description) {
    const c = { id: uid("col"), name: name || "Untitled collection", description: description || "", count: 0 };
    state.collections.push(c);
    commit();
    return c;
  }
  function addProduct(partial) {
    const p = { id: uid("prd"), name: "Untitled product", price: 0, sales: 0, status: "live", type: "Digital", ...partial };
    state.products.unshift(p);
    commit();
    return p;
  }
  function deleteLink(id) {
    state.links = state.links.filter((l) => l.id !== id);
    commit();
  }
  function moveLink(id, dir) {
    const i = state.links.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.links.length) return;
    const tmp = state.links[i];
    state.links[i] = state.links[j];
    state.links[j] = tmp;
    commit();
  }
  function toggleLink(id) {
    const l = state.links.find((x) => x.id === id);
    if (!l) return;
    l.active = !l.active;
    commit();
  }
  function setTheme(key) {
    if (!THEMES[key]) return;
    state.profile.theme = key;
    commit();
  }
  function updateUser(patch) { Object.assign(state.user, patch); commit(); }
  function updateProfile(patch) { Object.assign(state.profile, patch); commit(); }
  function updateSettings(patch) { Object.assign(state.settings, patch); commit(); }
  async function addContact(c) {
    const entry = { id: uid("cnt"), joined: today(), status: "subscribed", ...c };
    state.contacts.unshift(entry);
    commit();
    // Mirror to the cloud so signups survive a device change. Fire and
    // forget: the UI already shows the contact locally.
    if (S.auth().cloud && Cloud && Cloud.isConfigured() && Cloud.saveContact) {
      try {
        const r = await Cloud.saveContact({
          page_handle: state.user.handle || "",
          name: entry.name,
          email: entry.email,
          source: entry.source || "Manual"
        });
        if (r.ok && r.id) {
          // Replace the local uid with the cloud id so deletes match.
          const found = state.contacts.find((x) => x.id === entry.id);
          if (found) { found.id = r.id; commit(); }
        }
      } catch (e) { /* cloud sync failure does not break local UI */ }
    }
    return entry;
  }
  async function removeContact(id) {
    const before = state.contacts.length;
    state.contacts = state.contacts.filter((c) => c.id !== id);
    commit();
    if (state.contacts.length !== before && S.auth().cloud && Cloud && Cloud.isConfigured() && Cloud.deleteContact) {
      try { await Cloud.deleteContact(id); } catch (e) { /* cloud sync failure */ }
    }
  }
  function addShortLink(slug, target) { state.shortLinks.unshift({ id: uid("sln"), slug, target, clicks: 0, created: today() }); commit(); }
  function addPost(p) { state.posts.push({ id: uid("pst"), status: "scheduled", ...p }); commit(); }
  function addRule(trigger, reply) { state.rules.push({ id: uid("rul"), trigger, reply, active: true }); commit(); }
  function toggleRule(id) { const r = state.rules.find((x) => x.id === id); if (r) { r.active = !r.active; commit(); } }
  function markNotificationsRead() { state.notifications.forEach((n) => (n.unread = false)); commit(); }
  function unreadCount() { return state.notifications.filter((n) => n.unread).length; }

  /* ---------- utils ---------- */
  function today() { return new Date().toISOString().slice(0, 10); }
  function fmtNum(n) {
    if (n === null || n === undefined) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }
  function money(n) { return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  /* Only http(s), mailto and tel links may reach an href. Anything else
     (javascript:, data:, vbscript:, malformed) becomes "#".
     Bare domains ("shop.example.com/x") are upgraded to https instead of
     being resolved against a placeholder origin. */
  function safeUrl(url) {
    const raw = String(url == null ? "" : url).trim();
    if (!raw || raw === "#") return "#";

    let candidate = raw;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw);

    if (scheme && scheme[1].indexOf(".") === -1) {
      /* A real scheme. Allow only the three we render as links. */
      const proto = scheme[1].toLowerCase();
      if (["http", "https", "mailto", "tel"].indexOf(proto) === -1) return "#";
    } else if (/^\/\//.test(raw)) {
      candidate = "https:" + raw;
    } else if (/^[^\s/?#:]+\.[^\s/?#:]{2,}(?::\d+)?(?:[/?#]|$)/.test(raw)) {
      candidate = "https://" + raw;
    } else {
      return "#";
    }

    try {
      const u = new URL(candidate);
      if (["http:", "https:", "mailto:", "tel:"].indexOf(u.protocol) === -1) return "#";
      if (u.protocol === "http:" || u.protocol === "https:") {
        if (!u.hostname || u.hostname.indexOf(".") === -1) return "#";
      }
      return u.toString();
    } catch (e) {
      return "#";
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function hostOf(url) {
    if (!url) return "";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url.replace(/^mailto:/, ""); }
  }
  function initials(name) {
    return String(name || "U").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  /* ------------------------------------------------------------
     Accounts

     Linkey signs people in with a link, not a password, so nothing
     secret is ever stored on the device. Until the backend is wired
     up (see BACKEND.md) the "account" is the profile in localStorage
     and sign-in simply proves you know its email or username. The
     function shapes are the ones the hosted version will keep:
     signIn, signUp, signOut, completeSetup.
     ------------------------------------------------------------ */
  const HANDLE_MIN = 3;
  const HANDLE_MAX = 30;

  // Reserved so a username can never collide with a route, a support
  // address, or a name we may need to use ourselves later.
  const RESERVED_HANDLES = [
    "u", "api", "app", "admin", "administrator", "root", "www", "mail", "email",
    "support", "help", "legal", "terms", "privacy", "security", "abuse", "dmca",
    "billing", "payments", "status", "about", "blog", "careers", "press", "docs",
    "login", "signin", "signup", "logout", "register", "account", "settings",
    "dashboard", "links", "shop", "customize", "explore", "discover", "trending",
    "linkey", "official", "moderator", "staff", "team", "me", "you", "new",
    "create", "home", "index", "null", "undefined"
  ];

  /** normalizeHandle - lowercase, strip @, drop anything a URL cannot carry. */
  function normalizeHandle(v) {
    return String(v == null ? "" : v)
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9._-]/g, "");
  }

  /**
   * handleIssue - "" when the username is usable, otherwise one sentence
   * saying exactly what to change. `current` is the owner's existing handle,
   * which is always allowed (saving your own username is not a collision).
   */
  function handleIssue(handle, current) {
    const h = normalizeHandle(handle);
    if (!h) return "Pick a username.";
    if (h.length < HANDLE_MIN) return "Use at least " + HANDLE_MIN + " characters.";
    if (h.length > HANDLE_MAX) return "Keep it to " + HANDLE_MAX + " characters or fewer.";
    if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])$/.test(h)) {
      return "Start and end with a letter or number. Letters, numbers, dots, dashes and underscores only.";
    }
    if (/[._-]{2,}/.test(h)) return "No repeated dots, dashes or underscores.";
    if (RESERVED_HANDLES.indexOf(h) !== -1) return "That username is reserved.";
    const mine = normalizeHandle(current != null ? current : (state && state.user.handle));
    if (mine && h === mine) return "";
    return "";
  }

  /** handleSuggestions - three usable handles derived from a name. */
  function handleSuggestions(name) {
    const words = String(name || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const stem = normalizeHandle(words.join("")).slice(0, HANDLE_MAX);
    const first = normalizeHandle(words[0] || "");
    const last = normalizeHandle(words[words.length - 1] || "");

    const out = [];
    const add = (h) => {
      const v = String(h || "").slice(0, HANDLE_MAX);
      if (v && out.indexOf(v) === -1 && !handleIssue(v)) out.push(v);
    };
    add(stem);
    add(first);
    if (first && last && first !== last) add(first + "." + last);
    if (out.length < 3) add(stem + "." + Math.floor(10 + Math.random() * 89));
    if (out.length < 3) add(stem + "_" + Math.floor(10 + Math.random() * 89));
    // A blank name still needs something tappable rather than an empty row.
    if (!out.length) add("user" + Math.floor(100 + Math.random() * 900));
    return out.slice(0, 3);
  }

  function auth() {
    return state.auth || (state.auth = {
      signedIn: true, provider: "local", onboarded: true, since: 0,
      userId: "", email: "", cloud: false
    });
  }
  function isSignedIn() { return !!auth().signedIn; }
  function isOnboarded() { return !!auth().onboarded; }

  function emailIssue(email) {
    const e = String(email || "").trim();
    if (!e) return "Enter your email.";
    if (e.length > 254) return "That email is too long.";
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(e)) return "That email does not look right.";
    return "";
  }

  /**
   * signIn - identify by email or username.
   * Returns {ok, error}. Never throws, never touches the network.
   */
  function signIn(identifier) {
    const raw = String(identifier == null ? "" : identifier).trim();
    if (!raw) return { ok: false, error: "Enter your email or username." };
    const id = raw.toLowerCase().replace(/^@/, "");
    const u = state.user || {};
    const email = String(u.email || "").toLowerCase();
    const handle = String(u.handle || "").toLowerCase();
    const byEmail = id.indexOf("@") !== -1;
    const match = byEmail ? id === email : id === handle;
    if (!match) {
      return { ok: false, error: byEmail ? "No account for that email." : "No account with that username." };
    }
    const onboarded = isOnboarded();
    state.auth = Object.assign({}, auth(), {
      signedIn: true, provider: "local", onboarded: onboarded, since: Date.now()
    });
    commit();
    return { ok: true };
  }

  /**
   * blankAccount - a brand-new account starts with nothing of its own.
   *
   * Without this, signing up would inherit the demo account's links, contacts
   * and stats under the new handle — a data leak between accounts, not a
   * friendly default. Theme carries over because it is a preference, not
   * content. `Store.reset()` restores the seeded demo.
   */
  function blankAccount(name, handle, email, avatar) {
    state.links = [];
    state.collections = [];
    state.products = [];
    state.contacts = [];
    state.posts = [];
    state.shortLinks = [];
    state.rules = [];
    state.notifications = [];
    state.profile = {
      title: name,
      bio: "",
      theme: state.profile.theme,
      layout: "list",
      style: state.profile.style || {},
      socials: [],
      goal: "",
      platforms: []
    };
    state.user.tagline = "";
    state.user.avatar = avatar || "";
    state.user.email = email || state.user.email;
    state.settings = Object.assign({}, state.settings, {
      domain: "linkey.app/" + handle,
      seoTitle: name + " — links",
      seoDescription: "",
      viewMode: "list"
    });
    state.stats = zeroStats();
  }

  /** signUp - create the local account and send the owner to setup. */
  function signUp(input) {
    const name = String((input && input.name) || "").trim();
    const email = String((input && input.email) || "").trim();
    const handle = normalizeHandle(input && input.handle);

    if (name.length < 2) return { ok: false, field: "name", error: "Tell us your name." };
    if (name.length > 60) return { ok: false, field: "name", error: "Keep your name to 60 characters." };
    const eIssue = emailIssue(email);
    if (eIssue) return { ok: false, field: "email", error: eIssue };
    const hIssue = handleIssue(handle, "");
    if (hIssue) return { ok: false, field: "handle", error: hIssue };

    blankAccount(name, handle, email, "");
    state.user = Object.assign({}, state.user, { name: name, email: email, handle: handle });
    state.auth = {
      signedIn: true, provider: "local", onboarded: false, since: Date.now(),
      userId: "", email: email, cloud: false
    };
    state.ui = Object.assign({}, state.ui, { setup: freshSetup(handle, name, "") });
    commit();
    return { ok: true };
  }

  /** freshSetup - the five-step draft, with every field the wizard reads. */
  function freshSetup(handle, name, avatar) {
    return {
      step: 1,
      handle: handle || "",
      name: name || "",
      bio: "",
      avatar: avatar || "",
      goal: "",
      theme: state.profile.theme,
      platforms: [],
      values: {},
      extras: ["", "", ""],
      layout: state.profile.layout === "bento" ? "bento" : "list"
    };
  }

  /**
   * signUpIntent - remember what someone typed on the sign-up form while
   * they are away at Google (or in their inbox).
   *
   * The redirect leaves this page, so the only place the chosen name and
   * handle can live is localStorage. They are applied only when the
   * returned account has the same email, so a stale intent cannot rename
   * a different person's page.
   */
  function signUpIntent(input) {
    input = input || {};
    const name = String(input.name || "").trim().slice(0, 60);
    const email = String(input.email || "").trim().toLowerCase();
    const handle = normalizeHandle(input.handle);
    if (name.length < 2) return { ok: false, field: "name", error: "Tell us your name." };
    const eIssue = emailIssue(email);
    if (eIssue) return { ok: false, field: "email", error: eIssue };
    const hIssue = handleIssue(handle, "");
    if (hIssue) return { ok: false, field: "handle", error: hIssue };
    state.ui = Object.assign({}, state.ui, {
      pendingSignup: { name: name, email: email, handle: handle, at: Date.now() }
    });
    commit();
    return { ok: true };
  }

  function pendingSignup(email) {
    const p = state.ui && state.ui.pendingSignup;
    if (!p || !p.email || !p.name || !p.handle) return null;
    if (email && p.email !== String(email).toLowerCase()) return null;
    if (Date.now() - (Number(p.at) || 0) > 30 * 60 * 1000) return null;
    if (handleIssue(p.handle, "")) return null;
    return p;
  }

  /**
   * adoptCloudUser - make a Supabase user the current account.
   *
   * Three cases, in order:
   *   1. Same user id, already onboarded → a returning sign-in.
   *   2. A saved cloud page row → restore it on this device.
   *   3. Anything else → a brand-new account, blank, sent to onboarding.
   *
   * Nothing from the previous local account survives case 3, which is
   * what stops one person's links appearing under another's handle.
   */
  async function adoptCloudUser(u, page) {
    if (!u || !u.id) return { ok: false, error: "No user." };
    const prev = auth();
    const email = String(u.email || "");
    const name = String(u.name || "").trim() || (email ? email.split("@")[0] : "Your name");
    const avatar = String(u.avatar || "");
    const provider = String(u.provider || "google");

    if (prev.userId && prev.userId === u.id && prev.onboarded) {
      state.user = Object.assign({}, state.user, {
        email: email || state.user.email,
        avatar: avatar || state.user.avatar
      });
      state.auth = {
        signedIn: true, provider: provider, onboarded: true, since: Date.now(),
        userId: u.id, email: email, cloud: true
      };
      commit();
      // Refresh this device's contacts from the cloud copy.
      try {
        const cr = await Cloud.loadContacts();
        if (cr.ok && Array.isArray(cr.contacts)) {
          state.contacts = cr.contacts.map((c) => ({
            id: c.id,
            name: c.name || "",
            email: c.email || "",
            source: c.source || "",
            joined: c.created_at || today(),
            status: "subscribed"
          }));
          commit();
        }
      } catch (e) { /* cloud contact sync failure does not block signin */ }
      return { ok: true, returning: true, newAccount: false };
    }

    const data = page && page.data && typeof page.data === "object" ? page.data : null;
    if (page && page.onboarded && page.handle && data) {
      const handle = normalizeHandle(page.handle);
      if (!handleIssue(handle, "")) {
        state.user = Object.assign({}, state.user, {
          name: String(data.name || name).slice(0, 60),
          handle: handle,
          email: email,
          avatar: /^https:\/\//i.test(String(data.avatar || avatar)) ? String(data.avatar || avatar) : avatar
        });
        state.profile = {
          title: String(data.name || name).slice(0, 60),
          bio: String(data.bio || "").slice(0, 160),
          theme: THEMES[data.theme] ? data.theme : state.profile.theme,
          layout: LAYOUTS.some((l) => l.id === data.layout) ? data.layout : "list",
          style: sanitizeStyle(data.style),
          socials: [],
          goal: String(data.goal || "").slice(0, 40),
          platforms: (Array.isArray(data.platforms) ? data.platforms : []).filter((id) => platformById(id)).slice(0, MAX_PLATFORMS)
        };
        state.links = sanitizeLinks(data.links);
        // Publish/restore must round-trip: if the row carries an SEO title
        // or the hidden-branding switch, put it back before the next
        // autosave overwrites the row with defaults.
        state.settings = Object.assign({}, state.settings, {
          domain: "linkey.app/" + handle,
          seoTitle: String(data.seoTitle || "").trim().slice(0, 70) || String(data.name || name).slice(0, 60) + " — links",
          seoDescription: String(data.seoDescription || "").trim().slice(0, 160) || String(data.bio || "").slice(0, 160),
          hideBranding: data.hideBranding === true
        });
        // Analytics live on the device, not in the cloud row: the restored
        // page starts from nothing rather than the demo seed's numbers.
        state.stats = zeroStats();
        state.auth = {
          signedIn: true, provider: provider, onboarded: true, since: Date.now(),
          userId: u.id, email: email, cloud: true
        };
        state.ui = Object.assign({}, state.ui, { setup: null });
        commit();
        // Restore this owner's captured signups from the cloud.
        try {
          const cr = await Cloud.loadContacts();
          if (cr.ok && Array.isArray(cr.contacts)) {
            state.contacts = cr.contacts.map((c) => ({
              id: c.id,
              name: c.name || "",
              email: c.email || "",
              source: c.source || "",
              joined: c.created_at || today(),
              status: "subscribed"
            }));
            commit();
          }
        } catch (e) { /* cloud contact sync failure does not block signin */ }
        return { ok: true, returning: true, newAccount: false, hydrated: true };
      }
    }

    const intent = pendingSignup(email);
    const handle = intent ? intent.handle : (handleSuggestions(name)[0] || "");
    const finalName = intent ? intent.name : name;
    blankAccount(finalName, handle, email, avatar);
    state.user = Object.assign({}, state.user, { name: finalName, email: email, handle: handle });
    state.auth = {
      signedIn: true, provider: provider, onboarded: false, since: Date.now(),
      userId: u.id, email: email, cloud: true
    };
    state.ui = Object.assign({}, state.ui, {
      setup: freshSetup(handle, finalName, avatar),
      pendingSignup: null
    });
    commit();
    return { ok: true, returning: false, newAccount: true, adoptedIntent: !!intent };
  }

  /**
   * adoptProviderUser - a Google identity verified in the browser.
   *
   * Used by the no-server Google flow: Google has proved the person owns
   * the address, and the app turns that into an account on this device.
   * The three cases match adoptCloudUser so signing in either way ends
   * in the same place.
   *
   * Before a different person's page is replaced, the old one is copied
   * to `linkey.backup.v1` — replacing a live page is destructive and a
   * browser-only account has no server copy to fall back on.
   */
  function adoptProviderUser(profile) {
    if (!profile || !profile.id) return { ok: false, error: "Google did not return an account." };
    const prev = auth();
    const email = String(profile.email || "");
    const name = String(profile.name || "").trim() || (email ? email.split("@")[0] : "Your name");
    const avatar = safeAvatar(profile.avatar);
    const userId = String(profile.id);

    if (prev.userId && prev.userId === userId && prev.onboarded) {
      state.user = Object.assign({}, state.user, { email: email, avatar: avatar || state.user.avatar });
      state.auth = {
        signedIn: true, provider: "google", onboarded: true, since: Date.now(),
        userId: userId, email: email, cloud: false
      };
      commit();
      return { ok: true, returning: true, newAccount: false };
    }

    // Keep the page that is about to be replaced, once, for recovery.
    let backup = false;
    if (prev.signedIn && prev.onboarded && prev.userId !== userId) {
      backup = backupLocalPage();
    }

    const intent = pendingSignup(email);
    const handle = intent ? intent.handle : (handleSuggestions(name)[0] || "");
    const finalName = intent ? intent.name : name;
    blankAccount(finalName, handle, email, avatar);
    state.user = Object.assign({}, state.user, { name: finalName, email: email, handle: handle });
    state.auth = {
      signedIn: true, provider: "google", onboarded: false, since: Date.now(),
      userId: userId, email: email, cloud: false
    };
    state.ui = Object.assign({}, state.ui, {
      setup: freshSetup(handle, finalName, avatar),
      pendingSignup: null
    });
    commit();
    return { ok: true, returning: false, newAccount: true, adoptedIntent: !!intent, backup: backup };
  }

  const BACKUP_KEY = "linkey.backup.v1";

  /** backupLocalPage - one-slot snapshot of the account being replaced. */
  function backupLocalPage() {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        at: Date.now(),
        user: state.user,
        profile: state.profile,
        links: state.links
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * sanitizeLinks - the shape a link may have when it arrives from
   * storage or a cloud row. Unknown keys are dropped and every URL is
   * re-checked, so a tampered payload cannot inject a javascript: href
   * or a 10 MB string.
   */
  function sanitizeLink(raw) {
    if (!raw || typeof raw !== "object") return null;
    const url = String(raw.url || "").trim();
    const safe = url ? safeUrl(url) : "";
    const kind = LINK_TYPES[raw.kind] ? raw.kind : "link";
    const title = String(raw.title || "Link").slice(0, kind === "text" || kind === "header" ? 160 : 120);
    const out = {
      id: typeof raw.id === "string" && /^[a-z]{2,6}_[a-z0-9]{4,12}$/i.test(raw.id) ? raw.id : uid("lnk"),
      kind: kind,
      title: title,
      url: safe === "#" ? "" : safe,
      active: raw.active !== false,
      clicks: Math.max(0, Math.min(1e9, Number(raw.clicks) || 0)),
      views: Math.max(0, Math.min(1e9, Number(raw.views) || 0))
    };
    if (raw.platform && SOCIAL_PLATFORMS[raw.platform]) out.platform = raw.platform;
    if (raw.note) out.note = String(raw.note).slice(0, 160);
    if (SPANS.indexOf(raw.span) >= 0) out.span = raw.span;
    if (raw.featured === true) out.featured = true;
    if (raw.price != null) out.price = Math.max(0, Number(raw.price) || 0);
    if (raw.date) out.date = String(raw.date).slice(0, 32);
    return out;
  }

  function sanitizeLinks(list) {
    return (Array.isArray(list) ? list : []).slice(0, 200).map(sanitizeLink).filter(Boolean);
  }

  /**
   * publicView - a read-only page built from a pages row.
   *
   * The row is untrusted (another user wrote it, and the anon key can
   * read it once a public policy exists), so every field goes through
   * the same sanitizers as local state. A row that is not a complete,
   * valid page returns null and the caller shows "not published".
   */
  function publicView(row) {
    if (!row || typeof row !== "object") return null;
    if (row.onboarded !== true) return null;
    const data = row.data && typeof row.data === "object" ? row.data : null;
    if (!data) return null;
    const handle = normalizeHandle(row.handle);
    if (!handle || handleIssue(handle, "")) return null;
    const links = sanitizeLinks(data.links).filter((l) => l.active);
    const socials = [];
    links.forEach((l) => {
      if (l.kind === "social" && l.platform && SOCIAL_PLATFORMS[l.platform] && socials.indexOf(l.platform) === -1) {
        socials.push(l.platform);
      }
    });
    const name = String(data.name || handle).replace(/\s+/g, " ").trim().slice(0, 60) || handle;
    const bio = String(data.bio || "").replace(/\s+/g, " ").slice(0, 160);
    return {
      handle: handle,
      name: name,
      bio: bio,
      seoTitle: String(data.seoTitle || name).replace(/\s+/g, " ").trim().slice(0, 70) || name,
      seoDescription: String(data.seoDescription || bio).replace(/\s+/g, " ").trim().slice(0, 160),
      hideBranding: data.hideBranding === true,
      avatar: safeAvatar(data.avatar),
      theme: THEMES[data.theme] ? data.theme : "bubblegum",
      layout: LAYOUTS.some((l) => l.id === data.layout) ? data.layout : "list",
      style: sanitizeStyle(data.style),
      socials: socials,
      links: links
    };
  }

  /** cloudSnapshot - what gets written to the pages table. */
  function cloudSnapshot() {
    return {
      handle: state.user.handle,
      onboarded: isOnboarded(),
      data: {
        name: state.user.name,
        bio: state.profile.bio,
        avatar: state.user.avatar,
        theme: state.profile.theme,
        layout: state.profile.layout,
        style: style(),
        goal: state.profile.goal || "",
        platforms: state.profile.platforms || [],
        seoTitle: String(state.settings.seoTitle || "").trim().slice(0, 70),
        seoDescription: String(state.settings.seoDescription || "").trim().slice(0, 160),
        hideBranding: !!state.settings.hideBranding,
        links: state.links
      }
    };
  }

  /**
   * signInWithProvider - the local fallback for the OAuth buttons.
   *
   * When Supabase is configured the app calls Cloud.signInWithOAuth()
   * instead and never reaches this. Here it signs the local demo account
   * in and records which provider was asked for, so the button still does
   * something useful with no backend.
   */
  function signInWithProvider(provider, profile) {
    const p = String(provider || "google").toLowerCase();
    if (["google", "apple"].indexOf(p) === -1) return { ok: false, error: "Unknown provider." };
    const u = profile || {};
    if (u.email) state.user.email = String(u.email).slice(0, 254);
    if (u.name) state.user.name = String(u.name).slice(0, 60);
    if (u.avatar && safeAvatar(u.avatar)) state.user.avatar = safeAvatar(u.avatar);
    state.auth = {
      signedIn: true, provider: p, onboarded: isOnboarded(), since: Date.now(),
      userId: String(u.id || auth().userId || ""),
      email: String(u.email || state.user.email || ""),
      cloud: !!u.cloud
    };
    commit();
    return { ok: true, provider: p };
  }

  function signOut() {
    state.auth = Object.assign({}, auth(), {
      signedIn: false, since: 0,
      // Keep the provider and user id so signing back in on this device
      // is recognised as the same account rather than a new one.
      cloud: false
    });
    state.ui = Object.assign({}, state.ui, { setup: null });
    commit();
  }

  /** safeAvatar - https, or a small inline image from the file picker. */
  function safeAvatar(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    if (/^https:\/\/[^\s"'<>]+$/i.test(s) && s.length <= 500) return s;
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(s) && s.length <= 400000) return s;
    return "";
  }

  /** completeSetup - apply the wizard's answers and mark the account live. */
  function completeSetup(patch) {
    patch = patch || {};
    const handle = normalizeHandle(patch.handle != null ? patch.handle : state.user.handle);
    const hIssue = handleIssue(handle, state.user.handle);
    if (hIssue) return { ok: false, field: "handle", error: hIssue };

    const rawName = String(patch.name != null ? patch.name : state.user.name).trim().slice(0, 60);
    const name = rawName || handle;
    if (name.length < 2) return { ok: false, field: "name", error: "Tell us your name." };

    const goal = ONBOARD_GOALS.some((g) => g.id === patch.goal) ? patch.goal : (state.profile.goal || "");
    const platforms = (Array.isArray(patch.platforms) ? patch.platforms : [])
      .filter((id, i, arr) => platformById(id) && arr.indexOf(id) === i)
      .slice(0, MAX_PLATFORMS);

    state.user = Object.assign({}, state.user, {
      name: name,
      handle: handle
    });
    if (patch.avatar !== undefined) {
      const av = safeAvatar(patch.avatar);
      if (av || !String(patch.avatar || "").trim()) state.user.avatar = av;
    }
    state.profile = Object.assign({}, state.profile, {
      title: name,
      bio: String(patch.bio != null ? patch.bio : state.profile.bio).trim().slice(0, 160),
      goal: goal,
      platforms: platforms.length ? platforms : (state.profile.platforms || [])
    });
    // Keep the public address and SEO title in step with the final handle.
    state.settings = Object.assign({}, state.settings, {
      domain: "linkey.app/" + handle,
      seoTitle: name + " — links"
    });
    if (patch.layout && LAYOUTS.some((l) => l.id === patch.layout)) state.profile.layout = patch.layout;
    if (patch.theme && THEMES[patch.theme]) state.profile.theme = patch.theme;
    if (Array.isArray(patch.links)) state.links = sanitizeLinks(patch.links);

    // The chosen platforms are the icon row on the public page. Only the
    // ones that produced a real handle are kept, so a skipped row does not
    // leave a dead icon behind. Runs after the new links are installed.
    if (Array.isArray(patch.platforms)) {
      const connected = state.links
        .filter((l) => l.kind === "social" && l.platform && SOCIAL_PLATFORMS[l.platform])
        .map((l) => l.platform);
      state.profile.socials = connected.filter((id, i) => connected.indexOf(id) === i);
    }
    state.auth = {
      signedIn: true,
      provider: auth().provider || "local",
      onboarded: true,
      since: auth().since || Date.now(),
      userId: auth().userId || "",
      email: auth().email || state.user.email || "",
      cloud: !!auth().cloud
    };
    state.ui = Object.assign({}, state.ui, { setup: null });
    commit();
    return { ok: true };
  }

  /**
   * productTotals - one source of truth for the shop numbers.
   *
   * The Shop page shows each product's price and units sold right below the
   * headline stats, so revenue, order count and average order value are all
   * derived from the same list: price x sold. Keeping the arithmetic here
   * means Shop and Earn cannot drift apart, and it can be unit-tested without
   * a DOM. Non-numeric or missing fields count as zero.
   */
  function productTotals(products) {
    const list = Array.isArray(products) ? products : [];
    let orders = 0;
    let revenue = 0;
    list.forEach((p) => {
      const sold = Number(p && p.sales) || 0;
      const price = Number(p && p.price) || 0;
      orders += sold;
      revenue += price * sold;
    });
    return { orders: orders, revenue: revenue, avgOrder: orders ? revenue / orders : 0 };
  }

  global.Store = {
    KEY, THEMES, SOCIAL_PLATFORMS, LINK_TYPES, LAYOUTS, SPANS,
    HANDLE_MIN, HANDLE_MAX, RESERVED_HANDLES,
    ONBOARD_GOALS, ONBOARD_PLATFORMS, MAX_PLATFORMS, MAX_EXTRA_LINKS,
    FONTS, GRADIENTS, STYLE_DEFAULTS, BTN_FILLS, BTN_SHAPES, BTN_SHADOWS,
    BTN_SIZES, AVATAR_SHAPES, STYLE_WEIGHTS,
    platformById, onboardingUrl, extraLinkUrl, starterLinks, titleForUrl,
    sanitizeLink, sanitizeLinks, safeAvatar, cloudSnapshot, freshSetup,
    sanitizeStyle, style, setStyle, resetStyle, styleVars, styleVarsFor, themeById, publicView,
    base64Encode, hexToRgb, luminance, pickText, rgba, shade,
    get state() { return state; },
    subscribe, commit, reset, clearAccount, save,
    theme, activeLinks, socialLinks, buttonLinks, publicUrl,
    layout, setLayout, autoSpan, layoutPlan, cycleSpan,
    productTotals,
    auth, isSignedIn, isOnboarded, signIn, signUp, signOut, signInWithProvider,
    adoptCloudUser, adoptProviderUser, completeSetup, signUpIntent, pendingSignup, demoAllowed,
    BACKUP_KEY,
    normalizeHandle, handleIssue, handleSuggestions, emailIssue,
    addLink, updateLink, deleteLink, moveLink, toggleLink,
    addCollection, addProduct,
    setTheme, updateUser, updateProfile, updateSettings,
    addContact, removeContact, addShortLink, addPost, addRule, toggleRule,
    markNotificationsRead, unreadCount,
    uid, fmtNum, money, esc, safeUrl, hostOf, initials, today
  };
})(window);
