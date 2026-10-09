// CSS Beautify / Minify
(function () {
  const ui = DevUtils.ui;

  function readString(s, i) {
    const q = s[i];
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === q) { j++; break; }
      j++;
    }
    return j;
  }

  function beautify(css, indent) {
    const lines = [];
    let depth = 0, line = '', i = 0;
    const n = css.length;
    const pad = () => indent.repeat(depth);
    function flush() {
      const t = line.replace(/\s+$/g, '');
      if (t.trim()) lines.push(pad() + t.trim());
      line = '';
    }
    function space() {
      if (line && !/\s$/.test(line)) line += ' ';
    }
    while (i < n) {
      const c = css[i];
      if (css.startsWith('/*', i)) {
        const end = css.indexOf('*/', i + 2);
        const stop = end === -1 ? n : end + 2;
        flush();
        const cm = css.slice(i, stop);
        if (cm.indexOf('\n') === -1) {
          lines.push(pad() + cm.trim());
        } else {
          cm.split('\n').forEach(l => lines.push(pad() + l.trim()));
        }
        i = stop; continue;
      }
      if (c === '"' || c === "'") {
        const j = readString(css, i);
        line += css.slice(i, j);
        i = j; continue;
      }
      if (c === '{') {
        space();
        line += '{';
        flush();
        depth++;
        i++; continue;
      }
      if (c === '}') {
        // add a missing ';' to a trailing declaration
        if (depth > 0 && line.trim() && !/[;{}:]\s*$/.test(line) && line.indexOf(':') !== -1) line += ';';
        flush();
        depth = Math.max(0, depth - 1);
        line = '}';
        // keep ";}" style: consume a following ';'
        let k = i + 1;
        while (k < n && /\s/.test(css[k])) k++;
        if (css[k] === ';') { line += ';'; i = k; }
        flush();
        i++; continue;
      }
      if (c === ';') {
        line += ';';
        flush();
        i++; continue;
      }
      if (/\s/.test(c)) { space(); i++; continue; }
      line += c;
      i++;
    }
    flush();
    return lines.join('\n');
  }

  function minify(css) {
    let s = '', i = 0;
    const n = css.length;
    while (i < n) {
      if (css.startsWith('/*', i)) {
        const end = css.indexOf('*/', i + 2);
        i = end === -1 ? n : end + 2;
        continue;
      }
      const c = css[i];
      if (c === '"' || c === "'") {
        const j = readString(css, i);
        s += css.slice(i, j);
        i = j; continue;
      }
      s += c;
      i++;
    }
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/\s*([{}:;,>~])\s*/g, '$1');
    s = s.replace(/;}/g, '}');
    s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return s.trim();
  }

  DevUtils.registerTool({
    id: 'css-beautifier',
    name: 'CSS Beautify/Minify',
    group: 'Formatters',
    icon: '#',
    desc: 'Beautify or minify CSS',

    detect(text) {
      const t = (text || '').trim();
      if (/^(@media|@import|@font-face|:root)/.test(t)) return 0.8;
      if (/^[.#*a-zA-Z][^{};]*\{[^{}]*:[^{}]*\}/.test(t)) return 0.7;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste CSS here…', { rows: 16 });
      const output = ui.el('div', { class: 'du-output-box' });
      const st = ui.status();

      function run(fn) {
        const raw = input.value;
        if (!raw.trim()) { st.clear(); output.textContent = ''; return; }
        try {
          output.textContent = fn(raw);
          st.clear();
        } catch (e) {
          st.error('Error: ' + (e.message || e));
        }
      }

      const bar = ui.toolbar([
        ui.button('Beautify', () => run(s => beautify(s, '  ')), { primary: true }),
        ui.button('Minify', () => run(minify)),
        ui.copyButton(() => output.textContent)
      ]);

      const grid = ui.el('div', { class: 'du-grid-2' }, [
        ui.el('div', {}, [ui.sectionTitle('Input'), input]),
        ui.el('div', {}, [ui.sectionTitle('Output'), output])
      ]);
      container.appendChild(bar);
      container.appendChild(st.el);
      container.appendChild(grid);
      this._input = input;
    },

    setInput(text) {
      if (this._input) this._input.value = text;
    }
  });
})();
