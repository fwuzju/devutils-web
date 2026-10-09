// QR Code Generator — render text/URL as a QR code on canvas, downloadable as PNG
(function () {
  const { registerTool, ui } = window.DevUtils;

  registerTool({
    id: 'qr-generator',
    name: 'QR Code Generator',
    group: 'Generators',
    icon: '▦',
    desc: 'Encode text or a URL as a QR code. Everything stays local.',
    detect(text) {
      return /^https?:\/\//i.test(text.trim()) ? 0.3 : 0;
    },
    render(container) {
      const input = ui.textarea('Text or URL to encode…', { rows: 4 });
      const ecSel = ui.el('select', {}, ['L', 'M', 'Q', 'H'].map(l =>
        ui.el('option', { value: l, text: l })));
      ecSel.value = 'M';
      const sizeSlider = ui.el('input', { type: 'range', min: '2', max: '12', value: '6' });
      const sizeLabel = ui.el('span', { class: 'du-field-label', text: '6' });
      const status = ui.status();
      const canvas = ui.el('canvas');
      const card = ui.el('div', { class: 'du-card' }, [canvas]);
      let lastOk = false;

      function draw() {
        const text = input.value;
        if (!text) {
          lastOk = false;
          canvas.width = 0;
          canvas.height = 0;
          status.clear();
          return;
        }
        let qr;
        try {
          if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
            qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
          }
          qr = qrcode(0, ecSel.value); // 0 = auto type number
          qr.addData(text);
          qr.make();
        } catch (e) {
          lastOk = false;
          canvas.width = 0;
          canvas.height = 0;
          status.error('Could not encode (text too long for a QR code?): ' + e.message);
          return;
        }
        const cell = parseInt(sizeSlider.value, 10) || 6;
        const margin = 4;
        const count = qr.getModuleCount();
        const dim = (count + margin * 2) * cell;
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dim, dim);
        ctx.fillStyle = '#000000';
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
          }
        }
        lastOk = true;
        status.ok(count + '×' + count + ' modules, EC level ' + ecSel.value);
      }

      input.addEventListener('input', draw);
      ecSel.addEventListener('change', draw);
      sizeSlider.addEventListener('input', () => { sizeLabel.textContent = sizeSlider.value; draw(); });

      const downloadBtn = ui.button('Download PNG', () => {
        if (!lastOk) { status.error('Nothing to download — enter some text first.'); return; }
        const a = ui.el('a', { href: canvas.toDataURL('image/png'), download: 'qrcode.png' });
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

      container.appendChild(input);
      container.appendChild(ui.toolbar([
        ui.field('Error correction', ecSel),
        ui.field('Cell size', sizeSlider),
        sizeLabel,
        downloadBtn,
        ui.copyButton(() => input.value)
      ]));
      container.appendChild(status.el);
      container.appendChild(card);

      this._qrInput = input;
      this._qrDraw = draw;
      draw();
    },
    setInput(text) {
      if (this._qrInput) {
        this._qrInput.value = text;
        this._qrDraw();
      }
    }
  });
})();
