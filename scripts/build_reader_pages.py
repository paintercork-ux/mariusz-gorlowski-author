"""Build the individual reading pages and the latest-essay home card."""
from html import escape
import json
import re

ORIGIN = "https://mariuszgorlowski.com"


def reader_path(item, lang, translations):
    metadata = translations[item["id"]] if lang == "pl" else item
    slug = metadata.get("slug", item["id"])
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise ValueError("Invalid essay slug: " + slug)
    return ("/pl" if lang == "pl" else "") + "/writing/essays/" + slug + "/"


def reader_html(item, lang, translations, render_body, date_label, next_item):
    polish = lang == "pl"
    meta = translations[item["id"]] if polish else item
    title, description = escape(meta["title"]), escape(meta["description"], quote=True)
    path = reader_path(item, lang, translations)
    english = reader_path(item, "en", translations)
    polish_path = reader_path(item, "pl", translations)
    home = "/pl/" if polish else "/"
    listing = home + "writing/essays/"
    published = "Opublikowane" if polish else "Published"
    back = "Wszystkie eseje" if polish else "All essays"
    skip = "Przejdź do tekstu" if polish else "Skip to the essay"
    smaller = "Zmniejsz tekst" if polish else "Decrease text size"
    larger = "Powiększ tekst" if polish else "Increase text size"
    group_label = "Wielkość tekstu" if polish else "Text size"
    next_label = "Przeczytaj także" if polish else "Read next"
    next_meta = translations[next_item["id"]] if polish else next_item
    next_path = reader_path(next_item, lang, translations)
    en_current = ' aria-current="page"' if not polish else ""
    pl_current = ' aria-current="page"' if polish else ""
    structured = json.dumps({
        "@context": "https://schema.org", "@type": "Article",
        "headline": meta["title"], "description": meta["description"],
        "inLanguage": lang, "datePublished": item["date"],
        "mainEntityOfPage": ORIGIN + path,
        "author": {"@type": "Person", "name": "Mariusz Gorlowski", "url": ORIGIN + "/"},
    }, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!doctype html>
<html lang="{lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>{title} | Mariusz Gorlowski</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{ORIGIN}{path}">
<link rel="alternate" hreflang="en" href="{ORIGIN}{english}">
<link rel="alternate" hreflang="pl" href="{ORIGIN}{polish_path}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mariusz Gorlowski">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{ORIGIN}{path}">
<meta property="og:image" content="{ORIGIN}/assets/cover.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/reader.css?v=20261119-reading-1">
<script src="/reader.js?v=20261119-reading-1" defer></script>
<script type="application/ld+json">{structured}</script>
</head><body class="essay-reader">
<a class="reader-skip" href="#essay">{skip}</a>
<header class="reader-topbar"><div class="reader-topbar-inner">
<a class="reader-brand" href="{home}"><span class="reader-monogram" aria-hidden="true">MG</span><span>Mariusz Gorlowski</span></a>
<nav class="reader-languages" aria-label="Language / Język"><a href="{english}" lang="en" hreflang="en"{en_current}>EN</a><a href="{polish_path}" lang="pl" hreflang="pl"{pl_current}>PL</a></nav>
</div><div class="reader-progress" aria-hidden="true"><span data-reader-progress></span></div></header>
<main class="reader-main" id="essay">
<div class="reader-tools"><a class="reader-back" href="{listing}">{back}</a>
<div class="reader-size" role="group" aria-label="{group_label}"><button type="button" data-reader-smaller aria-label="{smaller}" title="{smaller}" disabled>A−</button><button type="button" data-reader-larger aria-label="{larger}" title="{larger}" disabled>A+</button></div></div>
<article aria-labelledby="reader-title"><div class="reader-meta"><time datetime="{item['date']}">{date_label(item['date'], lang)}</time><span class="reader-published">{published}</span></div>
<h1 class="reader-title" id="reader-title">{title}</h1>
<p class="reader-byline">Mariusz Gorlowski</p><hr class="reader-rule" aria-hidden="true">
<div class="essay-reader-body" data-reader-body>
{render_body(item, lang)}
</div></article>
<aside class="reader-next"><p>{next_label}</p><a href="{next_path}">{escape(next_meta['title'])}</a></aside>
<footer class="reader-footer"><a href="{listing}">{back}</a><br><a href="{home}">mariuszgorlowski.com</a></footer>
</main></body></html>
'''


def latest_card(item, lang, translations, date_label):
    polish = lang == "pl"
    meta = translations[item["id"]] if polish else item
    heading = "NAJNOWSZY ESEJ" if polish else "LATEST ESSAY"
    published = "Opublikowane" if polish else "Published"
    read = "Przeczytaj esej" if polish else "Read the essay"
    return f'''<section class="home-latest container" aria-labelledby="latest-essay-title">
<div class="home-latest-card"><div><p class="home-latest-eyebrow">{heading}</p>
<h2 id="latest-essay-title">{escape(meta['title'])}</h2>
<p class="home-latest-intro">{escape(meta['description'])}</p></div>
<div class="home-latest-actions"><div class="home-latest-meta"><time datetime="{item['date']}">{date_label(item['date'], lang)}</time><span class="home-latest-status">{published}</span></div>
<a class="btn btn-dark" href="{reader_path(item, lang, translations)}">{read}</a></div></div>
</section>'''


def write_reading_pages(root, posts, translations, render_body, date_label):
    essays = sorted((item for item in posts if item["type"] == "essay" and item.get("status") == "published"), key=lambda item: item["date"], reverse=True)
    if not essays:
        return
    sitemap_entries = []
    for lang, homepage in (("en", "index.html"), ("pl", "pl/index.html")):
        for index, item in enumerate(essays):
            next_item = essays[(index + 1) % len(essays)]
            url_path = reader_path(item, lang, translations)
            destination = root / url_path.lstrip("/") / "index.html"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(reader_html(item, lang, translations, render_body, date_label, next_item), encoding="utf-8")
            sitemap_entries.append(ORIGIN + url_path)
        page = root / homepage
        html = page.read_text(encoding="utf-8")
        updated, count = re.subn(r"<!-- AUTO:LATEST_ESSAY:START -->.*?<!-- AUTO:LATEST_ESSAY:END -->", lambda _: "<!-- AUTO:LATEST_ESSAY:START -->" + latest_card(essays[0], lang, translations, date_label) + "<!-- AUTO:LATEST_ESSAY:END -->", html, flags=re.DOTALL)
        if count != 1:
            raise RuntimeError("Expected one latest-essay block in " + homepage)
        page.write_text(updated, encoding="utf-8")
    sitemap = root / "sitemap.xml"
    xml = sitemap.read_text(encoding="utf-8")
    additions = [f"  <url><loc>{url}</loc></url>" for url in sitemap_entries if f"<loc>{url}</loc>" not in xml]
    if additions:
        xml = xml.replace("</urlset>", "\n".join(additions) + "\n</urlset>")
        sitemap.write_text(xml, encoding="utf-8")
