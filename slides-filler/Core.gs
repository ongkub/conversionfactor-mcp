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
 * Table fill: the team owns the first column (labels like "1. CA+LAL"); we match each row to a candidate by key
 * and write only the numeric cells. cells = 2D array of current cell texts, row 0 = header.
 * Returns { edits: [{row, col, oldText, newText}], unmatchedRows: [label], unusedCandidates: [name] }.
 */
function planTableEdits(cells, op) {
  var edits = [];
  var unmatchedRows = [];
  var used = {};
  for (var r = 1; r < cells.length; r++) {
    var label = String(cells[r][0] || '');
    var key = normKey(label.replace(/^[ \t\u00a0]*\d+[ \t\u00a0]*[.)][ \t\u00a0]*/, ''));
    if (!key) continue;
    var found = -1;
    for (var i = 0; i < op.candidates.length; i++) {
      if (used[i]) continue;
      var ck = op.candidates[i].key;
      if (ck.indexOf(key) === 0 || key.indexOf(ck) === 0) { found = i; break; }
    }
    if (found < 0) { unmatchedRows.push(label.replace(/\s+/g, ' ').replace(/^ | $/g, '')); continue; }
    used[found] = true;
    var values = op.candidates[found].cells;
    for (var col in values) {
      if (!Object.prototype.hasOwnProperty.call(values, col)) continue;
      var c = Number(col);
      var old = String(cells[r][c] === undefined ? '' : cells[r][c]).replace(/[\s\u00a0]+$/, '');
      edits.push({ row: r, col: c, oldText: old, newText: values[col] });
    }
  }
  var unusedCandidates = [];
  for (var j = 0; j < op.candidates.length; j++) if (!used[j]) unusedCandidates.push(op.candidates[j].name);
  return { edits: edits, unmatchedRows: unmatchedRows, unusedCandidates: unusedCandidates };
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
  module.exports = { planTableEdits: planTableEdits, normKey: normKey, splitLines_: splitLines_, planShapeEdits: planShapeEdits, applyEdits_: applyEdits_, decideFill: decideFill, slideTitleMatches_: slideTitleMatches_, percentRange: percentRange, TONE_COLORS: TONE_COLORS, shapeMatches_: shapeMatches_ };
}
