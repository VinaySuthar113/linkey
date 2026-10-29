# Third-party notices

This project ships a small number of third-party assets. Everything else — layout,
CSS, JavaScript, icons and copy — was written for Linkey.

## 1. Rubik (typeface)

| | |
|---|---|
| Files | `assets/fonts/rubik-latin.woff2`, `assets/fonts/rubik-latin-ext.woff2` |
| Upstream | https://github.com/googlefonts/rubik |
| Copyright | Copyright 2015 The Rubik Project Authors |
| Licence | SIL Open Font License, Version 1.1 |
| Licence text | `assets/fonts/OFL.txt` (shipped, as the OFL requires) |
| Modifications | Subset to Latin / Latin-Extended and converted to WOFF2. No glyph outlines were redrawn. |

The OFL permits use, modification and redistribution (including in a commercial
product and in a web font served to visitors) provided the licence travels with the
font, the font is not sold on its own, and any Reserved Font Name is not reused for a
modified version. Rubik declares no Reserved Font Name, so the family name is kept.

The app loads Rubik from its own origin. No Google Fonts request is made at runtime,
so no visitor IP is shared with Google for font delivery.

## 1b. The owner's brand mark

`assets/brand/logo.svg` is the owner's own mark, redrawn as vectors from the `LOGO`
frame of the Linkey design file. It replaces the previous brand mark used in the
design mockups, which belonged to a third party and is not shipped with this build.

It is the only file that needs to change to rebrand the product: the legal header
and the public-page footer both read it through `Pages.brandMark()`, so a
replacement propagates everywhere.

## 1c. Sign-in photographs

| | |
|---|---|
| Files | `assets/img/auth/photo-1.webp`, `assets/img/auth/photo-2.webp` |
| Source | Exported from the Linkey design file supplied for this build (`E:\Linkey.figcraft`), then cropped and recompressed to WebP |
| Role | Decorative art pane on the log-in and sign-up screens |

These are **placeholders taken from the design mockup**, not licensed stock. They
are decorative only (`aria-hidden`, empty `alt`). Before launch, replace them with
photography the operator owns or has licensed, or drop the pane entirely — the
layout degrades cleanly to a single centred column below 1100px, so deleting the
two files and the `.auth__art` markup costs nothing functionally.

## 2. Brand marks in the link picker

`assets/icons/providers/` contains 18 vector marks:

instagram, tiktok, youtube, youtube-music, youtube-circle, spotify, apple-music,
audiomack, soundcloud, x, threads, facebook, snapchat, pinterest, twitch, reddit,
clubhouse, rss.

**Provenance.** These were exported as vectors from the Linkey design file supplied for
this build (`E:\Linkey.figcraft`). No asset was taken from a competing product's
website, app bundle or icon library.

**Rights.** Every mark remains the trademark of its owner. Linkey claims no ownership.
They are used only to identify the service a link points to — nominative, descriptive
use inside a picker that the user operates. Nothing in the interface states or implies
partnership, endorsement or sponsorship.

**Fallback.** Providers without an exported mark render as a tinted monogram tile
generated at runtime from the provider's name and brand colour. No image file is
created or downloaded for them.

**Removal policy.** A rights holder can ask for a mark to be removed; the setting is a
one-line data change (`logo: null` in `assets/js/providers.js`) that falls back to the
monogram tile. This is documented in the public legal page under *Trademarks*.

## 2b. Google and Apple sign-in buttons

The "Continue with Google" and "Continue with Apple" buttons draw their marks as
inline SVG in `assets/js/pages.js` (`Pages.oauthIcon`): the four-colour Google "G"
and the Apple logo silhouette.

Both are trademarks of their owners and are used for the one purpose the marks exist
for — labelling the button that starts that provider's sign-in. The buttons are only
shown on the auth screens. If either provider's brand guidelines require a different
lockup, the mark is a single function and the surrounding button is styled from the
design file, so swapping it does not touch any other screen.

Nothing here implies endorsement. Apple's guidelines additionally restrict use of
"Sign in with Apple" to actual Apple ID sign-in. Apple sign-in is therefore **off by
default** (`auth.apple: false` in `assets/js/config.js`) and its button is not
rendered until a real Apple provider is configured. Google buttons start the real
PKCE flow once `config.js` holds a Supabase project; with an empty config they fall
back to the local demo, which **must not ship to production as a sign-in claim**.
Either fill in the config (see `BACKEND.md §2`) or hide the buttons until it is
filled.

## 3. Interface icons

`assets/js/icons.js` — original 1.5px stroke icons drawn for this project. Not copied
from an icon set, so no attribution is required.

## 4. What is deliberately *not* included

- No CSS, JavaScript, HTML, copy, screenshots or icon sprites from Linktree, Beacons,
  Carrd, Bio.link, Koji, Milkshake, Stan Store, Komi or any other link-in-bio product.
- No competitor trademarks in the product name, logo, tagline or marketing copy.
- No scraped profile photos. Mock portraits in the design are replaced with generated
  gradient placeholders.
- No analytics, ad or tracking SDK.

## 5. Runtime dependencies

None. The app is plain HTML, CSS and JavaScript with no package manager, bundler or
CDN dependency. `tools/spa_server.py` uses only the Python standard library.
