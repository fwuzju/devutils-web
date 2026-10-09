(function () {
  const VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'];

  const ATTR_MAP = {
    'class': 'className',
    'for': 'htmlFor',
    'tabindex': 'tabIndex',
    'colspan': 'colSpan',
    'rowspan': 'rowSpan',
    'maxlength': 'maxLength',
    'minlength': 'minLength',
    'readonly': 'readOnly',
    'cellpadding': 'cellPadding',
    'cellspacing': 'cellSpacing',
    'usemap': 'useMap',
    'frameborder': 'frameBorder',
    'contenteditable': 'contentEditable',
    'crossorigin': 'crossOrigin',
    'datetime': 'dateTime',
    'enctype': 'encType',
    'formaction': 'formAction',
    'formenctype': 'formEncType',
    'formmethod': 'formMethod',
    'formnovalidate': 'formNoValidate',
    'formtarget': 'formTarget',
    'hreflang': 'hrefLang',
    'inputmode': 'inputMode',
    'marginheight': 'marginHeight',
    'marginwidth': 'marginWidth',
    'novalidate': 'noValidate',
    'radiogroup': 'radioGroup',
    'spellcheck': 'spellCheck',
    'srcdoc': 'srcDoc',
    'srclang': 'srcLang',
    'srcset': 'srcSet',
    'autoplay': 'autoPlay',
    'autofocus': 'autoFocus',
    'autocomplete': 'autoComplete',
    'allowfullscreen': 'allowFullScreen',
    'charset': 'charSet',
    'http-equiv': 'httpEquiv'
  };

  function camelCase(s) {
    return s.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
  }

  function convertAttrName(name) {
    const lower = name.toLowerCase();
    if (ATTR_MAP[lower]) return ATTR_MAP[lower];
    if (/^(data|aria)-/.test(lower)) return lower;
    if (/^on[a-z]+$/.test(lower)) {
      // onclick -> onClick, onchange -> onChange, …
      const known = {
        onclick: 'onClick', ondblclick: 'onDoubleClick', onchange: 'onChange',
        oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown',
        onkeyup: 'onKeyUp', onkeypress: 'onKeyPress', onmousedown: 'onMouseDown',
        onmouseup: 'onMouseUp', onmouseover: 'onMouseOver', onmouseout: 'onMouseOut',
        onmousemove: 'onMouseMove', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave',
        onfocus: 'onFocus', onblur: 'onBlur', onload: 'onLoad', onerror: 'onError',
        onscroll: 'onScroll', onresize: 'onResize', oncontextmenu: 'onContextMenu',
        ondragstart: 'onDragStart', ondragover: 'onDragOver', ondrop: 'onDrop',
        ontouchstart: 'onTouchStart', ontouchmove: 'onTouchMove', ontouchend: 'onTouchEnd'
      };
      return known[lower] || ('on' + lower.slice(2, 3).toUpperCase() + lower.slice(3));
    }
    if (lower.indexOf('-') !== -1) return camelCase(lower);
    return lower;
  }

  function styleToObject(styleStr) {
    const props = styleStr.split(';').map(s => s.trim()).filter(Boolean);
    const pairs = props.map(decl => {
      const idx = decl.indexOf(':');
      if (idx === -1) return null;
      const key = camelCase(decl.slice(0, idx).trim());
      let value = decl.slice(idx + 1).trim().replace(/'/g, "\\'");
      return key + ': \'' + value + '\'';
    }).filter(Boolean);
    return 'style={{' + pairs.join(', ') + '}}';
  }

  // Split attribute string into name/value pairs (handles quoted values)
  function parseAttrs(attrStr) {
    const attrs = [];
    const re = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m;
    while ((m = re.exec(attrStr))) {
      const name = m[1];
      const value = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : (m[5] !== undefined ? m[5] : null));
      attrs.push({ name, value });
    }
    return attrs;
  }

  function renderAttrs(attrStr) {
    return parseAttrs(attrStr).map(({ name, value }) => {
      if (name.toLowerCase() === 'style' && value !== null) {
        return styleToObject(value);
      }
      const jsxName = convertAttrName(name);
      return value === null ? jsxName : jsxName + '="' + value + '"';
    });
  }

  function convert(html) {
    const tokens = html.split(/(<!--[\s\S]*?-->|<[^>]+>)/g).filter(t => t !== '');
    const out = [];
    const stack = [];
    let indent = 0;
    const pad = () => '  '.repeat(indent);

    function pushLine(text) { out.push(pad() + text); }

    tokens.forEach(tok => {
      if (tok.startsWith('<!--')) {
        const body = tok.slice(4, -3).trim();
        pushLine('{/* ' + body + ' */}');
      } else if (tok.startsWith('</')) {
        const name = tok.slice(2, -1).trim().toLowerCase();
        // pop matching tag (tolerate mismatches)
        let idx = stack.lastIndexOf(name);
        if (idx === -1) { pushLine(tok); return; }
        while (stack.length > idx) {
          stack.pop();
          indent = Math.max(0, indent - 1);
        }
        pushLine('</' + name + '>');
      } else if (tok.startsWith('<')) {
        const inner = tok.slice(1, -1);
        const selfClosing = /\/\s*$/.test(inner);
        const body = selfClosing ? inner.replace(/\/\s*$/, '') : inner;
        const nameMatch = body.match(/^\s*([^\s/>]+)/);
        if (!nameMatch) { pushLine(tok); return; }
        const name = nameMatch[1].toLowerCase();
        if (name === '!doctype' || name.startsWith('!')) return; // skip doctype
        const attrStr = body.slice(nameMatch[0].length).trim();
        const attrs = renderAttrs(attrStr);
        const attrText = attrs.length ? ' ' + attrs.join(' ') : '';
        if (selfClosing || VOID_TAGS.indexOf(name) !== -1) {
          pushLine('<' + name + attrText + ' />');
        } else {
          pushLine('<' + name + attrText + '>');
          stack.push(name);
          indent++;
        }
      } else {
        // text node: keep non-whitespace content on its own line
        const text = tok.replace(/\s+/g, ' ').trim();
        if (text) pushLine(text);
      }
    });

    return out.join('\n');
  }

  DevUtils.registerTool({
    id: 'html-to-jsx',
    name: 'HTML → JSX',
    group: 'Converters',
    icon: '⚛',
    desc: 'Convert HTML markup to JSX',

    detect(text) {
      const t = text.trim();
      if (!/^<[a-zA-Z!]/.test(t) || t.indexOf('>') === -1) return 0;
      if (/<[a-z][^>]*\sclass\s*=/i.test(t)) return 0.4;
      return 0.2;
    },

    render(container) {
      const ui = DevUtils.ui;

      const input = ui.textarea('Paste HTML here…', { rows: 12 });
      const output = ui.el('pre', { class: 'du-output-box' });
      const status = ui.status();

      function convertNow() {
        const text = input.value.trim();
        status.clear();
        if (!text) { output.textContent = ''; return; }
        try {
          output.textContent = convert(text);
          status.ok('Converted');
        } catch (e) {
          output.textContent = '';
          status.error(e.message || String(e));
        }
      }

      input.addEventListener('input', convertNow);

      container.appendChild(ui.toolbar([
        ui.button('Convert', convertNow, { primary: true }),
        ui.copyButton(() => output.textContent)
      ]));
      container.appendChild(input);
      container.appendChild(status.el);
      container.appendChild(ui.sectionTitle('JSX Output'));
      container.appendChild(output);

      this.setInput = function (text) {
        input.value = text;
        convertNow();
      };
    }
  });
})();
