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
/** Sørensen–Dice similarity of two strings by character bigrams (0..1). */
function diceBigrams(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  var grams = {};
  var total = 0;
  for (var i = 0; i < a.length - 1; i++) { var g = a.substr(i, 2); grams[g] = (grams[g] || 0) + 1; total++; }
  var hits = 0;
  for (var j = 0; j < b.length - 1; j++) {
    var h = b.substr(j, 2);
    if (grams[h] > 0) { grams[h]--; hits++; }
  }
  return (2 * hits) / (total + (b.length - 1));
}

function matchLabels_(labels, candidates) {
  var low = function (v) { return normKey(v).toLowerCase(); };
  var lastSegment = function (v) {
    var parts = String(v).split(/[ \t\u00a0]-[ \t\u00a0]/);
    return parts.length > 1 ? low(parts[parts.length - 1]) : null;
  };
  // Meta ad-set names start with a counter ("1_Sangthai Page …", "5_Construction …") that the team's labels drop
  var dropCounter = function (k) { return k.replace(/^\d+[._)]/, ''); };
  var cands = (candidates || []).map(function (c) {
    var keys = [String(c.key).toLowerCase()];
    (c.aliases || []).forEach(function (a) { keys.push(low(a)); });
    var withoutCounter = keys.map(dropCounter);
    withoutCounter.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    return { keys: keys, last: lastSegment(c.name) };
  });

  var items = labels.map(function (label) {
    var stripped = String(label || '').replace(/^[ \t\u00a0]*\d+[ \t\u00a0]*[.)][ \t\u00a0]*/, '');
    return { key: low(stripped), last: lastSegment(stripped), cand: -1 };
  });

  var used = {};
  var passes = [
    function (item, cd) { return cd.keys.indexOf(item.key) >= 0; },
    function (item, cd) {
      return cd.keys.some(function (k) { return k.indexOf(item.key) === 0 || (k.length >= 3 && item.key.indexOf(k) === 0); });
    },
    function (item, cd) { return !!item.last && !!cd.last && item.last === cd.last; },
    // the team shortened the ad-set name ("Retargeting + 1% lookalike" inside "Sangthai Page Retargeting + 1%Lookalike")
    function (item, cd) {
      return item.key.length >= 8 && cd.keys.some(function (k) { return k.length >= 8 && (k.indexOf(item.key) >= 0 || item.key.indexOf(k) >= 0); });
    },
  ];
  passes.forEach(function (test) {
    items.forEach(function (item) {
      if (item.cand >= 0 || !item.key) return;
      for (var i = 0; i < cands.length; i++) {
        if (used[i] || !test(item, cands[i])) continue;
        item.cand = i;
        used[i] = true;
        return;
      }
    });
  });

  // last resort: near-identical names (comma vs plus, "ST850PN" vs "ST850") — best unused candidate above a high similarity
  items.forEach(function (item) {
    if (item.cand >= 0 || item.key.length < 8) return;
    var best = -1;
    var bestScore = 0.8;
    for (var i = 0; i < cands.length; i++) {
      if (used[i]) continue;
      for (var k = 0; k < cands[i].keys.length; k++) {
        var score = diceBigrams(item.key, cands[i].keys[k]);
        if (score >= bestScore) { bestScore = score; best = i; }
      }
    }
    if (best >= 0) { item.cand = best; used[best] = true; }
  });

  return items.map(function (item) { return item.cand; });
}

function planTableEdits(cells, op) {
  var rows = [];
  for (var r = 1; r < cells.length; r++) {
    var label = String(cells[r][0] || '');
    var stripped = label.replace(/^[ \t\u00a0]*\d+[ \t\u00a0]*[.)][ \t\u00a0]*/, '');
    var key = normKey(stripped).toLowerCase();
    // second header row ("Current 16/09/2026 - …") is not a data row
    if (/^[ \t\u00a0]*(Current|Previous|Difference)\b/.test(label)) continue;
    if (key) rows.push({ r: r, label: label });
  }

  var matches = matchLabels_(rows.map(function (row) { return row.label; }), op.candidates);
  var used = {};
  var edits = [];
  var unmatchedRows = [];
  for (var i = 0; i < rows.length; i++) {
    var ci = matches[i];
    if (ci < 0) { unmatchedRows.push(rows[i].label.replace(/\s+/g, ' ').replace(/^ | $/g, '')); continue; }
    used[ci] = true;
    var values = op.candidates[ci].cells;
    for (var col in values) {
      if (!Object.prototype.hasOwnProperty.call(values, col)) continue;
      var c = Number(col);
      var old = String(cells[rows[i].r][c] === undefined ? '' : cells[rows[i].r][c]).replace(/[\s\u00a0]+$/, '');
      edits.push({ row: rows[i].r, col: c, oldText: old, newText: values[col] });
    }
  }
  var unusedCandidates = [];
  for (var j = 0; j < op.candidates.length; j++) if (!used[j]) unusedCandidates.push(op.candidates[j].name);
  return { edits: edits, unmatchedRows: unmatchedRows, unusedCandidates: unusedCandidates };
}

/**
 * Line-item fill: each qualifying line has "<label> <marker> : <value>" (marker defaults to "Result", case-sensitive).
 * Lines with no label before the marker are ignored. Labels are matched to op.candidates via matchLabels_.
 * Returns { edits: [{start, end, oldText, newText, label}], unmatchedLabels: [string], unusedCandidates: [string] }.
 */
function planLineEdits(text, op) {
  var marker = (op && op.marker) ? op.marker : 'Result';
  var candidates = (op && op.candidates) ? op.candidates : [];
  var lines = splitLines_(text);
  var qualifying = [];

  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    var markerIdx = -1;
    var colonIdx = -1;
    var searchFrom = ln.start;
    while (searchFrom <= ln.contentEnd - marker.length) {
      var found = text.indexOf(marker, searchFrom);
      if (found < 0 || found >= ln.contentEnd) break;
      var afterMarker = skipBlanks_(text, found + marker.length, ln.contentEnd);
      if (afterMarker < ln.contentEnd && text.charAt(afterMarker) === ':') {
        markerIdx = found;
        colonIdx = afterMarker;
        break;
      }
      searchFrom = found + 1;
    }
    if (markerIdx < 0) continue;

    var rawLabel = text.slice(ln.start, markerIdx).replace(/^[ \t\u00a0]+|[ \t\u00a0]+$/g, '');
    var label = rawLabel.replace(/^\d+[ \t\u00a0]*[.)][ \t\u00a0]*/, '');
    if (!label) continue;

    var valueStart = skipBlanks_(text, colonIdx + 1, ln.contentEnd);
    var end = ln.contentEnd;
    if (valueStart > end) valueStart = end;
    qualifying.push({
      label: label,
      start: valueStart,
      end: end,
      oldText: text.slice(valueStart, end),
    });
  }

  var matches = matchLabels_(qualifying.map(function (q) { return q.label; }), candidates);
  var used = {};
  var edits = [];
  var unmatchedLabels = [];
  for (var j = 0; j < qualifying.length; j++) {
    var ci = matches[j];
    if (ci < 0) {
      unmatchedLabels.push(qualifying[j].label);
    } else {
      used[ci] = true;
      edits.push({
        start: qualifying[j].start,
        end: qualifying[j].end,
        oldText: qualifying[j].oldText,
        newText: candidates[ci].value,
        label: qualifying[j].label,
      });
    }
  }
  var unusedCandidates = [];
  for (var k = 0; k < candidates.length; k++) {
    if (!used[k]) unusedCandidates.push(candidates[k].name);
  }
  return { edits: edits, unmatchedLabels: unmatchedLabels, unusedCandidates: unusedCandidates };
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

/**
 * Order positioned items ({ top, left, ... }) top-to-bottom; items whose tops differ by less than 5 pt
 * count as the same row and are ordered left-to-right. Returns a new sorted array.
 */
function orderByPosition_(items) {
  if (!items || !items.length) return [];
  var tagged = items.map(function (it, idx) {
    return { item: it, top: it.top, left: it.left, idx: idx };
  });
  tagged.sort(function (a, b) {
    return (a.top - b.top) || (a.left - b.left) || (a.idx - b.idx);
  });
  var out = [];
  var row = [tagged[0]];
  var rowTop = tagged[0].top;
  function flushRow() {
    row.sort(function (a, b) {
      return (a.left - b.left) || (a.top - b.top) || (a.idx - b.idx);
    });
    for (var j = 0; j < row.length; j++) out.push(row[j].item);
  }
  for (var i = 1; i < tagged.length; i++) {
    if (tagged[i].top - rowTop < 5) {
      row.push(tagged[i]);
    } else {
      flushRow();
      row = [tagged[i]];
      rowTop = tagged[i].top;
    }
  }
  flushRow();
  return out;
}


// ---- Charts: replace the picture the team pasted under an "Engagement" / "Reach" label ----

/** Header lookup that ignores case (Apps Script returns the names as the server sent them). */
function headerValue_(headers, name) {
  var want = String(name).toLowerCase();
  for (var k in headers) if (Object.prototype.hasOwnProperty.call(headers, k) && String(k).toLowerCase() === want) return headers[k];
  return '';
}

var CHART_TAG_PREFIX = 'spark:chart:';

/**
 * Which picture does this chart replace? 1) a picture this script tagged earlier, 2) otherwise the nearest wide
 * picture below the label that starts at the label's left edge. Boxes are {left, top, width, height}; images also
 * carry {title, ref}. Returns the image or null.
 */
function pickChartImage_(label, images, tag) {
  var i;
  for (i = 0; i < images.length; i++) if (images[i].title === tag) return images[i];
  var best = null;
  for (i = 0; i < images.length; i++) {
    var im = images[i];
    if (String(im.title || '').indexOf(CHART_TAG_PREFIX) === 0 || String(im.title || '').indexOf('spark:g') === 0) continue; // another chart's picture (or a Google visual)
    var below = im.top >= label.top - 4;
    var startsAtLabel = im.left <= label.left + 40 && im.left + im.width >= label.left + 20;
    var wide = im.height > 0 && im.width / im.height >= 1.3;
    if (!below || !startsAtLabel || !wide) continue;
    if (!best || im.top < best.top) best = im;
  }
  return best;
}

/** Pixel size for the chart image: 3x the picture's size in points (crisp), capped at 1200 px wide, same aspect. */
function chartPixelSize(widthPt, heightPt) {
  var scale = 3;
  if (widthPt * scale > 1200) scale = 1200 / widthPt;
  return { width: Math.max(200, Math.round(widthPt * scale)), height: Math.max(100, Math.round(heightPt * scale)) };
}


// ---- Creative pictures: the picture sitting directly above a rank box ("1 Engagement = …") ----

var CREATIVE_TAG_PREFIX = 'spark:creative:';

/**
 * Which picture belongs to this rank box? 1) one this script tagged earlier, 2) otherwise the portrait-ish picture
 * whose bottom edge is within 40 pt of the box top and that overlaps it horizontally (>= 60%). Chart pictures and wide
 * pictures are ignored. Boxes are {left, top, width, height}; images also carry {title}. Returns the image or null.
 */
function pickCreativeImage_(box, images, tag) {
  var i;
  for (i = 0; i < images.length; i++) if (images[i].title === tag) return images[i];
  var best = null;
  var bestGap = 1e9;
  for (i = 0; i < images.length; i++) {
    var im = images[i];
    var title = String(im.title || '');
    if (title.indexOf(CHART_TAG_PREFIX) === 0 || title.indexOf(CREATIVE_TAG_PREFIX) === 0 || title.indexOf('spark:g') === 0) continue;
    if (!(im.height > 0) || im.width / im.height > 1.6) continue;
    var overlap = Math.min(im.left + im.width, box.left + box.width) - Math.max(im.left, box.left);
    if (overlap < 0.6 * Math.min(im.width, box.width)) continue;
    var gap = Math.abs(im.top + im.height - box.top);
    if (gap > 40) continue;
    if (gap < bestGap) { best = im; bestGap = gap; }
  }
  return best;
}

/** Tile geometry for a two or three picture album, with a 2 pt gutter. */
function albumLayout(box, n) {
  var gap = 2;
  if (n === 2) {
    var half = (box.width - gap) / 2;
    return [
      { left: box.left, top: box.top, width: half, height: box.height },
      { left: box.left + half + gap, top: box.top, width: half, height: box.height }
    ];
  }
  if (n === 3) {
    var topHeight = (box.height - gap) * 0.6;
    var bottomHeight = box.height - gap - topHeight;
    var halfWidth = (box.width - gap) / 2;
    return [
      { left: box.left, top: box.top, width: box.width, height: topHeight },
      { left: box.left, top: box.top + topHeight + gap, width: halfWidth, height: bottomHeight },
      { left: box.left + halfWidth + gap, top: box.top + topHeight + gap, width: halfWidth, height: bottomHeight }
    ];
  }
  return [];
}

// ---- Google Ads slides: screenshots replaced by a line chart, native tables and the top ad ----
// Ops of kind gchart / gtable / gad. Everything the script inserts is titled with one of these tags,
// so the next run finds and replaces its own element instead of looking for the screenshot again.

var GCHART_TAG_PREFIX = 'spark:gchart:';
var GTABLE_TAG_PREFIX = 'spark:gtable:';
var GAD_TAG_PREFIX = 'spark:gad:';

function isSparkTitle_(title) {
  return String(title || '').indexOf('spark:') === 0;
}

function visibleShare_(box, page) {
  if (!box || !page || !isFinite(box.left) || !isFinite(box.top)) return 0;
  if (!(page.width > 0) || !(page.height > 0)) return 0;
  if (!(box.width > 0) || !(box.height > 0)) {
    return (box.left >= 0 && box.left < page.width && box.top >= 0 && box.top < page.height) ? 1 : 0;
  }
  var ix = Math.max(0, Math.min(box.left + box.width, page.width) - Math.max(box.left, 0));
  var iy = Math.max(0, Math.min(box.top + box.height, page.height) - Math.max(box.top, 0));
  return (ix * iy) / (box.width * box.height);
}

/** Index of the shape with non-empty trimmed text highest on the slide (smallest top; within <3pt, smaller left wins), or -1. */
function topTextIndex_(texts, positions) {
  if (!texts || !positions) return -1;
  var n = Math.min(texts.length, positions.length);
  var minTop = Infinity;
  var i;
  for (i = 0; i < n; i++) {
    if (!positions[i]) continue;
    if (!String(texts[i] || '').replace(/^\s+|\s+$/g, '')) continue;
    if (positions[i].top < minTop) minTop = positions[i].top;
  }
  if (!isFinite(minTop)) return -1;
  var best = -1;
  for (i = 0; i < n; i++) {
    if (!positions[i]) continue;
    if (!String(texts[i] || '').replace(/^\s+|\s+$/g, '')) continue;
    if (positions[i].top - minTop >= 3) continue;
    if (best < 0 || positions[i].left < positions[best].left ||
        (positions[i].left === positions[best].left && positions[i].top < positions[best].top)) {
      best = i;
    }
  }
  return best;
}

/** Does this shape text satisfy an anchor { label?, matches?, topLeftPicture? }? label = whole text or first non-empty line, case-insensitive. */
function anchorMatchesText_(text, anchor) {
  if (!anchor) return false;
  var trim = function (s) { return String(s || '').replace(/^[ \t \n\u000b\r]+|[ \t \n\u000b\r]+$/g, ''); };
  var t = trim(text);
  if (anchor.label) {
    var want = String(anchor.label).toLowerCase();
    if (t.toLowerCase() === want) return true;
    var lines = String(text || '').split(/[\n\u000b\r]/);
    for (var i = 0; i < lines.length; i++) {
      var line = trim(lines[i]);
      if (!line) continue;
      return line.toLowerCase() === want;
    }
    return false;
  }
  if (anchor.matches) return new RegExp(anchor.matches).test(t);
  return false;
}

/** Index of the first shape whose text satisfies the anchor, or -1. */
function findAnchorShape_(texts, anchor) {
  for (var i = 0; i < texts.length; i++) if (anchorMatchesText_(texts[i], anchor)) return i;
  return -1;
}

/** Elements ({title, left, top, width, height}) this script tagged for an op: the tag itself or "<tag>:<part>". */
function taggedElements_(elements, tag) {
  return elements.filter(function (e) {
    var t = String(e.title || '');
    return t === tag || t.indexOf(tag + ':') === 0;
  });
}

/** Smallest box that holds all the given boxes, or null. */
function unionBox_(boxes) {
  if (!boxes || !boxes.length) return null;
  var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  boxes.forEach(function (b) {
    left = Math.min(left, b.left); top = Math.min(top, b.top);
    right = Math.max(right, b.left + b.width); bottom = Math.max(bottom, b.top + b.height);
  });
  return { left: left, top: top, width: right - left, height: bottom - top };
}

/**
 * The team's screenshot under a label ("Demographics", "Campaign", "Most clicked ad"): the nearest picture that starts at or
 * below the label's top and overlaps the label horizontally (at least 50% of the label width, or starts within 60 pt of its
 * left edge). Pictures this script made (any spark: title) are never picked. Boxes {left, top, width, height}.
 */
function pickScreenshotBelow_(label, images, page) {
  var best = null;
  for (var i = 0; i < images.length; i++) {
    var im = images[i];
    if (isSparkTitle_(im.title)) continue;
    if (!(im.width > 0) || !(im.height > 0)) continue;
    if (page && visibleShare_(im, page) < 0.5) continue;
    if (im.top < label.top - 4) continue;
    var overlap = Math.min(im.left + im.width, label.left + label.width) - Math.max(im.left, label.left);
    var startsNear = Math.abs(im.left - label.left) <= 60;
    if (!(overlap >= 0.5 * label.width) && !startsNear) continue;
    if (!best || im.top < best.top) best = im;
  }
  return best;
}

/**
 * The KPI + daily-line screenshot under the title: a picture this script tagged earlier, otherwise the top-left-most untagged
 * picture that is big enough (>= 25% of the page width, >= 15% of its height) and centred in the left 65% of the page.
 */
function pickTopLeftPicture_(images, page, tag) {
  var i;
  for (i = 0; i < images.length; i++) {
    if (images[i].title === tag && (!page || visibleShare_(images[i], page) >= 0.5)) return images[i];
  }
  var best = null;
  for (i = 0; i < images.length; i++) {
    var im = images[i];
    if (isSparkTitle_(im.title)) continue;
    if (page && visibleShare_(im, page) < 0.5) continue;
    if (im.width < 0.25 * page.width || im.height < 0.15 * page.height) continue;
    if (im.left + im.width / 2 > 0.65 * page.width) continue;
    if (!best || im.top < best.top - 5 || (Math.abs(im.top - best.top) < 5 && im.left < best.left)) best = im;
  }
  return best;
}

/** Table frame for a box: column widths share the width by content weight (first column gets more), font size follows row height. */
function tableGeometry_(box, rows, header) {
  var all = (header && header.length ? [header] : []).concat(rows || []);
  var cols = 0;
  all.forEach(function (r) { cols = Math.max(cols, r.length); });
  if (!cols) return { cols: 0, rows: 0, colWidths: [], fontSize: 9, rowHeight: 0 };
  var weights = [];
  for (var c = 0; c < cols; c++) {
    var longest = 0;
    all.forEach(function (r) { longest = Math.max(longest, String(r[c] === undefined ? '' : r[c]).length); });
    // text columns (first) up to 40 chars of weight, number columns up to 14, each at least 4
    weights.push(Math.max(4, Math.min(c === 0 ? 40 : 14, longest)));
  }
  var total = weights.reduce(function (a, b) { return a + b; }, 0);
  var colWidths = weights.map(function (w) { return Math.round((box.width * w / total) * 10) / 10; });
  var rowCount = all.length;
  var rowHeight = box.height / rowCount;
  var fontSize = Math.max(7, Math.min(11, Math.floor(rowHeight * 0.5)));
  return { cols: cols, rows: rowCount, colWidths: colWidths, fontSize: fontSize, rowHeight: rowHeight };
}

/** White (share 0) to Google blue (share 1). Returns '#RRGGBB'. */
function heatColor_(share) {
  var s = Math.max(0, Math.min(1, Number(share) || 0));
  var from = [255, 255, 255];
  var to = [66, 133, 244];
  var hex = function (v) { var h = Math.round(v).toString(16); return h.length < 2 ? '0' + h : h; };
  return ('#' + [0, 1, 2].map(function (i) { return hex(from[i] + (to[i] - from[i]) * s); }).join('')).toUpperCase();
}

/** Dark text on pale cells, white text on strong cells (share 0..1). */
function heatTextColor_(share) {
  return Number(share) > 0.6 ? '#FFFFFF' : '#202124';
}

/** Largest rectangle of the picture's aspect that fits inside box, centred. */
function fitInside_(box, w, h) {
  if (!(w > 0) || !(h > 0)) return { left: box.left, top: box.top, width: box.width, height: box.height };
  var scale = Math.min(box.width / w, box.height / h);
  var nw = w * scale;
  var nh = h * scale;
  return { left: box.left + (box.width - nw) / 2, top: box.top + (box.height - nh) / 2, width: nw, height: nh };
}

/** "Most clicked ad" area: picture/text on the left half, stats table on the right half, 8 pt gutter. */
function adLayout_(box) {
  var gap = 8;
  var half = (box.width - gap) / 2;
  return {
    left: { left: box.left, top: box.top, width: half, height: box.height },
    right: { left: box.left + half + gap, top: box.top, width: half, height: box.height }
  };
}

/**
 * The line under Demographics ("…ส่วนใหญ่เป็น" + a second line "กลุ่ม… (9 Conversion)"): only the part after the marker is
 * replaced, the team's first line stays. Returns { start, end, oldText, newText } or null when the text has no marker.
 */
var CAPTION_MARKER = 'ส่วนใหญ่เป็น';
function planCaptionEdit_(text, caption) {
  var at = text.indexOf(CAPTION_MARKER);
  var cat = String(caption || '').indexOf(CAPTION_MARKER);
  if (at < 0 || cat < 0) return null;
  var rest = String(caption).slice(cat + CAPTION_MARKER.length).replace(/^[ \t ]+|[ \t ]+$/g, '');
  if (!rest) return null;
  var lines = splitLines_(text);
  var markerLine = -1;
  for (var i = 0; i < lines.length; i++) {
    if (at >= lines[i].start && at <= lines[i].contentEnd) { markerLine = i; break; }
  }
  if (markerLine < 0) return null;
  // the next non-empty line holds the group + number; without one, the value follows the marker on the same line
  for (var j = markerLine + 1; j < lines.length; j++) {
    if (lines[j].contentEnd > lines[j].start) {
      return { start: lines[j].start, end: lines[j].contentEnd, oldText: text.slice(lines[j].start, lines[j].contentEnd), newText: rest };
    }
  }
  var from = at + CAPTION_MARKER.length;
  var end = lines[markerLine].contentEnd;
  return { start: from, end: end, oldText: text.slice(from, end), newText: ' ' + rest };
}


// ---- Pull mode: fetch the latest complete report from ConversionFactor instead of pasting JSON ----

var EXPORT_BASE_URL = 'https://conversion.sparkth.io';

/** Report export keys look like cfr_ + 32 base64url characters. */
function isReportKey(key) {
  return /^cfr_[A-Za-z0-9_-]{32}$/.test(String(key || '').trim());
}

/** /api/report-exports/latest[?period_end=] or /api/report-exports/<snapshotId>. Never puts the key in the URL. */
function exportUrl(opts) {
  opts = opts || {};
  if (opts.snapshotId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(opts.snapshotId))) throw new Error('รหัสรายงานไม่ถูกต้อง');
    return EXPORT_BASE_URL + '/api/report-exports/' + opts.snapshotId;
  }
  var url = EXPORT_BASE_URL + '/api/report-exports/latest';
  if (opts.periodEnd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(opts.periodEnd))) throw new Error('รอบรายงานต้องเป็นรูปแบบ ปี-เดือน-วัน');
    url += '?period_end=' + opts.periodEnd;
  }
  return url;
}

/** Thai message for a non-200 answer of the export endpoint. */
function explainExportStatus(status) {
  if (status === 401) return 'คีย์ไม่ถูกต้อง หมดอายุ หรือถูกยกเลิก — ขอคีย์ใหม่ที่หน้า รายงานรายเดือน ของแบรนด์ แล้วตั้งค่าใหม่';
  if (status === 404) return 'ยังไม่มีรายงานที่ข้อมูลครบสำหรับรอบนี้ — ไปสร้างรายงานที่หน้าเว็บก่อน (ถ้าขึ้นว่าข้อมูลไม่ครบ ให้รอแล้วสร้างใหม่)';
  if (status === 429) return 'เรียกถี่เกินไป รอสัก 1 นาทีแล้วลองใหม่';
  if (status >= 500) return 'ระบบฝั่งเซิร์ฟเวอร์ขัดข้องชั่วคราว (' + status + ') ลองใหม่อีกครั้ง';
  return 'ดึงรายงานไม่สำเร็จ (รหัส ' + status + ')';
}

/** Short, safe summary of a payload for the confirmation step. */
function describePayload(payload) {
  return {
    period: payload && payload.period ? payload.period.current : '',
    generated_at: payload ? payload.generated_at : '',
    fills: payload && payload.fills ? payload.fills.length : 0,
  };
}


/** Convert a Demographics gtable op into horizontal bar chart data: { title, labels, values }. */
function demographicBars_(op) {
  var header = (op && op.header) ? op.header : [];
  var title = header[1] !== undefined && header[1] !== null ? String(header[1]) : '';
  var rows = (op && op.rows) ? op.rows : [];
  var labels = [];
  var values = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var name = row[0] === undefined || row[0] === null ? '' : String(row[0]);
    var pct = row[2] === undefined || row[2] === null ? '' : String(row[2]);
    labels.push(pct ? name + ' (' + pct + ')' : name);
    var raw = String(row[1] === undefined || row[1] === null ? '' : row[1]).replace(/[,฿\s\u00a0]/g, '');
    var num = raw === '' ? 0 : Number(raw);
    values.push(isFinite(num) ? num : 0);
  }
  return { title: title, labels: labels, values: values };
}

/** Largest integer font size (14 down to 7) such that wrapped lines fit inside box. */
function fitFontSize_(lines, box) {
  if (!box) return 7;
  var arr = lines || [];
  for (var s = 14; s >= 7; s--) {
    var cpl = Math.max(1, Math.floor(box.width / (s * 0.55)));
    var wrapped = 0;
    for (var i = 0; i < arr.length; i++) {
      var len = String(arr[i] === undefined || arr[i] === null ? '' : arr[i]).length;
      wrapped += Math.max(1, Math.ceil(len / cpl));
    }
    if (wrapped * s * 1.3 <= box.height) return s;
  }
  return 7;
}

/** "Header: value" lines for a gad op's stat summary. */
function adStatLines_(op) {
  if (!op || !op.header) return [];
  var header = op.header;
  var row = op.row || [];
  var out = [];
  for (var i = 0; i < header.length; i++) {
    var val = row[i] === undefined || row[i] === null ? '' : String(row[i]);
    out.push(String(header[i]) + ': ' + val);
  }
  return out;
}

/** Put real problems first, move "ทีมแก้ไว้แล้ว" skips to the end (capping skips at 8 + summary), then slice to limit. */
function orderProblems_(problems, limit) {
  var cap = (limit === undefined || limit === null) ? 60 : limit;
  var list = problems || [];
  var real = [];
  var skipped = [];
  for (var i = 0; i < list.length; i++) {
    var line = String(list[i]);
    if (line.indexOf('ทีมแก้ไว้แล้ว') >= 0) skipped.push(line);
    else real.push(line);
  }
  if (skipped.length > 8) {
    var extra = skipped.length - 8;
    skipped = skipped.slice(0, 8);
    skipped.push('…และข้ามจุดที่ทีมแก้ไว้อีก ' + extra + ' จุด (ติ๊ก "ทับกล่องที่ทีมแก้ไว้ด้วย" ถ้าต้องการให้ทับ)');
  }
  return real.concat(skipped).slice(0, cap);
}

if (typeof module !== 'undefined') {
  module.exports = { headerValue_: headerValue_, pickCreativeImage_: pickCreativeImage_, albumLayout: albumLayout, CREATIVE_TAG_PREFIX: CREATIVE_TAG_PREFIX, pickChartImage_: pickChartImage_, chartPixelSize: chartPixelSize, CHART_TAG_PREFIX: CHART_TAG_PREFIX, diceBigrams: diceBigrams, isReportKey: isReportKey, exportUrl: exportUrl, explainExportStatus: explainExportStatus, describePayload: describePayload, buildGrid: buildGrid, planHeaderDateEdits: planHeaderDateEdits, matchLabels_: matchLabels_, planTableEdits: planTableEdits, planLineEdits: planLineEdits, orderByPosition_: orderByPosition_, normKey: normKey, splitLines_: splitLines_, planShapeEdits: planShapeEdits, applyEdits_: applyEdits_, decideFill: decideFill, slideTitleMatches_: slideTitleMatches_, percentRange: percentRange, TONE_COLORS: TONE_COLORS, shapeMatches_: shapeMatches_, GCHART_TAG_PREFIX: GCHART_TAG_PREFIX, GTABLE_TAG_PREFIX: GTABLE_TAG_PREFIX, GAD_TAG_PREFIX: GAD_TAG_PREFIX, visibleShare_: visibleShare_, topTextIndex_: topTextIndex_, anchorMatchesText_: anchorMatchesText_, findAnchorShape_: findAnchorShape_, taggedElements_: taggedElements_, unionBox_: unionBox_, pickScreenshotBelow_: pickScreenshotBelow_, pickTopLeftPicture_: pickTopLeftPicture_, tableGeometry_: tableGeometry_, heatColor_: heatColor_, heatTextColor_: heatTextColor_, fitInside_: fitInside_, adLayout_: adLayout_, planCaptionEdit_: planCaptionEdit_, demographicBars_: demographicBars_, fitFontSize_: fitFontSize_, adStatLines_: adStatLines_, orderProblems_: orderProblems_ };
}
