// Hex ⇄ ASCII converter
(function () {
  const ui = DevUtils.ui;

  function asciiToHex(str, prefix, spaced) {
    const parts = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 255) throw new Error('Character "' + str[i] + '" (U+' +
        str.codePointAt(i).toString(16).toUpperCase() + ') is outside the 0–255 ASCII/Latin-1 range');
      parts.push((prefix ? '0x' : '') + code.toString(16).toUpperCase().padStart(2, '0'));
    }
    return parts.join(spaced ? ' ' : '');
  }

  function hexToAscii(str) {
    const clean = str.replace(/0x/gi, '').replace(/[\s,_-]+/g, '');
    if (!clean) return '';
    if (!/^[0-9A-Fa-f]+$/.test(clean)) throw new Error('Input contains characters that are not valid hex digits');
    if (clean.length % 2 !== 0) throw new Error('Hex string must have an even number of digits');
    let out = '';
    for (let i = 0; i < clean.length; i += 2) {
      out += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    }
    return out;
  }

  DevUtils.registerTool({
    id: 'hex-ascii',
    name: 'Hex ⇄ ASCII',
    group: 'Encoders / Decoders',
    icon: '0x',
    render(container) {
      let mode = 'toHex';
      const input = ui.textarea('Enter ASCII text or hex bytes here…', { rows: 6 });
      const output = ui.el('div', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtns = {};
      const prefixCb = ui.el('input', { type: 'checkbox' });
      const spacedCb = ui.el('input', { type: 'checkbox', checked: 'checked' });
      spacedCb.checked = true;

      function highlight() {
        for (const m of ['toHex', 'toAscii']) {
          modeBtns[m].className = 'du-btn' + (m === mode ? ' du-btn-primary' : '');
        }
        const enc = mode === 'toHex';
        prefixCb.disabled = !enc;
        spacedCb.disabled = !enc;
      }

      function process() {
        const text = input.value;
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          output.textContent = mode === 'toHex'
            ? asciiToHex(text, prefixCb.checked, spacedCb.checked)
            : hexToAscii(text);
        } catch (e) {
          output.textContent = '';
          status.error(e.message);
        }
      }

      function setMode(m) { mode = m; highlight(); process(); }

      modeBtns.toHex = ui.button('ASCII → Hex', () => setMode('toHex'));
      modeBtns.toAscii = ui.button('Hex → ASCII', () => setMode('toAscii'));
      prefixCb.addEventListener('change', process);
      spacedCb.addEventListener('change', process);
      input.addEventListener('input', process);

      container.appendChild(ui.toolbar([
        modeBtns.toHex, modeBtns.toAscii,
        ui.field('0x prefix', prefixCb),
        ui.field('Space separated', spacedCb),
        ui.copyButton(() => output.textContent)
      ]));
      container.appendChild(input);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Output'));
      container.appendChild(output);
      highlight();
    }
  });
})();
