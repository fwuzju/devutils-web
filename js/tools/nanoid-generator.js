// Nano ID Generator — small, URL-friendly random IDs (nanoid-style)
(function () {
  const { registerTool, ui } = window.DevUtils;

  const ALPHABETS = {
    'url-safe': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
    'numbers': '0123456789',
    'lowercase': 'abcdefghijklmnopqrstuvwxyz',
    'uppercase': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'hex': '0123456789abcdef',
    'custom': null
  };

  // nanoid's unbiased sampling: mask + step sized to the alphabet
  function nanoID(size, alphabet) {
    const len = alphabet.length;
    const mask = (2 << (31 - Math.clz32((len - 1) | 1))) - 1;
    const step = Math.ceil((1.6 * mask * size) / len);
    let id = '';
    while (id.length < size) {
      const bytes = crypto.getRandomValues(new Uint8Array(step));
      for (let i = 0; i < step && id.length < size; i++) {
        const b = bytes[i] & mask;
        if (b < len) id += alphabet[b];
      }
    }
    return id;
  }

  registerTool({
    id: 'nanoid-generator',
    name: 'Nano ID Generator',
    group: 'Generators',
    icon: '⚡',
    desc: 'Generate compact, URL-friendly unique IDs with a custom alphabet and length.',
    render(container) {
      const lenInput = ui.el('input', { type: 'number', min: '1', max: '512', value: '21' });
      const countInput = ui.el('input', { type: 'number', min: '1', max: '100', value: '5' });
      const alphaSel = ui.el('select', {}, Object.keys(ALPHABETS).map(k =>
        ui.el('option', { value: k, text: k })));
      const customInput = ui.el('input', { type: 'text', placeholder: 'Custom alphabet', style: 'display:none' });
      const status = ui.status();
      const outBox = ui.el('div', { class: 'du-output-box' });
      let current = [];

      function alphabet() {
        if (alphaSel.value === 'custom') return customInput.value;
        return ALPHABETS[alphaSel.value];
      }

      function generate() {
        const alpha = alphabet();
        if (!alpha || alpha.length < 2) {
          current = [];
          outBox.textContent = '';
          status.error('Alphabet must contain at least 2 characters.');
          return;
        }
        let size = parseInt(lenInput.value, 10);
        if (isNaN(size) || size < 1) size = 21;
        let n = parseInt(countInput.value, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > 100) n = 100;
        countInput.value = String(n);
        current = [];
        for (let i = 0; i < n; i++) current.push(nanoID(size, alpha));
        outBox.innerHTML = '';
        current.forEach(id => {
          const row = ui.el('div', { text: id, title: 'Click to copy' });
          row.style.cursor = 'pointer';
          row.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(id); } catch (e) { /* ignore */ }
            status.ok('Copied: ' + id);
          });
          outBox.appendChild(row);
        });
        status.clear();
      }

      alphaSel.addEventListener('change', () => {
        customInput.style.display = alphaSel.value === 'custom' ? '' : 'none';
        generate();
      });
      [lenInput, countInput, customInput].forEach(el => el.addEventListener('input', generate));

      container.appendChild(ui.toolbar([
        ui.field('Length', lenInput),
        ui.field('Alphabet', alphaSel),
        customInput,
        ui.field('Count', countInput),
        ui.button('Generate', generate, { primary: true }),
        ui.copyButton(() => current.join('\n'))
      ]));
      container.appendChild(status.el);
      container.appendChild(outBox);
      generate();
    }
  });
})();
