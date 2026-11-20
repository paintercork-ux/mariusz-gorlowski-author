(() => {
  const trigger = document.querySelector('[data-save-quote]');
  const dialog = document.querySelector('[data-quote-dialog]');
  const preview = document.querySelector('[data-quote-preview]');
  const download = document.querySelector('[data-quote-download]');
  const error = document.querySelector('[data-quote-error]');
  const cardPanel = document.querySelector('[data-quote-card]');
  const choose = document.querySelector('[data-quote-choose]');
  const editor = document.querySelector('[data-quote-editor]');
  const passages = document.querySelector('[data-quote-passages]');
  const excerpt = document.querySelector('[data-quote-excerpt]');
  const count = document.querySelector('[data-quote-count]');
  const editError = document.querySelector('[data-quote-edit-error]');
  const cancel = document.querySelector('[data-quote-cancel]');
  const apply = document.querySelector('[data-quote-apply]');
  if (!trigger || !dialog || !preview || !download) return;
  const suggested = JSON.parse(trigger.dataset.quote);
  const polish = suggested.language === 'pl';
  const article = suggested.article === true;
  const normalize = text => text.replace(/\s+/gu, ' ').trim();
  const essayPassages = [];
  for (const paragraph of document.querySelectorAll('[data-reader-body] > p')) {
    if (paragraph.matches('.v4-essay-signature, .v4-research-label')) break;
    const copy = paragraph.cloneNode(true);
    copy.querySelector('.reader-citations')?.remove();
    const text = normalize(copy.textContent);
    if (text) essayPassages.push(text);
  }
  const essayText = essayPassages.join(' ');
  let current = suggested;
  let objectURL;

  function wrapText(context, text, width) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/u)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function spacedWidth(context, text, spacing) {
    return Array.from(text).reduce((width, letter) => width + context.measureText(letter).width, 0)
      + Math.max(0, Array.from(text).length - 1) * spacing;
  }

  function spacedText(context, text, y, spacing) {
    let x = (1080 - spacedWidth(context, text, spacing)) / 2;
    context.textAlign = 'left';
    for (const letter of text) {
      context.fillText(letter, x, y);
      x += context.measureText(letter).width + spacing;
    }
  }

  function drawCard(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#050505';
    context.fillRect(0, 0, 1080, 1350);
    context.strokeStyle = '#dfbf79';
    context.lineWidth = 2;
    context.strokeRect(24, 24, 1032, 1302);
    context.fillStyle = '#dfbf79';
    context.textBaseline = 'top';

    const title = data.title.toLocaleUpperCase(data.language);
    let titleSize = 28;
    context.font = `${titleSize}px Georgia, 'Times New Roman', serif`;
    while (spacedWidth(context, title, 5) > 930 && titleSize > 16) {
      titleSize -= 1;
      context.font = `${titleSize}px Georgia, 'Times New Roman', serif`;
    }
    spacedText(context, title, 116, 5);

    let size = 96;
    let blocks;
    let height;
    do {
      context.font = `${size}px Georgia, 'Times New Roman', serif`;
      blocks = data.paragraphs.map(text => wrapText(context, text, 900));
      height = blocks.reduce((total, lines) => total + lines.length * size * 1.2, 0)
        + (blocks.length - 1) * 46;
      if (height <= 660 || size <= 36) break;
      size -= 2;
    } while (size >= 36);

    let y = 272 + (660 - height) / 2;
    context.textAlign = 'center';
    for (const lines of blocks) {
      for (const line of lines) {
        context.fillText(line, 540, y);
        y += size * 1.2;
      }
      y += 46;
    }
    context.font = "italic 58px Georgia, 'Times New Roman', serif";
    context.fillText('Mariusz Gorlowski', 540, 1060);
    context.font = "30px Georgia, 'Times New Roman', serif";
    spacedText(context, 'mariuszgorlowski.com', 1224, 2);
    return canvas;
  }

  async function prepareCard(data) {
    await document.fonts.ready;
    const canvas = drawCard(data);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image unavailable');
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(blob);
    preview.src = objectURL;
    preview.alt = `${data.paragraphs.join(' ')} — Mariusz Gorlowski`;
    download.href = objectURL;
    download.download = data.filename;
    current = data;
  }

  function showCard() {
    if (editor) editor.hidden = true;
    if (cardPanel) cardPanel.hidden = false;
    choose?.focus({ preventScroll: true });
  }

  function updateCount() {
    count.textContent = `${normalize(excerpt.value).length} / 500`;
    editError.hidden = true;
    excerpt.removeAttribute('aria-invalid');
  }

  if (choose && editor && cardPanel && passages && excerpt && count && editError && cancel && apply) {
    for (const text of essayPassages) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'quote-passage';
      option.textContent = text;
      option.setAttribute('aria-pressed', 'false');
      option.addEventListener('click', () => {
        excerpt.value = text;
        for (const sibling of passages.children) sibling.setAttribute('aria-pressed', 'false');
        option.setAttribute('aria-pressed', 'true');
        updateCount();
      });
      passages.append(option);
    }
    choose.addEventListener('click', () => {
      excerpt.value = current.paragraphs.join(' ');
      for (const option of passages.children) option.setAttribute('aria-pressed', String(option.textContent === normalize(excerpt.value)));
      updateCount();
      cardPanel.hidden = true;
      editor.hidden = false;
      passages.querySelector('button')?.focus({ preventScroll: true });
    });
    excerpt.addEventListener('input', updateCount);
    cancel.addEventListener('click', showCard);
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const text = normalize(excerpt.value);
      let message;
      if (!text) message = article
        ? (polish ? 'Wybierz fragment artykułu.' : 'Choose a passage from the article.')
        : (polish ? 'Wybierz fragment eseju.' : 'Choose a passage from the essay.');
      else if (text.length > 500) message = polish ? 'Skróć fragment do 500 znaków.' : 'Shorten the passage to 500 characters.';
      else if (!essayText.includes(text)) message = article
        ? (polish ? 'Wybierz fragment z artykułu, zachowując jego oryginalne brzmienie.' : 'Choose a passage from the article, keeping its original wording.')
        : (polish ? 'Wybierz fragment z eseju, zachowując jego oryginalne brzmienie.' : 'Choose a passage from the essay, keeping its original wording.');
      if (message) {
        editError.textContent = message;
        editError.hidden = false;
        excerpt.setAttribute('aria-invalid', 'true');
        excerpt.focus();
        return;
      }
      apply.disabled = true;
      try {
        await prepareCard({ ...suggested, paragraphs: [text] });
        showCard();
      } catch {
        editError.textContent = polish ? 'Nie udało się przygotować grafiki. Spróbuj ponownie.' : 'The image could not be prepared. Please try again.';
        editError.hidden = false;
      } finally {
        apply.disabled = false;
      }
    });
  }

  trigger.disabled = false;
  trigger.addEventListener('click', async () => {
    trigger.disabled = true;
    if (error) error.hidden = true;
    try {
      await prepareCard(current);
      showCard();
      if (!dialog.open) dialog.showModal();
    } catch {
      if (error) error.hidden = false;
    } finally {
      trigger.disabled = false;
    }
  });
  window.addEventListener('pagehide', event => {
    if (objectURL && !event.persisted) URL.revokeObjectURL(objectURL);
  });
})();
