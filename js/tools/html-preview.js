// HTML Preview — render HTML in a sandboxed iframe, live
(function () {
  const { registerTool, ui } = window.DevUtils;

  let input;

  registerTool({
    id: 'html-preview',
    name: 'HTML Preview',
    group: 'Inspect / Debug',
    icon: '👁',
    desc: 'Live-render HTML in a sandboxed iframe (scripts allowed, fully offline).',
    detect(text) {
      const t = text.trim();
      if (/^<!doctype\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 0.9;
      if (/<(div|p|span|body|head|table|h[1-6]|script|style)[\s>]/i.test(t)) return 0.5;
      return 0;
    },
    setInput(text) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
    },
    render(container) {
      const status = ui.status();

      input = ui.textarea('<h1>Hello</h1>\n<p>Type HTML here…</p>', { rows: 12 });

      const iframe = ui.el('iframe', {
        sandbox: 'allow-scripts',
        title: 'HTML preview',
        style: 'width:100%;min-height:420px;background:#ffffff;border:1px solid #8884;border-radius:8px;'
      });

      function update() {
        iframe.srcdoc = input.value;
        status.clear();
      }

      function openInNewTab() {
        const blob = new Blob([input.value], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }

      let timer = null;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(update, 300);
      });

      container.appendChild(input);
      container.appendChild(ui.toolbar([
        ui.button('Open in new tab', openInNewTab, { primary: true }),
        ui.copyButton(() => input.value)
      ]));
      container.appendChild(status.el);
      container.appendChild(ui.el('p', {
        text: 'Note: the preview always renders on a white background, regardless of the app theme. The iframe is sandboxed (allow-scripts only).'
      }));
      container.appendChild(ui.sectionTitle('Preview'));
      container.appendChild(iframe);

      update();
    }
  });
})();
