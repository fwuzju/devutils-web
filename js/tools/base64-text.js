// Base64 Encode/Decode — UTF-8 safe
(function () {
  const ui = DevUtils.ui;
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function bytesToBase64(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : null;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : null;
      out += B64[b0 >> 2];
      out += B64[((b0 & 3) << 4) | (b1 === null ? 0 : b1 >> 4)];
      out += b1 === null ? '=' : B64[((b1 & 15) << 2) | (b2 === null ? 0 : b2 >> 6)];
      out += b2 === null ? '=' : B64[b2 & 63];
    }
    return out;
  }

  function base64ToBytes(str) {
    const clean = str.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
      throw new Error('Invalid Base64 string');
    }
    const bytes = [];
    for (let i = 0; i < clean.length; i += 4) {
      const c0 = B64.indexOf(clean[i]);
      const c1 = B64.indexOf(clean[i + 1]);
      const c2 = clean[i + 2] === '=' ? -1 : B64.indexOf(clean[i + 2]);
      const c3 = clean[i + 3] === '=' ? -1 : B64.indexOf(clean[i + 3]);
      const n = (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3);
      bytes.push((n >> 16) & 255);
      if (c2 >= 0) bytes.push((n >> 8) & 255);
      if (c3 >= 0) bytes.push(n & 255);
    }
    return new Uint8Array(bytes);
  }

  function encodeText(str) {
    return bytesToBase64(new TextEncoder().encode(str));
  }

  function decodeText(str) {
    const bytes = base64ToBytes(str);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      throw new Error('Decoded bytes are not valid UTF-8 text');
    }
  }

  DevUtils.registerTool({
    id: 'base64-text',
    name: 'Base64 Encode/Decode',
    group: 'Encoders / Decoders',
    icon: '🔠',
    detect(text) {
      const t = (text || '').trim();
      if (!/^[A-Za-z0-9+/\s]+={0,2}$/.test(t)) return 0;
      const clean = t.replace(/\s+/g, '');
      if (!clean) return 0;
      try {
        const decoded = decodeText(clean);
        if (decoded.length > 0 && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(decoded)) return 0.6;
      } catch (e) { /* not decodable */ }
      return 0;
    },
    render(container) {
      let mode = 'encode';
      const input = ui.textarea('Enter text or Base64 here…', { rows: 6 });
      this._input = input;
      const output = ui.el('div', { class: 'du-output-box' });
      const status = ui.status();
      const modeBtns = {};

      function highlight() {
        for (const m of ['encode', 'decode']) {
          modeBtns[m].className = 'du-btn' + (m === mode ? ' du-btn-primary' : '');
        }
      }

      function process() {
        const text = input.value;
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          output.textContent = mode === 'encode' ? encodeText(text) : decodeText(text);
        } catch (e) {
          output.textContent = '';
          status.error(e.message);
        }
      }

      function setMode(m) {
        mode = m;
        highlight();
        process();
      }

      modeBtns.encode = ui.button('Encode', () => setMode('encode'));
      modeBtns.decode = ui.button('Decode', () => setMode('decode'));

      const useAsInput = ui.button('Use as input', () => {
        if (!output.textContent) return;
        input.value = output.textContent;
        setMode(mode === 'encode' ? 'decode' : 'encode');
      });

      input.addEventListener('input', process);

      container.appendChild(ui.toolbar([
        modeBtns.encode, modeBtns.decode,
        useAsInput,
        ui.copyButton(() => output.textContent)
      ]));
      container.appendChild(input);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Output'));
      container.appendChild(output);
      highlight();
    },
    setInput(text) {
      if (this._input) {
        this._input.value = text;
        this._input.dispatchEvent(new Event('input'));
      }
    }
  });
})();
