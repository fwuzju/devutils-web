// Color Converter — hex / rgb / hsl input → HEX, RGB, HSL, HSV + preview swatch
(function () {
  const ui = DevUtils.ui;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function parseColor(raw) {
    const t = String(raw).trim().toLowerCase();
    let m;
    // #rgb / #rrggbb
    if ((m = /^#?([0-9a-f]{3})$/.exec(t))) {
      const h = m[1];
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 };
    }
    if ((m = /^#?([0-9a-f]{6})$/.exec(t))) {
      const h = m[1];
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    // rgb() / rgba()
    if ((m = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(t))) {
      const ch = (s, max) => s.endsWith('%') ? parseFloat(s) / 100 * max : parseFloat(s);
      const r = ch(m[1], 255), g = ch(m[2], 255), b = ch(m[3], 255);
      const a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      if ([r, g, b, a].some(isNaN)) return null;
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255 || a < 0 || a > 1) return null;
      return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
    }
    // hsl() / hsla()
    if ((m = /^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(t))) {
      const h = ((parseFloat(m[1]) % 360) + 360) % 360;
      const s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
      const a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      if ([h, s, l, a].some(isNaN) || s < 0 || s > 1 || l < 0 || l > 1 || a < 0 || a > 1) return null;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const mm = l - c / 2;
      let r, g, b;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return { r: Math.round((r + mm) * 255), g: Math.round((g + mm) * 255), b: Math.round((b + mm) * 255), a };
    }
    return null;
  }

  function toHex(n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'); }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = d / max;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  DevUtils.registerTool({
    id: 'color-converter',
    name: 'Color Converter',
    group: 'Converters',
    icon: '🎨',

    detect(text) {
      const t = String(text).trim();
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return 0.7;
      if (/^(rgb|hsl)a?\(/.test(t)) return 0.6;
      return 0;
    },

    setInput(text) { this._setInput(String(text).trim()); },

    render(container) {
      const status = ui.status();
      const input = ui.textarea('#ff8800, rgb(255,136,0), hsl(32,100%,50%)…', { rows: 1 });
      const swatch = ui.el('div', { class: 'du-swatch' });
      const kv = ui.el('dl', { class: 'du-kv' });
      const rows = {};
      ['HEX', 'RGB', 'HSL', 'HSV'].forEach(k => {
        const dd = ui.el('dd');
        rows[k] = dd;
        kv.appendChild(ui.el('dt', { text: k }));
        kv.appendChild(dd);
      });

      function convert() {
        ['HEX', 'RGB', 'HSL', 'HSV'].forEach(k => { rows[k].textContent = ''; });
        swatch.style.background = 'transparent';
        const raw = input.value.trim();
        if (!raw) { status.clear(); return; }
        const c = parseColor(raw);
        if (!c) { status.error('Unrecognized color format. Try #rrggbb, rgb(r,g,b) or hsl(h,s%,l%).'); return; }
        status.clear();
        const hex = '#' + toHex(c.r) + toHex(c.g) + toHex(c.b);
        const hsl = rgbToHsl(c.r, c.g, c.b);
        const hsv = rgbToHsv(c.r, c.g, c.b);
        rows['HEX'].textContent = hex.toUpperCase();
        rows['RGB'].textContent = c.a < 1
          ? 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a + ')'
          : 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')';
        rows['HSL'].textContent = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
        rows['HSV'].textContent = 'hsv(' + hsv.h + ', ' + hsv.s + '%, ' + hsv.v + '%)';
        swatch.style.background = 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a + ')';
      }
      input.addEventListener('input', convert);

      container.appendChild(input);
      container.appendChild(ui.toolbar([
        ui.button('Clear', () => { input.value = ''; convert(); }),
        ui.copyButton(() => rows['HEX'].textContent)
      ]));
      container.appendChild(ui.el('div', { class: 'du-card' }, [swatch]));
      container.appendChild(ui.el('div', { class: 'du-card' }, [kv]));
      container.appendChild(status.el);

      this._setInput = (text) => { input.value = text; convert(); };
    }
  });
})();
