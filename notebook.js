// Enhancement only: the linked notebook pages also contain the full collection as HTML.
const initialLanguage = document.documentElement.lang === 'pl' ? 'pl' : 'en';
const text = {
  pl: {
    notebook: 'Notatnik autora', close: 'Zamknij', intro: 'Na początek', outro: 'Na zakończenie',
    human: 'Człowiek', machine: 'Maszyna', future: 'Przyszłość', previous: 'Poprzednia', next: 'Następna',
    start: 'Rozpocznij lekturę', page: 'Strona', of: 'z', copy: 'Skopiuj cytat', save: 'Zapisz grafikę',
    copied: 'Cytat skopiowany z podpisem i źródłem.', source: 'Źródło i kontekst', original: 'Otwórz źródło',
    reflection: 'Myśl autora', essays: 'Czytaj moje eseje', image: 'Grafika z cytatem', download: 'Pobierz PNG',
    openImage: 'Otwórz grafikę', share: 'Udostępnij', preparing: 'Przygotowuję grafikę…',
    imageNote: '1080 × 1350 px · Autor i źródło pozostają na grafice.',
    manual: 'Zaznacz tekst i skopiuj go ręcznie:', copyError: 'Przeglądarka nie udostępniła schowka. Tekst jest gotowy do ręcznego skopiowania.',
    imageError: 'Nie udało się przygotować grafiki. Spróbuj ponownie.',
    loadError: 'Nie udało się otworzyć notatnika. Możesz przeczytać go na osobnej stronie.',
    copyShort: 'Kopiuj', saveShort: 'Grafika', sourceShort: 'Źródło', continue: 'Czytaj dalej',
    fallback: 'Przejdź do notatnika', collection: 'Kolekcja Mariusza Gorlowskiego', quote: 'Cytat',
  },
  en: {
    notebook: 'The author’s notebook', close: 'Close', intro: 'Before you begin', outro: 'A final thought',
    human: 'Human', machine: 'Machine', future: 'Future', previous: 'Previous', next: 'Next',
    start: 'Begin reading', page: 'Page', of: 'of', copy: 'Copy quotation', save: 'Save image',
    copied: 'Quotation copied with its author and source.', source: 'Source and context', original: 'Open source',
    reflection: 'Author’s reflection', essays: 'Read my essays', image: 'Quotation image', download: 'Download PNG',
    openImage: 'Open image', share: 'Share', preparing: 'Preparing image…',
    imageNote: '1080 × 1350 px · The author and source stay on the image.',
    manual: 'Select the text and copy it manually:', copyError: 'The browser could not access the clipboard. The text is ready to copy manually.',
    imageError: 'The image could not be prepared. Please try again.',
    loadError: 'The notebook could not be opened. You can read it on its own page.',
    copyShort: 'Copy', saveShort: 'Image', sourceShort: 'Source', continue: 'Read on',
    fallback: 'Go to the notebook', collection: 'Selected by Mariusz Gorlowski', quote: 'Quotation',
  },
};
const ui = text[initialLanguage];
const home = initialLanguage === 'pl' ? '/pl/' : '/';
let collectionPromise;
let collection;
let pages;
let index = 0;
let dialog;
let imageDialog;
let sourceDialog;
let resizeFrame;
let restoreFocus;
let scrollY = 0;
let openedWithHistory = false;
let statusTimer;
let imageURL;
let imageFile;
let imageGeneration = 0;
let opening = false;

const element = (tag, className, value) => {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (value !== undefined) item.textContent = value;
  return item;
};
const translated = value => typeof value === 'string' ? value : value?.[initialLanguage] ?? '';
const paragraphs = (parent, values, className) => {
  for (const value of values) parent.append(element('p', className, value));
};
const bySelector = selector => dialog.querySelector(selector);

function hashId() {
  try { return decodeURIComponent(location.hash.match(/^#notebook(?:\/([^/]+))?$/u)?.[1] ?? 'intro'); }
  catch { return 'intro'; }
}

async function loadCollection() {
  if (!collectionPromise) {
    collectionPromise = fetch('/data/notebook.json?v=20261119-book-1').then(response => {
      if (!response.ok) throw new Error('Notebook unavailable');
      return response.json();
    }).then(data => {
      if (!Array.isArray(data.entries) || data.entries.length !== 63) throw new Error('Invalid notebook');
      collection = data;
      pages = [{ id: 'intro', kind: 'intro' }, ...data.entries, { id: 'outro', kind: 'outro' }];
      if (hashId() === 'intro-more') pages.splice(1, 0, { id: 'intro-more', kind: 'intro-more' });
    }).catch(error => { collectionPromise = undefined; throw error; });
  }
  return collectionPromise;
}

function makeDialog() {
  dialog = element('dialog', 'notebook-dialog');
  dialog.lang = initialLanguage;
  dialog.setAttribute('aria-labelledby', 'notebook-dialog-title');
  dialog.innerHTML = `
    <div class="notebook-binding">
      <div class="notebook-spread">
        <aside class="notebook-frontmatter"><p class="notebook-imprint"></p><h2 class="notebook-book-title"></h2><div class="notebook-title-rule" aria-hidden="true"></div><p class="notebook-subtitle"></p><p class="notebook-credit"></p><button type="button" class="notebook-contents-link" data-notebook-intro></button></aside>
        <section class="notebook-page" data-notebook-page tabindex="-1" role="region" aria-label="${initialLanguage === 'pl' ? 'Treść strony książki' : 'Book page'}">
          <div class="notebook-topline"><button type="button" class="notebook-label" id="notebook-dialog-title" data-notebook-title></button><div class="notebook-top-actions"><nav class="notebook-languages" aria-label="Language / Język"><a lang="en" hreflang="en" data-notebook-language="en">EN</a><a lang="pl" hreflang="pl" data-notebook-language="pl">PL</a></nav><button type="button" class="notebook-close" data-notebook-close autofocus></button></div></div>
          <div class="notebook-head-rule" aria-hidden="true"></div>
          <nav class="notebook-tabs" aria-label="${initialLanguage === 'pl' ? 'Rozdziały' : 'Chapters'}"><button type="button" data-notebook-category="human"></button><button type="button" data-notebook-category="machine"></button><button type="button" data-notebook-category="future"></button></nav>
          <div class="notebook-page-inner" data-notebook-page-inner></div>
          <nav class="notebook-pagination" aria-label="${initialLanguage === 'pl' ? 'Strony książki' : 'Book pages'}"><button type="button" data-notebook-previous></button><div class="notebook-page-number" data-notebook-page-number aria-live="polite" aria-atomic="true"></div><button type="button" data-notebook-next></button></nav>
        </section>
      </div>
    </div>
    <p class="notebook-status" data-notebook-status role="status" aria-live="polite" aria-atomic="true"></p>`;
  bySelector('.notebook-label').textContent = ui.notebook;
  bySelector('[data-notebook-title]').title = ui.intro;
  bySelector('[data-notebook-title]').addEventListener('click', () => showPage(0));
  bySelector('[data-notebook-close]').textContent = '×';
  bySelector('[data-notebook-close]').setAttribute('aria-label', ui.close);
  bySelector('[data-notebook-close]').title = ui.close;
  bySelector('[data-notebook-previous]').textContent = ui.previous;
  bySelector('[data-notebook-next]').textContent = ui.next;
  bySelector('.notebook-imprint').textContent = 'Mariusz Gorlowski';
  bySelector('.notebook-book-title').textContent = translated(collection.title);
  bySelector('.notebook-subtitle').textContent = translated(collection.subtitle);
  bySelector('.notebook-credit').textContent = translated(collection.credit);
  bySelector('[data-notebook-intro]').textContent = ui.intro;
  bySelector('[data-notebook-close]').addEventListener('click', requestClose);
  bySelector('[data-notebook-previous]').addEventListener('click', () => showPage(index - 1));
  bySelector('[data-notebook-next]').addEventListener('click', () => showPage(index + 1));
  bySelector('[data-notebook-intro]').addEventListener('click', () => showPage(0));
  for (const button of dialog.querySelectorAll('[data-notebook-category]')) {
    button.textContent = ui[button.dataset.notebookCategory];
    button.addEventListener('click', () => showPage(pages.findIndex(page => page.category === button.dataset.notebookCategory)));
  }
  for (const link of dialog.querySelectorAll('[data-notebook-language]')) {
    if (link.dataset.notebookLanguage === initialLanguage) link.setAttribute('aria-current', 'true');
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  dialog.addEventListener('close', afterClose);
  dialog.addEventListener('click', event => {
    // Only the backdrop closes the book; spaces between pages and controls do not.
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) requestClose();
  });
  dialog.addEventListener('keydown', event => {
    if (imageDialog?.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('textarea, input, select, summary, [contenteditable=true]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); showPage(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPage(index - 1); }
    if (event.key === 'Home') { event.preventDefault(); showPage(0); }
    if (event.key === 'End') { event.preventDefault(); showPage(pages.length - 1); }
  });
  document.body.append(dialog);
}

function updateBookViewport() {
  if (!dialog?.open) return;
  const height = window.visualViewport?.height ?? window.innerHeight;
  dialog.style.setProperty('--notebook-viewport-height', `${Math.floor(height)}px`);
}

function schedulePageFit() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(fitCurrentPage);
}

function fitCurrentPage() {
  if (!dialog?.open) return;
  updateBookViewport();
  const inner = bySelector('[data-notebook-page-inner]');
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  inner.classList.remove('notebook-compact');
  inner.style.removeProperty('--notebook-text-size');
  inner.style.removeProperty('--notebook-title-size');
  inner.style.removeProperty('--notebook-outro-size');
  const quote = inner.querySelector('.notebook-quote-body');
  if (quote) {
    const startSize = parseFloat(getComputedStyle(quote).fontSize);
    for (let size = startSize; size >= rootSize * 1.125; size -= .5) {
      inner.style.setProperty('--notebook-text-size', `${size / rootSize}rem`);
      if (inner.scrollHeight <= inner.clientHeight + 1) break;
    }
  } else if (inner.dataset.kind === 'intro') {
    const copy = inner.querySelector('.notebook-intro-copy');
    const title = inner.querySelector('.notebook-mobile-title h2');
    const startSize = parseFloat(getComputedStyle(copy).fontSize);
    for (let size = startSize; size >= rootSize; size -= .25) {
      inner.style.setProperty('--notebook-text-size', `${size / rootSize}rem`);
      if (inner.scrollHeight <= inner.clientHeight + 1) break;
    }
    if (inner.scrollHeight > inner.clientHeight + 1 && title) {
      for (let size = 30; size >= 24; size -= 1) {
        inner.style.setProperty('--notebook-title-size', `${size / 16}rem`);
        if (inner.scrollHeight <= inner.clientHeight + 1) break;
      }
    }
  } else if (inner.dataset.kind === 'outro') {
    inner.style.setProperty('--notebook-text-size', '1rem');
    const question = inner.querySelector('.notebook-outro-question');
    const startSize = parseFloat(getComputedStyle(question).fontSize);
    for (let size = startSize; size >= rootSize * 1.25; size -= .5) {
      inner.style.setProperty('--notebook-outro-size', `${size / rootSize}rem`);
      if (inner.scrollHeight <= inner.clientHeight + 1) break;
    }
  }
  if (inner.scrollHeight > inner.clientHeight + 1) inner.classList.add('notebook-compact');
  inner.dataset.fitted = String(inner.scrollHeight <= inner.clientHeight + 1);
  if (inner.dataset.kind === 'intro' && inner.dataset.fitted === 'false' && pages[1].id !== 'intro-more') {
    pages.splice(1, 0, { id: 'intro-more', kind: 'intro-more' });
    showPage(0, { updateHistory: false, animate: false });
    fitCurrentPage();
  }
}

function auxiliaryDialog(title) {
  if (!sourceDialog) {
    sourceDialog = element('dialog', 'notebook-source-dialog');
    sourceDialog.lang = initialLanguage;
    sourceDialog.setAttribute('aria-labelledby', 'notebook-source-title');
    document.body.append(sourceDialog);
  }
  sourceDialog.replaceChildren();
  const header = element('div', 'notebook-image-head');
  const heading = element('h2', '', title); heading.id = 'notebook-source-title';
  const close = element('button', 'notebook-secondary', ui.close); close.type = 'button';
  close.addEventListener('click', () => sourceDialog.close()); header.append(heading, close);
  sourceDialog.append(header);
  return sourceDialog;
}

function showSource(page) {
  const panel = auxiliaryDialog(ui.source);
  panel.append(element('p', 'notebook-author', translated(page.author)), element('p', 'notebook-source', `${translated(page.source)} · ${translated(page.year)}`));
  if (translated(page.translation)) panel.append(element('p', 'notebook-translation', translated(page.translation)));
  panel.append(element('p', 'notebook-context-copy', translated(page.context)));
  const link = element('a', 'notebook-primary', ui.original);
  link.href = sourceAddress(page); link.target = '_blank'; link.rel = 'noopener noreferrer';
  panel.append(link); panel.showModal();
}

window.addEventListener('resize', schedulePageFit);
window.visualViewport?.addEventListener('resize', schedulePageFit);

function say(message) {
  clearTimeout(statusTimer);
  bySelector('[data-notebook-status]').textContent = message;
  if (message) statusTimer = setTimeout(() => { bySelector('[data-notebook-status]').textContent = ''; }, 6000);
}

function currentPath(id, language = initialLanguage) {
  return `${language === 'pl' ? '/pl/' : '/'}#notebook/${encodeURIComponent(id)}`;
}

function showPage(nextIndex, { updateHistory = true, animate = true } = {}) {
  if (nextIndex < 0 || nextIndex >= pages.length) return;
  index = nextIndex;
  const page = pages[index];
  const inner = bySelector('[data-notebook-page-inner]');
  const activeBefore = document.activeElement;
  const focusWasOnPage = inner.contains(activeBefore);
  inner.dataset.fitted = 'pending';
  inner.replaceChildren();
  say('');
  const label = page.category ? ui[page.category] : page.kind === 'intro-more' ? ui.intro : ui[page.kind];
  inner.append(element('p', 'notebook-page-label', label));
  const article = element('article', 'notebook-article');
  if (page.kind === 'intro') {
    const mobileTitle = element('div', 'notebook-mobile-title');
    mobileTitle.append(element('h2', '', translated(collection.title)), element('span', 'notebook-mobile-subtitle', translated(collection.subtitle)));
    article.append(mobileTitle);
    const heading = element('h3', 'notebook-desktop-intro-heading', ui.intro);
    article.append(heading);
    const copy = element('div', 'notebook-intro-copy');
    paragraphs(copy, pages[1].id === 'intro-more' ? translated(collection.intro).slice(0, 1) : translated(collection.intro));
    article.append(copy);
    inner.append(article);
  } else if (page.kind === 'intro-more') {
    article.append(element('h3', '', ui.intro));
    const copy = element('div', 'notebook-intro-copy');
    paragraphs(copy, translated(collection.intro).slice(1));
    article.append(copy, element('p', 'notebook-signature notebook-foreword-signature', 'Mariusz Gorlowski'));
    inner.append(article);
  } else if (page.kind === 'outro') {
    const values = translated(collection.outro);
    article.append(element('h3', '', ui.outro), element('p', 'notebook-intro-copy', values[0]), element('p', 'notebook-outro-question', values[1]), element('p', 'notebook-signature', values[2]));
    inner.append(article);
    const essays = element('a', 'notebook-primary', ui.essays);
    essays.href = home + 'writing/essays/'; inner.append(essays);
  } else {
    if (page.kind === 'reflection') article.append(element('p', 'notebook-reflection-label', ui.reflection));
    const figure = element('figure', 'notebook-quote');
    const mark = element('span', 'notebook-quote-mark', '“'); mark.setAttribute('aria-hidden', 'true');
    const block = element('blockquote', 'notebook-quote-body');
    if (translated(page.paragraphs).join(' ').length > 200) block.classList.add('notebook-long');
    block.style.margin = '0';
    paragraphs(block, translated(page.paragraphs));
    figure.append(mark, block);
    const caption = element('figcaption', 'notebook-attribution');
    caption.append(element('span', 'notebook-author', translated(page.author)));
    caption.append(element('cite', 'notebook-source', `${translated(page.source)} · ${translated(page.year)}`));
    if (translated(page.translation)) caption.append(element('span', 'notebook-translation', translated(page.translation)));
    figure.append(caption); article.append(figure);
    inner.append(article);
    const tools = element('div', 'notebook-page-tools');
    const copy = element('button', '', ui.copyShort); copy.setAttribute('aria-label', ui.copy); copy.type = 'button'; copy.dataset.notebookCopy = '';
    copy.addEventListener('click', () => copyQuotation(page));
    const save = element('button', '', ui.saveShort); save.setAttribute('aria-label', ui.save); save.type = 'button'; save.dataset.notebookSave = '';
    save.addEventListener('click', () => prepareImage(page, save));
    const source = element('button', '', ui.sourceShort); source.type = 'button'; source.dataset.notebookSource = ''; source.setAttribute('aria-label', ui.source);
    source.addEventListener('click', () => showSource(page));
    tools.append(copy, save, source); inner.append(tools);
  }
  bySelector('[data-notebook-previous]').disabled = index === 0;
  bySelector('[data-notebook-next]').disabled = index === pages.length - 1;
  const number = bySelector('[data-notebook-page-number]');
  number.textContent = `${index + 1} / ${pages.length}`;
  number.setAttribute('aria-label', `${ui.page} ${index + 1} ${ui.of} ${pages.length}`);
  if (page.category) {
    const chapterPages = pages.filter(item => item.category === page.category);
    const chapterNumber = element('small');
    chapterNumber.append(element('span', 'notebook-counter-chapter', `${label} · `), document.createTextNode(`${chapterPages.findIndex(item => item.id === page.id) + 1} / ${chapterPages.length}`));
    number.append(chapterNumber);
  }
  for (const button of dialog.querySelectorAll('[data-notebook-category]')) button.setAttribute('aria-pressed', String(button.dataset.notebookCategory === page.category));
  for (const link of dialog.querySelectorAll('[data-notebook-language]')) link.href = currentPath(page.id, link.dataset.notebookLanguage);
  bySelector('[data-notebook-page]').scrollTop = 0;
  inner.dataset.kind = page.kind;
  bySelector('[data-notebook-next]').textContent = page.kind === 'intro' ? pages[1].id === 'intro-more' ? ui.continue : ui.start : page.kind === 'intro-more' ? ui.start : ui.next;
  if (animate) { inner.classList.remove('notebook-turned'); void inner.offsetWidth; inner.classList.add('notebook-turned'); }
  if (dialog.open) fitCurrentPage();
  if (animate && (focusWasOnPage || activeBefore?.disabled)) bySelector('[data-notebook-page]').focus({ preventScroll: true });
  if (updateHistory && dialog.open) history.replaceState({ ...history.state, notebook: page.id }, '', `#notebook/${encodeURIComponent(page.id)}`);
}

async function openBook(trigger, pushHistory = true) {
  if (opening || dialog?.open) return;
  opening = true;
  trigger?.setAttribute('aria-busy', 'true');
  try {
    await loadCollection();
    if (!dialog) makeDialog();
    restoreFocus = trigger ?? document.querySelector('[data-notebook-open]');
    const wanted = /^#notebook/u.test(location.hash) ? hashId() : pages[index].id;
    showPage(Math.max(0, pages.findIndex(page => page.id === wanted)), { updateHistory: false, animate: false });
    if (typeof dialog.showModal !== 'function') throw new Error('Dialog unavailable');
    scrollY = window.scrollY;
    document.documentElement.classList.add('notebook-is-open');
    document.body.classList.add('notebook-is-open');
    document.body.style.top = `-${scrollY}px`;
    dialog.showModal();
    updateBookViewport();
    fitCurrentPage();
    openedWithHistory = pushHistory;
    if (pushHistory) history.pushState({ ...history.state, notebook: pages[index].id }, '', `#notebook/${encodeURIComponent(pages[index].id)}`);
    // Native dialog traps focus; the book is sized to the browser's visible viewport.
    bySelector('[data-notebook-close]').focus({ preventScroll: true });
  } catch {
    const previous = document.querySelector('.notebook-error'); previous?.remove();
    const error = element('p', 'notebook-error', `${ui.loadError} `); error.setAttribute('role', 'alert');
    const fallback = element('a', '', ui.fallback); fallback.href = home + 'notebook/'; error.append(fallback);
    (document.querySelector('.profile-section') ?? document.querySelector('main') ?? document.body).append(error);
  } finally {
    trigger?.removeAttribute('aria-busy'); opening = false;
  }
}

function requestClose() {
  if (!dialog?.open) return;
  if (imageDialog?.open) { imageDialog.close(); return; }
  if (sourceDialog?.open) { sourceDialog.close(); return; }
  dialog.close();
  if (openedWithHistory && /^#notebook/u.test(location.hash)) history.back();
  else if (/^#notebook/u.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
}

function afterClose() {
  clearTimeout(statusTimer);
  document.documentElement.classList.remove('notebook-is-open');
  document.body.classList.remove('notebook-is-open');
  document.body.style.top = '';
  const scrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo({ top: scrollY, behavior: 'auto' });
  document.documentElement.style.scrollBehavior = scrollBehavior;
  restoreFocus?.focus({ preventScroll: true });
}

function sourceAddress(page) {
  return page.kind === 'reflection' ? `https://mariuszgorlowski.com${home}#notebook/${page.id}` : page.sourceUrl;
}

function quotationText(page) {
  const quote = translated(page.paragraphs).join('\n\n');
  const author = translated(page.author);
  const source = translated(page.source);
  const translation = translated(page.translation);
  return `${initialLanguage === 'pl' ? '„' : '“'}${quote}”\n— ${author}\n${source} · ${translated(page.year)}${translation ? `\n${translation}` : ''}\n${sourceAddress(page)}`;
}

async function copyQuotation(page) {
  const value = quotationText(page);
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const input = element('textarea'); input.value = value; input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;';
      dialog.append(input); input.focus(); input.select();
      const copied = document.execCommand('copy'); input.remove();
      if (!copied) throw new Error('Clipboard unavailable');
      bySelector('[data-notebook-copy]')?.focus({ preventScroll: true });
    }
    say(ui.copied);
  } catch {
    const panel = auxiliaryDialog(ui.manual);
    const fallback = element('div', 'notebook-manual-copy');
    const label = element('label', '', ui.manual); label.htmlFor = 'notebook-copy-text';
    const input = element('textarea'); input.id = 'notebook-copy-text'; input.readOnly = true; input.value = value;
    fallback.append(label, input); panel.append(fallback); panel.showModal();
    input.focus(); input.select(); say(ui.copyError);
  }
}

function wrapText(context, value, width) {
  const lines = []; let line = '';
  for (const word of value.split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function drawQuotationImage(page) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#080c0a'; context.fillRect(0, 0, 1080, 1350);
  context.strokeStyle = '#c7a66b'; context.lineWidth = 2; context.strokeRect(30, 30, 1020, 1290);
  context.strokeStyle = '#c7a66b55'; context.lineWidth = 1; context.strokeRect(40, 40, 1000, 1270);
  context.textBaseline = 'top'; context.textAlign = 'center';
  context.fillStyle = '#d8b97d'; context.font = "28px Georgia, 'Times New Roman', serif";
  context.fillText(ui[page.category].toLocaleUpperCase(initialLanguage), 540, 110);
  context.fillStyle = '#d8b97d'; context.font = "126px Georgia, 'Times New Roman', serif"; context.fillText('“', 540, 180);
  let fontSize = 76, blocks, height;
  do {
    context.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
    blocks = translated(page.paragraphs).map(value => wrapText(context, value, 850));
    height = blocks.reduce((total, block) => total + block.length * fontSize * 1.25, 0) + (blocks.length - 1) * 30;
    if (height <= 610) break;
    fontSize -= 2;
  } while (fontSize >= 34);
  context.fillStyle = '#f7eedb';
  let y = 300 + (610 - height) / 2;
  for (const block of blocks) {
    for (const line of block) { context.fillText(line, 540, y); y += fontSize * 1.25; }
    y += 30;
  }
  context.strokeStyle = '#b9975e'; context.lineWidth = 1; context.beginPath(); context.moveTo(495, 959); context.lineTo(585, 959); context.stroke();
  let authorSize = 43; const author = translated(page.author);
  do { context.font = `italic ${authorSize}px Georgia, 'Times New Roman', serif`; if (context.measureText(author).width <= 910) break; authorSize -= 1; } while (authorSize > 26);
  context.fillStyle = '#dcc18a'; context.fillText(author, 540, 991);
  context.font = "24px Georgia, 'Times New Roman', serif"; context.fillStyle = '#c8bca3';
  const source = `${translated(page.source)} · ${translated(page.year)}`;
  const sourceLines = wrapText(context, source, 900);
  sourceLines.forEach((line, number) => context.fillText(line, 540, 1064 + number * 31));
  const translation = translated(page.translation);
  context.font = "21px Georgia, 'Times New Roman', serif";
  if (translation) wrapText(context, translation, 900).forEach((line, number) => context.fillText(line, 540, 1064 + sourceLines.length * 31 + 13 + number * 27));
  context.fillStyle = '#bbaa89'; context.font = "22px Georgia, 'Times New Roman', serif";
  context.fillText(ui.collection, 540, 1220);
  context.fillStyle = '#dcc18a'; context.font = "26px Georgia, 'Times New Roman', serif";
  context.fillText('mariuszgorlowski.com', 540, 1260);
  return canvas;
}

function makeImageDialog() {
  imageDialog = element('dialog', 'notebook-image-dialog'); imageDialog.lang = initialLanguage;
  imageDialog.setAttribute('aria-labelledby', 'notebook-image-title');
  imageDialog.innerHTML = `<div class="notebook-image-head"><h2 id="notebook-image-title"></h2><button type="button" class="notebook-close" autofocus></button></div><img class="notebook-image-preview" width="1080" height="1350"><div class="notebook-image-actions"><a class="notebook-secondary" data-image-download></a><button type="button" class="notebook-secondary" data-image-share hidden></button><a class="notebook-secondary" data-image-open target="_blank" rel="noopener noreferrer"></a></div><p class="notebook-image-note"></p>`;
  imageDialog.querySelector('h2').textContent = ui.image;
  imageDialog.querySelector('.notebook-close').textContent = ui.close;
  imageDialog.querySelector('.notebook-close').addEventListener('click', () => imageDialog.close());
  imageDialog.querySelector('[data-image-download]').textContent = ui.download;
  imageDialog.querySelector('[data-image-open]').textContent = ui.openImage;
  imageDialog.querySelector('[data-image-share]').textContent = ui.share;
  imageDialog.querySelector('.notebook-image-note').textContent = ui.imageNote;
  imageDialog.querySelector('[data-image-share]').addEventListener('click', async () => {
    try { if (imageFile) await navigator.share({ files: [imageFile] }); }
    catch (error) { if (error.name !== 'AbortError') imageDialog.querySelector('.notebook-image-note').textContent = ui.imageError; }
  });
  document.body.append(imageDialog);
}

async function prepareImage(page, button) {
  const generation = ++imageGeneration; button.disabled = true; button.textContent = ui.preparing;
  try {
    await document.fonts.ready;
    const canvas = drawQuotationImage(page);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob || generation !== imageGeneration || !dialog.open || pages[index].id !== page.id) return;
    if (!imageDialog) makeImageDialog();
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(blob);
    const filename = `mariusz-gorlowski-notebook-${page.id}-${initialLanguage}.png`;
    const preview = imageDialog.querySelector('img'); preview.src = imageURL;
    preview.alt = `${translated(page.paragraphs).join(' ')} — ${translated(page.author)}. ${translated(page.source)}`;
    const download = imageDialog.querySelector('[data-image-download]'); download.href = imageURL; download.download = filename;
    imageDialog.querySelector('[data-image-open]').href = imageURL;
    imageFile = new File([blob], filename, { type: 'image/png' });
    imageDialog.querySelector('[data-image-share]').hidden = !navigator.canShare?.({ files: [imageFile] });
    imageDialog.showModal();
  } catch { say(ui.imageError); }
  finally { button.disabled = false; button.textContent = ui.saveShort; }
}

// Map the real book in the existing image, including object-fit cropping on phones.
function alignBookHotspot() {
  const image = document.querySelector('.cover-image');
  const hotspot = document.querySelector('.notebook-hotspot');
  if (!image || !hotspot || !image.naturalWidth) return;
  const style = getComputedStyle(image);
  const positions = style.objectPosition.split(' ').map(value => parseFloat(value) / 100);
  const sx = Number.isFinite(positions[0]) ? positions[0] : .5;
  const sy = Number.isFinite(positions[1]) ? positions[1] : .5;
  const scale = Math.max(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight);
  const x = (image.clientWidth - image.naturalWidth * scale) * sx;
  const y = (image.clientHeight - image.naturalHeight * scale) * sy;
  // Original 2172 × 724 hero: the closed black book, not the foreground notebook.
  const box = { left: 1149, top: 383, right: 1750, bottom: 565 };
  const left = Math.max(0, x + box.left * scale), top = Math.max(0, y + box.top * scale);
  const right = Math.min(image.clientWidth, x + box.right * scale), bottom = Math.min(image.clientHeight, y + box.bottom * scale);
  if (right <= left || bottom <= top) { hotspot.style.visibility = 'hidden'; return; }
  hotspot.style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px;`;
}

for (const trigger of document.querySelectorAll('[data-notebook-open]')) {
  trigger.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); openBook(trigger);
  });
}
const coverImage = document.querySelector('.cover-image');
if (coverImage) {
  coverImage.addEventListener('load', alignBookHotspot);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(alignBookHotspot).observe(coverImage);
  else window.addEventListener('resize', alignBookHotspot);
  alignBookHotspot();
}
window.addEventListener('popstate', () => {
  if (/^#notebook/u.test(location.hash)) {
    if (dialog?.open) showPage(Math.max(0, pages.findIndex(page => page.id === hashId())), { updateHistory: false });
    else openBook(null, false);
  } else if (dialog?.open) { imageDialog?.close(); sourceDialog?.close(); dialog.close(); }
});
window.addEventListener('pagehide', event => { if (!event.persisted && imageURL) URL.revokeObjectURL(imageURL); });
if (/^#notebook(?:\/|$)/u.test(location.hash) || document.body.hasAttribute('data-notebook-auto-open')) openBook(null, false);
