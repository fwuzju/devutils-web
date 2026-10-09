// Number Base Converter — binary / octal / decimal / hexadecimal
(function () {
  const ui = DevUtils.ui;
  const BASES = [2, 8, 10, 16];
  const NAMES = { 2: 'Binary', 8: 'Octal', 10: 'Decimal', 16: 'Hexadecimal' };

  function groupBin(s) {
    const neg = s.startsWith('-');
    let body = neg ? s.slice(1) : s;
    body = body.replace(/(.{4})(?=.)/g, '$1 ');
    return (neg ? '-' : '') + body;
  }

  function parse(input, base) {
    let t = String(input).trim().replace(/[_,\s]/g, '');
    if (!t) return null;
    let neg = false;
    if (t.startsWith('-') || t.startsWith('+')) { neg = t[0] === '-'; t = t.slice(1); }
    if (!t) return null;
    let b = base;
    if (base === 16 && /^0x/i.test(t)) t = t.slice(2);
    if (base === 8 && /^0o/i.test(t)) t = t.slice(2);
    if (base === 2 && /^0b/i.test(t)) t = t.slice(2);
    if (!t) return null;
    const patterns = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-fA-F]+$/ };
    if (!patterns[b].test(t)) {
      throw new Error('"' + t + '" is not a valid ' + NAMES[b] + ' number.');
    }
    let v;
    try {
      v = BigInt((b === 10 ? '' : '0' + { 2: 'b', 8: 'o', 16: 'x' }[b]) + t);
    } catch (e) {
      const n = parseInt(t, b);
      if (isNaN(n)) throw new Error('Could not parse input.');
      v = BigInt(n);
    }
    return neg ? -v : v;
  }

  function format(v, base) {
    if (base === 2) return groupBin(v.toString(2));
    if (base === 16) return (v < 0n ? '-0x' : '0x') + (v < 0n ? -v : v).toString(16).toUpperCase();
    return v.toString(base);
  }

  DevUtils.registerTool({
    id: 'number-base',
    name: 'Number Base Converter',
    group: 'Converters',
    icon: '🔢',

    detect(text) {
      const t = String(text).trim();
      if (/^0x[0-9a-fA-F]+$/.test(t) || /^[01]+$/.test(t)) return 0.4;
      return 0;
    },

    setInput(text) { this._setInput(String(text).trim()); },

    render(container) {
      const status = ui.status();
      const input = ui.textarea('Enter a number…', { rows: 1 });
      const select = ui.el('select', { class: 'du-input' },
        BASES.map(b => ui.el('option', { value: String(b), text: NAMES[b] + ' (' + b + ')' }))
      );
      select.value = '10';

      const kv = ui.el('dl', { class: 'du-kv' });
      const rows = {};
      BASES.forEach(b => {
        const dd = ui.el('dd');
        rows[b] = dd;
        kv.appendChild(ui.el('dt', { text: NAMES[b] }));
        kv.appendChild(dd);
      });

      function convert() {
        BASES.forEach(b => { rows[b].textContent = ''; });
        if (!input.value.trim()) { status.clear(); return; }
        let v;
        try {
          v = parse(input.value, Number(select.value));
        } catch (e) {
          status.error(e.message);
          return;
        }
        if (v === null) { status.clear(); return; }
        status.clear();
        BASES.forEach(b => { rows[b].textContent = format(v, b); });
      }
      input.addEventListener('input', convert);
      select.addEventListener('change', convert);

      container.appendChild(ui.field('Input base', select));
      container.appendChild(input);
      container.appendChild(ui.toolbar([
        ui.button('Clear', () => { input.value = ''; convert(); }),
        ui.copyButton(() => BASES.map(b => NAMES[b] + ': ' + rows[b].textContent).join('\n'))
      ]));
      container.appendChild(ui.el('div', { class: 'du-card' }, [kv]));
      container.appendChild(status.el);

      this._setInput = (text) => {
        input.value = text;
        if (/^0x/i.test(text.trim())) select.value = '16';
        else if (/^[01]+$/.test(text.trim())) select.value = '2';
        convert();
      };
    }
  });
})();
