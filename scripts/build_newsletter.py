"""Build notification forms and export the confirmation emails for Brevo.

data/newsletter.json maps each language to the book and essay form actions
copied from Brevo's Simple HTML embeds. Without those actions the site forms
are omitted. The preview uses the same cards and sends no email.
"""

import argparse
from html import escape
import json
from pathlib import Path
import re
from string import Template
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://mariuszgorlowski.com"
STYLES = '<link rel="stylesheet" href="/newsletter.css?v=1">'
TOPICS = ("book", "essay")
TEXT = {
    "pl": {
        "book": {
            "title": "Powiadom mnie, gdy książka będzie dostępna",
            "copy": "Gdy pierwszy tom „Kodu Przejściowego” trafi do sprzedaży, wyślę Ci wiadomość z linkiem do zakupu.",
            "email_title": "Potwierdź powiadomienie o książce",
            "greeting": "Dziękuję za zainteresowanie „Kodem Przejściowym”.",
        },
        "essay": {
            "title": "Powiadom mnie o nowych esejach",
            "copy": "Gdy opublikuję nowy esej, wyślę Ci krótką wiadomość z linkiem do tekstu.",
            "email_title": "Potwierdź zapis na powiadomienia o esejach",
            "greeting": "Dziękuję, że chcesz czytać dalej.",
        },
        "privacy": "Polityka prywatności",
        "email_address": "Adres e-mail",
        "submit": "Powiadom mnie",
        "help": "Potwierdzisz zapis przez e-mail.",
        "confirm": "Potwierdź zapis",
        "email_footer": "Otrzymujesz tę wiadomość po zgłoszeniu zapisu na mariuszgorlowski.com.",
        "back": "Wróć na stronę autorską",
        "check": ("Sprawdź swoją skrzynkę", "Otwórz wiadomość ode mnie i kliknij „Potwierdź zapis”."),
        "confirmed": ("Zapis potwierdzony", "Dziękuję. Odezwę się, gdy pojawi się wiadomość, o którą prosisz."),
    },
    "en": {
        "book": {
            "title": "Notify me when the book is available",
            "copy": "When the first volume of The Transition Code goes on sale, I'll send you an email with a link to buy it.",
            "email_title": "Confirm your book notification",
            "greeting": "Thank you for your interest in The Transition Code.",
        },
        "essay": {
            "title": "Notify me about new essays",
            "copy": "When I publish a new essay, I'll send you a short email with a link to read it.",
            "email_title": "Confirm your sign-up for new essays",
            "greeting": "Thank you for wanting to read more.",
        },
        "privacy": "Privacy notice",
        "email_address": "Email address",
        "submit": "Notify me",
        "help": "You'll confirm your sign-up by email.",
        "confirm": "Confirm sign-up",
        "email_footer": "You are receiving this email after a sign-up request on mariuszgorlowski.com.",
        "back": "Back to the author website",
        "check": ("Check your inbox", "Open my email and click “Confirm sign-up”."),
        "confirmed": ("Sign-up confirmed", "Thank you. I'll be in touch when there is news about what you signed up for."),
    },
}


def privacy_path(lang):
    return "/pl/privacy.html" if lang == "pl" else "/privacy.html"


def status_path(lang, status):
    return {
        "pl": {"check": "/pl/powiadomienia/sprawdz-skrzynke/", "confirmed": "/pl/powiadomienia/potwierdzono/"},
        "en": {"check": "/notifications/check-your-inbox/", "confirmed": "/notifications/confirmed/"},
    }[lang][status]


def form_actions(root):
    path = root / "data/newsletter.json"
    if not path.is_file():
        return {}
    settings = json.loads(path.read_text(encoding="utf-8"))
    actions = {}
    for lang in TEXT:
        for topic in TOPICS:
            url = settings.get(lang, {}).get(topic)
            if not url:
                continue
            parsed = urlsplit(url)
            host = parsed.hostname or ""
            if (parsed.scheme != "https" or not (host == "sibforms.com" or host.endswith(".sibforms.com"))
                    or parsed.username or parsed.password or parsed.fragment
                    or not parsed.path.startswith("/serve/") or parsed.path == "/serve/"):
                raise ValueError(f"Expected a Brevo Simple HTML form action for {lang}/{topic}")
            actions[lang, topic] = url
    return actions


def signup_card(lang, topic, action, preview=False):
    copy = TEXT[lang]
    details = copy[topic]
    heading = "h3" if topic == "book" else "h2"
    method = "get" if preview else "post"
    email_name = "" if preview else ' name="EMAIL"'
    brevo_fields = "" if preview else f'''
    <input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off" hidden>
    <input type="hidden" name="locale" value="{lang}">'''
    return f'''<section class="newsletter-card" id="powiadomienia" aria-labelledby="newsletter-title">
  <{heading} class="newsletter-title" id="newsletter-title">{escape(details["title"])}</{heading}>
  <p class="newsletter-copy">{escape(details["copy"])}</p>
  <form class="newsletter-form" action="{escape(action, quote=True)}" method="{method}">
    <label for="newsletter-email">{copy["email_address"]}</label>
    <div class="newsletter-fields">
      <input id="newsletter-email" type="email"{email_name} autocomplete="email" inputmode="email" aria-describedby="newsletter-help" required>
      <button class="newsletter-button" type="submit">{copy["submit"]}</button>
    </div>{brevo_fields}
    <p class="newsletter-help" id="newsletter-help">{escape(copy["help"])} <a href="{privacy_path(lang)}">{copy["privacy"]}</a></p>
  </form>
</section>'''


def confirmation_email(lang, topic, confirm_url="{{ doubleoptin }}"):
    copy = TEXT[lang]
    details = copy[topic]
    instruction = (
        "Potwierdź zapis poniżej." if lang == "pl" else "Confirm your sign-up below."
    )
    template = Template((ROOT / "scripts/newsletter_email.html").read_text(encoding="utf-8"))
    return template.substitute(
        lang=lang,
        title=escape(details["email_title"]),
        greeting=escape(details["greeting"]),
        instruction=escape(f'{details["copy"]} {instruction}'),
        confirm_url=escape(confirm_url, quote=True),
        confirm_label=copy["confirm"],
        footer_text=copy["email_footer"],
        privacy_url=ORIGIN + privacy_path(lang),
        privacy_label=copy["privacy"],
    )


def status_page(lang, status):
    copy = TEXT[lang]
    title, message = copy[status]
    home = "/pl/" if lang == "pl" else "/"
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>{title} | Mariusz Gorlowski</title>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/styles.css?v=20261117-lang-gold-1">
{STYLES}
</head>
<body>
<main class="container simple-page">
  <section class="newsletter-card newsletter-status" aria-labelledby="newsletter-status-title">
    <h1 class="newsletter-title" id="newsletter-status-title">{title}</h1>
    <p class="newsletter-copy">{escape(message)}</p>
    <a class="newsletter-button" href="{home}">{copy["back"]}</a>
  </section>
</main>
</body></html>
'''


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_slot(html, slot, content, path):
    start = f"<!-- AUTO:{slot}:START -->"
    end = f"<!-- AUTO:{slot}:END -->"
    pattern = re.escape(start) + r".*?" + re.escape(end)
    block = f"\n{content}\n" if content else ""
    updated, count = re.subn(pattern, lambda _: start + block + end, html, flags=re.DOTALL)
    if count != 1:
        raise ValueError(f"Expected one {slot} slot in {path}, found {count}")
    return updated


def write_newsletters(root, preview=False):
    actions = form_actions(root) if not preview else {}
    for lang in TEXT:
        localized_root = root / "pl" if lang == "pl" else root
        books = localized_root / "writing/index.html"
        essays = sorted((localized_root / "writing/essays").glob("*/index.html"))
        for topic, paths in (("book", [books]), ("essay", essays)):
            action = status_path(lang, "check") if preview else actions.get((lang, topic))
            card = signup_card(lang, topic, action, preview) if action else ""
            for path in paths:
                html = path.read_text(encoding="utf-8")
                html = replace_slot(html, "NEWSLETTER_HEAD", STYLES if card else "", path)
                html = replace_slot(html, "NEWSLETTER", card, path)
                path.write_text(html, encoding="utf-8")
        if preview or any((lang, topic) in actions for topic in TOPICS):
            for status in ("check", "confirmed"):
                path = root / status_path(lang, status).lstrip("/") / "index.html"
                write_text(path, status_page(lang, status))
        if preview:
            for topic in TOPICS:
                email = confirmation_email(lang, topic, status_path(lang, "confirmed"))
                write_text(root / f"preview-powiadomien/{lang}/{topic}/index.html", email)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--preview", type=Path, metavar="BUILT_DIRECTORY")
    mode.add_argument("--emails", type=Path, metavar="OUTPUT_DIRECTORY")
    args = parser.parse_args()
    if args.preview:
        if args.preview.resolve() == ROOT:
            parser.error("Generate the preview in a separate output directory.")
        write_newsletters(args.preview, preview=True)
    elif args.emails:
        for lang in TEXT:
            for topic in TOPICS:
                write_text(args.emails / f"confirm-{topic}-{lang}.html", confirmation_email(lang, topic))
    else:
        write_newsletters(ROOT)


if __name__ == "__main__":
    main()
