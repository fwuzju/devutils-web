// XML Beautify / Minify
(function () {
  const ui = DevUtils.ui;

  // token types: pi (<?...?>), comment, cdata, decl (<!DOCTYPE...>), tag, text
  function tokenize(xml) {
    const tokens = [];
    let i = 0;
    const n = xml.length;
    while (i < n) {
      const lt = xml.indexOf('<', i);
      if (lt === -1) { tokens.push({ type: 'text', value: xml.slice(i) }); break; }
      if (lt > i) tokens.push({ type: 'text', value: xml.slice(i, lt) });
      if (xml.startsWith('<!--', lt)) {
        const end = xml.indexOf('-->', lt + 4);
        const stop = end === -1 ? n : end + 3;
        tokens.push({ type: 'comment', value: xml.slice(lt, stop) });
        i = stop; continue;
      }
      if (xml.startsWith('<![CDATA[', lt)) {
        const end = xml.indexOf(']]>', lt + 9);
        const stop = end === -1 ? n : end + 3;
        tokens.push({ type: 'cdata', value: xml.slice(lt, stop) });
        i = stop; continue;
      }
      if (xml.startsWith('<?', lt)) {
        const end = xml.indexOf('?>', lt + 2);
        const stop = end === -1 ? n : end + 2;
        tokens.push({ type: 'pi', value: xml.slice(lt, stop) });
        i = stop; continue;
      }
      if (/^<![A-Za-z]/.test(xml.slice(lt, lt + 3))) {
        // DOCTYPE and friends; may contain an internal subset [ ... ]
        let j = lt + 2, depthB = 0;
        while (j < n) {
          const ch = xml[j];
          if (ch === '[') depthB++;
          else if (ch === ']') depthB--;
          else if (ch === '>' && depthB === 0) { j++; break; }
          j++;
        }
        tokens.push({ type: 'decl', value: xml.slice(lt, j) });
        i = j; continue;
      }
      const gt = xml.indexOf('>', lt);
      if (gt === -1) { tokens.push({ type: 'text', value: xml.slice(lt) }); break; }
      tokens.push({ type: 'tag', value: xml.slice(lt, gt + 1) });
      i = gt + 1;
    }
    return tokens;
  }

  function beautify(xml, indent) {
    const tokens = tokenize(xml);
    const lines = [];
    let depth = 0;
    const pad = () => indent.repeat(depth);
    tokens.forEach(t => {
      if (t.type === 'text') {
        const txt = t.value.replace(/\s+/g, ' ').trim();
        if (txt) lines.push(pad() + txt);
        return;
      }
      if (t.type === 'pi' || t.type === 'decl') {
        lines.push(pad() + t.value.trim());
        return;
      }
      if (t.type === 'comment') {
        const cm = t.value.trim();
        if (cm.indexOf('\n') === -1) lines.push(pad() + cm);
        else cm.split('\n').forEach(l => lines.push(pad() + l.trim()));
        return;
      }
      if (t.type === 'cdata') {
        t.value.trim().split('\n').forEach(l => lines.push(pad() + l.trim()));
        return;
      }
      // tag
      const isClose = /^<\//.test(t.value);
      const isSelfClose = /\/>$/.test(t.value);
      if (isClose) depth = Math.max(0, depth - 1);
      lines.push(pad() + t.value.trim().replace(/\s+>/, '>').replace(/\s+\/>$/, '/>'));
      if (!isClose && !isSelfClose) depth++;
    });
    return lines.join('\n');
  }

  function minify(xml) {
    const tokens = tokenize(xml);
    let out = '';
    tokens.forEach(t => {
      if (t.type === 'text') {
        out += t.value.replace(/\s+/g, ' ').trim();
      } else if (t.type === 'cdata') {
        out += t.value;
      } else {
        out += t.value.trim().replace(/\s+>/, '>').replace(/\s+\/>$/, '/>');
      }
    });
    return out.trim();
  }

  DevUtils.registerTool({
    id: 'xml-beautifier',
    name: 'XML Beautify/Minify',
    group: 'Formatters',
    icon: '◇',
    desc: 'Beautify or minify XML documents',

    detect(text) {
      const t = (text || '').trim();
      if (/^<\?xml[\s?]/.test(t)) return 0.9;
      if (/^<(!DOCTYPE|\[CDATA\[)/.test(t)) return 0.6;
      if (/^<[a-zA-Z_][\w:.-]*(\s[^>]*)?>[\s\S]*<\/[a-zA-Z_]/.test(t)) return 0.55;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste XML here…', { rows: 16 });
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
