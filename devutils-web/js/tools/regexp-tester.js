// RegExp Tester — live regex matching with highlight, match table and cheat sheet
(function () {
  const { registerTool, ui } = window.DevUtils;

  const FLAG_LIST = ['g', 'i', 'm', 's', 'u', 'y'];
  const MAX_MATCHES = 1000;

  const CHEAT_ROWS = [
    ['.', 'any char except line terminators'],
    ['\\d  \\D', 'digit / not a digit (0-9)'],
    ['\\w  \\W', 'word char [A-Za-z0-9_] / not a word char'],
    ['\\s  \\S', 'whitespace / not whitespace'],
    ['[abc]  [^abc]', 'char class: one of / none of a,b,c'],
    ['a|b', 'alternation: a or b'],
    ['*  +  ?', '0+ / 1+ / 0-or-1 repetitions'],
    ['{n} {n,} {n,m}', 'exactly n / at least n / n to m repetitions'],
    ['*?  +?', 'lazy (non-greedy) quantifiers'],
    ['^  $', 'start / end of string (or line with m flag)'],
    ['\\b  \\B', 'word boundary / not a word boundary'],
    ['(…)', 'capturing group'],
    ['(?:…)', 'non-capturing group'],
    ['(?<name>…)', 'named capturing group'],
    ['\\1', 'backreference to group 1'],
    ['g', 'global — find all matches'],
    ['i', 'case-insensitive'],
    ['m', 'multiline — ^ and $ match line boundaries'],
    ['s', 'dotAll — . matches newlines'],
    ['u', 'unicode — full Unicode matching'],
    ['y', 'sticky — match only at lastIndex']
  ];

  let patternInput, textInput;
  const flagBoxes = {};

  function selectedFlags() {
    return FLAG_LIST.filter(f => flagBoxes[f].checked).join('');
  }

  // accepts /pattern/flags or a bare pattern; returns { pattern, flags } or null
  function parseInput() {
    const raw = patternInput.value;
    const m = raw.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
    if (m && m[1].length > 0) {
      // literal form: its flags win, sync the checkboxes
      FLAG_LIST.forEach(f => { flagBoxes[f].checked = m[2].includes(f); });
      return { pattern: m[1], flags: m[2] };
    }
    return { pattern: raw, flags: selectedFlags() };
  }

  registerTool({
    id: 'regexp-tester',
    name: 'RegExp Tester',
    group: 'Inspect / Debug',
    icon: '.*',
    desc: 'Test a regular expression against text: live highlighting, match list and capture groups.',
    detect(text) {
      const t = text.trim();
      if (t.length > 2 && /^\/.+\/[gimsuy]{0,6}$/.test(t)) return 0.6;
      return 0;
    },
    setInput(text) {
      const t = text.trim();
      if (t.length > 2 && /^\/.+\/[gimsuy]{0,6}$/.test(t)) {
        patternInput.value = t;
      } else {
        textInput.value = text;
      }
      patternInput.dispatchEvent(new Event('input'));
    },
    render(container) {
      const status = ui.status();
      const highlightBox = ui.el('div', { class: 'du-output-box' });
      const tableWrap = ui.el('div');

      patternInput = ui.el('input', {
        class: 'du-input', type: 'text',
        placeholder: '/pattern/flags  or a bare pattern',
        spellcheck: 'false', autocomplete: 'off'
      });

      const flagsRow = ui.el('div', { class: 'du-toolbar' });
      flagsRow.appendChild(ui.el('span', { class: 'du-field-label', text: 'Flags:' }));
      FLAG_LIST.forEach(f => {
        const cb = ui.el('input', { type: 'checkbox' });
        if (f === 'g') cb.checked = true;
        flagBoxes[f] = cb;
        flagsRow.appendChild(ui.el('label', { style: 'display:inline-flex;align-items:center;gap:4px;' }, [cb, f]));
      });

      textInput = ui.textarea('Text to test against…', { rows: 8 });

      const copyBtn = ui.copyButton(() => {
        const rows = tableWrap.querySelectorAll('tbody tr');
        if (!rows.length) return '';
        return Array.from(rows).map(tr =>
          Array.from(tr.children).map(td => td.textContent).join('\t')
        ).join('\n');
      });

      function clearResults() {
        highlightBox.textContent = '';
        tableWrap.innerHTML = '';
      }

      function run() {
        clearResults();
        const raw = patternInput.value;
        if (!raw) { status.clear(); return; }
        if (!raw.trim()) { status.clear(); return; }

        const parsed = parseInput();
        if (!parsed.pattern) { status.clear(); return; }

        let re;
        try {
          re = new RegExp(parsed.pattern, parsed.flags);
        } catch (e) {
          status.error('Invalid regular expression: ' + e.message);
          return;
        }

        const text = textInput.value;
        if (!text) { status.ok('Valid regex — enter some test text.'); return; }

        const execFlags = parsed.flags.includes('g') ? parsed.flags : parsed.flags + 'g';
        let matches;
        try {
          const execRe = new RegExp(parsed.pattern, execFlags);
          matches = [];
          for (const m of text.matchAll(execRe)) {
            matches.push(m);
            if (matches.length >= MAX_MATCHES) break;
          }
        } catch (e) {
          status.error('Matching failed: ' + e.message);
          return;
        }

        // highlighted text
        const frag = document.createDocumentFragment();
        let last = 0;
        matches.forEach(m => {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          frag.appendChild(ui.el('span', { class: 'du-hl', text: m[0] }));
          last = m.index + m[0].length;
        });
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        highlightBox.appendChild(frag);

        // match table
        const MAX_ROWS = 200;
        const thead = ui.el('thead', {}, [
          ui.el('tr', {}, ['#', 'Match', 'Index', 'Groups'].map(h => ui.el('th', { text: h })))
        ]);
        const tbody = ui.el('tbody');
        matches.slice(0, MAX_ROWS).forEach((m, i) => {
          const groups = m.length > 1
            ? m.slice(1).map(g => (g === undefined ? 'undefined' : JSON.stringify(g))).join(', ')
            : '—';
          tbody.appendChild(ui.el('tr', {}, [
            ui.el('td', { text: String(i + 1) }),
            ui.el('td', { text: JSON.stringify(m[0]) }),
            ui.el('td', { text: String(m.index) }),
            ui.el('td', { text: groups })
          ]));
        });
        tableWrap.appendChild(ui.el('table', { class: 'du-table' }, [thead, tbody]));

        let msg = matches.length + ' match' + (matches.length === 1 ? '' : 'es');
        if (matches.length >= MAX_MATCHES) msg += ' (stopped at ' + MAX_MATCHES + ')';
        if (matches.length > MAX_ROWS) msg += ' — showing first ' + MAX_ROWS + ' rows';
        status.ok(msg);
      }

      let timer = null;
      function schedule() {
        clearTimeout(timer);
        timer = setTimeout(run, 200);
      }
      patternInput.addEventListener('input', schedule);
      textInput.addEventListener('input', schedule);
      FLAG_LIST.forEach(f => flagBoxes[f].addEventListener('change', run));

      const cheatHead = ui.el('thead', {}, [
        ui.el('tr', {}, [ui.el('th', { text: 'Syntax' }), ui.el('th', { text: 'Meaning' })])
      ]);
      const cheatBody = ui.el('tbody');
      CHEAT_ROWS.forEach(([syntax, meaning]) => {
        cheatBody.appendChild(ui.el('tr', {}, [
          ui.el('td', { text: syntax }),
          ui.el('td', { text: meaning })
        ]));
      });
      const cheat = ui.el('details', {}, [
        ui.el('summary', { text: 'Regex cheat sheet' }),
        ui.el('table', { class: 'du-table' }, [cheatHead, cheatBody])
      ]);

      container.appendChild(ui.field('Regular expression', patternInput));
      container.appendChild(flagsRow);
      container.appendChild(ui.sectionTitle('Test text'));
      container.appendChild(textInput);
      container.appendChild(ui.toolbar([copyBtn]));
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Highlighted text'));
      container.appendChild(highlightBox);
      container.appendChild(ui.sectionTitle('Matches'));
      container.appendChild(tableWrap);
      container.appendChild(cheat);
    }
  });
})();
