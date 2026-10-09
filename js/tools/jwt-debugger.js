// JWT Debugger — decode & inspect JSON Web Tokens
(function () {
  const ui = DevUtils.ui;
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function base64UrlDecode(seg) {
    const std = seg.replace(/-/g, '+').replace(/_/g, '/');
    const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) throw new Error('Invalid base64url segment');
    const bytes = [];
    for (let i = 0; i < padded.length; i += 4) {
      const c0 = B64.indexOf(padded[i]);
      const c1 = B64.indexOf(padded[i + 1]);
      const c2 = padded[i + 2] === '=' ? -1 : B64.indexOf(padded[i + 2]);
      const c3 = padded[i + 3] === '=' ? -1 : B64.indexOf(padded[i + 3]);
      const n = (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3);
      bytes.push((n >> 16) & 255);
      if (c2 >= 0) bytes.push((n >> 8) & 255);
      if (c3 >= 0) bytes.push(n & 255);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  }

  function decodeSegment(seg, label) {
    let json;
    try {
      json = base64UrlDecode(seg);
    } catch (e) {
      throw new Error(label + ': not valid base64url (' + e.message + ')');
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(label + ': not valid JSON');
    }
  }

  function humanDuration(ms) {
    const s = Math.round(Math.abs(ms) / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm';
    return s + 's';
  }

  function makeCard(title, getText) {
    const body = ui.el('div', { class: 'du-output-box' });
    const card = ui.el('div', { class: 'du-card' }, [
      ui.toolbar([ui.sectionTitle(title), ui.copyButton(getText)]),
      body
    ]);
    return { card, body };
  }

  DevUtils.registerTool({
    id: 'jwt-debugger',
    name: 'JWT Debugger',
    group: 'Encoders / Decoders',
    icon: '🔑',
    detect(text) {
      return /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test((text || '').trim()) ? 0.95 : 0;
    },
    render(container) {
      const input = ui.textarea('Paste a JWT (eyJhbGciOi…) here…', { rows: 4 });
      this._input = input;
      const status = ui.status();

      const headerCard = makeCard('Header', () => headerCard.body.textContent);
      const payloadCard = makeCard('Payload', () => payloadCard.body.textContent);
      const sigBox = ui.el('div', { class: 'du-output-box' });
      const timesCard = ui.el('div', { class: 'du-card' });
      const resultsWrap = ui.el('div');

      function renderTimes(payload) {
        timesCard.innerHTML = '';
        const keys = [['exp', 'Expires at'], ['iat', 'Issued at'], ['nbf', 'Not before']];
        const present = keys.filter(([k]) => typeof payload[k] === 'number');
        if (!present.length) { timesCard.style.display = 'none'; return; }
        timesCard.style.display = '';
        const dl = ui.el('dl', { class: 'du-kv' });
        const now = Date.now();
        for (const [k, label] of present) {
          const d = new Date(payload[k] * 1000);
          let extra = '';
          if (k === 'exp') {
            const diff = payload[k] * 1000 - now;
            if (diff < 0) {
              extra = ' — Expired';
            } else {
              extra = ' — expires in ' + humanDuration(diff);
            }
          }
          const dd = ui.el('dd', { text: label + ': ' + d.toLocaleString() + extra });
          if (k === 'exp') {
            dd.style.color = payload[k] * 1000 - now < 0 ? '#d32f2f' : '#2e7d32';
            dd.style.fontWeight = '600';
          }
          dl.appendChild(ui.el('dt', { text: k }));
          dl.appendChild(dd);
        }
        timesCard.appendChild(ui.sectionTitle('Timestamps'));
        timesCard.appendChild(dl);
      }

      function process() {
        const token = input.value.trim();
        status.clear();
        resultsWrap.style.display = token ? '' : 'none';
        if (!token) return;
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[0] || !parts[1]) {
          status.error('Not a valid JWT: expected 3 dot-separated segments (header.payload.signature)');
          resultsWrap.style.display = 'none';
          return;
        }
        let header, payload;
        try {
          header = decodeSegment(parts[0], 'Header');
          payload = decodeSegment(parts[1], 'Payload');
        } catch (e) {
          status.error(e.message);
          resultsWrap.style.display = 'none';
          return;
        }
        headerCard.body.textContent = JSON.stringify(header, null, 2);
        payloadCard.body.textContent = JSON.stringify(payload, null, 2);
        sigBox.textContent = parts[2] || '(empty signature)';
        renderTimes(payload);
        resultsWrap.style.display = '';
      }

      input.addEventListener('input', process);

      container.appendChild(input);
      container.appendChild(status.el);
      const sigCard = ui.el('div', { class: 'du-card' }, [
        ui.toolbar([ui.sectionTitle('Signature'), ui.copyButton(() => sigBox.textContent)]),
        sigBox
      ]);
      resultsWrap.appendChild(headerCard.card);
      resultsWrap.appendChild(payloadCard.card);
      resultsWrap.appendChild(timesCard);
      resultsWrap.appendChild(sigCard);
      resultsWrap.style.display = 'none';
      container.appendChild(resultsWrap);
    },
    setInput(text) {
      if (this._input) {
        this._input.value = text;
        this._input.dispatchEvent(new Event('input'));
      }
    }
  });
})();
