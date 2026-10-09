// DevUtils Web — tool registry & shared UI helpers
// Every tool file calls DevUtils.registerTool({...}) exactly once.
window.DevUtils = (function () {
  const tools = [];

  function registerTool(def) {
    if (!def || !def.id || !def.name || !def.group || typeof def.render !== 'function') {
      throw new Error('registerTool: def must have id, name, group, render(container)');
    }
    tools.push(Object.assign({ icon: '🔧', detect: null }, def));
  }

  function getTools() { return tools.slice(); }
  function getTool(id) { return tools.find(t => t.id === id) || null; }

  // ---------- shared UI helpers (use these so all tools look consistent) ----------
  const ui = {};

  ui.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  };

  ui.textarea = function (placeholder, opts) {
    opts = opts || {};
    const ta = ui.el('textarea', { class: 'du-input', placeholder: placeholder || '', spellcheck: 'false' });
    if (opts.rows) ta.rows = opts.rows;
    if (opts.readonly) ta.readOnly = true;
    return ta;
  };

  ui.button = function (label, onClick, opts) {
    opts = opts || {};
    return ui.el('button', { class: 'du-btn' + (opts.primary ? ' du-btn-primary' : ''), text: label, onclick: onClick });
  };

  // copy-to-clipboard button; getText may be a function returning the text
  ui.copyButton = function (getText) {
    const btn = ui.button('Copy', async () => {
      const text = typeof getText === 'function' ? getText() : getText;
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = ui.el('textarea', { text }); document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove();
      }
      const old = btn.textContent; btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = old; }, 1200);
    });
    return btn;
  };

  ui.toolbar = function (buttons) {
    const bar = ui.el('div', { class: 'du-toolbar' });
    buttons.forEach(b => bar.appendChild(b));
    return bar;
  };

  ui.field = function (labelText, control) {
    return ui.el('label', { class: 'du-field' }, [
      ui.el('span', { class: 'du-field-label', text: labelText }), control
    ]);
  };

  // status line for errors / info (red for error, green for ok)
  ui.status = function () {
    const s = ui.el('div', { class: 'du-status' });
    return {
      el: s,
      error(msg) { s.textContent = msg; s.className = 'du-status du-status-error'; },
      ok(msg) { s.textContent = msg; s.className = 'du-status du-status-ok'; },
      clear() { s.textContent = ''; s.className = 'du-status'; }
    };
  };

  ui.sectionTitle = function (text) { return ui.el('div', { class: 'du-section-title', text }); };

  return { registerTool, getTools, getTool, ui };
})();
