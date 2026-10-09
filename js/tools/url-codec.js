// URL Encode/Decode
(function () {
  const ui = DevUtils.ui;

  function encodeAll(str) {
    const bytes = new TextEncoder().encode(str);
    let out = '';
    for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
    return out;
  }

  function safeDecode(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      // lenient fallback: decode only well-formed %XX sequences, replace broken ones
      return str.replace(/%[0-9A-Fa-f]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(1), 16)));
    }
  }

  DevUtils.registerTool({
    id: 'url-codec',
    name: 'URL Encode/Decode',
    group: 'Encoders / Decoders',
    icon: '%',
    detect(text) {
      return /%[0-9A-Fa-f]{2}/.test(text || '') ? 0.5 : 0;
    },
    render(container) {
      let mode = 'encode';
      const input = ui.textarea('Enter text or URL-encoded string here…', { rows: 6 });
      this._input = input;
      const output = ui.el('div', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtns = {};
      const allCb = ui.el('input', { type: 'checkbox' });

      function highlight() {
        for (const m of ['encode', 'decode']) {
          modeBtns[m].className = 'du-btn' + (m === mode ? ' du-btn-primary' : '');
        }
        allCb.disabled = mode !== 'encode';
      }

      function process() {
        const text = input.value;
        status.clear();
        if (!text) { output.textContent = ''; return; }
        if (mode === 'encode') {
          output.textContent = allCb.checked ? encodeAll(text) : encodeURIComponent(text);
        } else {
          const decoded = safeDecode(text);
          output.textContent = decoded;
          try {
            decodeURIComponent(text);
          } catch (e) {
            status.ok('Decoded leniently (input contained malformed escape sequences)');
          }
        }
      }

      function setMode(m) { mode = m; highlight(); process(); }

      modeBtns.encode = ui.button('Encode', () => setMode('encode'));
      modeBtns.decode = ui.button('Decode', () => setMode('decode'));
      allCb.addEventListener('change', process);
      input.addEventListener('input', process);

      container.appendChild(ui.toolbar([
        modeBtns.encode, modeBtns.decode,
        ui.field('Encode all characters', allCb),
        ui.copyButton(() => output.textContent)
      ]));
      container.appendChild(input);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Output'));
      container.appendChild(output);
      highlight();
    },
    setInput(text) {
      if (this._input) {
        this._input.value = text;
        this._input.dispatchEvent(new Event('input'));
      }
    }
  });
})();
