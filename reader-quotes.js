function bindQuoteReader(root) {
  const trigger = root.querySelector('[data-save-quote]');
  const dialog = root.querySelector('[data-quote-dialog]');
  const preview = root.querySelector('[data-quote-preview]');
  const download = root.querySelector('[data-quote-download]');
  const error = root.querySelector('[data-quote-error]');
  const cardPanel = root.querySelector('[data-quote-card]');
  const choose = root.querySelector('[data-quote-choose]');
  const editor = root.querySelector('[data-quote-editor]');
  const passages = root.querySelector('[data-quote-passages]');
  const excerpt = root.querySelector('[data-quote-excerpt]');
  const count = root.querySelector('[data-quote-count]');
  const editError = root.querySelector('[data-quote-edit-error]');
  const cancel = root.querySelector('[data-quote-cancel]');
  const apply = root.querySelector('[data-quote-apply]');
  const copyStatus = root.querySelector('[data-quote-copy-status]');
  const deviceSave = root.querySelector('[data-quote-device-save]');
  const saveHelp = root.querySelector('[data-quote-save-help]');
  if (!trigger || !dialog || !preview || !download) return;
  const suggested = JSON.parse(trigger.dataset.quote);
  const polish = suggested.language === 'pl';
  const article = suggested.article === true;
  const calendar = suggested.calendar === true;
  const preparedCards = new Map(Object.entries(suggested.prepared_cards ?? {}));
  const normalize = text => text.replace(/\s+/gu, ' ').trim();
  const essayPassages = [];
  for (const paragraph of root.querySelectorAll('[data-reader-body] > p')) {
    if (paragraph.matches('.v4-essay-signature, .v4-research-label')) break;
    const copy = paragraph.cloneNode(true);
    copy.querySelector('.reader-citations')?.remove();
    const text = normalize(copy.textContent);
    if (!text) continue;
    if (calendar && paragraph.matches('.calendar-final') && essayPassages.length) {
      essayPassages[essayPassages.length - 1] += ` ${text}`;
    } else {
      essayPassages.push(text);
    }
  }
  const essayText = essayPassages.join(' ');
  let current = suggested;
  let objectURL;
  let imageFile;

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
    const preparedFilename = preparedCards.get(data.paragraphs[0]);
    const filename = preparedFilename ?? data.filename;
    let file;
    let imageURL;
    if (preparedFilename) {
      imageURL = `/assets/calendar-quotes/${preparedFilename}`;
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = undefined;
    } else {
      if (!calendar) await document.fonts.ready;
      const canvas = drawCard(data);
      let blob;
      if (calendar) {
        // Use system fonts and encode during the click for shorter custom passages.
        const png = canvas.toDataURL('image/png');
        const pngPrefix = 'data:image/png;base64,';
        if (!png.startsWith(pngPrefix)) throw new Error('Image unavailable');
        const bytes = Uint8Array.from(atob(png.slice(pngPrefix.length)), char => char.charCodeAt(0));
        file = new File([bytes], filename, { type: 'image/png' });
        blob = file;
      } else {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Image unavailable');
      }
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = URL.createObjectURL(blob);
      imageURL = objectURL;
    }
    preview.src = imageURL;
    preview.alt = `${data.paragraphs.join(' ')} — Mariusz Gorlowski`;
    download.href = imageURL;
    download.download = filename;
    if (deviceSave && saveHelp) {
      imageFile = undefined;
      if (file && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        try {
          if (navigator.canShare({ files: [file] })) imageFile = file;
        } catch {
          // Direct PNG download remains available without system file sharing.
        }
      }
      deviceSave.hidden = !imageFile;
      saveHelp.hidden = true;
    }
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
    if (copyStatus) copyStatus.textContent = '';
  }

  function showEditor(text) {
    excerpt.value = text;
    for (const option of passages.children) option.setAttribute('aria-pressed', String(option.textContent === normalize(text)));
    updateCount();
    cardPanel.hidden = true;
    editor.hidden = false;
  }

  function reportPassageError(message) {
    editError.textContent = message;
    editError.hidden = false;
    excerpt.setAttribute('aria-invalid', 'true');
    excerpt.focus();
  }

  async function copyQuote(text) {
    const normalized = normalize(text);
    copyStatus.textContent = '';
    if (!normalized || !essayText.includes(normalized)) {
      reportPassageError(polish ? 'Wybierz fragment tej kartki, zachowując jego brzmienie.' : 'Choose a passage from this page, keeping its original wording.');
      return;
    }

    const previousValue = excerpt.value;
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // The browser may restrict clipboard access when the preview is embedded.
      }
    }
    if (!dialog.open) return;

    if (!copied) {
      if (editor.hidden) showEditor(text);
      else if (excerpt.value !== previousValue) return;
      const from = excerpt.value.indexOf(text);
      excerpt.focus({ preventScroll: true });
      excerpt.setSelectionRange(from, from + text.length);
      try {
        copied = document.execCommand('copy');
      } catch {
        // Keep the selected text available for the device's native Copy action.
      }
    }
    copyStatus.textContent = copied ? copyStatus.dataset.copied : copyStatus.dataset.manual;
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
      showEditor(current.paragraphs.join(' '));
      passages.querySelector('button')?.focus({ preventScroll: true });
    });
    excerpt.addEventListener('input', updateCount);
    cancel.addEventListener('click', () => {
      if (calendar) dialog.close();
      else showCard();
    });
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const text = normalize(excerpt.value);
      let message;
      if (!text) message = article
        ? (polish ? 'Wybierz fragment artykułu.' : 'Choose a passage from the article.')
        : calendar ? (polish ? 'Wybierz fragment tej kartki.' : 'Choose a passage from this page.')
          : (polish ? 'Wybierz fragment eseju.' : 'Choose a passage from the essay.');
      else if (text.length > 500) message = polish ? 'Skróć fragment do 500 znaków.' : 'Shorten the passage to 500 characters.';
      else if (!essayText.includes(text)) message = article
        ? (polish ? 'Wybierz fragment z artykułu, zachowując jego oryginalne brzmienie.' : 'Choose a passage from the article, keeping its original wording.')
        : calendar ? (polish ? 'Wybierz fragment tej kartki, zachowując jego brzmienie.' : 'Choose a passage from this page, keeping its original wording.')
          : (polish ? 'Wybierz fragment z eseju, zachowując jego oryginalne brzmienie.' : 'Choose a passage from the essay, keeping its original wording.');
      if (message) {
        reportPassageError(message);
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

  if (copyStatus) {
    cardPanel.querySelector('[data-copy-quote]').addEventListener('click', () => copyQuote(current.paragraphs.join('\n\n')));
    editor.querySelector('[data-copy-quote]').addEventListener('click', () => {
      const { value, selectionStart, selectionEnd } = excerpt;
      const text = selectionEnd > selectionStart ? value.slice(selectionStart, selectionEnd) : value;
      copyQuote(text.trim());
    });
  }

  if (deviceSave && saveHelp) {
    download.addEventListener('click', () => {
      if (navigator.maxTouchPoints > 0) saveHelp.hidden = false;
    });
    deviceSave.addEventListener('click', async () => {
      if (!imageFile) return;
      try {
        await navigator.share({ files: [imageFile] });
      } catch (error) {
        if (error.name !== 'AbortError') saveHelp.hidden = false;
      }
    });
  }

  trigger.disabled = false;
  trigger.addEventListener('click', async () => {
    if (calendar) {
      if (dialog.open) return;
      showEditor(excerpt.value);
      excerpt.setSelectionRange(0, 0);
      dialog.showModal();
      passages.querySelector('button')?.focus({ preventScroll: true });
      return;
    }

    trigger.disabled = true;
    if (error) error.hidden = true;
    if (copyStatus) copyStatus.textContent = '';
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
}

const quoteReaders = document.querySelectorAll('[data-quote-reader]');
for (const reader of quoteReaders.length ? quoteReaders : [document]) bindQuoteReader(reader);
