# Apex Finance — social media kit

Everything needed to post the case study on LinkedIn, Instagram and X. Assets are rendered from HTML at each platform's native size, so type stays sharp at full resolution.

Live case study: https://apex-finance-case-study.vercel.app/

---

## What's in here

```
social/
  linkedin/apex-case-study-carousel.pdf   8 pages · 1080×1350 · 3.3 MB
  carousel/slide-01..08.png               1080×1350 (4:5)  — Instagram + PDF source
  x/x-01..05.png                          1600×900 (16:9)
  story/story-01.png                      1080×1920 (9:16)
  og/apex-og-1200x630.png                 1200×630 (link preview)
  copy/linkedin.md                        post + first comment + alt text
  copy/instagram.md                       caption + story + alt text
  copy/x.md                               6-post thread + single-post variant
  copy/check-lengths.mjs                  verifies every X post is ≤ 280 chars
```

---

## Post playbook

### LinkedIn — document carousel
1. Start a post → **Add a document** → upload `linkedin/apex-case-study-carousel.pdf`.
2. Name the document: `Apex Finance — product case study`.
3. Paste the body from `copy/linkedin.md`.
4. Publish, then immediately add the **first comment** with the four links.
5. Hashtags go at the end of the body: `#ProductDesign #Fintech #DesignSystems #UX #Frontend #Nigeria`.

Why a PDF: LinkedIn turns documents into swipeable carousels that stay readable at full width, and the first page becomes the feed thumbnail — page 1 is built for that.

### Instagram — carousel + story
1. Post `carousel/slide-01.png` … `slide-08.png` **in order** (4:5 keeps the most grid height).
2. Caption from `copy/instagram.md`; link goes in the **bio**.
3. Post `story/story-01.png` separately, with the link sticker placed just above the "Case study → link in bio" pill.

### X — thread
1. Post as a **single thread**, images `x-01` … `x-05` attached to posts 1–5.
2. Links only in post 6. Link-first posts get suppressed.
3. Alternative: one post with four images (`x-01`–`x-04`) using the "Single post" block.

---

## Posting order

If you post all three, space them across the day rather than firing simultaneously:

1. **LinkedIn** first — it has the longest tail and the most text.
2. **X** a couple of hours later — the thread can quote the LinkedIn discussion.
3. **Instagram** after that, with the story pointing back at the carousel.

---

## Content rules baked into the assets and copy

These are not decoration — they are the reason the case study works:

- **No invented outcomes.** KPIs and guardrails are proposed, not measured. Never add "we increased X by Y%".
- **Rates are illustrative.** 16% p.a., 12% p.a. and 14% p.a. in the demo are sample numbers, not offers.
- **Apex is a portfolio concept**, not a licensed institution. The disclaimer stays in the alt text, the captions and page 8.
- **Prices are delayed 15 minutes**, and the screen says so.

---

## Alt text

Every asset has alt text in its platform's copy file. Short version:

- Cover — "Banking that grows with you" with the Apex mobile home screen.
- Savings — a fixed plan showing 16% p.a., opened 20 October, matures 18 January, locked until maturity.
- Movement — the send sheet showing ₦0.00 fee and instant settlement before the send button.
- Shares — NGX portfolio, USD wallet, six holdings, 15-minute delay badge.
- System — desktop workspace in light, then in deep royal-blue dark mode.
- Close — four live links, KPIs proposed rather than reported.

---

## Regenerating

The renderer lives outside the repo (`shots/` is gitignored) because it drives a headless browser:

```
node shots/social-capture.mjs   # signs into mobile + desktop at 2x, writes shots/social-raw/
node shots/social-build.mjs     # composes HTML per asset, screenshots, builds the PDF
node social/copy/check-lengths.mjs
```

`social-build.mjs` reads the raw captures plus the built fonts and screenshots at exact platform sizes; it writes every PNG in `social/` and the LinkedIn PDF. Editing copy or layout means editing that script and re-running it — do not hand-edit the PNGs.

---

## Before you publish

- [ ] Logo/name spelling and the four URLs check out against the live sites.
- [ ] Alt text attached to every image (platforms don't auto-fill it).
- [ ] Link in the right place: LinkedIn first comment, Instagram bio, X last post.
- [ ] The "portfolio concept · sample data" line survived wherever you trimmed.
- [ ] `node social/copy/check-lengths.mjs` passes after any X edit.
