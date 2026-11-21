"""Build the Brevo essay feeds and export bilingual campaign emails."""

import argparse
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
import json
from pathlib import Path
import re
from string import Template
from xml.etree import ElementTree as ET

from build_newsletter import privacy_path, write_text
from build_reader_pages import ORIGIN, reader_path


ROOT = Path(__file__).resolve().parent.parent

# These essays were public before the essay newsletter was introduced.
ARCHIVE_IDS = frozenset({"2026-11-10-say-no", "2026-11-13-voice", "2026-11-19-still-me"})

COPY = {
    "pl": {
        "section": "/pl/writing/essays/",
        "feed_title": "Eseje Mariusza Gorlowskiego",
        "feed_description": "Nowe eseje na stronie autorskiej Mariusza Gorlowskiego.",
        "subject": "Nowy esej od Mariusza Gorlowskiego",
        "read": "Przeczytaj esej",
        "footer": "Otrzymujesz tę wiadomość, ponieważ zapisałeś się na powiadomienia o nowych esejach.",
        "unsubscribe": "Wypisz się",
        "privacy": "Polityka prywatności",
    },
    "en": {
        "section": "/writing/essays/",
        "feed_title": "Essays by Mariusz Gorlowski",
        "feed_description": "New essays on the author website of Mariusz Gorlowski.",
        "subject": "A new essay from Mariusz Gorlowski",
        "read": "Read the essay",
        "footer": "You are receiving this email because you signed up for notifications about new essays.",
        "unsubscribe": "Unsubscribe",
        "privacy": "Privacy notice",
    },
}


def published_essays(posts):
    return sorted(
        (post for post in posts if post["type"] == "essay" and post.get("status") == "published"),
        key=lambda post: (post["date"], post["id"]),
        reverse=True,
    )


def essay_details(post, lang, translations):
    metadata = translations[post["id"]] if lang == "pl" else post
    if teaser := metadata.get("newsletter_teaser"):
        teaser = " ".join(teaser.split())
    else:
        description = " ".join(metadata["description"].split())
        teaser = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
    return metadata["title"], teaser, ORIGIN + reader_path(post, lang, translations)


def write_essay_feeds(root, posts, translations):
    essays = [post for post in published_essays(posts) if post["id"] not in ARCHIVE_IDS]
    paths = {lang: root / copy["section"].lstrip("/") / "feed.xml" for lang, copy in COPY.items()}
    published_dates = {}
    for path in paths.values():
        if path.is_file():
            for item in ET.parse(path).findall("channel/item"):
                essay_id = item.findtext("guid").rsplit("/", 1)[1]
                published_dates.setdefault(essay_id, item.findtext("pubDate"))

    # Brevo uses publication times to select entries for each mailing window.
    # Reuse the first feed timestamp when an existing essay is edited or rebuilt.
    build_date = format_datetime(datetime.now(timezone.utc), usegmt=True)
    for lang, copy in COPY.items():
        feed = ET.Element("rss", version="2.0")
        channel = ET.SubElement(feed, "channel")
        ET.SubElement(channel, "title").text = copy["feed_title"]
        ET.SubElement(channel, "link").text = ORIGIN + copy["section"]
        ET.SubElement(channel, "description").text = copy["feed_description"]
        ET.SubElement(channel, "language").text = lang

        for post in essays:
            title, teaser, url = essay_details(post, lang, translations)
            item = ET.SubElement(channel, "item")
            ET.SubElement(item, "title").text = title
            ET.SubElement(item, "link").text = url
            # Brevo renders RSS descriptions as HTML. Escape the plain text before XML serialization.
            ET.SubElement(item, "description").text = escape(teaser, quote=False)
            ET.SubElement(item, "guid", isPermaLink="false").text = (
                f"tag:mariuszgorlowski.com,2026:essay/{lang}/{post['id']}"
            )
            ET.SubElement(item, "pubDate").text = published_dates.get(post["id"], build_date)

        ET.indent(feed)
        xml = ET.tostring(feed, encoding="utf-8", xml_declaration=True).decode("utf-8")
        write_text(paths[lang], xml + "\n")


def essay_email(lang, sample=None):
    copy = COPY[lang]
    if sample is None:
        title, teaser, url = "{{ item.TITLE }}", "{{ item.DESCRIPTION | safe }}", "{{ item.LINK }}"
        start, end = "{% for item in params.items %}", "{% endfor %}"
    else:
        title, teaser, url = (escape(value, quote=True) for value in sample)
        start = end = ""

    template = Template((ROOT / "scripts/newsletter_essay_email.html").read_text(encoding="utf-8"))
    return template.substitute(
        lang=lang,
        subject=escape(copy["subject"]),
        items_start=start,
        items_end=end,
        essay_title=title,
        essay_teaser=teaser,
        essay_url=url,
        read_label=escape(copy["read"]),
        footer=escape(copy["footer"]),
        unsubscribe_label=escape(copy["unsubscribe"]),
        privacy_url=ORIGIN + privacy_path(lang),
        privacy_label=escape(copy["privacy"]),
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--emails", type=Path, required=True, metavar="OUTPUT_DIRECTORY")
    args = parser.parse_args()
    posts = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))
    translations = json.loads((ROOT / "data/publications_pl.json").read_text(encoding="utf-8"))
    essays = published_essays(posts)
    for lang in COPY:
        write_text(args.emails / f"essay-{lang}.html", essay_email(lang))
        if essays:
            sample = essay_details(essays[0], lang, translations)
            write_text(args.emails / f"sample-essay-{lang}.html", essay_email(lang, sample))


if __name__ == "__main__":
    main()
