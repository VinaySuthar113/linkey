/* ============================================================
   Linkey — add-link picker data
   Structure mirrors the "Add" component in the design:
   8 tabs, category tiles, and grouped provider rows.

   Copy is written for Linkey (the design file's row descriptions
   were placeholders). Logos are used only to identify the service
   a link points to — see THIRD_PARTY.md.
   ============================================================ */
(function () {
  const LOGO = "assets/icons/providers/";

  /* Brand marks exported from the design (real vector logos). */
  const LOGOS = {
    instagram: "instagram.svg",
    tiktok: "tiktok.svg",
    youtube: "youtube.svg",
    "youtube-music": "youtube-music.svg",
    spotify: "spotify.svg",
    x: "x.svg",
    threads: "threads.svg",
    facebook: "facebook.svg",
    snapchat: "snapchat.svg",
    pinterest: "pinterest.svg",
    twitch: "twitch.svg",
    reddit: "reddit.svg",
    clubhouse: "clubhouse.svg",
    "apple-music": "apple-music.svg",
    audiomack: "audiomack.svg",
    soundcloud: "soundcloud.svg",
    rss: "rss.svg"
  };

  /* Fallback tiles: brand initial on a tinted disc. */
  const BRAND_COLORS = {
    shopify: "#5E8E3E", fourthwall: "#111111", amaze: "#7B3FE4", books: "#B4532A",
    bonfire: "#F26B21", discord: "#5865F2", whatsapp: "#25D366", slack: "#611F69",
    gleam: "#E5484D", gofundme: "#00B964", sendowl: "#2F6FED", "mobile-app": "#111111",
    cameo: "#111111", "call-of-duty": "#111111", bgmi: "#F5A623", "free-fire": "#FF6B00",
    "clash-of-clans": "#8B5A2B", vimeo: "#1AB7EA", typeform: "#262627", laylo: "#111111",
    umg: "#111111", maps: "#4285F4", calendly: "#006BFF", seated: "#111111",
    bandsintown: "#00A0B0", form: "#0066BB", email: "#EA4335", stats: "#7C3AED",
    faq: "#0F766E", chatbot: "#F59E0B", pdf: "#E11D48", video: "#111111",
    music: "#111111", podcast: "#8B5CF6", presave: "#111111", text: "#111111",
    header: "#111111", reviews: "#F59E0B", file: "#111111", link: "#B58900",
    product: "#43A047", collection: "#FF5000", coaching: "#0EA5E9",
    "digital-product": "#7C3AED", courses: "#F97316", affiliate: "#10B981",
    "quick-collection": "#FF5000", "discount-code": "#EF4444", "email-signup": "#EA4335",
    "sms-signup": "#22C55E", "community-sms": "#22C55E", "contact-form": "#0066BB",
    "contact-details": "#0EA5E9", "tiktok-profile": "#111111", "tiktok-video": "#111111"
  };

  const p = (id, name, desc, kind, logo) => ({ id, name, desc, kind: kind || "link", logo: logo || null });

  /* ---- providers ------------------------------------------------------- */
  const P = {
    instagram: p("instagram", "Instagram", "Show your latest posts and reels.", "social", "instagram"),
    tiktok: p("tiktok", "TikTok", "Send visitors to your TikTok profile.", "social", "tiktok"),
    "tiktok-profile": p("tiktok-profile", "TikTok profile", "Feature a single TikTok account.", "social", "tiktok"),
    "tiktok-video": p("tiktok-video", "TikTok video", "Embed one of your TikToks.", "video", "tiktok"),
    youtube: p("youtube", "YouTube", "Link your channel or a single video.", "video", "youtube"),
    "youtube-music": p("youtube-music", "YouTube Music", "Share a playlist or album.", "video", "youtube-music"),
    spotify: p("spotify", "Spotify", "Share a track, album or playlist.", "video", "spotify"),
    "apple-music": p("apple-music", "Apple Music", "Open an album, playlist or artist page.", "video", "apple-music"),
    audiomack: p("audiomack", "Audiomack", "Link a track, album or artist profile.", "video", "audiomack"),
    soundcloud: p("soundcloud", "SoundCloud", "Embed a track, set or artist profile.", "video", "soundcloud"),
    music: p("music", "Music", "Point to any music URL.", "video", "music"),
    podcast: p("podcast", "Podcast", "Link your show or a single episode.", "video", "podcast"),
    presave: p("presave", "Pre-save", "Collect pre-saves before a release.", "video", "presave"),
    video: p("video", "Video", "Point to any video URL.", "video", "video"),
    vimeo: p("vimeo", "Vimeo", "Share a Vimeo video or channel.", "video", "vimeo"),
    pdf: p("pdf", "PDF", "Let visitors open a PDF in place.", "link", "pdf"),
    x: p("x", "X", "Send visitors to your X profile.", "social", "x"),
    threads: p("threads", "Threads", "Link your Threads profile.", "social", "threads"),
    facebook: p("facebook", "Facebook", "Link your page or profile.", "social", "facebook"),
    snapchat: p("snapchat", "Snapchat", "Add your Snapchat handle or story.", "social", "snapchat"),
    pinterest: p("pinterest", "Pinterest", "Open a board, pin or profile.", "social", "pinterest"),
    twitch: p("twitch", "Twitch", "Send people to your live channel.", "social", "twitch"),
    reddit: p("reddit", "Reddit", "Link a subreddit or profile.", "social", "reddit"),
    rss: p("rss", "RSS feed", "Publish any RSS feed as a link.", "social", "rss"),
    cameo: p("cameo", "Cameo", "Offer personalised video messages.", "social", "cameo"),
    clubhouse: p("clubhouse", "Clubhouse", "Link your Clubhouse profile.", "social", "clubhouse"),
    "call-of-duty": p("call-of-duty", "Call of Duty", "Let squads find your Activision ID.", "social", "call-of-duty"),
    bgmi: p("bgmi", "BGMI", "Show your in-game BGMI ID.", "social", "bgmi"),
    "free-fire": p("free-fire", "Free Fire", "Share your Free Fire UID.", "social", "free-fire"),
    "clash-of-clans": p("clash-of-clans", "Clash of Clans", "Invite players with your clan tag.", "social", "clash-of-clans"),
    reviews: p("reviews", "Reviews", "Show testimonials from customers.", "social", "reviews"),
    shopify: p("shopify", "Shopify", "Feature products from your Shopify store.", "product", "shopify"),
    fourthwall: p("fourthwall", "Fourthwall", "Sell merch and memberships.", "product", "fourthwall"),
    amaze: p("amaze", "Amaze", "Show products from your Amaze store.", "product", "amaze"),
    books: p("books", "Books", "Feature a book or a reading list.", "product", "books"),
    bonfire: p("bonfire", "Bonfire", "Sell print-on-demand merch.", "product", "bonfire"),
    "mobile-app": p("mobile-app", "Mobile app", "Drive installs for your app.", "product", "mobile-app"),
    coaching: p("coaching", "Coaching & booking", "Sell 1:1 sessions and consultations.", "product", "coaching"),
    "digital-product": p("digital-product", "Digital products", "Sell PDFs, guides and templates.", "product", "digital-product"),
    courses: p("courses", "Courses", "Sell a course or a lesson series.", "product", "courses"),
    affiliate: p("affiliate", "Affiliate products", "Promote products you recommend.", "product", "affiliate"),
    "quick-collection": p("quick-collection", "Quick-add collections", "Drop in a ready-made collection.", "product", "quick-collection"),
    "discount-code": p("discount-code", "Discount code", "Reveal a code visitors can copy.", "product", "discount-code"),
    gleam: p("gleam", "Gleam", "Run giveaways and gated content.", "product", "gleam"),
    gofundme: p("gofundme", "GoFundMe", "Collect donations for a cause.", "product", "gofundme"),
    sendowl: p("sendowl", "SendOwl", "Sell digital downloads.", "product", "sendowl"),
    discord: p("discord", "Discord", "Invite people to your server.", "social", "discord"),
    whatsapp: p("whatsapp", "WhatsApp", "Start a chat or join a group.", "social", "whatsapp"),
    slack: p("slack", "Slack", "Invite people to your workspace.", "social", "slack"),
    form: p("form", "Form", "Collect messages from visitors.", "form", "form"),
    "contact-form": p("contact-form", "Contact form", "A ready-made contact form.", "form", "contact-form"),
    "email-signup": p("email-signup", "Email signup", "Grow your mailing list.", "form", "email-signup"),
    "sms-signup": p("sms-signup", "SMS signup", "Collect phone numbers.", "form", "sms-signup"),
    "community-sms": p("community-sms", "Community SMS", "Text updates to your community.", "form", "community-sms"),
    typeform: p("typeform", "Typeform", "Embed a Typeform survey.", "form", "typeform"),
    laylo: p("laylo", "Laylo", "Collect release notifications.", "form", "laylo"),
    umg: p("umg", "UMG signup", "Fan signup for a release.", "form", "umg"),
    maps: p("maps", "Maps", "Show where to find you.", "form", "maps"),
    "contact-details": p("contact-details", "Contact details", "Show email, phone and address.", "form", "contact-details"),
    faq: p("faq", "FAQs", "Answer common questions.", "form", "faq"),
    chatbot: p("chatbot", "Chatbot", "Let visitors ask questions.", "form", "chatbot"),
    email: p("email", "Email", "Start an email to you.", "form", "email"),
    stats: p("stats", "Stats", "Show a number that matters.", "form", "stats"),
    calendly: p("calendly", "Calendly", "Let people book a time.", "form", "calendly"),
    "tour-event": p("tour-event", "Tour & event", "Promote your next date.", "event", "event"),
    seated: p("seated", "Seated", "Sell tickets through Seated.", "event", "seated"),
    bandsintown: p("bandsintown", "Bandsintown", "List your upcoming shows.", "event", "bandsintown"),
    text: p("text", "Text", "Add a block of text.", "text", "text"),
    header: p("header", "Header", "Add a section heading.", "header", "header"),
    file: p("file", "File downloads", "Share downloadable files.", "link", "file")
  };

  /* ---- sections -------------------------------------------------------- */
  const SECTION = (title, ids) => ({ title, items: ids.map((k) => P[k]) });

  /* Only keep logo keys that actually have a file; give every provider a
     fallback colour so the monogram tile always renders. */
  Object.keys(P).forEach((k) => {
    const item = P[k];
    if (item.logo && !LOGOS[item.logo]) item.logo = null;
    if (!BRAND_COLORS[item.id]) BRAND_COLORS[item.id] = "#FF5000";
  });

  const SECTIONS = {
    commerce: [
      SECTION("Digital products", ["coaching", "digital-product", "courses"]),
      SECTION("Affiliate", ["affiliate", "quick-collection"]),
      SECTION("Physical products", ["shopify", "fourthwall", "amaze", "books", "bonfire"]),
      SECTION("Communities", ["discord", "whatsapp", "slack"]),
      SECTION("Promotions", ["discount-code", "gleam"]),
      SECTION("Fundraising", ["gofundme"]),
      SECTION("Other", ["sendowl", "mobile-app"])
    ],
    social: [
      SECTION("Social", ["instagram", "tiktok", "tiktok-profile", "x", "threads", "reviews", "facebook", "snapchat", "pinterest", "twitch", "reddit", "rss", "cameo", "clubhouse"]),
      SECTION("Games", ["call-of-duty", "bgmi", "free-fire", "clash-of-clans"])
    ],
    media: [
      SECTION("Audio", ["music", "podcast", "spotify", "youtube-music", "apple-music", "audiomack", "soundcloud", "presave"]),
      SECTION("Video", ["video", "youtube", "tiktok-video", "vimeo"]),
      SECTION("Document", ["pdf", "file"])
    ],
    contact: [
      SECTION("Forms", ["form", "contact-form", "email-signup", "sms-signup", "typeform", "laylo", "umg", "community-sms"]),
      SECTION("Details", ["maps", "contact-details", "faq", "chatbot", "email", "stats"]),
      SECTION("Scheduling", ["calendly"])
    ],
    event: [SECTION("Events", ["tour-event", "seated", "bandsintown"])],
    text: [SECTION("Text", ["text", "header"])]
  };

  const TABS = [
    { id: "suggested", label: "Suggested", icon: "bulb" },
    { id: "commerce", label: "Commerce", icon: "store" },
    { id: "social", label: "Social", icon: "heart" },
    { id: "media", label: "Media", icon: "play" },
    { id: "contact", label: "Contact", icon: "book" },
    { id: "event", label: "Event", icon: "calendar" },
    { id: "text", label: "Text", icon: "article" },
    { id: "all", label: "View all", icon: "dots" }
  ];

  const QUICK = [
    { id: "collection", label: "Collection", icon: "grid", color: "#FF5000" },
    { id: "link", label: "Link", icon: "link", color: "#C79A00" },
    { id: "product", label: "Product", icon: "tag", color: "#43A047" },
    { id: "form", label: "Form", icon: "message", color: "#0066BB" }
  ];

  const SUGGESTED = SECTION("Suggested", ["instagram", "tiktok", "youtube", "youtube-music", "spotify", "file"]);

  /* All providers, de-duplicated, in tab order — the "View all" tab. */
  function allSections() {
    const out = [];
    const seen = new Set();
    ["commerce", "social", "media", "contact", "event", "text"].forEach((tab) => {
      SECTIONS[tab].forEach((sec) => {
        const items = sec.items.filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        });
        if (items.length) out.push({ title: sec.title, items });
      });
    });
    return out;
  }

  window.PICKER = {
    TABS,
    QUICK,
    SUGGESTED,
    SECTIONS,
    ALL: allSections(),
    LOGO,
    LOGOS,
    BRAND_COLORS,
    /* Flat lookup, used by the link cards and the details step. */
    byId: P
  };
})();
