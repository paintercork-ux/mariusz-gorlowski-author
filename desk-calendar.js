const calendar = document.querySelector('#desk-calendar');
const trigger = document.querySelector('[data-calendar-open]');

if (trigger && typeof calendar?.showModal === 'function') {
  bindCalendar(calendar, trigger);
}

function bindCalendar(dialog, opener) {
  const menu = 'menu';
  const menuHeading = dialog.querySelector('#desk-calendar-title');
  const scrollPane = dialog.querySelector('[data-calendar-scroll]');
  const views = Array.from(dialog.querySelectorAll('[data-calendar-view]'));
  const tiles = Array.from(dialog.querySelectorAll('[data-calendar-select]'));
  const back = dialog.querySelector('[data-calendar-back]');
  const close = dialog.querySelector('[data-calendar-close]');
  let returning = false;

  function render() {
    returning = false;
    for (const picker of dialog.querySelectorAll('[data-quote-dialog][open]')) picker.close();
    const current = history.state?.deskCalendar;
    const selected = views.find(view => view.dataset.calendarView === current);
    if (!selected) {
      if (dialog.open) dialog.close();
      return;
    }

    const previous = dialog.dataset.current;
    const reading = current !== menu;
    const heading = reading ? selected.querySelector('h2') : menuHeading;
    const previousTile = tiles.find(tile => tile.dataset.calendarSelect === previous);

    for (const view of views) view.hidden = view !== selected;
    dialog.dataset.current = current;
    dialog.setAttribute('aria-labelledby', heading.id);
    menuHeading.hidden = reading;
    back.hidden = !reading;

    if (!dialog.open) dialog.showModal();
    scrollPane.scrollTop = 0;
    const focusTarget = !reading && previousTile ? previousTile : heading;
    focusTarget.focus({ preventScroll: true });
  }

  function openView(view) {
    // Keep one history entry for the calendar and one for the open page.
    history.pushState({ ...history.state, deskCalendar: view }, '');
    render();
  }

  function returnTo(steps) {
    if (returning || !dialog.open) return;
    returning = true;
    history.go(-steps);
  }

  opener.addEventListener('click', () => openView(menu));
  for (const tile of tiles) {
    tile.addEventListener('click', () => openView(tile.dataset.calendarSelect));
  }
  back.addEventListener('click', () => returnTo(1));
  close.addEventListener('click', () => returnTo(dialog.dataset.current === menu ? 1 : 2));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    returnTo(dialog.dataset.current === menu ? 1 : 2);
  });
  dialog.addEventListener('close', () => {
    delete dialog.dataset.current;
    opener.focus({ preventScroll: true });
  });
  window.addEventListener('popstate', render);
  opener.hidden = false;
  render();
}
