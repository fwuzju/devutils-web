// DevUtils Web — app shell: routing, sidebar, search, theme, smart detection
(function () {
  const { getTools, getTool, ui } = window.DevUtils;

  // ---------- theme ----------
  const themeBtn = document.getElementById('theme-toggle');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
    localStorage.setItem('du-theme', t);
  }
  const savedTheme = localStorage.getItem('du-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);
  themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // ---------- sidebar ----------
  const toolListEl = document.getElementById('tool-list');
  const searchEl = document.getElementById('tool-search');
  const GROUP_ORDER = ['Formatters', 'Encoders / Decoders', 'Converters', 'Generators', 'Inspect / Debug'];

  function buildSidebar(filter) {
    toolListEl.innerHTML = '';
    const q = (filter || '').trim().toLowerCase();
    const groups = {};
    for (const t of getTools()) {
      if (q && !(t.name.toLowerCase().includes(q) || t.group.toLowerCase().includes(q))) continue;
      (groups[t.group] = groups[t.group] || []).push(t);
    }
    const orderedGroups = GROUP_ORDER.filter(g => groups[g]).concat(Object.keys(groups).filter(g => !GROUP_ORDER.includes(g)));
    for (const g of orderedGroups) {
      toolListEl.appendChild(ui.el('div', { class: 'tl-group', text: g }));
      for (const t of groups[g].sort((a, b) => a.name.localeCompare(b.name))) {
        const item = ui.el('div', { class: 'tl-item', 'data-id': t.id }, [
          ui.el('span', { class: 'tl-icon', text: t.icon }),
          ui.el('span', { text: t.name })
        ]);
        item.addEventListener('click', () => { location.hash = '#/' + t.id; });
        toolListEl.appendChild(item);
      }
    }
  }

  function markActive(id) {
    toolListEl.querySelectorAll('.tl-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });
  }

  searchEl.addEventListener('input', () => buildSidebar(searchEl.value));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchEl.focus(); }
  });

  // ---------- routing ----------
  const container = document.getElementById('tool-container');
  function route() {
    const id = decodeURIComponent((location.hash || '').replace(/^#\//, ''));
    const tool = getTool(id) || getTools()[0];
    if (!tool) return;
    if (getTool(id) == null) { location.hash = '#/' + tool.id; return; }
    container.innerHTML = '';
    const header = ui.el('div', { class: 'tool-header' }, [
      ui.el('h1', { class: 'tool-title', text: tool.icon + ' ' + tool.name }),
      ui.el('span', { class: 'tool-group-tag', text: tool.group })
    ]);
    container.appendChild(header);
    if (tool.desc) container.appendChild(ui.el('p', { class: 'tool-desc', text: tool.desc }));
    const pane = ui.el('div', { class: 'tool-pane' });
    container.appendChild(pane);
    tool.render(pane);
    markActive(tool.id);
    localStorage.setItem('du-last-tool', tool.id);
  }
  window.addEventListener('hashchange', route);

  // ---------- smart detection ----------
  const sdWrap = document.getElementById('smart-detect');
  const sdInput = document.getElementById('sd-input');
  const sdResults = document.getElementById('sd-results');
  sdWrap.classList.remove('hidden');

  let sdTimer = null;
  sdInput.addEventListener('input', () => {
    clearTimeout(sdTimer);
    sdTimer = setTimeout(runDetect, 200);
  });

  function runDetect() {
    sdResults.innerHTML = '';
    const text = sdInput.value.trim();
    if (text.length < 2) return;
    const scored = [];
    for (const t of getTools()) {
      if (typeof t.detect !== 'function') continue;
      let s = 0;
      try { s = t.detect(text) || 0; } catch (e) { /* ignore broken detectors */ }
      if (s > 0) scored.push([t, s]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    const currentId = (location.hash || '').replace(/^#\//, '');
    for (const [t, s] of scored.slice(0, 4)) {
      if (t.id === currentId) continue;
      const chip = ui.el('button', { class: 'sd-chip', text: t.icon + ' ' + t.name });
      chip.addEventListener('click', () => {
        const payload = text;
        location.hash = '#/' + t.id;
        // pass detected input to the tool if it exposes setInput
        setTimeout(() => {
          const tool = getTool(t.id);
          if (tool && typeof tool.setInput === 'function') tool.setInput(payload);
        }, 0);
      });
      sdResults.appendChild(chip);
    }
  }

  // ---------- boot ----------
  buildSidebar('');
  if (!location.hash) {
    const last = localStorage.getItem('du-last-tool');
    if (last && getTool(last)) location.hash = '#/' + last;
  }
  route();
})();
