# Bilingual EN / PL website — review branch
Status: **DRAFT ONLY. NOT PUBLISHED.** Main and official website have not been changed.
Branch: `bilingual-en-pl-review-2026-11-17`. Please do not merge without the author's explicit PUBLISH approval.

## Architecture
- Original English six indexable URLs are unchanged.
- Exact Polish equivalents live under `/pl/`; each has independent, fully translated visible content, `lang=pl`, local canonical, SEO title/description, and reciprocal `hreflang` references.
- Every EN and PL page, including noindex privacy and thank-you screens, has a compact accessible language switch linking to the **equivalent page**.
- Main assets remain in `/assets/`. The images are the existing approved photographs and the existing English cover proposals (correctly labeled as such in the Polish captions).
- All internal PL links target PL pages, external original social links stay unchanged.
- Sitemap lists 12 public EN and PL content URLs; privacy and thank-you remain noindex.

## Editorial
- Original EN literary essays are in `data/essays/*.txt`. Draft Polish translations for editorial approval are in `data/essays/pl/*.txt`. These are translations of *previously published* essays, not new works or manuscript excerpts.
- `data/publications.json` maintains the English source-of-truth IDs, dates, external links, manual features and order. `data/publications_pl.json` contains matching Polish metadata.
- Run `python scripts/build_publications.py` after editing the metadata or either language's approved full essay text. The script updates selected article cards in both languages and does not scrape social media.
- Current QR FINDER Articles & Updates page contains summaries and external social links in the EN source. The Polish page translates **all content that exists on the EN page**, but does not invent or republish the full external articles. Full article archive can be a separate agreed enhancement only after obtaining their complete source texts.
- The unreleased third essay and unpublished books are not published or excerpted.

## Contact / privacy
- Same pre-existing verified Formspree form ID; no new account and no exposure of private recipient address.
- Polish option display labels are localized; submitted values and the query-topic selectors remain unchanged.
- The browser confirmation and error messages are localized. In preview domains, form submission is intentionally blocked.
- `/pl/thank-you.html` receives successful Polish form submissions; EN form behavior stays as it was.

## Approval checklist before public deploy
1. Author reviews all Polish literary and product copy (especially essay tone and book statuses).
2. Check responsive EN/PL header switch and mobile two-card home layout (320px, iPhone, desktop), QR photo placement and book-cover display.
3. Verify all 12 pages, reciprocal language links, image/CSS asset paths and canonical / hreflang / sitemap.
4. Verify preview-mode form is blocked; test real production form only with explicit user approval after publish.
5. Only with separate explicit approval: PR review, merge, GitHub Pages deploy evidence, live verification, then monitor Search Console. Do not repeat already completed domain verification or submit sitemap reflexively.

QR FINDER *production* repositories, Netlify, Stripe, and product infrastructure are out of scope.
