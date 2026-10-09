// Lorem Ipsum — classic placeholder text generator
(function () {
  const { registerTool, ui } = window.DevUtils;

  const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum').split(' ');

  function rnd(n) { return Math.floor(Math.random() * n); }

  function sentence(minWords, maxWords) {
    const len = minWords + rnd(maxWords - minWords + 1);
    const words = [];
    for (let i = 0; i < len; i++) words.push(WORDS[rnd(WORDS.length)]);
    return words.join(' ').replace(/^./, c => c.toUpperCase()) + '.';
  }

  function paragraph() {
    const n = 3 + rnd(4); // 3-6 sentences
    const s = [];
    for (let i = 0; i < n; i++) s.push(sentence(5, 14));
    return s.join(' ');
  }

  function generate(unit, count) {
    if (unit === 'words') {
      const words = [];
      for (let i = 0; i < count; i++) words.push(WORDS[rnd(WORDS.length)]);
      return words.join(' ');
    }
    if (unit === 'sentences') {
      const s = [];
      for (let i = 0; i < count; i++) s.push(sentence(5, 14));
      return s.join(' ');
    }
    const paras = [];
    for (let i = 0; i < count; i++) paras.push(paragraph());
    // the classic opening
    paras[0] = 'Lorem ipsum dolor sit amet, ' + paras[0].replace(/^./, c => c.toLowerCase());
    return paras.join('\n\n');
  }

  registerTool({
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum',
    group: 'Generators',
    icon: '📜',
    desc: 'Generate classic lorem ipsum placeholder text.',
    render(container) {
      const unitSel = ui.el('select', {}, ['paragraphs', 'sentences', 'words'].map(u =>
        ui.el('option', { value: u, text: u })));
      const countInput = ui.el('input', { type: 'number', min: '1', max: '100', value: '3' });
      const out = ui.textarea('', { rows: 12, readonly: true });
      const status = ui.status();

      function run() {
        let n = parseInt(countInput.value, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > 100) n = 100;
        countInput.value = String(n);
        out.value = generate(unitSel.value, n);
        status.clear();
      }

      container.appendChild(ui.toolbar([
        ui.field('Unit', unitSel),
        ui.field('Count', countInput),
        ui.button('Generate', run, { primary: true }),
        ui.copyButton(() => out.value)
      ]));
      container.appendChild(status.el);
      container.appendChild(out);
      run();
    }
  });
})();
