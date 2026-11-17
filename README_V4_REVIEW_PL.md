# V4 — draft for review (17 November 2026)
Base: 0f13d0d4a1af10d6b8f027a96cea471529500f8c (main). Branch: v4-review-2026-11-17. This branch is a DRAFT, not published to the official GitHub Pages website.
- Home preserves the approved cover, portrait, author lines and intro; two equal side-by-side clickable cards, including on a 320px screen.
- /writing/ opens books; /writing/essays/ lists two selected published essays. No manuscript excerpts.
- /qr-finder/ opens system; /qr-finder/articles/ lists two selected public articles.
- /contact/ is the single shared Formspree form. It is deliberately disabled on preview hosts to avoid sending test enquiries. It operates only on the production hostname after approved deploy.
- The existing assets, styles.css, privacy.html, thank-you.html, CNAME, verification tag, QR FINDER production and other repositories are unchanged.
- Selection in data/publications.json is manual by featured/display_order; scripts/build_publications.py builds only curated V4 pages.
- sitemap.xml reflects planned URLs and only becomes public after an authorised merge to main.
- Preview visually and check mobile before requesting PUBLISH. NEVER merge without the author's explicit consent.
