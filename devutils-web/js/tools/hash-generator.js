// Hash Generator — MD5 + SHA family digests of the input text
(function () {
  const { registerTool, ui } = window.DevUtils;

  const SHA_ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

  function toHex(buf) {
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  }

  registerTool({
    id: 'hash-generator',
    name: 'Hash Generator',
    group: 'Generators',
    icon: '#️⃣',
    desc: 'Compute MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text.',
    render(container) {
      const input = ui.textarea('Text to hash…', { rows: 5 });
      const upperCb = ui.el('input', { type: 'checkbox' });
      const status = ui.status();
      const kv = ui.el('dl', { class: 'du-kv' });
      let runId = 0;

      const rows = {};
      ['MD5'].concat(SHA_ALGOS).forEach(algo => {
        const val = ui.el('span');
        const copyBtn = ui.copyButton(() => val.textContent);
        copyBtn.style.padding = '1px 8px';
        copyBtn.style.marginLeft = '8px';
        const dd = ui.el('dd', {}, [val, copyBtn]);
        kv.appendChild(ui.el('dt', { text: algo }));
        kv.appendChild(dd);
        rows[algo] = val;
      });

      async function update() {
        const myId = ++runId;
        const text = input.value;
        const apply = h => upperCb.checked ? h.toUpperCase() : h;
        try {
          rows['MD5'].textContent = apply(window.md5(text));
          if (!crypto.subtle) throw new Error('crypto.subtle unavailable');
          const data = new TextEncoder().encode(text);
          const digests = await Promise.all(SHA_ALGOS.map(a => crypto.subtle.digest(a, data)));
          if (myId !== runId) return; // a newer run superseded this one
          SHA_ALGOS.forEach((a, i) => { rows[a].textContent = apply(toHex(digests[i])); });
          status.clear();
        } catch (e) {
          if (myId !== runId) return;
          status.error('Hashing failed: ' + e.message);
        }
      }

      input.addEventListener('input', update);
      upperCb.addEventListener('change', update);

      container.appendChild(input);
      container.appendChild(ui.toolbar([ui.field('Uppercase', upperCb)]));
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('Hashes'));
      container.appendChild(kv);
      update();
    }
  });
})();
