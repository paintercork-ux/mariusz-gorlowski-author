"""Build the bilingual article linked from the lamp on the homepage."""
import json
import re

from build_atlas import ARTICLES, ROOT, TRANSLATIONS, write_page
from build_reader_pages import ORIGIN, reader_html, reader_path, sourced_article_body


def build():
    metadata = json.loads((ROOT / "data/ai-energy.json").read_text(encoding="utf-8"))
    item = {"type": "article", "id": "ai-energy", **metadata["en"]}
    translations = {**TRANSLATIONS, item["id"]: metadata["pl"]}
    next_item = next(article for article in ARTICLES if article["id"] == "antarctica")
    quotes = {item["id"]: {lang: [metadata[lang]["quote"]] for lang in ("pl", "en")}}
    paths = []
    for lang in ("pl", "en"):
        body = (ROOT / "data" / f"ai-energy-{lang}.txt").read_text(encoding="utf-8")
        if metadata[lang]["quote"] not in re.sub(r"\s+", " ", body):
            raise ValueError(f"Suggested quote is missing from the {lang} article")
        path = reader_path(item, lang, translations)
        markup = sourced_article_body(body, metadata["sources"], item["id"], lang)
        write_page(path, reader_html(item, lang, translations, lambda _item, _lang: markup, None, next_item, quotes))
        paths.append(path)

    sitemap = ROOT / "sitemap.xml"
    xml = sitemap.read_text(encoding="utf-8")
    additions = [f"  <url><loc>{ORIGIN}{path}</loc></url>" for path in paths if f"<loc>{ORIGIN}{path}</loc>" not in xml]
    if additions:
        sitemap.write_text(xml.replace("</urlset>", "\n".join(additions) + "\n</urlset>"), encoding="utf-8")


if __name__ == "__main__":
    build()
