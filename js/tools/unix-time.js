// Unix Time Converter — timestamp <-> human-readable date/time
(function () {
  const ui = DevUtils.ui;

  function stripNoise(s) { return String(s).replace(/[,\s_]/g, ''); }

  function relTime(date) {
    const diffMs = Date.now() - date.getTime();
    const abs = Math.abs(diffMs);
    const future = diffMs < 0;
    const units = [
      ['year', 365 * 86400e3], ['month', 30 * 86400e3], ['week', 7 * 86400e3],
      ['day', 86400e3], ['hour', 3600e3], ['minute', 60e3], ['second', 1e3]
    ];
    let text = 'just now';
    for (const [name, ms] of units) {
      const v = Math.floor(abs / ms);
      if (v >= 1) { text = v + ' ' + name + (v > 1 ? 's' : ''); break; }
    }
    if (text === 'just now') return text;
    return future ? 'in ' + text : text + ' ago';
  }

  DevUtils.registerTool({
    id: 'unix-time',
    name: 'Unix Time Converter',
    group: 'Converters',
    icon: '🕐',

    detect(text) {
      const t = String(text).trim();
      if (/^\d{9,13}$/.test(t)) return 0.7;
      return 0;
    },

    setInput(text) { this._setInput(String(text).trim()); },

    render(container) {
      const status = ui.status();
      let clockTimer = null;

      // --- live "now" clock ---
      const clockVal = ui.el('dd');
      const clockDl = ui.el('dl', { class: 'du-kv' }, [
        ui.el('dt', { text: 'Current Unix time' }), clockVal
      ]);
      function tickClock() { clockVal.textContent = String(Math.floor(Date.now() / 1000)); }
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
      // clean up when the tool view is removed from the DOM
      container._duCleanup = function () { clearInterval(clockTimer); };
      const observer = new MutationObserver(() => {
        if (!container.isConnected) {
          clearInterval(clockTimer);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // --- timestamp -> date ---
      const tsInput = ui.textarea('Unix timestamp (seconds or milliseconds), e.g. 1700000000', { rows: 1 });
      const tsOutDl = ui.el('dl', { class: 'du-kv' });
      const tsFields = {};
      ['Local time', 'UTC (ISO 8601)', 'Relative'].forEach(k => {
        const dd = ui.el('dd');
        tsFields[k] = dd;
        tsOutDl.appendChild(ui.el('dt', { text: k }));
        tsOutDl.appendChild(dd);
      });

      function convertTs(raw) {
        const t = stripNoise(raw);
        ['Local time', 'UTC (ISO 8601)', 'Relative'].forEach(k => { tsFields[k].textContent = ''; });
        if (!t) { status.clear(); return; }
        if (!/^-?\d+$/.test(t)) { status.error('Not a valid integer timestamp.'); return; }
        let n;
        try { n = BigInt(t); } catch (e) { status.error('Not a valid integer timestamp.'); return; }
        // seconds (~10 digits) vs milliseconds (~13 digits)
        const digits = t.replace('-', '').length;
        let ms;
        if (digits <= 11) ms = Number(n * 1000n);
        else ms = Number(n);
        const d = new Date(ms);
        if (isNaN(d.getTime())) { status.error('Timestamp out of range.'); return; }
        status.ok(digits <= 11 ? 'Interpreted as seconds.' : 'Interpreted as milliseconds.');
        tsFields['Local time'].textContent = d.toLocaleString();
        tsFields['UTC (ISO 8601)'].textContent = d.toISOString();
        tsFields['Relative'].textContent = relTime(d);
      }
      tsInput.addEventListener('input', () => convertTs(tsInput.value));

      // --- date -> timestamp ---
      const dtInput = ui.el('input', { class: 'du-input', type: 'datetime-local', step: '1' });
      const dtOutDl = ui.el('dl', { class: 'du-kv' });
      const dtFields = {};
      ['Unix seconds', 'Unix milliseconds'].forEach(k => {
        const dd = ui.el('dd');
        dtFields[k] = dd;
        dtOutDl.appendChild(ui.el('dt', { text: k }));
        dtOutDl.appendChild(dd);
      });
      dtInput.addEventListener('input', () => {
        dtFields['Unix seconds'].textContent = '';
        dtFields['Unix milliseconds'].textContent = '';
        if (!dtInput.value) { status.clear(); return; }
        const d = new Date(dtInput.value);
        if (isNaN(d.getTime())) { status.error('Invalid date/time.'); return; }
        const ms = d.getTime();
        dtFields['Unix seconds'].textContent = String(Math.floor(ms / 1000));
        dtFields['Unix milliseconds'].textContent = String(ms);
      });

      container.appendChild(ui.el('div', { class: 'du-card' }, [clockDl]));
      container.appendChild(ui.sectionTitle('Timestamp → Date'));
      container.appendChild(tsInput);
      container.appendChild(ui.toolbar([
        ui.button('Now', () => { tsInput.value = String(Math.floor(Date.now() / 1000)); convertTs(tsInput.value); }),
        ui.button('Clear', () => { tsInput.value = ''; convertTs(''); }),
        ui.copyButton(() => tsFields['UTC (ISO 8601)'].textContent)
      ]));
      container.appendChild(ui.el('div', { class: 'du-card' }, [tsOutDl]));
      container.appendChild(ui.sectionTitle('Date → Timestamp'));
      container.appendChild(ui.field('Local date & time', dtInput));
      container.appendChild(ui.el('div', { class: 'du-card' }, [dtOutDl]));
      container.appendChild(status.el);

      this._setInput = (text) => { tsInput.value = text; convertTs(text); };
    }
  });
})();
