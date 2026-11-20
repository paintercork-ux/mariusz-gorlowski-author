const pins = [...document.querySelectorAll('[data-continent]')];
const cards = [...document.querySelectorAll('[data-atlas-card]')];
const hint = document.querySelector('[data-atlas-hint]');
const languages = [...document.querySelectorAll('[data-atlas-language]')];

function selectContinent() {
  const key = location.hash.slice(1);
  const selected = pins.some(pin => pin.dataset.continent === key);
  hint.hidden = selected;
  for (const pin of pins) {
    if (pin.dataset.continent === key) pin.setAttribute('aria-current', 'location');
    else pin.removeAttribute('aria-current');
  }
  for (const card of cards) card.hidden = card.dataset.atlasCard !== key;
  for (const link of languages) {
    link.href = link.getAttribute('href').split('#')[0] + (selected ? location.hash : '');
  }
}

for (const pin of pins) {
  pin.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    location.hash = pin.dataset.continent;
  });
}
window.addEventListener('hashchange', selectContinent);
selectContinent();
