// Render the two language versions of AI in Practice from reviewed content.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(resolve(root,'data/ai-practice.json'),'utf8'));
function renderPage(data,lang,review){
 const route=(lang,slug="")=>(lang==="pl"?"/pl":"")+"/writing/ai-in-practice/"+(slug?slug+"/":"");
 const escape=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 const layout=data.languages[lang], p=review?.languages[lang]||layout, slug=review?.slug||"", url=data.domain+route(lang,slug);
 const image=data.domain+"/assets/ai-practice/"+(review?.ogImage||data.reviews[0].ogImage);
 const before=layout.before.replace(/<nav aria-label="Language \/ Język" class="lang-switch">.*?<\/nav>/s,`<nav aria-label="Language / Język" class="lang-switch">${["en","pl"].map(l=>`<a href="${route(l,slug)}" hreflang="${l}" lang="${l}"${l===lang?' aria-current="page"':''}>${l.toUpperCase()}</a>`).join("")}</nav>`);
 const content=review?`<a class="ap-all-link" href="${route(lang)}">← ${escape(layout.back)}</a>${p.article}`:layout.hero+[...data.reviews].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>r.languages[lang].card).join("");
 return `<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101d24"><meta name="robots" content="index,follow,max-image-preview:large"><title>${escape(p.title)}</title><meta name="description" content="${escape(p.description)}"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="${data.domain+route("en",slug)}"><link rel="alternate" hreflang="pl" href="${data.domain+route("pl",slug)}"><meta property="og:type" content="${review?"article":"website"}"><meta property="og:site_name" content="Mariusz Gorlowski"><meta property="og:title" content="${escape(p.title)}"><meta property="og:description" content="${escape(p.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=20261117-lang-gold-1"><link rel="stylesheet" href="/v4.css?v=20261127-ai-practice"><link rel="stylesheet" href="/share.css?v=20261119-profile-1"><link rel="stylesheet" href="/ai-practice.css?v=2"><script type="module" src="/share.js?v=20261119-profile-1"></script><script defer src="/ai-practice.js?v=2"></script></head><body class="ap-page">${before}<div class="ap-wrap">${content}${layout.next||""}${layout.after}</body></html>\n`;
}
for(const lang of ['pl','en']) for(const review of [null,...data.reviews]) {const dir=resolve(root,lang==='pl'?'pl':'','writing','ai-in-practice',review?.slug||'');mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'index.html'),renderPage(data,lang,review),'utf8');}
