// Text Diff Checker — line-based LCS diff with additions/deletions stats
(function () {
  const { registerTool, ui } = window.DevUtils;

  const HARD_LINE_LIMIT = 2000;

  // LCS diff over lines; falls back to naive per-line compare past the limit
  function computeDiff(aLines, bLines) {
    if (aLines.length > HARD_LINE_LIMIT || bLines.length > HARD_LINE_LIMIT) {
      const out = [];
      const n = Math.max(aLines.length, bLines.length);
      for (let i = 0; i < n; i++) {
        const a = i < aLines.length ? aLines[i] : undefined;
        const b = i < bLines.length ? bLines[i] : undefined;
        if (a === b) {
          out.push({ type: 'same', text: a });
        } else {
          if (a !== undefined) out.push({ type: 'del', text: a });
          if (b !== undefined) out.push({ type: 'add', text: b });
        }
      }
      return { rows: out, fallback: true };
    }

    const n = aLines.length, m = bLines.length, W = m + 1;
    const dp = new Uint32Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * W + j] = aLines[i] === bLines[j]
          ? dp[(i + 1) * W + j + 1] + 1
          : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
      }
    }
    const out = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (aLines[i] === bLines[j]) { out.push({ type: 'same', text: aLines[i] }); i++; j++; }
      else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) { out.push({ type: 'del', text: aLines[i] }); i++; }
      else { out.push({ type: 'add', text: bLines[j] }); j++; }
    }
    while (i < n) { out.push({ type: 'del', text: aLines[i] }); i++; }
    while (j < m) { out.push({ type: 'add', text: bLines[j] }); j++; }
    return { rows: out, fallback: false };
  }

  let origInput, changedInput;

  registerTool({
    id: 'text-diff',
    name: 'Text Diff Checker',
    group: 'Inspect / Debug',
    icon: '±',
    desc: 'Line-based diff between two texts (LCS). Green = added, red = removed.',
    setInput(text) {
      origInput.value = text;
    },
    render(container) {
      const status = ui.status();
      const statsEl = ui.el('div', { class: 'du-section-title' });
      const output = ui.el('div', { class: 'du-output-box' });
      let lastDiffText = '';

      origInput = ui.textarea('Original text…', { rows: 12 });
      changedInput = ui.textarea('Changed text…', { rows: 12 });

      function compare() {
        output.innerHTML = '';
        lastDiffText = '';
        const aLines = origInput.value.split('\n');
        const bLines = changedInput.value.split('\n');
        const { rows, fallback } = computeDiff(aLines, bLines);

        let adds = 0, dels = 0;
        const frag = document.createDocumentFragment();
        const plainLines = [];
        rows.forEach(r => {
          let prefix, cls = '';
          if (r.type === 'add') { prefix = '+ '; cls = 'du-diff-add'; adds++; }
          else if (r.type === 'del') { prefix = '- '; cls = 'du-diff-del'; dels++; }
          else { prefix = '  '; }
          const line = ui.el('div', cls ? { class: cls } : {}, [prefix + r.text]);
          frag.appendChild(line);
          plainLines.push(prefix + r.text);
        });
        output.appendChild(frag);
        lastDiffText = plainLines.join('\n');

        statsEl.textContent = '+' + adds + ' addition' + (adds === 1 ? '' : 's') +
          '  -' + dels + ' deletion' + (dels === 1 ? '' : 's') +
          (fallback ? '  (inputs over ' + HARD_LINE_LIMIT + ' lines: simple per-line compare)' : '');
        status.clear();
      }

      const grid = ui.el('div', { class: 'du-grid-2' }, [
        ui.field('Original', origInput),
        ui.field('Changed', changedInput)
      ]);

      container.appendChild(grid);
      container.appendChild(ui.toolbar([
        ui.button('Compare', compare, { primary: true }),
        ui.copyButton(() => lastDiffText)
      ]));
      container.appendChild(status.el);
      container.appendChild(statsEl);
      container.appendChild(output);
    }
  });
})();
