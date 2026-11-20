"""Build the two editions of the short story linked from the cup."""
from html import escape
from pathlib import Path

from build_reader_pages import ORIGIN, reader_html, reader_path


ROOT = Path(__file__).resolve().parent.parent
STORY = {
    "type": "story",
    "id": "two-cups",
    "title": "Two Cups",
    "description": "A message brings Lena back to her father’s kitchen. Over tea, Marek has to answer for words sent in his name.",
    "reading_note": "Short story · About 25 minutes to read",
}
TRANSLATIONS = {
    "two-cups": {
        "slug": "dwie-filizanki",
        "title": "Dwie filiżanki",
        "description": "Jedna wiadomość sprowadza Lenę do kuchni ojca. Przy herbacie Marek musi odpowiedzieć za słowa wysłane w jego imieniu.",
        "reading_note": "Opowiadanie · Około 25 minut czytania",
    },
}


def story_body(_item, lang):
    text = (ROOT / "data" / f"two-cups-{lang}.txt").read_text(encoding="utf-8")
    return "\n".join(
        '<p class="reader-scene-break" role="separator">* * *</p>'
        if paragraph == "* * *" else f"<p>{escape(paragraph)}</p>"
        for paragraph in text.strip().split("\n\n")
    )


def build():
    locations = []
    for lang in ("pl", "en"):
        path = reader_path(STORY, lang, TRANSLATIONS)
        page = ROOT / path.lstrip("/") / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(reader_html(STORY, lang, TRANSLATIONS, story_body, None, None, {}), encoding="utf-8")
        locations.append(ORIGIN + path)

    sitemap = ROOT / "sitemap.xml"
    xml = sitemap.read_text(encoding="utf-8")
    additions = [f"  <url><loc>{url}</loc></url>" for url in locations if f"<loc>{url}</loc>" not in xml]
    if additions:
        sitemap.write_text(xml.replace("</urlset>", "\n".join(additions) + "\n</urlset>"), encoding="utf-8")


if __name__ == "__main__":
    build()
