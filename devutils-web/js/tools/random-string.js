// Random String Generator — secure random strings with charset & grouping options
(function () {
  const { registerTool, ui } = window.DevUtils;

  const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?/'
  };

  function randChar(alphabet) {
    const len = alphabet.length;
    const limit = Math.floor(256 / len) * len; // rejection sampling to avoid modulo bias
    const buf = new Uint8Array(1);
    for (;;) {
      crypto.getRandomValues(buf);
      if (buf[0] < limit) return alphabet[buf[0] % len];
    }
  }

  function randString(len, alphabet) {
    let s = '';
    for (let i = 0; i < len; i++) s += randChar(alphabet);
    return s;
  }

  function group(s, n) {
    if (n <= 0) return s;
    const parts = [];
    for (let i = 0; i < s.length; i += n) parts.push(s.slice(i, i + n));
    return parts.join('-');
  }

  registerTool({
    id: 'random-string',
    name: 'Random String Generator',
    group: 'Generators',
    icon: '🎲',
    desc: 'Generate cryptographically secure random strings: passwords, tokens, license keys.',
    render(container) {
      const cbs = {};
      ['upper', 'lower', 'digits', 'symbols'].forEach(k => {
        cbs[k] = ui.el('input', { type: 'checkbox' });
      });
      cbs.upper.checked = true;
      cbs.lower.checked = true;
      cbs.digits.checked = true;

      const lenInput = ui.el('input', { type: 'number', min: '1', max: '512', value: '16' });
      const countInput = ui.el('input', { type: 'number', min: '1', max: '100', value: '5' });
      const groupInput = ui.el('input', { type: 'number', min: '0', max: '64', value: '0' });
      const presetSel = ui.el('select', {}, ['custom', 'License Key', 'Token', 'Password'].map(p =>
        ui.el('option', { value: p, text: p })));
      const status = ui.status();
      const outBox = ui.el('div', { class: 'du-output-box' });
      let current = [];

      const PRESETS = {
        'License Key': { sets: ['upper', 'digits'], len: 16, count: 5, group: 4 },
        'Token': { sets: ['lower', 'digits'], len: 32, count: 1, group: 0 },
        'Password': { sets: ['upper', 'lower', 'digits', 'symbols'], len: 16, count: 1, group: 0 }
      };

      function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.keys(cbs).forEach(k => { cbs[k].checked = p.sets.includes(k); });
        lenInput.value = String(p.len);
        countInput.value = String(p.count);
        groupInput.value = String(p.group);
      }

      function generate() {
        const alphabet = Object.keys(cbs).filter(k => cbs[k].checked).map(k => SETS[k]).join('');
        if (!alphabet) {
          current = [];
          outBox.textContent = '';
          status.error('Select at least one character set.');
          return;
        }
        let len = parseInt(lenInput.value, 10);
        if (isNaN(len) || len < 1) len = 16;
        if (len > 512) len = 512;
        let n = parseInt(countInput.value, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > 100) n = 100;
        let g = parseInt(groupInput.value, 10);
        if (isNaN(g) || g < 0) g = 0;
        lenInput.value = String(len);
        countInput.value = String(n);
        groupInput.value = String(g);
        current = [];
        for (let i = 0; i < n; i++) current.push(group(randString(len, alphabet), g));
        outBox.innerHTML = '';
        current.forEach(s => {
          const row = ui.el('div', { text: s, title: 'Click to copy' });
          row.style.cursor = 'pointer';
          row.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(s); } catch (e) { /* ignore */ }
            status.ok('Copied: ' + s);
          });
          outBox.appendChild(row);
        });
        status.clear();
      }

      presetSel.addEventListener('change', () => { applyPreset(presetSel.value); generate(); });
      const markCustom = () => { presetSel.value = 'custom'; generate(); };
      Object.keys(cbs).forEach(k => cbs[k].addEventListener('change', markCustom));
      [lenInput, countInput, groupInput].forEach(el => el.addEventListener('input', markCustom));

      container.appendChild(ui.toolbar([
        ui.field('Preset', presetSel),
        ui.field('Length', lenInput),
        ui.field('Count', countInput),
        ui.field('Group every', groupInput)
      ]));
      container.appendChild(ui.toolbar([
        ui.field('A-Z', cbs.upper),
        ui.field('a-z', cbs.lower),
        ui.field('0-9', cbs.digits),
        ui.field('Symbols', cbs.symbols),
        ui.button('Generate', generate, { primary: true }),
        ui.copyButton(() => current.join('\n'))
      ]));
      container.appendChild(status.el);
      container.appendChild(outBox);
      generate();
    }
  });
})();
