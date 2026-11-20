"""Build the individual reading pages and the latest-essay home card."""
from html import escape
import json
import re

ORIGIN = "https://mariuszgorlowski.com"


def atlas_path(lang):
    return "/pl/siedem-twarzy-ai/" if lang == "pl" else "/seven-faces-of-ai/"


def reader_path(item, lang, translations):
    metadata = translations[item["id"]] if lang == "pl" else item
    slug = metadata.get("slug", item["id"])
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise ValueError("Invalid essay slug: " + slug)
    if item["type"] == "atlas":
        return atlas_path(lang) + slug + "/"
    section = "/writing/" if item["type"] in {"article", "story"} else "/writing/essays/"
    return ("/pl" if lang == "pl" else "") + section + slug + "/"


def sourced_article_body(body, bibliography, item_id, lang):
    source_label = "Źródła" if lang == "pl" else "Sources"
    source_name = "Źródło" if lang == "pl" else "Source"
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
            raise ValueError(f"Missing source for {item_id} in {lang}")
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


def quote_markup(item, lang, metadata, quotes):
    paragraphs = quotes.get(item["id"], {}).get(lang)
    if not paragraphs:
        return ""
    polish = lang == "pl"
    article = item["type"] in {"atlas", "article"}
    calendar = item["type"] == "calendar"
    caption = "Zabierz jedną myśl" if polish else "Take a thought with you"
    save = "Zapisz myśl" if polish else "Save a thought"
    close = "Zamknij" if polish else "Close"
    download = "Pobierz grafikę" if polish else "Download image"
    choose = "Wybierz inny fragment" if polish else "Choose another passage"
    instructions = "Wybierz fragment eseju. Możesz go skrócić lub wkleić inny fragment tekstu." if polish else "Choose a passage from the essay. You can shorten it or paste another excerpt."
    passages = "Fragmenty eseju" if polish else "Essay passages"
    excerpt = "Fragment do zapisania" if polish else "Passage to save"
    limit = "Do 500 znaków, aby karta pozostała czytelna." if polish else "Up to 500 characters to keep the card readable."
    generate = "Podgląd karty" if polish else "Preview card"
    cancel = "Anuluj" if polish else "Cancel"
    error = "Nie udało się przygotować grafiki. Spróbuj ponownie." if polish else "The image could not be prepared. Please try again."
    data = {"title": metadata["title"], "language": lang, "paragraphs": paragraphs, "filename": "mariusz-gorlowski-" + metadata.get("slug", item["id"]) + "-" + lang + ".png"}
    if article:
        instructions = "Wybierz fragment artykułu. Możesz go skrócić lub wkleić inny fragment tekstu." if polish else "Choose a passage from the article. You can shorten it or paste another excerpt."
        passages = "Fragmenty artykułu" if polish else "Article passages"
        data["article"] = True
    suffix = "-" + item["id"] if calendar else ""
    copy_action = copy_status = ""
    preview_actions = f'<a class="quote-download" data-quote-download download>{download}</a>'
    maxlength = ' maxlength="500"'
    if calendar:
        instructions = "Wybierz akapit. Możesz go skrócić lub wkleić dowolny fragment tej kartki." if polish else "Choose a paragraph. You can shorten it or paste any passage from this page."
        passages = "Fragmenty kartki" if polish else "Passages from this page"
        limit = "Grafika może zawierać do 500 znaków." if polish else "The image can contain up to 500 characters."
        copy_label = "Skopiuj cytat" if polish else "Copy quote"
        device_save = "Zapisz lub udostępnij" if polish else "Save or share"
        save_help = "Jeśli zapis w podglądzie nie ruszy, przytrzymaj obraz lub otwórz stronę w przeglądarce telefonu." if polish else "If saving does not start, press and hold the image or open the page in your phone’s browser."
        copied = "Skopiowano." if polish else "Copied."
        manual = "Użyj opcji Kopiuj dla zaznaczonego tekstu." if polish else "Use your device’s Copy option for the selected text."
        copy_action = f'<button class="quote-choose" type="button" data-copy-quote>{copy_label}</button>'
        preview_actions = (
            f'<div class="quote-card-actions">{preview_actions}'
            f'<button class="quote-choose" type="button" data-quote-device-save hidden>{device_save}</button>'
            f'{copy_action}</div><p class="quote-save-help" data-quote-save-help hidden>{save_help}</p>'
        )
        copy_status = f'<p class="quote-copy-status" role="status" data-quote-copy-status data-copied="{copied}" data-manual="{manual}"></p>'
        maxlength = ""
        data["calendar"] = True
        if metadata.get("prepared_cards"):
            data["prepared_cards"] = metadata["prepared_cards"]
    payload = escape(json.dumps(data, ensure_ascii=False), quote=True)
    dialog_id = f"quote-dialog{suffix}"
    entry = (
        f'<button class="reader-quote-trigger" type="button" data-save-quote data-quote="{payload}"'
        f' aria-haspopup="dialog" aria-controls="{dialog_id}" disabled>'
        f'<span class="reader-quote-caption">{caption}</span>'
        f'<span class="reader-quote-button">{save}</span></button>'
    )
    return f'''<section class="reader-quote-save" aria-label="{save}">{entry}
<p class="quote-error" data-quote-error role="status" hidden>{error}</p></section>
<dialog class="quote-dialog" data-quote-dialog id="{dialog_id}" aria-labelledby="quote-dialog-title{suffix}"><div class="quote-dialog-shell">
<div class="quote-dialog-head"><h2 id="quote-dialog-title{suffix}">{save}</h2><form method="dialog"><button class="quote-close" type="submit">{close}</button></form></div>
<div class="quote-card-panel" data-quote-card>
<button class="quote-choose" type="button" data-quote-choose>{choose}</button>
<img class="quote-preview-image" data-quote-preview width="1080" height="1350" alt="">
{preview_actions}
</div>
<form class="quote-editor" data-quote-editor hidden>
<p class="quote-picker-help">{instructions}</p>
<div class="quote-passages" data-quote-passages role="group" aria-label="{passages}"></div>
<label for="quote-excerpt{suffix}">{excerpt}</label>
<textarea id="quote-excerpt{suffix}" data-quote-excerpt rows="4"{maxlength} aria-describedby="quote-limit{suffix} quote-count{suffix} quote-edit-error{suffix}"></textarea>
<div class="quote-editor-meta"><p id="quote-limit{suffix}">{limit}</p><output id="quote-count{suffix}" data-quote-count></output></div>
<p class="quote-edit-error" id="quote-edit-error{suffix}" data-quote-edit-error role="alert" hidden></p>
<div class="quote-editor-actions"><button class="quote-cancel" type="button" data-quote-cancel>{cancel}</button>{copy_action}<button class="quote-apply" type="submit" data-quote-apply>{generate}</button></div>
</form>{copy_status}
</div></dialog>'''


def reader_bookmark_ui(lang):
    polish = lang == "pl"
    save = "Zapisz miejsce" if polish else "Save my place"
    resume = "Wróć do zakładki" if polish else "Resume reading"
    remove = "Usuń zakładkę" if polish else "Remove bookmark"
    saved = "Miejsce zapisane. Wrócisz tu po ponownym otwarciu tekstu." if polish else "Place saved. You'll return here the next time you open this text."
    removed = "Zakładka usunięta." if polish else "Bookmark removed."
    unavailable = "Zakładka jest niedostępna w tej przeglądarce." if polish else "Bookmarks are unavailable in this browser."
    button = (
        f'<button class="reader-bookmark" type="button" data-reader-bookmark aria-label="{save}" title="{save}" '
        f'data-saved="{saved}" data-removed="{removed}" data-remove-label="{remove}" data-unavailable="{unavailable}" hidden>'
        f'<span class="reader-bookmark-icon" aria-hidden="true"></span><span class="reader-bookmark-label">{save}</span></button>'
    )
    controls = (
        '<div class="reader-bookmark-controls" data-reader-bookmark-controls hidden>'
        f'<button class="reader-bookmark-resume" type="button" data-reader-resume>{resume}</button></div>'
    )
    return button, controls


def reader_html(item, lang, translations, render_body, date_label, next_item, quotes):
    polish = lang == "pl"
    article = item["type"] in {"atlas", "article"}
    story = item["type"] == "story"
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
    next_markup = ""
    if next_item is not None:
        next_label = "Przeczytaj także" if polish else "Read next"
        next_meta = translations[next_item["id"]] if polish else next_item
        next_path = reader_path(next_item, lang, translations)
        next_markup = f'<aside class="reader-next"><p>{next_label}</p><a href="{next_path}">{escape(next_meta["title"])}</a></aside>'
    en_current = ' aria-current="page"' if not polish else ""
    pl_current = ' aria-current="page"' if polish else ""
    reader_version = "20261120-bookmark-3"
    bookmark, bookmark_controls = reader_bookmark_ui(lang)
    if article or story:
        if item["type"] == "atlas":
            listing = atlas_path(lang) + "#" + item["id"]
            back = "Wróć do mapy" if polish else "Back to the map"
        else:
            listing = home + "#top"
            back = "Wróć do gabinetu" if polish else "Back to the study"
        if story:
            skip = "Przejdź do opowiadania" if polish else "Skip to the story"
            reader_meta = escape(meta["reading_note"])
        else:
            skip = "Przejdź do artykułu" if polish else "Skip to the article"
            reader_meta = escape(meta["region"])
    else:
        reader_meta = f'<time datetime="{item["date"]}">{date_label(item["date"], lang)}</time><span class="reader-published">{published}</span>'
    published_schema = {"datePublished": item["date"]} if not (article or story) else {}
    quote_script = "" if story else '<script src="/reader-quotes.js?v=20261120-download-time-1" defer></script>'
    structured = json.dumps({
        "@context": "https://schema.org", "@type": "CreativeWork" if story else "Article",
        "headline": meta["title"], "description": meta["description"],
        "inLanguage": lang, **published_schema,
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
<link rel="stylesheet" href="/reader.css?v={reader_version}">
<script src="/reader.js?v={reader_version}" defer></script>
{quote_script}
<script type="application/ld+json">{structured}</script>
</head><body class="essay-reader">
<a class="reader-skip" href="#essay">{skip}</a>
<header class="reader-topbar"><div class="reader-topbar-inner">
<a class="reader-brand" href="{home}"><span class="reader-monogram" aria-hidden="true">MG</span><span>Mariusz Gorlowski</span></a>
<div class="reader-topbar-actions">{bookmark}<nav class="reader-languages" aria-label="Language / Język"><a href="{english}" lang="en" hreflang="en"{en_current}>EN</a><a href="{polish_path}" lang="pl" hreflang="pl"{pl_current}>PL</a></nav></div>
</div><div class="reader-progress" aria-hidden="true"><span data-reader-progress></span></div><p class="reader-bookmark-status" data-reader-bookmark-status role="status" aria-atomic="true"></p></header>
<main class="reader-main" id="essay">
<div class="reader-tools"><a class="reader-back" href="{listing}">{back}</a>
<div class="reader-size" role="group" aria-label="{group_label}"><button type="button" data-reader-smaller aria-label="{smaller}" title="{smaller}" disabled>A−</button><button type="button" data-reader-larger aria-label="{larger}" title="{larger}" disabled>A+</button></div></div>
{bookmark_controls}
<article aria-labelledby="reader-title"><div class="reader-meta">{reader_meta}</div>
<h1 class="reader-title" id="reader-title">{title}</h1>
<p class="reader-byline">Mariusz Gorlowski</p><hr class="reader-rule" aria-hidden="true">
<div class="essay-reader-body" data-reader-body>
{render_body(item, lang)}
</div></article>
{quote_markup(item, lang, meta, quotes)}
{next_markup}
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
    quotes = json.loads((root / "data/essay_quotes.json").read_text(encoding="utf-8"))
    sitemap_entries = []
    for lang, homepage in (("en", "index.html"), ("pl", "pl/index.html")):
        for index, item in enumerate(essays):
            next_item = essays[(index + 1) % len(essays)]
            url_path = reader_path(item, lang, translations)
            destination = root / url_path.lstrip("/") / "index.html"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(reader_html(item, lang, translations, render_body, date_label, next_item, quotes), encoding="utf-8")
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
