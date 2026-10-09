(function () {
  // RFC-4180-ish CSV parser: quoted fields, escaped double quotes, embedded newlines
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += c;
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    // drop trailing fully-empty rows
    while (rows.length && rows[rows.length - 1].every(v => v === '')) rows.pop();
    return rows;
  }

  function csvEscape(value) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function jsonToCSV(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Input must be a JSON array of objects');
    const keys = [];
    data.forEach(obj => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(k => { if (keys.indexOf(k) === -1) keys.push(k); });
      }
    });
    const lines = [keys.map(csvEscape).join(',')];
    data.forEach(obj => {
      lines.push(keys.map(k => {
        let v = obj && typeof obj === 'object' ? obj[k] : obj;
        if (v !== null && typeof v === 'object') v = JSON.stringify(v);
        return csvEscape(v);
      }).join(','));
    });
    return lines.join('\n');
  }

  function csvToJSON(text) {
    const rows = parseCSV(text);
    if (rows.length === 0) throw new Error('No CSV data found');
    const headers = rows[0];
    const out = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = i < row.length ? row[i] : ''; });
      return obj;
    });
    return JSON.stringify(out, null, 2);
  }

  DevUtils.registerTool({
    id: 'json-csv',
    name: 'JSON ⇄ CSV',
    group: 'Converters',
    icon: '📊',
    desc: 'Convert between JSON arrays and CSV',

    detect(text) {
      const t = text.trim();
      if (!t.startsWith('[')) return 0;
      try { return Array.isArray(JSON.parse(t)) ? 0.4 : 0; } catch (e) { return 0; }
    },

    render(container) {
      const ui = DevUtils.ui;
      let mode = 'json-to-csv';

      const input = ui.textarea('Paste a JSON array of objects here…', { rows: 12 });
      const output = ui.el('pre', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtn = ui.button('JSON → CSV', null, { primary: true });

      function convert() {
        const text = input.value.trim();
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          output.textContent = mode === 'json-to-csv' ? jsonToCSV(text) : csvToJSON(text);
          status.ok('Converted');
        } catch (e) {
          output.textContent = '';
          status.error(e.message || String(e));
        }
      }

      modeBtn.addEventListener('click', () => {
        mode = mode === 'json-to-csv' ? 'csv-to-json' : 'json-to-csv';
        modeBtn.textContent = mode === 'json-to-csv' ? 'JSON → CSV' : 'CSV → JSON';
        input.placeholder = mode === 'json-to-csv'
          ? 'Paste a JSON array of objects here…'
          : 'Paste CSV here (first row = headers)…';
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
        mode = 'json-to-csv';
        modeBtn.textContent = 'JSON → CSV';
        convert();
      };
    }
  });
})();
