const content = document.querySelector('[data-reader-body]');
const progress = document.querySelector('[data-reader-progress]');
const smaller = document.querySelector('[data-reader-smaller]');
const larger = document.querySelector('[data-reader-larger]');
const topbar = document.querySelector('.reader-topbar');
const sizes = [1.125, 1.25, 1.375, 1.5, 1.625];
const preferenceKey = 'mariusz-reader-text-size';
let currentSize = 1;
let framePending = false;

function updateProgress() {
  framePending = false;
  if (!content || !progress) return;
  const top = content.getBoundingClientRect().top + window.scrollY;
  const header = topbar?.offsetHeight ?? 0;
  const range = Math.max(1, content.offsetHeight - window.innerHeight + header);
  const fraction = Math.min(1, Math.max(0, (window.scrollY - top + header) / range));
  progress.style.transform = `scaleX(${fraction})`;
}

function scheduleProgress() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateProgress);
}

function applySize() {
  if (!content || !smaller || !larger) return;
  content.style.setProperty('--reader-font-size', `${sizes[currentSize]}rem`);
  smaller.disabled = currentSize === 0;
  larger.disabled = currentSize === sizes.length - 1;
  scheduleProgress();
}

try {
  const saved = Number(localStorage.getItem(preferenceKey));
  if (Number.isInteger(saved) && saved >= 0 && saved < sizes.length
      && localStorage.getItem(preferenceKey) !== null) currentSize = saved;
} catch { /* Text controls remain available when preferences cannot be saved. */ }

function changeSize(direction) {
  currentSize = Math.max(0, Math.min(sizes.length - 1, currentSize + direction));
  applySize();
  try { localStorage.setItem(preferenceKey, String(currentSize)); } catch { /* Optional preference only. */ }
}

smaller?.addEventListener('click', () => changeSize(-1));
larger?.addEventListener('click', () => changeSize(1));
window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress);
window.addEventListener('load', scheduleProgress);
applySize();

function bindBookmark() {
  const toggle = document.querySelector('[data-reader-bookmark]');
  const label = toggle?.querySelector('.reader-bookmark-label');
  const controls = document.querySelector('[data-reader-bookmark-controls]');
  const resume = controls?.querySelector('[data-reader-resume]');
  const status = document.querySelector('[data-reader-bookmark-status]');
  if (!content || !toggle || !label || !resume || !status) return;

  const blocks = Array.from(content.children).filter(block => block.matches('p, h2') && block.textContent.trim());
  if (!blocks.length) return;
  const canonical = document.querySelector('link[rel="canonical"]');
  const pathname = canonical ? new URL(canonical.href).pathname : location.pathname.replace(/\/index\.html$/, '/');
  const storageKey = 'mariusz-reader-bookmark:' + pathname;
  const saveLabel = label.textContent;
  let noticeTimer;

  function readBookmark() {
    try {
      const place = JSON.parse(localStorage.getItem(storageKey));
      if (place && Number.isInteger(place.block) && blocks[place.block] &&
          Number.isFinite(place.fraction) && place.fraction >= 0 && place.fraction <= 1) return place;
    } catch { /* Reading still works when storage is blocked. */ }
    return null;
  }

  function updateBookmark() {
    const hasBookmark = !!readBookmark();
    const anchorTop = controls.hidden === hasBookmark ? content.getBoundingClientRect().top : null;
    controls.hidden = !hasBookmark;
    toggle.toggleAttribute('data-bookmarked', hasBookmark);
    const action = hasBookmark ? toggle.dataset.removeLabel : saveLabel;
    label.textContent = action;
    toggle.setAttribute('aria-label', action);
    toggle.title = action;

    if (anchorTop !== null && anchorTop < readingLine()) {
      const shift = content.getBoundingClientRect().top - anchorTop;
      if (Math.abs(shift) > 0.5) window.scrollBy({ top: shift, behavior: 'instant' });
    }
  }

  function announce(message) {
    clearTimeout(noticeTimer);
    status.textContent = message;
    noticeTimer = setTimeout(() => { status.textContent = ''; }, 3500);
  }

  function readingLine() {
    return (topbar?.getBoundingClientRect().bottom ?? 0) + 12;
  }

  function characterRect(range, node, offset) {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    return range.getBoundingClientRect();
  }

  function firstVisibleCharacter(block, line) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let offset = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.length && characterRect(range, node, node.length - 1).bottom > line) {
        let first = 0;
        let last = node.length - 1;
        while (first < last) {
          const middle = Math.floor((first + last) / 2);
          if (characterRect(range, node, middle).bottom > line) last = middle;
          else first = middle + 1;
        }
        return offset + first;
      }
      offset += node.length;
    }
    return null;
  }

  function savedCharacterRect(block, offset) {
    if (!Number.isInteger(offset) || offset < 0) return null;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (offset < node.length) return characterRect(document.createRange(), node, offset);
      offset -= node.length;
    }
    return null;
  }

  function currentPlace() {
    const line = readingLine();
    const visible = blocks.findIndex(block => block.getBoundingClientRect().bottom > line);
    const block = visible < 0 ? blocks.length - 1 : visible;
    const rect = blocks[block].getBoundingClientRect();
    const fraction = rect.height ? Math.min(1, Math.max(0, (line - rect.top) / rect.height)) : 0;
    const offset = firstVisibleCharacter(blocks[block], line);
    return { block, fraction, offset };
  }

  toggle.addEventListener('click', () => {
    const hasBookmark = !!readBookmark();
    try {
      if (hasBookmark) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(currentPlace()));
    } catch {
      announce(toggle.dataset.unavailable);
      return;
    }
    updateBookmark();
    announce(hasBookmark ? toggle.dataset.removed : toggle.dataset.saved);
  });

  resume.addEventListener('click', () => {
    const place = readBookmark();
    if (!place) {
      updateBookmark();
      toggle.focus();
      return;
    }
    const block = blocks[place.block];
    const rect = block.getBoundingClientRect();
    const character = savedCharacterRect(block, place.offset);
    const top = character?.height ? character.top : rect.top + rect.height * place.fraction;
    block.tabIndex = -1;
    block.focus({ preventScroll: true });
    window.scrollTo({ top: window.scrollY + top - readingLine(), behavior: 'instant' });
  });

  window.addEventListener('pageshow', updateBookmark);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) updateBookmark();
  });
  toggle.hidden = false;
  updateBookmark();
}

bindBookmark();
