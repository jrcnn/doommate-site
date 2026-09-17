# doommate-site

Static website for [Doommate](https://doommate.com/), hosted on GitHub Pages. No build step, no framework.

```
index.html            landing page
privacy/index.html    Privacy Policy  → /privacy/
terms/index.html      Terms of Use    → /terms/
imprint/index.html    Imprint         → /imprint/
support/index.html    Support         → /support/
CNAME                 custom domain (doommate.com)
404.html              self-contained not-found page
assets/css/site.css   shared tokens (mirrors Doommate/DesignSystem/Theme.swift), header, footer
assets/css/landing.css
assets/css/legal.css
assets/js/landing.js  typewriter (web port of TypewriterEngine), scroll reveals, feed → block screen, pinned phone, payoff counter
assets/img/           app icon sizes and screenshots (webp, 660px wide)
```

## Local preview

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## Deploying

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)`. `.nojekyll` is present so files are served as-is.

The site is served at `https://doommate.com/`, set by the `CNAME` file and under Settings → Pages → Custom domain. Internal links are relative. The absolute `og:url`, `og:image` and `canonical` URLs, and the 404 page's home link, assume the domain root.

## Editing

- **Legal documents:** the `<article class="doc">` in `privacy/index.html` and `terms/index.html` is the document text. Edit it in place and update the “Last Updated” line. Each `<h2>` has an `id="section-N"` that the contents list links to.
- **Imprint:** hand-written (not derived from the legal documents). Service-provider details under Hungary's e-commerce act; if a sole-proprietor registration number or tax number exists, add it to section 1. Every page's footer links to it.
- **Support:** one button that opens an email to `doommateapp@gmail.com` with the subject "Doommate support". Every page's footer links to it; this is the page to give App Store Connect as the Support URL.
- **App Store link:** both download buttons in `index.html` (hero and closing) link to `https://apps.apple.com/app/doommate-quit-doomscrolling/id6788865673`. The URL has no country code, so Apple opens the visitor's own storefront.
- **Link preview:** every page's Open Graph tags point to `assets/img/og.png`, a 1200×630 render of the landing hero. Link previews in Discord, iMessage, Slack and other apps use it. If the hero changes, re-render it: screenshot `index.html` at a 1440×756 window at 2× scale with reduced motion, then crop around the content and scale to 1200×630. Discord caches previews, so test a changed image with a new URL such as `https://doommate.com/?v=2`.
- **Dialog lines:** the hero terminal plays lines from the `#dialog-lines` JSON block at the bottom of `index.html`, copied verbatim from the app's `Resources/DialogLines/generic.json`, inline markup included.
- **Block screen:** the shield in the feed section mirrors `DoommateShieldUI/ShieldConfigurationExtension.swift` — the signal-lost icon is that file's Core Graphics geometry as SVG, the subtitle is one of its `operationLines`, and the button reads `UNDERSTOOD`. Update both together.
- **Sample records:** the graded operations and the reclaimed-hours card are illustrative and labelled as samples on the page. Keep them consistent with `AppRouter.computeGrade`: abandoned is always F, and S needs ≥95% of the goal on Brutal for at least 10 days.
