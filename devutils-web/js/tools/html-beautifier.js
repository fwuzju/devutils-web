// HTML Beautify / Minify
(function () {
  const ui = DevUtils.ui;

  const VOID = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1,
    link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
  };
  const RAW = { pre: 1, textarea: 1, script: 1, style: 1 };

  // token types: text, raw (verbatim content of pre/textarea/script/style),
  // tag, comment, decl (doctype / processing instruction)
  function tokenize(html) {
    const tokens = [];
    let i = 0;
    const n = html.length;
    while (i < n) {
      const lt = html.indexOf('<', i);
      if (lt === -1) { tokens.push({ type: 'text', value: html.slice(i) }); break; }
      if (lt > i) tokens.push({ type: 'text', value: html.slice(i, lt) });
      if (html.startsWith('<!--', lt)) {
        const end = html.indexOf('-->', lt + 4);
        const stop = end === -1 ? n : end + 3;
        tokens.push({ type: 'comment', value: html.slice(lt, stop) });
        i = stop; continue;
      }
      if (/^<![A-Za-z]/.test(html.slice(lt, lt + 3)) || html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
        const gt = html.indexOf('>', lt);
        const stop = gt === -1 ? n : gt + 1;
        tokens.push({ type: 'decl', value: html.slice(lt, stop) });
        i = stop; continue;
      }
      const gt = html.indexOf('>', lt);
      if (gt === -1) { tokens.push({ type: 'text', value: html.slice(lt) }); break; }
      const tag = html.slice(lt, gt + 1);
      tokens.push({ type: 'tag', value: tag });
      i = gt + 1;
      const m = tag.match(/^<([a-zA-Z][\w-]*)/);
      if (m && RAW[m[1].toLowerCase()] && !/\/>$/.test(tag)) {
        const closeRe = new RegExp('</' + m[1] + '\\s*>', 'i');
        const rest = html.slice(i);
        const cm = rest.match(closeRe);
        const rawContent = cm ? rest.slice(0, cm.index) : rest;
        if (rawContent) tokens.push({ type: 'raw', value: rawContent });
        if (cm) {
          tokens.push({ type: 'tag', value: cm[0] });
          i += cm.index + cm[0].length;
        } else {
          i = n;
        }
      }
    }
    return tokens;
  }

  function beautify(html, indent) {
    const tokens = tokenize(html);
    const lines = [];
    let depth = 0;
    const pad = () => indent.repeat(depth);
    tokens.forEach(t => {
      if (t.type === 'text') {
        const txt = t.value.replace(/\s+/g, ' ').trim();
        if (txt) lines.push(pad() + txt);
      } else if (t.type === 'raw') {
        const v = t.value.replace(/^\r?\n/, '').replace(/\s+$/, '');
        if (v) v.split('\n').forEach(l => lines.push(l));
      } else if (t.type === 'comment' || t.type === 'decl') {
        lines.push(pad() + t.value.trim());
      } else { // tag
        const isClose = /^<\//.test(t.value);
        const isSelfClose = /\/>$/.test(t.value);
        const m = t.value.match(/^<\/?\s*([a-zA-Z][\w-]*)/);
        const name = m ? m[1].toLowerCase() : '';
        if (isClose) depth = Math.max(0, depth - 1);
        lines.push(pad() + t.value.trim().replace(/\s+>/, '>').replace(/\s+\/>$/, '/>'));
        if (!isClose && !isSelfClose && !VOID[name]) depth++;
      }
    });
    return lines.join('\n');
  }

  function minify(html) {
    const tokens = tokenize(html);
    let out = '';
    tokens.forEach(t => {
      if (t.type === 'text') {
        out += t.value.replace(/\s+/g, ' ').trim();
      } else if (t.type === 'raw') {
        out += t.value;
      } else {
        out += t.value.trim().replace(/\s+>/, '>').replace(/\s+\/>$/, '/>');
      }
    });
    return out.trim();
  }

  DevUtils.registerTool({
    id: 'html-beautifier',
    name: 'HTML Beautify/Minify',
    group: 'Formatters',
    icon: '</>',
    desc: 'Beautify or minify HTML markup',

    detect(text) {
      const t = (text || '').trim();
      if (/^<!doctype html/i.test(t) || /^<html[\s>]/i.test(t)) return 0.85;
      if (/^<\/?[a-zA-Z][^>]*>/.test(t) && t.indexOf('</') !== -1) return 0.6;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste HTML here…', { rows: 16 });
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
