"""Build manually selected publication cards from data/publications.json.
Selected literary essays MUST have an original full-text file in data/essays.
The script does NOT fetch Facebook/LinkedIn and does NOT auto-select by date.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json, re
from datetime import date

ROOT=Path(__file__).resolve().parent.parent
posts=json.loads((ROOT/'data/publications.json').read_text(encoding="utf-8"))
for p in posts:
    assert p["type"] in ("essay","qr_finder")
    assert isinstance(p.get("featured"),bool) and isinstance(p.get("display_order"),int)
    assert re.fullmatch(r"[a-z0-9-]+",p["id"])
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}",p["date"])
    for l in p["links"]:
        assert urlsplit(l["url"]).scheme == "https"
def essay_full_text(p):
    src=ROOT/"data"/"essays"/(p["id"]+".txt")
    if not src.is_file():
        raise FileNotFoundError(f"Featured essay needs its approved full text: {src}")
    blocks=re.split(r"\n\s*\n",src.read_text(encoding="utf-8").strip())
    if blocks and blocks[0].strip().casefold()==p["title"].casefold(): blocks.pop(0)
    output=[]
    for b in blocks:
        b=" ".join(b.split())
        if not b: continue
        cls=("v4-essay-signature" if b=="Mariusz Gorlowski" else
             "v4-research-label" if b=="Research reference:" else "")
        attr=f' class="{cls}"' if cls else ""
        output.append(f"<p{attr}>{escape(b)}</p>")
    return "\n".join(output)
def build(kind):
    chosen=sorted((p for p in posts if p["type"]==kind and p["featured"]),key=lambda p:p["display_order"])
    if len(chosen)>3:raise ValueError(f"More than three featured items: {kind}")
    rendered=[]
    for p in chosen:
        stamp=date.fromisoformat(p["date"]).strftime("%-d %B %Y")
        links="".join(f'<a href="{escape(l["url"],quote=True)}" target="_blank" rel="noopener noreferrer">{"Original post" if kind=="essay" else "Read"} on {escape(l["label"])} <span aria-hidden="true">↗</span></a>' for l in p["links"])
        if kind=="essay":
            accordion=(f'<details class="v4-full-essay" id="full-{escape(p["id"])}"><summary>'
                       '<span class="v4-open-label">Read the full essay</span>'
                       '<span class="v4-close-label">Close the essay</span>'
                       '<span class="v4-expand-chevron" aria-hidden="true">⌄</span></summary>'
                       f'<div class="v4-essay-body">{essay_full_text(p)}</div></details>')
        else: accordion=""
        rendered.append(f'<article class="v4-article">'
                        f'<div class="v4-article-meta"><time datetime="{p["date"]}">{stamp}</time> · {"Independent essay" if kind=="essay" else "QR FINDER"}</div>'
                        f'<h3>{escape(p["title"])}</h3>'
                        f'<p class="v4-article-lead">{escape(p["description"])}</p>'
                        f'{accordion}<div class="v4-article-links">{links}</div></article>')
    return ('\n<hr class="v4-gold-rule v4-essay-divider" aria-hidden="true"/>\n' if kind=="essay" else '\n').join(rendered)
for marker,kind,relpath in [
    ("ESSAYS","essay","writing/essays/index.html"),
    ("QR","qr_finder","qr-finder/articles/index.html")
]:
    path=ROOT/relpath
    html=path.read_text(encoding="utf-8")
    pattern=f"<!-- AUTO:{marker}:START -->"+r".*?"+f"<!-- AUTO:{marker}:END -->"
    replacement=f"<!-- AUTO:{marker}:START -->"+build(kind)+f"<!-- AUTO:{marker}:END -->"
    updated,count=re.subn(pattern,lambda _:replacement,html,flags=re.DOTALL)
    if count!=1:raise RuntimeError(f"Expected one {marker} block, got {count}")
    path.write_text(updated,encoding="utf-8")
print("Updated curated links and the approved complete essays; no platform sync")
