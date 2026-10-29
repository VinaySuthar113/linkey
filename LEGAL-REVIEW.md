# Legal review — open items before launch

Internal checklist, not legal advice. The public-facing text lives in `legal.html`.
This file records what still needs a human decision.

**Status:** build is clean of competitor material; the name needs clearance.

---

## 1. ⚠️ Blocking: the name "Linkey" is already in use

Two live apps already ship under this exact name:

| Store | Identifier | What it is |
|---|---|---|
| Apple App Store | `id6746167718` | "Linkey" — a network / device utility |
| Google Play | `com.linkeyapp.net` | "Linkey" — same publisher family |

They are not link-in-bio products, so this is not a straight market collision, but it
is a **prior use of the identical word mark in software**. Consequences:

- App Store / Play submissions can be rejected for name duplication.
- The existing publisher can oppose a trademark application or send a cease-and-desist.
- Search results and social handles are already diluted.

### What to do before spending on brand assets

1. **Clearance search** — identical and near-identical marks in the relevant classes
   (9 software, 35 SaaS/online services, 42 hosting):
   - USPTO TESS / Trademark Search (US)
   - EUIPO eSearch plus (EU)
   - UKIPO search (UK)
   - IP India public search (IN)
   - WIPO Global Brand Database (international)
2. **Company/domain check** — Companies House / MCA, plus `.com`, `.app`, `.io`.
3. **Decide**: rename, or licence/coexist. A rename is cheapest now; it gets
   exponentially more expensive after launch, press and printed material.
4. **If keeping the name**, file in the classes you actually trade in, and keep evidence
   of first use. Do not rely on the ™ symbol for protection — it only signals a claim.

Candidate names should be coined or arbitrary (strongest), not descriptive
("LinkPage", "BioLinks" are weak and hard to register).

> The rest of this document assumes the name is settled. None of it depends on the name.

---

## 2. Copy and design originality

Checked against the general link-in-bio category (Linktree, Beacons, Bio.link, Carrd,
Koji, Stan Store, Komi, Milkshake).

- **Layout / flow.** A list of link rows, a link picker grouped by category and a phone
  preview are category conventions, not protectable expression. The specific
  composition here comes from the supplied Figma file.
- **Copy.** All user-facing strings were rewritten. The design file's placeholder text
  ("Share your Music URL", "Share your PDF", "App pre-made collections") is **not**
  shipped — the unit suite asserts this (`tests/unit.test.js`, placeholder-copy checks).
- **Assets.** 18 brand marks were exported from the project's own design file, not
  scraped from a competitor. Provenance is recorded in `THIRD_PARTY.md`.
- **Code.** Written from scratch for this build. No competitor bundle was inspected,
  decompiled or copied. The app has zero runtime dependencies.
- **Fonts.** Rubik under the OFL, licence shipped. No commercial font is redistributed.

**Residual risk: low.** Nothing here reads as a clone of a specific competitor's
protected expression.

---

## 3. Trademark use inside the product

- The picker shows third-party marks to identify destinations. This is nominative use;
  it is the same thing every link-in-bio product does, and it is what makes the feature
  work at all.
- **Do not** use a third-party mark in the Linkey logo, app icon, store listing,
  screenshots used as marketing, or ad creative. That crosses from descriptive use into
  implied endorsement.
- **Do not** write "works with Instagram" style claims without checking each platform's
  brand guidelines. Prefer "add a link to Instagram".
- Keep the non-affiliation paragraph in Settings and on `legal.html` — it is the cheapest
  mitigation available.
- Honour removal requests promptly. The fallback is one data change (`logo: null`).

---

## 4. User content and safe harbour

A link-in-bio host is a hosting service for user content, so it needs a takedown
process, not just a policy page.

- `legal.html#dmca` has the notice requirements and the counter-notice promise.
- **Missing:** an actual designated agent / abuse mailbox. Replace
  `[DMCA EMAIL]`, `[CONTACT EMAIL]`, `[PRIVACY EMAIL]`, `[LEGAL ENTITY NAME]`,
  `[ADDRESS]`, `[JURISDICTION]`, `[VENUE]` and the age thresholds.
- **Missing:** repeat-infringer termination is stated in the policy but not enforced in
  code — there are no accounts yet. Revisit when auth lands.
- Outbound links are the highest-risk surface (phishing, malware, impersonation). The
  acceptable-use list covers it; enforcement needs link scanning or at least a report
  button on public pages.

---

## 5. Privacy

- This build is local-first: data sits in `localStorage` under `linkey.state.v1` and is
  not transmitted. That is stated accurately on `legal.html#privacy`.
- **No cookies, no third-party scripts, no font CDN** — verified by inspection of
  `index.html` and `legal.html`.
- **When a backend is added**, the policy needs: lawful basis, retention periods,
  sub-processors, international transfer safeguards, a data-processing agreement,
  breach-notification timeline, and a cookie banner if any non-essential cookie appears.
- GDPR/UK GDPR: the rights section already lists access, rectification, erasure,
  restriction, portability and objection. Add a supervisory-authority complaint route.
- **CCPA/CPRA** (if serving California): add "do not sell/share" language even if you
  don't sell data — the disclosure itself is required above the thresholds.
- Children: `legal.html` uses `[13/16]`. Pick one per market; COPPA is 13, GDPR is 16 by
  default with member-state derogations down to 13.

---

## 6. Security posture (verified in this build)

| Check | Result |
|---|---|
| URL scheme allow-list (`http`, `https`, `mailto`, `tel`) | `Store.safeUrl()`, applied to bio links, social icons and edit-link save |
| `javascript:` / `data:` / `vbscript:` / `file:` in a saved link | Rejected at input, neutralised to `#` at render |
| XSS via link title | Escaped with `Store.esc()`; tested with `<img onerror>` payload — not executed |
| Inline handlers from user data | None; all wiring is `data-action` + delegated listeners |
| Third-party requests | None |
| Secrets in the repo | None |

Re-run after any change: `node tests/unit.test.js` (712 assertions) plus the browser
flow in `qa/addpop.html`.

---

## 7. Launch checklist

- [ ] Name cleared, or renamed everywhere (app, store listings, domains, handles)
- [ ] `[bracketed]` placeholders in `legal.html` replaced
- [ ] Entity formed, address and contact mailbox live
- [ ] Trademark application filed in classes 9 / 35 / 42 (or a decision recorded not to)
- [ ] Lawyer review of Terms, Privacy and the liability/consumer-rights carve-outs
- [ ] DMCA agent designated (and registered with the US Copyright Office if US-facing)
- [ ] Report/abuse path on public pages
- [ ] Platform brand guidelines checked for every mark in the picker
- [ ] Backend privacy addendum written *before* the first byte leaves the browser
