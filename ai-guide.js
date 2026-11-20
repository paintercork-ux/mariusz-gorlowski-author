const language = document.documentElement.lang === 'pl' ? 'pl' : 'en';
const labels = language === 'pl' ? {
  contents: 'Spis treści', sources: 'Źródła', begin: 'Rozpocznij lekturę',
  previous: 'Poprzednia', next: 'Następna', page: 'Strona', of: 'z', backToReading: 'Wróć do lektury',
  copy: 'Kopiuj polecenie', copied: 'Skopiowano polecenie.', reference: 'Źródło',
  manual: 'Zaznacz i skopiuj polecenie ręcznie.',
  error: 'Nie udało się wczytać notatnika.', retry: 'Spróbuj ponownie',
} : {
  contents: 'Contents', sources: 'Sources', begin: 'Begin reading',
  previous: 'Previous', next: 'Next', page: 'Page', of: 'of', backToReading: 'Back to reading',
  copy: 'Copy prompt', copied: 'Prompt copied.', reference: 'Source',
  manual: 'Select and copy the prompt manually.',
  error: 'The notebook could not be loaded.', retry: 'Try again',
};

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const linkTo = (label, href, className) => {
  const link = make('a', className, label);
  link.href = href;
  return link;
};

const sourceId = (chapter, number) => `source-${chapter.id}-${number}`;
const inlinePattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+(?:\([^\s)]*\)[^\s)]*)?)\)|\*\*(.+?)\*\*|\*([^*]+)\*|\((\d+(?:[–-]\d+)?(?:,\s*\d+(?:[–-]\d+)?)*)(, tłum\. własne)?\)/gu;

function appendInline(parent, text, chapter) {
  const sourceNumbers = new Set(chapter?.sources.map(source => source.number));
  let offset = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const [original, label, url, bold, italic, notes, translation] = match;
    parent.append(text.slice(offset, match.index));
    offset = match.index + original.length;
    if (label) {
      const link = linkTo(label, url, 'guide-source-link');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      parent.append(link);
    } else if (bold || italic) {
      parent.append(make(bold ? 'strong' : 'em', '', bold || italic));
    } else {
      const numbers = notes.split(',').flatMap(note => {
        const [first, last = first] = note.trim().split(/[–-]/u).map(Number);
        return Array.from({length: last - first + 1}, (_, index) => first + index);
      });
      if (!numbers.every(number => sourceNumbers.has(number))) {
        parent.append(original);
        continue;
      }
      const marker = make('sup', 'guide-reference');
      numbers.forEach((number, index) => {
        if (index) marker.append(', ');
        const link = linkTo(String(number), '#' + sourceId(chapter, number));
        link.setAttribute('aria-label', `${labels.reference} ${number} · ${chapter.title}`);
        marker.append(link);
      });
      parent.append(marker);
      if (translation) parent.append(' ', make('em', '', '(tłum. własne)'));
    }
  }
  parent.append(text.slice(offset));
}

const content = document.querySelector('.guide-content');
const chapterLabel = document.querySelector('.guide-chapter');
const status = document.querySelector('.guide-status');
const pageCount = document.querySelector('.guide-page-count');
const previous = document.querySelector('[data-guide-previous]');
const next = document.querySelector('[data-guide-next]');
const otherLanguage = document.querySelector('[data-guide-switch]');
const closeLink = document.querySelector('.guide-close');
let book;
let pages = [];
let index = 0;
let readingPage;

function setCloseDestination() {
  const referrer = document.referrer ? new URL(document.referrer) : null;
  const cameFromWriting = referrer?.origin === location.origin && /^\/(?:pl\/)?writing\/?$/u.test(referrer.pathname);
  if (!cameFromWriting && new URLSearchParams(location.search).get('from') !== 'writing') return;

  closeLink.href = language === 'pl' ? '/pl/writing/' : '/writing/';
  const switchURL = new URL(otherLanguage.href);
  switchURL.searchParams.set('from', 'writing');
  otherLanguage.href = switchURL.href;
}

function pageTitle(text) {
  const heading = make('h1', 'guide-page-title', text);
  heading.tabIndex = -1;
  content.append(heading);
  return heading;
}

function showContents() {
  const heading = pageTitle(book.title);
  content.append(make('p', 'guide-subtitle', book.subtitle));
  const nav = make('nav', 'guide-toc');
  nav.setAttribute('aria-label', labels.contents);
  nav.append(make('h2', '', labels.contents));
  const list = make('ol', 'guide-toc-list');
  for (const chapter of book.chapters) {
    const entry = make('li');
    entry.append(linkTo(chapter.title, '#' + (chapter.intro.length ? chapter.id : chapter.sections[0].id)));
    list.append(entry);
  }
  const sourceEntry = make('li');
  sourceEntry.append(linkTo(labels.sources, '#sources'));
  list.append(sourceEntry);
  nav.append(list);
  content.append(nav);
  return heading;
}

function showSources() {
  const heading = pageTitle(labels.sources);
  for (const chapter of book.chapters.filter(chapter => chapter.sources.length)) {
    const section = make('section', 'guide-sources');
    section.append(make('h2', '', chapter.title));
    const list = make('ol', 'guide-source-list');
    for (const source of chapter.sources) {
      const item = make('li');
      item.id = sourceId(chapter, source.number);
      item.value = source.number;
      item.tabIndex = -1;
      appendInline(item, source.text);
      list.append(item);
    }
    section.append(list);
    content.append(section);
  }
  return heading;
}

async function copyPrompt(prompt, panel) {
  const existing = panel.querySelector('textarea');
  if (existing) {
    existing.focus();
    existing.select();
    return;
  }
  try {
    await navigator.clipboard.writeText(prompt);
    status.textContent = labels.copied;
  } catch {
    const field = make('textarea', 'guide-manual-copy');
    field.readOnly = true;
    field.rows = 6;
    field.value = prompt;
    field.setAttribute('aria-label', labels.manual);
    panel.append(field);
    field.focus();
    field.select();
    status.textContent = labels.manual;
  }
}

function showSection(page) {
  const heading = pageTitle(page.title);
  let list;
  for (const block of page.blocks) {
    if (block.type === 'list') {
      if (!list) {
        list = make('ul');
        content.append(list);
      }
      const item = make('li');
      appendInline(item, block.text, page.chapter);
      list.append(item);
      continue;
    }
    list = undefined;
    if (block.type === 'quote' && ['prompts', 'conversation'].includes(page.chapter.id)) {
      const panel = make('div', 'guide-prompt');
      const quote = make('blockquote', 'guide-prompt-text', block.text);
      const copy = make('button', 'guide-copy', labels.copy);
      copy.type = 'button';
      copy.addEventListener('click', () => copyPrompt(block.text, panel));
      panel.append(quote, copy);
      content.append(panel);
    } else {
      const quote = block.type === 'quote';
      const node = make(quote ? 'blockquote' : 'p', quote ? 'guide-quote' : '');
      appendInline(node, block.text, page.chapter);
      content.append(node);
    }
  }
  return heading;
}

function render(moveFocus = false) {
  const hash = location.hash.slice(1);
  const source = hash.startsWith('source-');
  if (source && pages[index]?.chapter) readingPage = pages[index].id;
  index = Math.max(0, pages.findIndex(page => page.id === (source ? 'sources' : hash)));
  const page = pages[index];
  content.replaceChildren();
  content.classList.toggle('guide-intro', page.id === 'contents');
  content.scrollTop = 0;
  status.textContent = '';
  chapterLabel.textContent = page.chapter && page.chapter.title !== page.title ? page.chapter.title : '';
  const heading = page.id === 'contents' ? showContents() :
    page.id === 'sources' ? showSources() : showSection(page);

  previous.hidden = index === 0;
  const returnToReading = source && readingPage;
  if (index) previous.href = '#' + (returnToReading || pages[index - 1].id);
  previous.textContent = returnToReading ? labels.backToReading : labels.previous;
  next.hidden = index === pages.length - 1;
  if (!next.hidden) next.href = '#' + pages[index + 1].id;
  next.textContent = index === 0 ? labels.begin : labels.next;
  pageCount.textContent = `${index + 1} / ${pages.length}`;
  pageCount.setAttribute('aria-label', `${labels.page} ${index + 1} ${labels.of} ${pages.length}`);
  otherLanguage.hash = source && document.getElementById(hash) ? hash : page.id;
  document.title = page.id === 'contents' ? book.title : `${page.title} | ${book.title}`;
  if (source) {
    const reference = document.getElementById(hash);
    if (reference) {
      reference.focus({preventScroll: true});
      reference.scrollIntoView({block: 'nearest', behavior: 'instant'});
      return;
    }
  }
  if (moveFocus) heading.focus({preventScroll: true});
}

async function load() {
  try {
    const response = await fetch('/data/ai-guide.json?v=20261120');
    if (!response.ok) throw new Error('Book unavailable');
    const data = await response.json();
    book = data[language];
    pages = [
      {id: 'contents', title: book.title},
      ...book.chapters.flatMap(chapter => [
        ...(chapter.intro.length ? [{id: chapter.id, title: chapter.title, blocks: chapter.intro}] : []),
        ...chapter.sections,
      ].map(section => ({...section, chapter}))),
      {id: 'sources', title: labels.sources},
    ];
    render();
  } catch {
    book = undefined;
    content.replaceChildren();
    pageTitle(labels.error);
    const retry = make('button', 'guide-primary', labels.retry);
    retry.type = 'button';
    retry.addEventListener('click', load, {once: true});
    content.append(retry);
  }
}

document.querySelector('.guide-skip').addEventListener('click', event => {
  event.preventDefault();
  content.focus();
});

window.addEventListener('hashchange', () => {
  if (book) render(true);
});

document.addEventListener('keydown', event => {
  if (!book || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.closest('a, button, input, textarea, select, [contenteditable]')) return;
  if (window.getSelection()?.toString()) return;
  const destination = event.key === 'ArrowLeft' ? index - 1 :
    event.key === 'ArrowRight' ? index + 1 : index;
  if (destination !== index && pages[destination]) {
    event.preventDefault();
    location.hash = pages[destination].id;
  }
});

setCloseDestination();
load();
