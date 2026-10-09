// SQL Formatter
(function () {
  const ui = DevUtils.ui;

  // token types: word, str, comment, blockcomment, punct, op, space
  function tokenize(sql) {
    const tokens = [];
    let i = 0;
    const n = sql.length;
    while (i < n) {
      const c = sql[i];
      if (/\s/.test(c)) { i++; continue; } // whitespace is irrelevant
      if (c === '-' && sql[i + 1] === '-') {
        let j = i + 2;
        while (j < n && sql[j] !== '\n') j++;
        tokens.push({ type: 'comment', value: sql.slice(i, j) });
        i = j; continue;
      }
      if (c === '/' && sql[i + 1] === '*') {
        const end = sql.indexOf('*/', i + 2);
        const stop = end === -1 ? n : end + 2;
        tokens.push({ type: 'comment', value: sql.slice(i, stop) });
        i = stop; continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        let j = i + 1;
        while (j < n) {
          if (sql[j] === c) {
            if (sql[j + 1] === c) { j += 2; continue; } // '' escape
            j++; break;
          }
          j++;
        }
        tokens.push({ type: 'str', value: sql.slice(i, j) });
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$]/.test(sql[j])) j++;
        tokens.push({ type: 'word', value: sql.slice(i, j) });
        i = j; continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w.]/.test(sql[j])) j++;
        tokens.push({ type: 'word', value: sql.slice(i, j) });
        i = j; continue;
      }
      if (c === '(' || c === ')' || c === ',' || c === ';') {
        tokens.push({ type: 'punct', value: c });
        i++; continue;
      }
      tokens.push({ type: 'op', value: c });
      i++;
    }
    return tokens;
  }

  const KEYWORDS = new Set((
    'SELECT FROM WHERE GROUP BY ORDER HAVING LIMIT OFFSET UNION ALL JOIN INNER LEFT RIGHT FULL ' +
    'CROSS OUTER ON AND OR NOT AS IN IS NULL LIKE BETWEEN EXISTS CASE WHEN THEN ELSE END ASC DESC ' +
    'DISTINCT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP ADD COLUMN INDEX IF ' +
    'PRIMARY KEY FOREIGN REFERENCES DEFAULT UNIQUE CHECK CONSTRAINT CASCADE WITH RECURSIVE'
  ).split(' '));

  // function names that take '(' without a preceding space
  const SQL_FUNCS = new Set((
    'COUNT SUM AVG MIN MAX COALESCE NULLIF CAST UPPER LOWER LENGTH SUBSTRING SUBSTR TRIM NOW ' +
    'ABS ROUND CONCAT GROUP_CONCAT EXTRACT DATE DATEDIFF IFNULL ISNULL LAG LEAD RANK ROW_NUMBER'
  ).split(' '));

  // multi-word clauses that start a new line
  const NEWLINE_CLAUSES = [
    'GROUP BY', 'ORDER BY', 'UNION ALL',
    'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
    'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'INNER JOIN', 'CROSS JOIN', 'JOIN',
    'INSERT INTO', 'DELETE FROM',
    'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
    'UPDATE', 'SET', 'VALUES', 'DELETE'
  ];

  function matchClause(tokens, idx) {
    for (const clause of NEWLINE_CLAUSES) {
      const parts = clause.split(' ');
      let ok = true;
      for (let k = 0; k < parts.length; k++) {
        const t = tokens[idx + k];
        if (!t || t.type !== 'word' || t.value.toUpperCase() !== parts[k]) { ok = false; break; }
      }
      if (ok) return parts.length;
    }
    return 0;
  }

  // mark '(' tokens that wrap a subquery (contain SELECT before matching ')')
  function markSubqueries(tokens) {
    const subOpen = new Set(), subClose = new Set();
    const stack = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'punct' && t.value === '(') stack.push(i);
      else if (t.type === 'punct' && t.value === ')') {
        if (!stack.length) continue;
        const open = stack.pop();
        for (let k = open + 1; k < i; k++) {
          if (tokens[k].type === 'word' && tokens[k].value.toUpperCase() === 'SELECT') {
            subOpen.add(open);
            subClose.add(i);
            break;
          }
        }
      }
    }
    return { subOpen, subClose };
  }

  function format(sql, uppercase, indent) {
    const tokens = tokenize(sql);
    const { subOpen, subClose } = markSubqueries(tokens);
    const lines = [];
    let line = '', depth = 0;
    const pad = () => indent.repeat(depth);
    let lastWord = '';

    function flush() {
      const t = line.replace(/\s+$/, '');
      if (t) lines.push(pad() + t);
      line = '';
    }
    function append(str) {
      const endsOpen = /[\s(.]$/.test(line);
      const startsClose = /^[),;.]/.test(str);
      if (line && !endsOpen && !startsClose) line += ' ';
      line += str;
    }

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'comment') {
        flush();
        lines.push(pad() + t.value.replace(/\s+$/, ''));
        continue;
      }
      if (t.type === 'word') {
        const clauseLen = matchClause(tokens, i);
        if (clauseLen > 0) {
          flush();
          const words = [];
          for (let k = 0; k < clauseLen; k++) {
            const w = tokens[i + k].value;
            words.push(uppercase ? w.toUpperCase() : w);
          }
          line = words.join(' ');
          lastWord = words[words.length - 1].toUpperCase();
          i += clauseLen - 1;
          continue;
        }
        const w = uppercase && KEYWORDS.has(t.value.toUpperCase()) ? t.value.toUpperCase() : t.value;
        append(w);
        lastWord = t.value.toUpperCase();
        continue;
      }
      if (t.type === 'str') { append(t.value); lastWord = ''; continue; }
      if (t.type === 'punct') {
        if (t.value === '(') {
          if (subOpen.has(i)) {
            append('(');
            flush();
            depth++;
          } else {
            // no space after a function name (COUNT(), …), space elsewhere
            if (line && /[\w$]$/.test(line) && SQL_FUNCS.has(lastWord)) line += '(';
            else append('(');
          }
          lastWord = '';
          continue;
        }
        if (t.value === ')') {
          if (subClose.has(i)) {
            flush();
            depth = Math.max(0, depth - 1);
            line = ')';
          } else {
            append(')');
          }
          lastWord = '';
          continue;
        }
        if (t.value === ',') { append(','); lastWord = ''; continue; }
        if (t.value === ';') { append(';'); flush(); lastWord = ''; continue; }
      }
      // op
      append(t.value);
      lastWord = '';
    }
    flush();
    return lines.join('\n');
  }

  DevUtils.registerTool({
    id: 'sql-formatter',
    name: 'SQL Formatter',
    group: 'Formatters',
    icon: '▤',
    desc: 'Format SQL queries with keyword casing and line breaks',

    detect(text) {
      const t = (text || '').trim();
      if (/^(select|insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table|with)\b/i.test(t)) return 0.85;
      if (/\b(select)\b[\s\S]*\b(from)\b/i.test(t)) return 0.6;
      return 0;
    },

    render(container) {
      const input = ui.textarea('Paste SQL here…', { rows: 16 });
      const output = ui.el('div', { class: 'du-output-box' });
      const st = ui.status();

      const upperChk = ui.el('input', { type: 'checkbox', checked: 'checked' });
      const upperField = ui.field('Uppercase keywords', upperChk);

      function run() {
        const raw = input.value;
        if (!raw.trim()) { st.clear(); output.textContent = ''; return; }
        try {
          output.textContent = format(raw, upperChk.checked, '  ');
          st.clear();
        } catch (e) {
          st.error('Error: ' + (e.message || e));
        }
      }

      const bar = ui.toolbar([
        ui.button('Format', run, { primary: true }),
        upperField,
        ui.copyButton(() => output.textContent)
      ]);

      input.addEventListener('input', run);
      upperChk.addEventListener('change', run);

      const grid = ui.el('div', { class: 'du-grid-2' }, [
        ui.el('div', {}, [ui.sectionTitle('Input'), input]),
        ui.el('div', {}, [ui.sectionTitle('Output'), output])
      ]);
      container.appendChild(bar);
      container.appendChild(st.el);
      container.appendChild(grid);
      this._input = input;
      this._run = run;
    },

    setInput(text) {
      if (this._input) {
        this._input.value = text;
        this._run();
      }
    }
  });
})();
