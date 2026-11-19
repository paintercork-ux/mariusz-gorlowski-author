const counter = document.querySelector('[data-curiosity-count]');
const endpoint = document.querySelector('meta[name="curiosity-counter-endpoint"]')?.content;
const storageKey = 'mariusz-curiosity-visit';
let updating = false;

function visitId() {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (/^[0-9a-f-]{36}$/i.test(stored ?? '')) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem(storageKey, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

async function showVisitNumber() {
  if (!counter || !endpoint || updating) return;
  updating = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId: visitId() }),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('The counter is unavailable.');
    const data = await response.json();
    if (!Number.isSafeInteger(data.number) || data.number <= 1000) {
      throw new Error('The counter response is invalid.');
    }
    counter.textContent = new Intl.NumberFormat(document.documentElement.lang).format(data.number);
    counter.closest('.curiosity-count').hidden = false;
  } catch {
    // Keep the author's message available if the counter service cannot be reached.
    counter.closest('.curiosity-count').hidden = true;
  } finally {
    clearTimeout(timeout);
    updating = false;
  }
}

void showVisitNumber();
window.addEventListener('pageshow', event => {
  if (event.persisted) void showVisitNumber();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void showVisitNumber();
});
