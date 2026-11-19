"""Build manually curated article cards in English and Polish.

Source of truth:
  data/publications.json      — original posts, dates, selection and external URLs
  data/publications_pl.json   — Polish editorial titles and descriptions
  data/essays/<id>.txt        — approved English complete essays
  data/essays/pl/<id>.txt     — complete Polish essays

Never fetch automatically from social platforms or publish manuscripts.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json
import re
from datetime import date
from build_reader_pages import reader_path, write_reading_pages

ROOT = Path(__file__).resolve().parent.parent
posts = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))
pl = json.loads((ROOT / "data/publications_pl.json").read_text(encoding="utf-8"))
months_pl = ("stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
             "lipca", "sierpnia", "września", "października", "listopada", "grudnia")
for p in posts:
    assert p["type"] in ("essay", "qr_finder")
    assert isinstance(p.get("featured"), bool) and isinstance(p.get("display_order"), int)
    assert re.fullmatch(r"[a-z0-9-]+", p["id"])
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", p["date"])
    assert p["id"] in pl, "Missing Polish publication metadata: " + p["id"]
    assert all(pl[p["id"]].get(key) for key in ("title", "description"))
    for link in p["links"]:
        assert urlsplit(link["url"]).scheme == "https"

def inline_text(text):
    safe = escape(text)
    safe = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", safe)
    return re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", safe)


def essay_full_text(item, lang):
    filename = item["id"] + ".txt"
    src = ROOT / "data" / "essays" / (("pl/" if lang == "pl" else "") + filename)
    if not src.is_file():
        raise FileNotFoundError("Featured essay needs full text: " + str(src))
    title = pl[item["id"]]["title"] if lang == "pl" else item["title"]
    blocks = re.split(r"\n\s*\n", src.read_text(encoding="utf-8").strip())
    if blocks and blocks[0].strip().removeprefix("# ").casefold() == title.casefold():
        blocks.pop(0)
    output = []
    for block in blocks:
        block = " ".join(block.split())
        if not block:
            continue
        if block == "---":
            output.append('<hr class="v4-gold-rule" aria-hidden="true"/>')
            continue
        label = block.replace("**", "")
        klass = ("v4-essay-signature" if block == "Mariusz Gorlowski" else
                 "v4-research-label" if label in ("Research reference:", "Reference", "Źródło naukowe:") else "")
        attr = f' class="{klass}"' if klass else ""
        doi_link = re.fullmatch(r"\[(https://doi\.org/[^\]]+)\]\(\1\)", block)
        if doi_link:
            block = doi_link.group(1)
        if block.startswith("https://doi.org/"):
            safe = escape(block, quote=True)
            output.append(f'<p class="v4-source-link"><a href="{safe}" target="_blank" rel="noopener noreferrer">{escape(block)}</a></p>')
        else:
            output.append(f"<p{attr}>{inline_text(block)}</p>")
    return "\n".join(output)

def date_label(s, lang):
    d = date.fromisoformat(s)
    return f"{d.day} {months_pl[d.month-1]} {d.year}" if lang == "pl" else d.strftime("%d %B %Y").lstrip("0")

def build(kind, lang):
    chosen = sorted((p for p in posts if p["type"] == kind and p["featured"]), key=lambda p: p["display_order"])
    if len(chosen) > 3:
        raise ValueError("More than three featured items: " + kind)
    rendered = []
    for item in chosen:
        title = pl[item["id"]]["title"] if lang == "pl" else item["title"]
        desc = pl[item["id"]]["description"] if lang == "pl" else item["description"]
        links = "".join(
            f'<a href="{escape(link["url"], quote=True)}" target="_blank" rel="noopener noreferrer">'
            f'{("Oryginalny wpis" if kind == "essay" else "Przeczytaj") if lang == "pl" else ("Original post" if kind == "essay" else "Read")} '
            f'{"na" if lang == "pl" else "on"} {escape(link["label"])} '
            '<span aria-hidden="true">↗</span></a>'
            for link in item["links"]
        )
        if kind == "essay":
            read_label = "Przeczytaj cały esej" if lang == "pl" else "Read the full essay"
            reading_link = (
                f'<a class="v4-read-essay" id="full-{escape(item["id"])}" '
                f'href="{reader_path(item, lang, pl)}">{read_label}</a>'
            )
        else:
            reading_link = ""
        label = ("Esej autorski" if lang == "pl" else "Independent essay") if kind == "essay" else "QR FINDER"
        meta = f'<time datetime="{item["date"]}">{date_label(item["date"], lang)}</time> · {label}'
        if kind == "essay" and item.get("status") == "published":
            published = "Opublikowane" if lang == "pl" else "Published"
            meta = (
                f'<span>{meta}</span><span class="v4-essay-status">'
                f'<span class="v4-status-dot" aria-hidden="true"></span>{published}</span>'
            )
            meta_class = "v4-article-meta v4-essay-meta"
        else:
            meta_class = "v4-article-meta"
        links_html = f'<div class="v4-article-links">{links}</div>' if links else ""
        rendered.append(
            '<article class="v4-article">'
            f'<div class="{meta_class}">{meta}</div>'
            f'<h3>{escape(title)}</h3>'
            f'<p class="v4-article-lead">{escape(desc)}</p>'
            f'{reading_link}{links_html}</article>'
        )
    divider = '\n<hr class="v4-gold-rule v4-essay-divider" aria-hidden="true"/>\n' if kind == "essay" else "\n"
    return divider.join(rendered)

for lang, root in (("en", ""), ("pl", "pl/")):
    for marker, kind, relpath in (
        ("ESSAYS", "essay", "writing/essays/index.html"),
        ("QR", "qr_finder", "qr-finder/articles/index.html"),
    ):
        path = ROOT / root / relpath
        html = path.read_text(encoding="utf-8")
        pattern = f"<!-- AUTO:{marker}:START -->" + r".*?" + f"<!-- AUTO:{marker}:END -->"
        replacement = f"<!-- AUTO:{marker}:START -->" + build(kind, lang) + f"<!-- AUTO:{marker}:END -->"
        updated, count = re.subn(pattern, lambda _: replacement, html, flags=re.DOTALL)
        if count != 1:
            raise RuntimeError(f"Expected one {marker} block in {path}, got {count}")
        path.write_text(updated, encoding="utf-8")
write_reading_pages(ROOT, posts, pl, essay_full_text, date_label)
print("Updated EN/PL publication cards, individual reading pages and latest home essays.")
