(function () {
  DevUtils.registerTool({
    id: 'yaml-json',
    name: 'YAML ⇄ JSON',
    group: 'Converters',
    icon: '⇄',
    desc: 'Convert between YAML and JSON',

    detect(text) {
      if (!/^\w+:\s/m.test(text)) return 0;
      try { JSON.parse(text); return 0; } catch (e) { return 0.3; }
    },

    render(container) {
      const ui = DevUtils.ui;
      let mode = 'yaml-to-json';

      const input = ui.textarea('Paste YAML here…', { rows: 12 });
      const output = ui.el('pre', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtn = ui.button('YAML → JSON', null, { primary: true });

      function convert() {
        const text = input.value.trim();
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          if (mode === 'yaml-to-json') {
            output.textContent = JSON.stringify(jsyaml.load(text), null, 2);
          } else {
            output.textContent = jsyaml.dump(JSON.parse(text), { indent: 2 });
          }
          status.ok('Converted');
        } catch (e) {
          output.textContent = '';
          status.error(e.message || String(e));
        }
      }

      function setMode(m) {
        mode = m;
        modeBtn.textContent = m === 'yaml-to-json' ? 'YAML → JSON' : 'JSON → YAML';
        input.placeholder = m === 'yaml-to-json' ? 'Paste YAML here…' : 'Paste JSON here…';
        convert();
      }
      modeBtn.addEventListener('click', () => {
        setMode(mode === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json');
      });

      input.addEventListener('input', convert);

      container.appendChild(ui.toolbar([
        modeBtn,
        ui.copyButton(() => output.textContent)
      ]));
      container.appendChild(input);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Output'));
      container.appendChild(output);

      this.setInput = function (text) {
        input.value = text;
        setMode('yaml-to-json');
      };
    }
  });
})();
