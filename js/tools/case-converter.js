// Case Converter — split text into words and render common casing styles
(function () {
  const ui = DevUtils.ui;

  function splitWords(text) {
    return String(text)
      // camelCase / PascalCase boundaries: fooBar -> foo Bar, HTTPServer -> HTTP Server
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_\-\/\\.:;]+/)
      .map(w => w.trim())
      .filter(Boolean);
  }

  const lower = w => w.toLowerCase();
  const upper = w => w.toUpperCase();
  const cap = w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';

  const STYLES = [
    ['camelCase', ws => ws.map((w, i) => i === 0 ? lower(w) : cap(w)).join('')],
    ['PascalCase', ws => ws.map(cap).join('')],
    ['snake_case', ws => ws.map(lower).join('_')],
    ['kebab-case', ws => ws.map(lower).join('-')],
    ['UPPER_SNAKE_CASE', ws => ws.map(upper).join('_')],
    ['lower case', ws => ws.map(lower).join(' ')],
    ['Title Case', ws => ws.map(cap).join(' ')]
  ];

  DevUtils.registerTool({
    id: 'case-converter',
    name: 'Case Converter',
    group: 'Converters',
    icon: 'Aa',

    render(container) {
      const status = ui.status();
      const input = ui.textarea('e.g. helloWorld_example-name', { rows: 3 });
      const kv = ui.el('dl', { class: 'du-kv' });
      const rows = {};
      STYLES.forEach(([label]) => {
        const dd = ui.el('dd', {
          title: 'Click to copy',
          style: 'cursor:pointer;',
          onclick() {
            const text = rows[label].textContent;
            if (!text) return;
            const done = () => {
              const old = dd.textContent;
              dd.textContent = 'Copied!';
              setTimeout(() => { dd.textContent = old; }, 900);
            };
            try {
              navigator.clipboard.writeText(text).then(done, done);
            } catch (e) {
              const ta = ui.el('textarea', { text });
              document.body.appendChild(ta);
              ta.select(); document.execCommand('copy'); ta.remove();
              done();
            }
          }
        });
        rows[label] = dd;
        kv.appendChild(ui.el('dt', { text: label }));
        kv.appendChild(dd);
      });

      function convert() {
        const words = splitWords(input.value);
        STYLES.forEach(([label]) => { rows[label].textContent = ''; });
        if (!words.length) { status.clear(); return; }
        status.clear();
        STYLES.forEach(([label, fn]) => { rows[label].textContent = fn(words); });
      }
      input.addEventListener('input', convert);

      container.appendChild(input);
      container.appendChild(ui.toolbar([
        ui.button('Clear', () => { input.value = ''; convert(); }),
        ui.copyButton(() => STYLES.map(([label]) => label + ': ' + rows[label].textContent).join('\n'))
      ]));
      container.appendChild(ui.el('div', { class: 'du-card' }, [kv]));
      container.appendChild(status.el);

      this._setInput = (text) => { input.value = text; convert(); };
    },

    setInput(text) { this._setInput(String(text)); }
  });
})();
