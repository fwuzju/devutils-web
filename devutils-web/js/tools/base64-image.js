// Base64 Image — file → base64, base64 → image preview/download
(function () {
  const ui = DevUtils.ui;

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // extract pure base64 + mime from a pasted data URL or raw base64
  function parsePasted(text) {
    const t = (text || '').trim();
    if (!t) return null;
    const m = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(t);
    if (m) return { mime: m[1], b64: m[2].replace(/\s+/g, '') };
    const b64 = t.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(b64) && b64.length % 4 === 0) {
      return { mime: 'image/png', b64 };
    }
    return null;
  }

  DevUtils.registerTool({
    id: 'base64-image',
    name: 'Base64 Image',
    group: 'Encoders / Decoders',
    icon: '🖼',
    render(container) {
      const status = ui.status();

      // ---------- direction 1: file → base64 ----------
      const outArea = ui.textarea('Base64 output will appear here…', { rows: 8, readonly: true });
      const sizeInfo = ui.el('span', { class: 'du-field-label', text: '' });
      const fileInput = ui.el('input', { type: 'file', accept: 'image/*' });
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          outArea.value = String(reader.result || '');
          sizeInfo.textContent = 'File: ' + f.name + ' — ' + formatBytes(f.size) +
            ' → Base64 length: ' + formatBytes(outArea.value.length);
          status.clear();
        };
        reader.onerror = () => status.error('Failed to read file');
        reader.readAsDataURL(f);
      });

      // ---------- direction 2: base64 → image ----------
      const pasteArea = ui.textarea('Paste Base64 string or data:image/...;base64,… URL here…', { rows: 4 });
      const previewBox = ui.el('div', { class: 'du-card' }, [
        ui.el('span', { class: 'du-field-label', text: 'No image yet' })
      ]);
      const downloadBtn = ui.button('Download image', () => {});
      let currentDataUrl = null;
      let currentExt = 'png';
      downloadBtn.addEventListener('click', () => {
        if (!currentDataUrl) return;
        const a = ui.el('a', { href: currentDataUrl, download: 'image.' + currentExt });
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

      function showPreview() {
        const parsed = parsePasted(pasteArea.value);
        previewBox.innerHTML = '';
        if (!pasteArea.value.trim()) {
          previewBox.appendChild(ui.el('span', { class: 'du-field-label', text: 'No image yet' }));
          status.clear();
          currentDataUrl = null;
          return;
        }
        if (!parsed) {
          previewBox.appendChild(ui.el('span', { class: 'du-field-label', text: 'No image yet' }));
          status.error('Not a valid Base64 string or data URL');
          currentDataUrl = null;
          return;
        }
        const dataUrl = 'data:' + parsed.mime + ';base64,' + parsed.b64;
        const img = ui.el('img', { alt: 'preview' });
        img.style.maxWidth = '100%';
        img.style.maxHeight = '320px';
        img.onload = () => {
          status.ok('Decoded ' + formatBytes(Math.floor(parsed.b64.length * 3 / 4)) +
            ' (' + img.naturalWidth + '×' + img.naturalHeight + ')');
          currentDataUrl = dataUrl;
        };
        img.onerror = () => {
          status.error('Base64 decoded but it is not a displayable image');
          currentDataUrl = null;
        };
        img.src = dataUrl;
        currentExt = (parsed.mime.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        previewBox.appendChild(img);
      }
      pasteArea.addEventListener('input', showPreview);

      container.appendChild(ui.sectionTitle('Image file → Base64'));
      container.appendChild(ui.toolbar([
        fileInput,
        ui.copyButton(() => outArea.value)
      ]));
      container.appendChild(outArea);
      container.appendChild(ui.el('div', { class: 'du-field' }, [sizeInfo]));

      container.appendChild(ui.sectionTitle('Base64 → Image'));
      container.appendChild(pasteArea);
      container.appendChild(ui.toolbar([downloadBtn]));
      container.appendChild(status.el);
      container.appendChild(previewBox);
    }
  });
})();
