const content = document.querySelector('[data-reader-body]');
const progress = document.querySelector('[data-reader-progress]');
const smaller = document.querySelector('[data-reader-smaller]');
const larger = document.querySelector('[data-reader-larger]');
const sizes = [1.125, 1.25, 1.375, 1.5, 1.625];
const preferenceKey = 'mariusz-reader-text-size';
let currentSize = 1;
let framePending = false;

function updateProgress() {
  framePending = false;
  if (!content || !progress) return;
  const top = content.getBoundingClientRect().top + window.scrollY;
  const header = document.querySelector('.reader-topbar')?.offsetHeight ?? 0;
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
