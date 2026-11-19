(() => {
  const trigger = document.querySelector('[data-save-quote]');
  const dialog = document.querySelector('[data-quote-dialog]');
  const preview = document.querySelector('[data-quote-preview]');
  const download = document.querySelector('[data-quote-download]');
  const error = document.querySelector('[data-quote-error]');
  if (!trigger || !dialog || !preview || !download) return;
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
      if (height <= 660 || size <= 54) break;
      size -= 2;
    } while (size >= 54);

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

  trigger.disabled = false;
  trigger.addEventListener('click', async () => {
    trigger.disabled = true;
    if (error) error.hidden = true;
    try {
      const data = JSON.parse(trigger.dataset.quote);
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
      if (!dialog.open) dialog.showModal();
    } catch {
      if (error) error.hidden = false;
    } finally {
      trigger.disabled = false;
    }
  });
  window.addEventListener('pagehide', () => {
    if (objectURL) URL.revokeObjectURL(objectURL);
  });
})();
