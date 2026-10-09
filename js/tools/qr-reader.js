// QR Code Reader — decode QR codes from uploaded / pasted / dropped images
(function () {
  const { registerTool, ui } = window.DevUtils;

  registerTool({
    id: 'qr-reader',
    name: 'QR Code Reader',
    group: 'Inspect / Debug',
    icon: '🔎',
    desc: 'Decode a QR code from an image — upload, drag & drop, or paste (⌘V) a screenshot. Fully offline.',
    render(container) {
      const status = ui.status();

      const dropZone = ui.el('div', { class: 'du-card', text: 'Drop an image here, or ' });
      dropZone.style.textAlign = 'center';
      dropZone.style.padding = '28px 14px';
      dropZone.style.cursor = 'pointer';
      const pickBtn = ui.button('Choose image…', () => fileInput.click(), { primary: true });
      dropZone.appendChild(pickBtn);
      const hint = ui.el('div', { class: 'du-field-label', text: 'or paste a screenshot with ⌘V / Ctrl+V' });
      hint.style.marginTop = '8px';
      dropZone.appendChild(hint);

      const fileInput = ui.el('input', { type: 'file', accept: 'image/*', style: 'display:none' });

      const previewWrap = ui.el('div', { class: 'du-card hidden' });
      const canvas = ui.el('canvas');
      canvas.style.maxWidth = '100%';
      previewWrap.appendChild(canvas);

      container.appendChild(dropZone);
      container.appendChild(fileInput);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Decoded content'));
      const resultBox = ui.el('div', { class: 'du-output-box', text: '(no QR code decoded yet)' });
      container.appendChild(resultBox);
      const resultBar = ui.toolbar([]);
      container.appendChild(resultBar);
      container.appendChild(previewWrap);

      function showResult(text) {
        resultBox.textContent = text;
        resultBar.innerHTML = '';
        resultBar.appendChild(ui.copyButton(() => resultBox.textContent));
        if (/^https?:\/\//i.test(text)) {
          const openBtn = ui.button('Open link', () => window.open(text, '_blank', 'noopener'), { primary: true });
          resultBar.appendChild(openBtn);
        }
        const genBtn = ui.button('Re-create in QR Generator', () => {
          const gen = window.DevUtils.getTool('qr-generator');
          location.hash = '#/qr-generator';
          setTimeout(() => { if (gen && typeof gen.setInput === 'function') gen.setInput(text); }, 0);
        });
        resultBar.appendChild(genBtn);
      }

      function decodeImage(img) {
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        previewWrap.classList.remove('hidden');
        if (code && code.data) {
          showResult(code.data);
          status.ok('QR code decoded successfully.');
          // draw the detected location box
          if (code.location) {
            const l = code.location;
            ctx.strokeStyle = '#34c759';
            ctx.lineWidth = Math.max(2, canvas.width / 200);
            ctx.beginPath();
            ctx.moveTo(l.topLeftCorner.x, l.topLeftCorner.y);
            ctx.lineTo(l.topRightCorner.x, l.topRightCorner.y);
            ctx.lineTo(l.bottomRightCorner.x, l.bottomRightCorner.y);
            ctx.lineTo(l.bottomLeftCorner.x, l.bottomLeftCorner.y);
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          resultBox.textContent = '(no QR code found in this image)';
          resultBar.innerHTML = '';
          status.error('No QR code detected — try a sharper, higher-contrast image.');
        }
      }

      function loadBlob(blob) {
        if (!blob || !blob.type.startsWith('image/')) {
          status.error('That does not look like an image.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { decodeImage(img); URL.revokeObjectURL(url); };
        img.onerror = () => { status.error('Could not load this image.'); URL.revokeObjectURL(url); };
        img.src = url;
      }

      fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadBlob(fileInput.files[0]); });
      dropZone.addEventListener('click', (e) => { if (e.target !== pickBtn) fileInput.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
      dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) loadBlob(e.dataTransfer.files[0]);
      });
      // paste works anywhere in the tool pane (container keeps a reference for cleanup-free simplicity)
      container.tabIndex = -1;
      container.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        for (const item of items) {
          if (item.type.startsWith('image/')) { loadBlob(item.getAsFile()); e.preventDefault(); return; }
        }
        status.error('Clipboard has no image — copy a screenshot first.');
      });
      dropZone.addEventListener('paste', (e) => e.stopPropagation());
      container.addEventListener('click', () => container.focus());
    }
  });
})();
