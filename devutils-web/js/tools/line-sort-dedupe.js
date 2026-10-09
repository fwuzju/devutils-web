// Line Sort/Dedupe — line manipulation utilities (sort, dedupe, trim, shuffle…)
(function () {
  const { registerTool, ui } = window.DevUtils;

  let input;

  function cryptoShuffle(arr) {
    const rnd = new Uint32Array(1);
    for (let i = arr.length - 1; i > 0; i--) {
      crypto.getRandomValues(rnd);
      const j = Math.floor((rnd[0] / 4294967296) * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  registerTool({
    id: 'line-sort-dedupe',
    name: 'Line Sort/Dedupe',
    group: 'Inspect / Debug',
    icon: '⇅',
    desc: 'Sort, reverse, dedupe, trim or shuffle lines of text.',
    setInput(text) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
    },
    render(container) {
      const status = ui.status();

      input = ui.textarea('One item per line…', { rows: 14 });

      function lineCount() {
        const v = input.value;
        return v === '' ? 0 : v.split('\n').length;
      }
      function showCount(extra) {
        const n = lineCount();
        status.ok(n + ' line' + (n === 1 ? '' : 's') + (extra ? ' — ' + extra : ''));
      }

      function apply(fn, label) {
        const lines = input.value.split('\n');
        const result = fn(lines);
        input.value = result.join('\n');
        showCount(label);
      }

      const ops = [
        ['Sort A→Z', () => apply(ls => ls.slice().sort((a, b) => a.localeCompare(b)), 'sorted A→Z')],
        ['Sort Z→A', () => apply(ls => ls.slice().sort((a, b) => b.localeCompare(a)), 'sorted Z→A')],
        ['Sort by length', () => apply(ls => ls.slice().sort((a, b) => a.length - b.length || a.localeCompare(b)), 'sorted by length')],
        ['Reverse lines', () => apply(ls => ls.slice().reverse(), 'reversed')],
        ['Remove duplicates', () => apply(ls => {
          const seen = new Set();
          return ls.filter(l => (seen.has(l) ? false : (seen.add(l), true)));
        }, 'duplicates removed (order kept)')],
        ['Remove empty lines', () => apply(ls => ls.filter(l => l.trim() !== ''), 'empty lines removed')],
        ['Trim each line', () => apply(ls => ls.map(l => l.trim()), 'trimmed')],
        ['Shuffle', () => apply(ls => cryptoShuffle(ls.slice()), 'shuffled')]
      ];

      container.appendChild(input);
      container.appendChild(ui.toolbar(
        ops.map(([label, fn]) => ui.button(label, fn))
          .concat([ui.copyButton(() => input.value)])
      ));
      container.appendChild(status.el);

      input.addEventListener('input', () => showCount());
    }
  });
})();
