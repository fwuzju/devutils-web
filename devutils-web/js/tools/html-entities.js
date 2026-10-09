// HTML Entities Encode/Decode
(function () {
  const ui = DevUtils.ui;

  const BASIC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function encodeEntities(str, encodeNonAscii) {
    let out = '';
    for (const ch of str) {
      if (BASIC_MAP[ch]) {
        out += BASIC_MAP[ch];
      } else if (encodeNonAscii && ch.codePointAt(0) > 127) {
        out += '&#x' + ch.codePointAt(0).toString(16).toUpperCase() + ';';
      } else {
        out += ch;
      }
    }
    return out;
  }

  function decodeEntities(str) {
    const ta = document.createElement('textarea');
    ta.innerHTML = str;
    return ta.value;
  }

  DevUtils.registerTool({
    id: 'html-entities',
    name: 'HTML Entities',
    group: 'Encoders / Decoders',
    icon: '&',
    render(container) {
      let mode = 'encode';
      const input = ui.textarea('Enter text or HTML entities here…', { rows: 6 });
      const output = ui.el('div', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtns = {};
      const nonAsciiCb = ui.el('input', { type: 'checkbox' });

      function highlight() {
        for (const m of ['encode', 'decode']) {
          modeBtns[m].className = 'du-btn' + (m === mode ? ' du-btn-primary' : '');
        }
        nonAsciiCb.disabled = mode !== 'encode';
      }

      function process() {
        const text = input.value;
        status.clear();
        if (!text) { output.textContent = ''; return; }
        output.textContent = mode === 'encode'
          ? encodeEntities(text, nonAsciiCb.checked)
          : decodeEntities(text);
      }

      function setMode(m) { mode = m; highlight(); process(); }

      modeBtns.encode = ui.button('Encode', () => setMode('encode'));
      modeBtns.decode = ui.button('Decode', () => setMode('decode'));
      nonAsciiCb.addEventListener('change', process);
      input.addEventListener('input', process);

      container.appendChild(ui.toolbar([
        modeBtns.encode, modeBtns.decode,
        ui.field('Encode non-ASCII as &#x…;', nonAsciiCb),
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
