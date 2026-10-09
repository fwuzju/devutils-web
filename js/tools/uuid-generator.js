// UUID Generator — random v4 UUIDs with formatting options
(function () {
  const { registerTool, ui } = window.DevUtils;

  function genUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  registerTool({
    id: 'uuid-generator',
    name: 'UUID Generator',
    group: 'Generators',
    icon: '🆔',
    desc: 'Generate random RFC 4122 version 4 UUIDs.',
    render(container) {
      const countInput = ui.el('input', { type: 'number', min: '1', max: '100', value: '5' });
      const upperCb = ui.el('input', { type: 'checkbox' });
      const noHyphenCb = ui.el('input', { type: 'checkbox' });
      const status = ui.status();
      const outBox = ui.el('div', { class: 'du-output-box' });
      let current = [];

      function generate() {
        let n = parseInt(countInput.value, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > 100) n = 100;
        countInput.value = String(n);
        current = [];
        for (let i = 0; i < n; i++) {
          let id = genUUID();
          if (noHyphenCb.checked) id = id.replace(/-/g, '');
          if (upperCb.checked) id = id.toUpperCase();
          current.push(id);
        }
        outBox.innerHTML = '';
        current.forEach(id => {
          const row = ui.el('div', { text: id, title: 'Click to copy' });
          row.style.cursor = 'pointer';
          row.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(id); } catch (e) { /* clipboard may be unavailable on file:// */ }
            status.ok('Copied: ' + id);
          });
          outBox.appendChild(row);
        });
        status.clear();
      }

      [countInput, upperCb, noHyphenCb].forEach(el => el.addEventListener('input', generate));

      container.appendChild(ui.toolbar([
        ui.field('Count', countInput),
        ui.field('Uppercase', upperCb),
        ui.field('No hyphens', noHyphenCb),
        ui.button('Generate', generate, { primary: true }),
        ui.copyButton(() => current.join('\n'))
      ]));
      container.appendChild(status.el);
      container.appendChild(outBox);
      generate();
    }
  });
})();
