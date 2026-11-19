"""Generate the accessible, no-JavaScript companion pages from the reader's data."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'data/notebook.json').read_text())
escape = html.escape


def paragraph(value):
    return '<p>' + escape(value) + '</p>'


for lang in ('en', 'pl'):
    home = '/pl/' if lang == 'pl' else '/'
    path = ROOT / ('pl/notebook' if lang == 'pl' else 'notebook')
    path.mkdir(parents=True, exist_ok=True)
    title = DATA['title'][lang]
    open_label = 'Otwórz książkę' if lang == 'pl' else 'Open the book'
    home_label = 'Strona główna' if lang == 'pl' else 'Home'
    source_label = 'Źródło' if lang == 'pl' else 'Source'
    description = DATA['credit'][lang]
    chapters = {'human': 'Człowiek', 'machine': 'Maszyna', 'future': 'Przyszłość'} if lang == 'pl' else {'human': 'Human', 'machine': 'Machine', 'future': 'Future'}
    body = '<header><a href="' + home + '">' + home_label + '</a></header>'
    body += '<h1>' + escape(title) + '</h1><p>' + escape(DATA['subtitle'][lang]) + '</p><p>' + escape(description) + '</p>'
    body += '<p><a class="notebook-primary" href="' + home + '#notebook/intro" data-notebook-open>' + open_label + '</a></p>'
    body += ''.join(paragraph(value) for value in DATA['intro'][lang])
    for category, label in chapters.items():
        body += '<details open><summary>' + label + '</summary>'
        for entry in DATA['entries']:
            if entry['category'] != category:
                continue
            body += '<figure id="' + entry['id'] + '"><blockquote>' + ''.join(paragraph(value) for value in entry['paragraphs'][lang]) + '</blockquote>'
            body += '<figcaption>' + escape(entry['author'][lang]) + ' · ' + escape(entry['year'][lang]) + '<br><cite>' + escape(entry['source'][lang]) + '</cite>'
            if entry['translation'][lang]:
                body += '<br>' + escape(entry['translation'][lang])
            body += '<p>' + escape(entry['context'][lang]) + '</p><a href="' + escape(entry['sourceUrl'], quote=True) + '" target="_blank" rel="noopener noreferrer">' + source_label + '</a></figcaption></figure>'
        body += '</details>'
    body += ''.join(paragraph(value) for value in DATA['outro'][lang])
    body += '<p><a href="' + home + 'writing/essays/">' + ('Czytaj moje eseje' if lang == 'pl' else 'Read my essays') + '</a></p>'
    document = f'''<!doctype html>
<html lang="{lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} | Mariusz Gorlowski</title>
<meta name="description" content="{escape(description, quote=True)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{escape(title, quote=True)}">
<meta property="og:description" content="{escape(description, quote=True)}">
<meta property="og:image" content="https://mariuszgorlowski.com/assets/cover.webp">
<meta property="og:url" content="https://mariuszgorlowski.com{home}notebook/">
<link rel="canonical" href="https://mariuszgorlowski.com{home}notebook/">
<link rel="alternate" hreflang="en" href="https://mariuszgorlowski.com/notebook/">
<link rel="alternate" hreflang="pl" href="https://mariuszgorlowski.com/pl/notebook/">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css?v=20261117-lang-gold-1">
<link rel="stylesheet" href="/notebook.css?v=20261119-book-2">
<script type="module" src="/notebook.js?v=20261119-book-2"></script>
</head><body data-notebook-auto-open><main class="notebook-fallback">{body}</main></body></html>
'''
    (path / 'index.html').write_text(document)
print('Accessible notebook pages generated: EN + PL.')
