const isPolish = document.documentElement.lang === 'pl';
const ui = isPolish ? {
  title: 'Udostępnij stronę', close: 'Zamknij',
  intro: 'Skopiuj link i prześlij go wybranej osobie lub udostępnij w swoim serwisie społecznościowym.',
  link: 'Link do strony', copy: 'Kopiuj link', copied: 'Link skopiowany.',
  manual: 'Link jest zaznaczony. Wybierz „Kopiuj” z menu urządzenia.',
  text: 'Mariusz Gorlowski — autor, eseista i twórca QR FINDER.',
} : {
  title: 'Share this website', close: 'Close',
  intro: 'Copy the link to send it to someone or share it on social media.',
  link: 'Website link', copy: 'Copy link', copied: 'Link copied.',
  manual: 'The link is selected. Choose “Copy” from your device’s menu.',
  text: 'Mariusz Gorlowski — writer, essayist and founder of QR FINDER.',
};
const shareData = {
  title: 'Mariusz Gorlowski', text: ui.text,
  url: 'https://mariuszgorlowski.com' + (isPolish ? '/pl/' : '/'),
};

let shareDialog;
function showLinkDialog() {
  if (!shareDialog) {
    shareDialog = document.createElement('dialog');
    shareDialog.className = 'site-share-dialog';
    shareDialog.setAttribute('aria-labelledby', 'site-share-title');
    shareDialog.setAttribute('aria-describedby', 'site-share-intro');
    shareDialog.innerHTML = `<div class="site-share-heading"><h2 id="site-share-title"></h2><button type="button" class="site-share-close" autofocus>×</button></div><p id="site-share-intro"></p><input type="url" readonly><button type="button" class="site-share-copy"></button><p class="site-share-status" role="status" aria-live="polite"></p>`;
    shareDialog.querySelector('h2').textContent = ui.title;
    const close = shareDialog.querySelector('.site-share-close');
    close.setAttribute('aria-label', ui.close);
    close.addEventListener('click', () => shareDialog.close());
    shareDialog.querySelector('#site-share-intro').textContent = ui.intro;
    const input = shareDialog.querySelector('input');
    input.value = shareData.url;
    input.setAttribute('aria-label', ui.link);
    input.addEventListener('click', () => input.select());
    const copy = shareDialog.querySelector('.site-share-copy');
    const status = shareDialog.querySelector('.site-share-status');
    copy.textContent = ui.copy;
    copy.addEventListener('click', async () => {
      copy.disabled = true;
      try {
        await navigator.clipboard.writeText(shareData.url);
        status.textContent = ui.copied;
      } catch {
        input.focus();
        input.select();
        status.textContent = ui.manual;
      } finally {
        copy.disabled = false;
      }
    });
    shareDialog.addEventListener('click', event => {
      if (event.target !== shareDialog) return;
      const rect = shareDialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) shareDialog.close();
    });
    document.body.append(shareDialog);
  }
  shareDialog.querySelector('.site-share-status').textContent = '';
  if (!shareDialog.open) shareDialog.showModal();
}

for (const button of document.querySelectorAll('[data-share-site]')) {
  let sharing = false;
  button.addEventListener('click', async () => {
    if (sharing) return;
    sharing = true;
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      showLinkDialog();
    } finally {
      sharing = false;
    }
  });
}
