// JS Beautify / Minify
(function () {
  const ui = DevUtils.ui;

  // ---------- tokenizer ----------
  // token types: word, str, tpl, regex, punct, space, nl, comment, blockcomment
  const REGEX_PREV_PUNCT = '([{:;,=!&|?+-*%<>~^}';
  const REGEX_PREV_WORDS = {
    return: 1, typeof: 1, case: 1, in: 1, of: 1, new: 1, delete: 1,
    void: 1, instanceof: 1, yield: 1, await: 1, else: 1, do: 1
  };

  function readQuoted(src, i, quote) {
    let j = i + 1;
    const n = src.length;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === quote) { j++; break; }
      if (quote !== '`' && ch === '\n') break; // unterminated
      j++;
    }
    return j;
  }

  function readTemplate(src, i) {
    let j = i + 1, depth = 0;
    const n = src.length;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === '`' && depth === 0) { j++; break; }
      if (ch === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
      if (ch === '}' && depth > 0) { depth--; j++; continue; }
      j++;
    }
    return j;
  }

  function readRegex(src, i) {
    let j = i + 1, inClass = false;
    const n = src.length;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === '[') { inClass = true; j++; continue; }
      if (ch === ']') { inClass = false; j++; continue; }
      if (ch === '/' && !inClass) { j++; break; }
      if (ch === '\n') break;
      j++;
    }
    while (j < n && /[a-z]/i.test(src[j])) j++; // flags
    return j;
  }

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const n = src.length;
    let prev = null; // last significant token
    while (i < n) {
      const c = src[i];
      if (c === '\n') { tokens.push({ type: 'nl', value: '\n' }); i++; continue; }
      if (/\s/.test(c)) { tokens.push({ type: 'space', value: ' ' }); i++; continue; }
      if (c === '/' && src[i + 1] === '/') {
        let j = i + 2;
        while (j < n && src[j] !== '\n') j++;
        tokens.push({ type: 'comment', value: src.slice(i, j) });
        i = j; continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        const end = src.indexOf('*/', i + 2);
        const stop = end === -1 ? n : end + 2;
        tokens.push({ type: 'blockcomment', value: src.slice(i, stop) });
        i = stop; continue;
      }
      if (c === '"' || c === "'") {
        const j = readQuoted(src, i, c);
        prev = { type: 'str', value: src.slice(i, j) };
        tokens.push(prev); i = j; continue;
      }
      if (c === '`') {
        const j = readTemplate(src, i);
        prev = { type: 'tpl', value: src.slice(i, j) };
        tokens.push(prev); i = j; continue;
      }
      if (c === '/') {
        const regexCtx = !prev ||
          (prev.type === 'punct' && prev.value !== '++' && prev.value !== '--' &&
            REGEX_PREV_PUNCT.indexOf(prev.value[prev.value.length - 1]) !== -1) ||
          (prev.type === 'word' && REGEX_PREV_WORDS[prev.value]);
        if (regexCtx) {
          const j = readRegex(src, i);
          prev = { type: 'regex', value: src.slice(i, j) };
          tokens.push(prev); i = j; continue;
        }
      }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$]/.test(src[j])) j++;
        prev = { type: 'word', value: src.slice(i, j) };
        tokens.push(prev); i = j; continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w.$]/.test(src[j])) j++;
        prev = { type: 'word', value: src.slice(i, j) };
        tokens.push(prev); i = j; continue;
      }
      if (/[+\-*\/%=&|<>!~^?:]/.test(c)) {
        // merge a run of operator chars into one punct token (++, ===, =>, ...)
        let j = i + 1;
        while (j < n && /[+\-*\/%=&|<>!~^?:]/.test(src[j]) &&
               !(src[j] === '/' && (src[j + 1] === '/' || src[j + 1] === '*')) &&
               !(src[j - 1] === '/' && (src[j] === '*' || src[j] === '/'))) j++;
        prev = { type: 'punct', value: src.slice(i, j) };
        tokens.push(prev); i = j; continue;
      }
      prev = { type: 'punct', value: c };
      tokens.push(prev); i++;
    }
    return tokens;
  }

  // ---------- beautify ----------
  function beautify(src, indent) {
    const tokens = tokenize(src);
    const lines = [];
    let line = '', depth = 0, paren = 0, pendingSpace = false;
    const pad = () => indent.repeat(depth);

    function flush() {
      const t = line.replace(/\s+$/, '');
      if (t) lines.push(pad() + t);
      line = '';
    }
    function append(str) {
      if (pendingSpace && line && !/[\s(\[.]$/.test(line) && !/^[\)\],;.:?]/.test(str)) {
        line += ' ';
      }
      pendingSpace = false;
      line += str;
    }
    function nextSignificant(idx) {
      for (let k = idx + 1; k < tokens.length; k++) {
        const t = tokens[k];
        if (t.type !== 'space' && t.type !== 'nl') return t;
      }
      return null;
    }

    for (let idx = 0; idx < tokens.length; idx++) {
      const t = tokens[idx];
      if (t.type === 'space') { pendingSpace = true; continue; }
      if (t.type === 'nl') {
        if (paren === 0) flush(); else pendingSpace = true;
        continue;
      }
      if (t.type === 'comment') {
        if (line.trim()) { append(t.value.replace(/\s+$/, '')); flush(); }
        else { line = t.value.replace(/\s+$/, ''); flush(); }
        continue;
      }
      if (t.type === 'blockcomment') {
        if (t.value.indexOf('\n') === -1) {
          append(t.value);
          pendingSpace = true;
        } else {
          flush();
          t.value.split('\n').forEach(l => lines.push(pad() + l.trim()));
        }
        continue;
      }
      if (t.type === 'punct') {
        if (t.value === '{') {
          pendingSpace = false;
          if (line && !/[\s([:]$/.test(line)) line += ' ';
          line += '{';
          flush();
          depth++;
          continue;
        }
        if (t.value === '}') {
          flush();
          depth = Math.max(0, depth - 1);
          line = '}';
          const nx = nextSignificant(idx);
          if (nx && nx.type === 'punct' && ';,.)'.indexOf(nx.value) !== -1) {
            // keep the line open; following punct continues it
          } else {
            flush();
          }
          continue;
        }
        if (t.value === '(') {
          if (/\b(if|for|while|switch|catch)$/.test(line)) { pendingSpace = false; line += ' '; }
          append('(');
          paren++;
          continue;
        }
        if (t.value === ')') { append(')'); paren = Math.max(0, paren - 1); continue; }
        if (t.value === '[') { append('['); continue; }
        if (t.value === ']') { append(']'); continue; }
        if (t.value === ';') {
          append(';');
          if (paren === 0) flush();
          continue;
        }
        if (t.value === ',') { append(','); pendingSpace = true; continue; }
        append(t.value);
        continue;
      }
      // word, str, tpl, regex
      append(t.value);
    }
    flush();
    return lines.join('\n');
  }

  // ---------- minify ----------
  function needsSpace(prev, cur) {
    const p = prev.value[prev.value.length - 1];
    const c = cur.value[0];
    if (/[\w$]/.test(p) && /[\w$]/.test(c)) return true;
    if (prev.type === 'word' && cur.type === 'regex') return true; // return /re/
    if ((p === '+' || p === '-') && c === p) return true; // avoid ++/-- merging
    if (p === '/' && (c === '/' || c === '*')) return true; // avoid comment merging
    return false;
  }

  function minify(src) {
    const tokens = tokenize(src);
    let out = '';
    let pendingSpace = false;
    let prev = null; // previous significant token
    tokens.forEach(t => {
      if (t.type === 'space' || t.type === 'nl' || t.type === 'comment' || t.type === 'blockcomment') {
        pendingSpace = true; // dropped; needsSpace decides if a real space is required
        return;
      }
      if (pendingSpace && prev && needsSpace(prev, t)) out += ' ';
      pendingSpace = false;
      out += t.value;
      prev = t;
    });
    return out.trim();
  }

  DevUtils.registerTool({
    id: 'js-beautifier',
    name: 'JS Beautify/Minify',
    group: 'Formatters',
    icon: 'ƒ',
    desc: 'Beautify or minify JavaScript (heuristic, no eval)',

    detect(text) {
      const t = (text || '').trim();
      if (/^(function|const|let|var|class|import|export|async\s+function)\s/.test(t)) return 0.8;
      if (/=>/.test(t) && /[{};]/.test(t)) return 0.5;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste JavaScript here…', { rows: 16 });
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
