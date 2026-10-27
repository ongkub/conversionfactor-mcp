/**
 * Pure logic for the Sangthai monthly report filler (no SlidesApp calls, so it can be tested with node).
 * Payload schema: "sangthai-slides/1" — produced by the MCP tool get_monthly_report_data (section 7).
 */

// Same rule as the backend branchMatchKey(): deck titles and campaign names spell branches differently.
function normKey(name) {
  return String(name).replace(/อ\./g, '').replace(/[\s\-–. ]/g, '');
}

var BLANK_ = /[ \t ]/;

// Split on newline / vertical tab (a Slides line break). Returns [{start, contentEnd}] — contentEnd drops trailing blanks.
function splitLines_(text) {
  var lines = [];
  var start = 0;
  for (var i = 0; i <= text.length; i++) {
    var c = text.charAt(i);
    if (i === text.length || c === '\n' || c === '\u000b' || c === '\r') {
      var end = i;
      while (end > start && BLANK_.test(text.charAt(end - 1))) end--;
      lines.push({ start: start, contentEnd: end });
      start = i + 1;
    }
  }
  return lines;
}

function skipBlanks_(text, i, limit) {
  while (i < limit && BLANK_.test(text.charAt(i))) i++;
  return i;
}

/**
 * Where does `op` put its value inside this shape's text?
 * Returns [{start, end, oldText, newText}] (empty when the anchor line is not found).
 */
function planShapeEdits(text, op) {
  var edits = [];
  if (op.mode === 'regex') {
    var re = new RegExp(op.pattern, 'g');
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      edits.push({ start: m.index, end: m.index + m[0].length, oldText: m[0], newText: op.value });
    }
    return edits;
  }

  var lines = splitLines_(text);
  var from = 0;
  var to = lines.length;
  if (op.section) {
    var s = -1;
    for (var i = 0; i < lines.length; i++) {
      var t = text.slice(lines[i].start, lines[i].contentEnd).replace(/^[ \t ]+/, '');
      if (t.indexOf(op.section) === 0) { s = i; break; }
    }
    if (s < 0) return [];
    from = s + 1;
    for (var j = from; j < lines.length; j++) {
      var tj = text.slice(lines[j].start, lines[j].contentEnd).replace(/^[ \t ]+/, '');
      if (/^\d+\.\s/.test(tj)) { to = j; break; }
    }
  }

  for (var k = from; k < to; k++) {
    var ln = lines[k];
    var p = skipBlanks_(text, ln.start, ln.contentEnd);
    if (text.indexOf(op.label, p) !== p) continue;
    var q = skipBlanks_(text, p + op.label.length, ln.contentEnd);
    if (q >= ln.contentEnd || (text.charAt(q) !== ':' && text.charAt(q) !== '=')) continue;
    var colon = q;
    var valueStart = skipBlanks_(text, colon + 1, ln.contentEnd);
    var end = ln.contentEnd;

    if (op.mode === 'colon_until_paren') {
      var paren = text.indexOf('(', valueStart);
      if (paren >= 0 && paren < ln.contentEnd) {
        end = paren;
        while (end > valueStart && BLANK_.test(text.charAt(end - 1))) end--;
      }
    } else if (op.mode === 'after_marker') {
      var at = text.indexOf(op.marker, colon);
      if (at < 0 || at >= ln.contentEnd) continue;
      valueStart = at + op.marker.length;
    }
    if (valueStart > end) valueStart = end;
    return [{ start: valueStart, end: end, oldText: text.slice(valueStart, end), newText: op.value }];
  }
  return [];
}

/**
 * Table fill: the team owns the first column (labels like "1. CA+LAL"); we match each row to a candidate and write
 * only the other cells. cells = 2D array of current cell texts, row 0 = header.
 * Matching, strongest first (case-insensitive, spaces/dots/dashes ignored):
 *   1. exact key (candidate key or alias)   2. one key is a prefix of the other
 *   3. same last segment after " - " (team label "GDN-Sangthai - Custom intent 70%" vs "GDN-Tier 1&2 - Custom intent 70%")
 * Returns { edits: [{row, col, oldText, newText}], unmatchedRows: [label], unusedCandidates: [name] }.
 */
function planTableEdits(cells, op) {
  var low = function (v) { return normKey(v).toLowerCase(); };
  var lastSegment = function (v) {
    var parts = String(v).split(/[ \t\u00a0]-[ \t\u00a0]/);
    return parts.length > 1 ? low(parts[parts.length - 1]) : null;
  };
  var cands = op.candidates.map(function (c) {
    var keys = [String(c.key).toLowerCase()];
    (c.aliases || []).forEach(function (a) { keys.push(low(a)); });
    return { keys: keys, last: lastSegment(c.name), c: c };
  });

  var rows = [];
  for (var r = 1; r < cells.length; r++) {
    var label = String(cells[r][0] || '');
    var stripped = label.replace(/^[ \t\u00a0]*\d+[ \t\u00a0]*[.)][ \t\u00a0]*/, '');
    var key = low(stripped);
    // second header row ("Current 16/09/2026 - …") is not a data row
    if (/^[ \t\u00a0]*(Current|Previous|Difference)\b/.test(label)) continue;
    if (key) rows.push({ r: r, label: label, key: key, last: lastSegment(stripped), cand: -1 });
  }

  var used = {};
  var passes = [
    function (row, cd) { return cd.keys.indexOf(row.key) >= 0; },
    function (row, cd) {
      return cd.keys.some(function (k) { return k.indexOf(row.key) === 0 || (k.length >= 3 && row.key.indexOf(k) === 0); });
    },
    function (row, cd) { return !!row.last && !!cd.last && row.last === cd.last; },
  ];
  passes.forEach(function (test) {
    rows.forEach(function (row) {
      if (row.cand >= 0) return;
      for (var i = 0; i < cands.length; i++) {
        if (used[i] || !test(row, cands[i])) continue;
        row.cand = i;
        used[i] = true;
        return;
      }
    });
  });

  var edits = [];
  var unmatchedRows = [];
  rows.forEach(function (row) {
    if (row.cand < 0) { unmatchedRows.push(row.label.replace(/\s+/g, ' ').replace(/^ | $/g, '')); return; }
    var values = cands[row.cand].c.cells;
    for (var col in values) {
      if (!Object.prototype.hasOwnProperty.call(values, col)) continue;
      var c = Number(col);
      var old = String(cells[row.r][c] === undefined ? '' : cells[row.r][c]).replace(/[\s\u00a0]+$/, '');
      edits.push({ row: row.r, col: c, oldText: old, newText: values[col] });
    }
  });
  var unusedCandidates = [];
  for (var j = 0; j < cands.length; j++) if (!used[j]) unusedCandidates.push(cands[j].c.name);
  return { edits: edits, unmatchedRows: unmatchedRows, unusedCandidates: unusedCandidates };
}

/**
 * Header cells "Current / 16/09/2026 / - / 15/10/2026" and "Previous …": replace the two dates of each.
 * Returns [{row, col, start, end, oldText, newText}] for rows 0-2.
 */
function planHeaderDateEdits(cells, headerDates) {
  var edits = [];
  for (var r = 0; r < Math.min(3, cells.length); r++) {
    for (var c = 0; c < cells[r].length; c++) {
      var text = String(cells[r][c] || '');
      var which = text.indexOf('Current') >= 0 ? headerDates.current : text.indexOf('Previous') >= 0 ? headerDates.previous : null;
      if (!which) continue;
      var re = /\d{2}\/\d{2}\/\d{4}/g;
      var m;
      var i = 0;
      while ((m = re.exec(text)) !== null && i < 2) {
        if (m[0] !== which[i]) edits.push({ row: r, col: c, start: m.index, end: m.index + m[0].length, oldText: m[0], newText: which[i] });
        i++;
      }
    }
  }
  return edits;
}

/**
 * Rows of a table as the reader sees them: cells that cannot be read (merged, not the top-left one) are left out.
 * readCell(r, c) returns the text or throws. Returns { texts[r][k], cols[r][k] } where cols maps the k-th visible
 * cell back to its real column — a label spanning 2 columns makes "Amount spent" visible column 1, grid column 2.
 */
function buildGrid(numRows, numCols, readCell) {
  var texts = [];
  var cols = [];
  for (var r = 0; r < numRows; r++) {
    var rowTexts = [];
    var rowCols = [];
    for (var c = 0; c < numCols; c++) {
      var text;
      try { text = readCell(r, c); } catch (e) { continue; }
      rowTexts.push(text);
      rowCols.push(c);
    }
    texts.push(rowTexts);
    cols.push(rowCols);
  }
  return { texts: texts, cols: cols };
}

// Apply edits to a string (used by tests; the real script edits ranges one by one, last first).
function applyEdits_(text, edits) {
  var sorted = edits.slice().sort(function (a, b) { return b.start - a.start; });
  var out = text;
  for (var i = 0; i < sorted.length; i++) {
    out = out.slice(0, sorted[i].start) + sorted[i].newText + out.slice(sorted[i].end);
  }
  return out;
}

/**
 * 'unchanged' | 'skipped_edited' | 'fill'
 * stored = the value this script wrote last time (null on the first run).
 * If the box no longer holds what we wrote, the team edited it → skip unless force.
 */
function decideFill(oldText, newText, stored, force) {
  if (oldText === newText) return 'unchanged';
  if (!force && stored !== null && stored !== undefined && oldText !== stored) return 'skipped_edited';
  return 'fill';
}

// Colour code for the trailing "(…%)" part of a value (green = better, red = worse, yellow = about the same)
var TONE_COLORS = { good: '#22BA4F', bad: '#FF0000', neutral: '#FBAB01' };

// Offsets of the "(…)" tail inside newText, or null when it has none
function percentRange(newText) {
  var open = newText.lastIndexOf('(');
  if (open < 0 || newText.charAt(newText.length - 1) !== ')') return null;
  return { from: open, to: newText.length };
}

function slideTitleMatches_(shapeText, selector) {
  var t = shapeText.replace(/^[ \t \n]+/, '');
  if (t.indexOf(selector.titlePrefix) !== 0) return false;
  return normKey(t.slice(selector.titlePrefix.length)) === selector.titleKey;
}

function shapeMatches_(text, selector) {
  if (selector.containsText && text.indexOf(selector.containsText) < 0) return false;
  if (selector.matches && !new RegExp(selector.matches).test(text)) return false;
  return true;
}

if (typeof module !== 'undefined') {
  module.exports = { buildGrid: buildGrid, planHeaderDateEdits: planHeaderDateEdits, planTableEdits: planTableEdits, normKey: normKey, splitLines_: splitLines_, planShapeEdits: planShapeEdits, applyEdits_: applyEdits_, decideFill: decideFill, slideTitleMatches_: slideTitleMatches_, percentRange: percentRange, TONE_COLORS: TONE_COLORS, shapeMatches_: shapeMatches_ };
}
