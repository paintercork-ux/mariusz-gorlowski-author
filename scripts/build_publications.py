"""Rebuild only the two manually curated V4 publication lists.
Usage: python scripts/build_publications.py
This script NEVER reads social media or selects the newest posts automatically.
Edit data/publications.json intentionally, using featured and display_order.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json, re
root = Path(__file__).resolve().parent.parent
posts = json.loads((root/'data/publications.json').read_text(encoding='utf-8'))
for post in posts:
    assert post['type'] in ('essay','qr_finder')
    assert isinstance(post.get('featured'),bool)
    assert isinstance(post.get('display_order'),int)
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',post['date'])
    for link in post['links']:
        assert urlsplit(link['url']).scheme == 'https'
def render(kind):
    selected=sorted((x for x in posts if x['type']==kind and x['featured']),key=lambda x:x['display_order'])
    if len(selected)>3: raise ValueError(f'Too many featured posts for {kind}')
    output=[]
    for p in selected:
        links=''.join(f'<a href="{escape(a["url"],quote=True)}" target="_blank" rel="noopener noreferrer">Read on {escape(a["label"])} <span aria-hidden="true">↗</span></a>' for a in p['links'])
        output.append(f'<article class="v4-article"><div class="v4-article-meta"><time datetime="{p["date"]}">{p["date"]}</time> · {"Independent essay" if kind=="essay" else "QR FINDER"}</div><h3>{escape(p["title"])}</h3><p>{escape(p["description"])}</p><div class="v4-article-links">{links}</div></article>')
    return '\n'.join(output)
for marker,kind,path in [('ESSAYS','essay',root/'writing/essays/index.html'),('QR','qr_finder',root/'qr-finder/articles/index.html')]:
    html=path.read_text(encoding='utf-8')
    pattern=f'<!-- AUTO:{marker}:START -->'+r'.*?'+f'<!-- AUTO:{marker}:END -->'
    html,count=re.subn(pattern,lambda _:f'<!-- AUTO:{marker}:START -->'+render(kind)+f'<!-- AUTO:{marker}:END -->',html,flags=re.DOTALL)
    if count != 1: raise RuntimeError(f'Expected one {marker} block, got {count}')
    path.write_text(html,encoding='utf-8')
print('Updated selected posts only; no platform synchronisation')
