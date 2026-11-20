"""Build the bilingual continental map and its article pages."""
from html import escape
import json
from pathlib import Path
import re

from build_reader_pages import ORIGIN, atlas_path, reader_html, reader_path


ROOT = Path(__file__).resolve().parent.parent
ATLAS_STYLE_LINK = '<link rel="stylesheet" href="/ai-atlas.css?v=20261120-2">'
CATALOG = json.loads((ROOT / "data/ai-atlas.json").read_text(encoding="utf-8"))
ARTICLES = [{"type": "atlas", "id": entry["id"], **entry["en"]} for entry in CATALOG["articles"]]
TRANSLATIONS = {entry["id"]: entry["pl"] for entry in CATALOG["articles"]}
SOURCES = {entry["id"]: entry["sources"] for entry in CATALOG["articles"]}
QUOTES = {
    entry["id"]: {lang: [entry[lang]["quote"]] for lang in ("pl", "en")}
    for entry in CATALOG["articles"]
}


def article_body(item, lang):
    body = (ROOT / "data/ai-atlas" / lang / f"{item['id']}.txt").read_text(encoding="utf-8")
    source_label = "Źródła" if lang == "pl" else "Sources"
    source_name = "Źródło" if lang == "pl" else "Source"
    bibliography = SOURCES[item["id"]]
    paragraphs = []
    for block in re.split(r"\n\s*\n", body.strip()):
        if block.startswith("## "):
            paragraphs.append(f'<h2 class="reader-section-title">{escape(block[3:])}</h2>')
            continue
        references = re.search(r"(?:\s*\[\d+\])+$", block)
        if references is None:
            paragraphs.append(f"<p>{escape(block)}</p>")
            continue
        numbers = [int(number) for number in re.findall(r"\d+", references.group())]
        if any(not 1 <= number <= len(bibliography) for number in numbers):
            raise ValueError(f"Missing source for {item['id']} in {lang}")
        citation_links = "".join(
            f'<a href="#source-{n}" aria-label="{source_name} {n}">[{n}]</a>'
            for n in numbers
        )
        paragraphs.append(
            f'<p>{escape(block[:references.start()])}<sup class="reader-citations">{citation_links}</sup></p>'
        )
    sources = []
    for n, (pl_label, en_label, url) in enumerate(bibliography, 1):
        label = pl_label if lang == "pl" else en_label
        sources.append(f'<li id="source-{n}"><a href="{escape(url, quote=True)}">{escape(label)}</a></li>')
    return "\n".join(paragraphs) + f'''
<section class="reader-sources" aria-labelledby="reader-sources-title">
<h2 id="reader-sources-title">{source_label}</h2>
<ol>{''.join(sources)}</ol>
</section>'''


def map_page(lang):
    ui = CATALOG["ui"][lang]
    home = "/pl/" if lang == "pl" else "/"
    title = escape(ui["title"])
    subtitle = escape(ui["subtitle"])
    pins, cards = [], []
    for item, entry in zip(ARTICLES, CATALOG["articles"], strict=True):
        key = item["id"]
        text = entry[lang]
        path = reader_path(item, lang, TRANSLATIONS)
        region = escape(text["region"])
        x, y = entry["pin"]
        pins.append(f'''<a href="{path}" class="atlas-pin" data-continent="{key}" style="--pin-x:{x}%;--pin-y:{y}%" aria-label="{region}"><span class="atlas-pin-dot" aria-hidden="true"></span><span class="atlas-pin-label" aria-hidden="true">{region}</span></a>''')
        cards.append(f'''<div data-atlas-card="{key}" hidden>
<p class="atlas-location">{region}</p>
<h2>{escape(text["title"])}</h2>
<p class="atlas-case-copy">{escape(text["description"])}</p>
<a class="atlas-read" href="{path}">{escape(ui["read"])}</a>
</div>''')
    languages = "".join(
        f'<a href="{atlas_path(t)}" data-atlas-language lang="{t}" hreflang="{t}"'
        + (' aria-current="page"' if t == lang else "")
        + f'>{t.upper()}</a>'
        for t in ("en", "pl")
    )
    return f'''<!doctype html>
<html lang="{lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101c22">
<title>{title} | Mariusz Gorlowski</title>
<meta name="description" content="{escape(ui["subtitle"], quote=True)}">
<link rel="canonical" href="{ORIGIN}{atlas_path(lang)}">
<link rel="alternate" hreflang="en" href="{ORIGIN}{atlas_path("en")}">
<link rel="alternate" hreflang="pl" href="{ORIGIN}{atlas_path("pl")}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/styles.css">
{ATLAS_STYLE_LINK}
<script src="/ai-atlas.js?v=20261120-1" defer></script>
</head>
<body class="atlas-view">
<div class="atlas-page">
<header class="atlas-topbar"><div class="atlas-topbar-inner">
<a class="atlas-back" href="{home}">{escape(ui["home"])}</a>
<nav class="atlas-languages" aria-label="Język / Language">{languages}</nav>
</div></header>
<main class="atlas-content" aria-labelledby="atlas-title">
<header class="atlas-intro">
<h1 class="atlas-title" id="atlas-title">{title}</h1>
<p class="atlas-deck">{subtitle}</p>
</header>
<div class="atlas-layout">
<div class="atlas-map">
<img src="/assets/ai-atlas-map.svg" width="1000" height="515" alt="">
{chr(10).join(pins)}
</div>
<section class="atlas-case" aria-live="polite" aria-atomic="true">
<p class="atlas-hint" data-atlas-hint>{escape(ui["continent"])}</p>
{chr(10).join(cards)}
</section>
</div>
</main>
</div></body></html>
'''


def write_page(path, html):
    destination = ROOT / path.lstrip("/") / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")


def add_home_entry(lang):
    ui = CATALOG["ui"][lang]
    page = ROOT / ("pl/index.html" if lang == "pl" else "index.html")
    original = page.read_text(encoding="utf-8")
    block = (
        f'<!-- AUTO:AI_ATLAS:START --><a class="atlas-entry" href="{atlas_path(lang)}" aria-label="{escape(ui["entry"], quote=True)}">'
        '<span class="atlas-entry-dot" aria-hidden="true"></span></a><!-- AUTO:AI_ATLAS:END -->'
    )
    begin = "<!-- AUTO:AI_ATLAS:START -->"
    if begin in original:
        updated, count = re.subn(begin + r".*?<!-- AUTO:AI_ATLAS:END -->", lambda _: block, original, flags=re.DOTALL)
    else:
        updated, count = re.subn('<div class="cover-content">', lambda match: block + "\n" + match.group(), original)
    if count != 1:
        raise ValueError(f"Expected one atlas entry in {page.name}")
    updated, style_count = re.subn(r'<link rel="stylesheet" href="/ai-atlas\.css(?:\?[^\"]*)?">', ATLAS_STYLE_LINK, updated, count=1)
    if not style_count:
        updated = updated.replace("</head>", ATLAS_STYLE_LINK + "\n</head>", 1)
    page.write_text(updated, encoding="utf-8")


def build():
    locations = []
    for lang in ("en", "pl"):
        home = atlas_path(lang)
        write_page(home, map_page(lang))
        locations.append(home)
        add_home_entry(lang)
        for index, article in enumerate(ARTICLES):
            path = reader_path(article, lang, TRANSLATIONS)
            next_article = ARTICLES[(index + 1) % len(ARTICLES)]
            write_page(path, reader_html(article, lang, TRANSLATIONS, article_body, None, next_article, QUOTES))
            locations.append(path)
    sitemap = ROOT / "sitemap.xml"
    text = sitemap.read_text(encoding="utf-8")
    additions = [f"  <url><loc>{ORIGIN}{path}</loc></url>" for path in locations if f"<loc>{ORIGIN}{path}</loc>" not in text]
    if additions:
        sitemap.write_text(text.replace("</urlset>", "\n".join(additions) + "\n</urlset>"), encoding="utf-8")


if __name__ == "__main__":
    build()
