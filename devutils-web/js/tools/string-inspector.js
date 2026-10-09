// String Inspector — live statistics about a string
(function () {
  const { registerTool, ui } = window.DevUtils;

  function vizChar(ch) {
    if (ch === ' ') return 'Space';
    if (ch === '\n') return '\\n';
    if (ch === '\r') return '\\r';
    if (ch === '\t') return '\\t';
    if (ch === '\f') return '\\f';
    if (ch === '\v') return '\\v';
    if (ch === '\u0000') return '\\0';
    const code = ch.codePointAt(0);
    if (code < 32 || code === 127) return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
    return ch;
  }

  let input;

  registerTool({
    id: 'string-inspector',
    name: 'String Inspector',
    group: 'Inspect / Debug',
    icon: '🔍',
    desc: 'Live statistics about any text: size, words, lines, ASCII check, character frequency.',
    setInput(text) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
    },
    render(container) {
      const status = ui.status();
      const kv = ui.el('dl', { class: 'du-kv' });
      const freqWrap = ui.el('div');

      input = ui.textarea('Type or paste text to inspect…', { rows: 8 });

      function update() {
        kv.innerHTML = '\u0000';
        freqWrap.innerHTML = '\u0000';
        const text = input.value;
        if (!text) { status.clear(); return; }

        const lines = text.split('\n');
        const noWs = text.replace(/\s/g, '\u0000');
        const bytes = new TextEncoder().encode(text).length;
        const words = (text.trim().match(/\S+/g) || []).length;
        const sentences = (text.match(/[.!?]+(?=\s|$)/g) || []).length;
        const distinct = new Set(text).size;
        const isAscii = /^[\x00-\x7F]*$/.test(text);
        const longest = lines.reduce((max, l) => Math.max(max, l.length), 0);

        const stats = [
          ['Characters', String(text.length)],
          ['Characters (no whitespace)', String(noWs.length)],
          ['Bytes (UTF-8)', String(bytes)],
          ['Words', String(words)],
          ['Lines', String(lines.length)],
          ['Sentences (rough)', String(sentences)],
          ['Distinct characters', String(distinct)],
          ['Pure ASCII', isAscii ? 'Yes' : 'No'],
          ['Longest line', String(longest) + ' chars']
        ];
        stats.forEach(([k, v]) => {
          kv.appendChild(ui.el('dt', { text: k }));
          kv.appendChild(ui.el('dd', { text: v }));
        });

        // top-10 character frequency
        const freq = new Map();
        for (const ch of text) freq.set(ch, (freq.get(ch) || 0) + 1);
        const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const thead = ui.el('thead', {}, [
          ui.el('tr', {}, ['#', 'Character', 'Count', '%'].map(h => ui.el('th', { text: h })))
        ]);
        const tbody = ui.el('tbody');
        top.forEach(([ch, count], i) => {
          tbody.appendChild(ui.el('tr', {}, [
            ui.el('td', { text: String(i + 1) }),
            ui.el('td', { text: vizChar(ch) }),
            ui.el('td', { text: String(count) }),
            ui.el('td', { text: (count / text.length * 100).toFixed(1) + '%' })
          ]));
        });
        freqWrap.appendChild(ui.el('table', { class: 'du-table' }, [thead, tbody]));
        status.clear();
      }

      input.addEventListener('input', update);

      container.appendChild(input);
      container.appendChild(ui.toolbar([ui.copyButton(() => input.value)]));
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Statistics'));
      container.appendChild(kv);
      container.appendChild(ui.sectionTitle('Top 10 characters'));
      container.appendChild(freqWrap);
    }
  });
})();
