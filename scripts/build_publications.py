"""Build SEO-visible publication links from data/publications.json.

Usage: python scripts/build_publications.py
Requires Python 3.10+ only. This updates the article lists in index.html.
It does not fetch Facebook or LinkedIn content; future authorised sync may
update the same JSON file, then this script is run during deployment.
"""
from pathlib import Path
from html import escape
import json,re
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent.parent
posts=json.loads((ROOT/'data/publications.json').read_text(encoding='utf8'))
for p in posts:
 assert p['type'] in ('essay','qr_finder'),p
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',p['date']),p
 for v in p['links']:
  assert urlsplit(v['url']).scheme=='https',v
posts.sort(key=lambda p:p['date'],reverse=True)
def render(kind):
 out=[]
 for p in posts:
  if p['type']!=kind:continue
  buttons=''.join(f'<a href="{escape(x["url"],quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="Read {escape(p["title"])} on {escape(x["label"])}">Read on {escape(x["label"])} ↗</a>' for x in p['links'])
  out.append(f'<article class="pub-entry"><div class="pub-meta"><time datetime="{p["date"]}">{p["date"]}</time> · {"Independent essay" if kind=="essay" else "QR FINDER"}</div><h4>{escape(p["title"])}</h4><p>{escape(p["description"])}</p><div class="pub-links">{buttons}</div></article>')
 return '\n'.join(out)
html=(ROOT/'index.html').read_text(encoding='utf8')
for marker,kind in [('ESSAYS','essay'),('QR','qr_finder')]:
 pattern=f'<!-- AUTO:{marker}:START -->'+r'.*?'+f'<!-- AUTO:{marker}:END -->'
 replacement=f'<!-- AUTO:{marker}:START -->'+render(kind)+f'<!-- AUTO:{marker}:END -->'
 html,n=re.subn(pattern,lambda _:replacement,html,flags=re.DOTALL)
 if n!=1:raise RuntimeError(f'Expected one {marker} block, got {n}')
(ROOT/'index.html').write_text(html,encoding='utf8')
print(f'Updated links: {len(posts)} unique publications, {sum(len(p["links"]) for p in posts)} social links')
