// JSON Format / Validate
(function () {
  const ui = DevUtils.ui;

  function posToLineCol(text, pos) {
    const upTo = text.slice(0, pos);
    const line = (upTo.match(/\n/g) || []).length + 1;
    const col = pos - upTo.lastIndexOf('\n');
    return { line, col };
  }

  function describeError(err, text) {
    let msg = err.message || String(err);
    let m = msg.match(/line (\d+) column (\d+)/i);
    if (m) return msg; // engine already reports line/column
    m = msg.match(/position (\d+)/i);
    if (m) {
      const lc = posToLineCol(text, parseInt(m[1], 10));
      return msg + '  (line ' + lc.line + ', column ' + lc.col + ')';
    }
    return msg;
  }

  DevUtils.registerTool({
    id: 'json-formatter',
    name: 'JSON Format/Validate',
    group: 'Formatters',
    icon: '{ }',
    desc: 'Format, minify and validate JSON',

    detect(text) {
      const t = (text || '').trim();
      if (!t) return 0;
      try { JSON.parse(t); return 0.95; } catch (e) { /* fall through */ }
      if (t[0] === '{' || t[0] === '[') return 0.5;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste JSON here…', { rows: 16 });
      const output = ui.el('div', { class: 'du-output-box' });
      const st = ui.status();

      const indentSel = ui.el('select', { class: 'du-btn' }, [
        ui.el('option', { value: '2', text: 'Indent: 2' }),
        ui.el('option', { value: '4', text: 'Indent: 4' }),
        ui.el('option', { value: 'tab', text: 'Indent: tab' })
      ]);

      function currentIndent() {
        const v = indentSel.value || '2';
        return v === 'tab' ? '\t' : parseInt(v, 10);
      }

      function format() {
        const raw = input.value.trim();
        if (!raw) { st.clear(); output.textContent = ''; return; }
        try {
          const obj = JSON.parse(raw);
          output.textContent = JSON.stringify(obj, null, currentIndent());
          st.ok('Valid JSON');
        } catch (e) {
          st.error('Invalid JSON: ' + describeError(e, raw));
        }
      }

      function minify() {
        const raw = input.value.trim();
        if (!raw) { st.clear(); output.textContent = ''; return; }
        try {
          const obj = JSON.parse(raw);
          output.textContent = JSON.stringify(obj);
          st.ok('Valid JSON');
        } catch (e) {
          st.error('Invalid JSON: ' + describeError(e, raw));
        }
      }

      const bar = ui.toolbar([
        ui.button('Format', format, { primary: true }),
        ui.button('Minify', minify),
        indentSel,
        ui.copyButton(() => output.textContent)
      ]);

      input.addEventListener('input', format);
      indentSel.addEventListener('change', format);

      const grid = ui.el('div', { class: 'du-grid-2' }, [
        ui.el('div', {}, [ui.sectionTitle('Input'), input]),
        ui.el('div', {}, [ui.sectionTitle('Output'), output])
      ]);
      container.appendChild(bar);
      container.appendChild(st.el);
      container.appendChild(grid);
      this._input = input;
      this._format = format;
    },

    setInput(text) {
      if (this._input) {
        this._input.value = text;
        this._format();
      }
    }
  });
})();
