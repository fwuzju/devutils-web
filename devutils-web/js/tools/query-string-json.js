(function () {
  function qsToJSON(text) {
    let qs = text.trim();
    // full URL → take query part; tolerate leading '?'
    const qIdx = qs.indexOf('?');
    if (/^https?:\/\//i.test(qs) || /^[\w.-]+\.[\w]{2,}[/?]/.test(qs)) {
      qs = qIdx >= 0 ? qs.slice(qIdx + 1) : '';
    } else if (qs.startsWith('?')) {
      qs = qs.slice(1);
    }
    // strip fragment
    const hashIdx = qs.indexOf('#');
    if (hashIdx >= 0) qs = qs.slice(0, hashIdx);

    const params = new URLSearchParams(qs);
    const obj = {};
    for (const [key, value] of params) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }
    return JSON.stringify(obj, null, 2);
  }

  function jsonToQS(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('Input must be a flat JSON object');
    }
    const params = new URLSearchParams();
    Object.keys(obj).forEach(key => {
      const v = obj[key];
      if (Array.isArray(v)) {
        v.forEach(item => params.append(key, item !== null && typeof item === 'object' ? JSON.stringify(item) : String(item)));
      } else if (v !== null && typeof v === 'object') {
        params.append(key, JSON.stringify(v));
      } else {
        params.append(key, String(v));
      }
    });
    return params.toString();
  }

  DevUtils.registerTool({
    id: 'query-string-json',
    name: 'Query String ⇄ JSON',
    group: 'Converters',
    icon: '?',
    desc: 'Convert between URL query strings and JSON',

    detect(text) {
      const t = text.trim();
      if (t.indexOf('=') === -1 || t.indexOf('&') === -1) return 0;
      if (/\s{2,}/.test(t) || t.indexOf(' ') !== -1) return 0;
      return 0.4;
    },

    render(container) {
      const ui = DevUtils.ui;
      let mode = 'qs-to-json';

      const input = ui.textarea('Paste a query string or URL here…', { rows: 8 });
      const output = ui.el('pre', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtn = ui.button('Query String → JSON', null, { primary: true });

      function convert() {
        const text = input.value.trim();
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          output.textContent = mode === 'qs-to-json' ? qsToJSON(text) : jsonToQS(text);
          status.ok('Converted');
        } catch (e) {
          output.textContent = '';
          status.error(e.message || String(e));
        }
      }

      modeBtn.addEventListener('click', () => {
        mode = mode === 'qs-to-json' ? 'json-to-qs' : 'qs-to-json';
        modeBtn.textContent = mode === 'qs-to-json' ? 'Query String → JSON' : 'JSON → Query String';
        input.placeholder = mode === 'qs-to-json'
          ? 'Paste a query string or URL here…'
          : 'Paste a flat JSON object here…';
        convert();
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
        mode = 'qs-to-json';
        modeBtn.textContent = 'Query String → JSON';
        convert();
      };
    }
  });
})();
