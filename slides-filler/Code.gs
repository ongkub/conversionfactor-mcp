/**
 * SPARK Report filler — fills last month's deck copy with the numbers from get_monthly_report_data.
 * Container-bound script: Extensions → Apps Script on the TEST copy of the Sangthai report.
 * Core.gs holds the pure logic (tested with node); this file only talks to Slides.
 */

var SCHEMA = 'sangthai-slides/1';
// Shown in the result so it is obvious which copy of this script is running
var SCRIPT_VERSION = 'v2-grid-2026-10-27';
// Prefix of the remembered values. v2: older runs wrote some table cells one column off, so their memory is not trusted.
var PROP_PREFIX = 'v2:';

function onOpen() {
  SlidesApp.getUi()
    .createMenu('SPARK Report')
    .addItem('เติมข้อมูลจาก JSON…', 'showFillDialog')
    .addToUi();
}

function showFillDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Dialog').setWidth(620).setHeight(520);
  SlidesApp.getUi().showModalDialog(html, 'เติมข้อมูลรายงานประจำเดือน');
}

// Page elements that hold text, including the ones inside groups. Skips anything whose centre is off the slide
// (last month's stale boxes are parked off-canvas).
function collectTables_(elements, pageW, pageH, out) {
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var type = el.getPageElementType();
    if (type === SlidesApp.PageElementType.GROUP) {
      collectTables_(el.asGroup().getChildren(), pageW, pageH, out);
    } else if (type === SlidesApp.PageElementType.TABLE) {
      var left = el.getLeft();
      var top = el.getTop();
      var outside = isFinite(left) && isFinite(top) && (left >= pageW || left + el.getWidth() <= 0 || top >= pageH || top + el.getHeight() <= 0);
      if (!outside) out.push(el.asTable());
    }
  }
}

function collectShapes_(elements, pageW, pageH, out) {
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var type = el.getPageElementType();
    if (type === SlidesApp.PageElementType.GROUP) {
      collectShapes_(el.asGroup().getChildren(), pageW, pageH, out);
    } else if (type === SlidesApp.PageElementType.SHAPE) {
      // Skip only boxes that lie completely outside the slide (last month's stale boxes are parked beyond the right
      // edge). Do not test the centre: wide title boxes report positions that put their centre beyond the slide.
      var left = el.getLeft();
      var top = el.getTop();
      var right = left + el.getWidth();
      var bottom = top + el.getHeight();
      var outside = isFinite(left) && isFinite(top) && (left >= pageW || right <= 0 || top >= pageH || bottom <= 0);
      if (!outside) out.push(el.asShape());
    }
  }
}

function buildIndex_() {
  var pres = SlidesApp.getActivePresentation();
  var w = pres.getPageWidth();
  var h = pres.getPageHeight();
  return pres.getSlides().map(function (slide, i) {
    var shapes = [];
    collectShapes_(slide.getPageElements(), w, h, shapes);
    var tables = [];
    collectTables_(slide.getPageElements(), w, h, tables);
    return { number: i + 1, shapes: shapes, tables: tables };
  });
}

function shapeText_(shape) {
  return shape.getText().asString();
}

function findSlide_(index, selector) {
  for (var i = 0; i < index.length; i++) {
    var shapes = index[i].shapes;
    for (var j = 0; j < shapes.length; j++) {
      var t = shapeText_(shapes[j]);
      if (selector.containsText && t.indexOf(selector.containsText) >= 0) return index[i];
      if (selector.titlePrefix && slideTitleMatches_(t, selector)) return index[i];
    }
  }
  return null;
}

function readStyle_(range) {
  var st = range.getTextStyle();
  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  return {
    family: safe(function () { return st.getFontFamily(); }),
    size: safe(function () { return st.getFontSize(); }),
    bold: safe(function () { return st.isBold(); }),
    italic: safe(function () { return st.isItalic(); }),
    color: safe(function () { return st.getForegroundColor(); }),
  };
}

function writeStyle_(range, s) {
  var st = range.getTextStyle();
  try { if (s.family) st.setFontFamily(s.family); } catch (e) {}
  try { if (s.size) st.setFontSize(s.size); } catch (e) {}
  try { if (s.bold !== null) st.setBold(s.bold); } catch (e) {}
  try { if (s.italic !== null) st.setItalic(s.italic); } catch (e) {}
  try { if (s.color && s.color.getColorType() !== SlidesApp.ColorType.UNSUPPORTED) st.setForegroundColor(s.color); } catch (e) {}
}

// Replace [start, end) in the shape text, keeping the look of the old value (font, size, bold, colour).
function replaceRange_(shape, edit, tone) {
  var text = shape.getText();
  if (edit.end > edit.start) {
    var old = text.getRange(edit.start, edit.end);
    var style = readStyle_(old);
    old.setText(edit.newText);
    var neu = shape.getText().getRange(edit.start, edit.start + edit.newText.length);
    writeStyle_(neu, style);
  } else {
    text.insertText(edit.start, edit.newText);
  }
  applyTone_(shape, edit.start, edit.newText, tone);
}

// Team colour code on the "(…%)" part. Also applied when the text is already right (colours follow the rule every run).
function applyTone_(shape, start, valueText, tone) {
  var pr = tone ? percentRange(valueText) : null;
  if (!pr || !TONE_COLORS[tone]) return;
  try {
    shape.getText().getRange(start + pr.from, start + pr.to).getTextStyle().setForegroundColor(TONE_COLORS[tone]);
  } catch (e) {}
}

// Why was a slide not found? List shapes (on or off the slide) that look like the title we want.
function debugTitle_(selector) {
  var pres = SlidesApp.getActivePresentation();
  var w = pres.getPageWidth();
  var h = pres.getPageHeight();
  var found = [];
  var slides = pres.getSlides();
  function walk(elements, slideNo) {
    for (var i = 0; i < elements.length && found.length < 4; i++) {
      var el = elements[i];
      var type = el.getPageElementType();
      if (type === SlidesApp.PageElementType.GROUP) { walk(el.asGroup().getChildren(), slideNo); continue; }
      if (type !== SlidesApp.PageElementType.SHAPE) continue;
      var t = el.asShape().getText().asString();
      if (t.indexOf('Campaign') >= 0 && (!selector.titleKey || normKey(t).indexOf(selector.titleKey) >= 0)) {
        found.push('หน้า ' + slideNo + ' | ' + JSON.stringify(t.slice(0, 70)) + ' | กลางกล่อง=(' +
          Math.round(el.getLeft() + el.getWidth() / 2) + ',' + Math.round(el.getTop() + el.getHeight() / 2) + ') หน้ากว้าง/สูง=(' +
          Math.round(w) + ',' + Math.round(h) + ')');
      }
    }
  }
  for (var s = 0; s < slides.length && found.length < 4; s++) walk(slides[s].getPageElements(), s + 1);
  return found;
}

// Rows of a table as the reader sees them: merged cells that are not the top-left one are left out.
// texts[r][k] = text of the k-th visible cell of row r, cols[r][k] = its real column in the grid
// (a label cell that spans 2 columns makes "Amount spent" visible column 1 but grid column 2).
function tableGrid_(table) {
  return buildGrid(table.getNumRows(), table.getNumColumns(), function (r, c) {
    return table.getCell(r, c).getText().asString(); // throws for a merged cell that is not the top-left one
  });
}

// Replace the whole text of one cell, keeping the look of the old text.
function setCellText_(table, row, col, newText) {
  var text = table.getCell(row, col).getText();
  var len = text.asString().replace(/\n$/, '').length;
  if (len > 0) {
    var range = text.getRange(0, len);
    var style = readStyle_(range);
    range.setText(newText);
    writeStyle_(table.getCell(row, col).getText().getRange(0, newText.length), style);
  } else {
    text.insertText(0, newText);
  }
}

// "Current 16/09/2026 - 15/10/2026" / "Previous …" cells in the header rows of a table we fill
function applyHeaderDates_(table, grid, op, tableIndex, props, force, counts, problems, slideNumber) {
  var edits = planHeaderDateEdits(grid.texts, op.headerDates);
  for (var e = edits.length - 1; e >= 0; e--) {
    var ed = edits[e];
    var gridCol = grid.cols[ed.row][ed.col];
    var key = PROP_PREFIX + op.id + '#h' + tableIndex + ':' + ed.row + ':' + ed.col + ':' + ed.start;
    var decision = decideFill(ed.oldText, ed.newText, props.getProperty(key), !!force);
    if (decision === 'fill') {
      try {
        var range = table.getCell(ed.row, gridCol).getText().getRange(ed.start, ed.end);
        var style = readStyle_(range);
        range.setText(ed.newText);
        writeStyle_(table.getCell(ed.row, gridCol).getText().getRange(ed.start, ed.start + ed.newText.length), style);
        counts.filled++;
        props.setProperty(key, ed.newText);
      } catch (err) {
        problems.push(op.id + ': เขียนวันที่หัวตารางหน้า ' + slideNumber + ' ไม่ได้ (' + err.message + ')');
      }
    } else if (decision === 'skipped_edited') {
      counts.skipped_edited++;
      problems.push(op.id + ': วันที่หัวตารางหน้า ' + slideNumber + ' ทีมแก้ไว้แล้ว (ข้าม)');
    } else {
      counts.unchanged++;
    }
  }
}

// One "table" op on one slide: fills the numeric cells of every table whose header matches.
// Returns true when at least one row of a table was matched.
function applyTableOp_(op, slide, props, force, counts, problems) {
  var touched = false;
  for (var t = 0; t < slide.tables.length; t++) {
    var table = slide.tables[t];
    var grid = tableGrid_(table);
    var cells = grid.texts;
    if (!cells.length || !cells[0].length || cells[0][0].indexOf(op.table.headerContains) < 0) continue;
    var plan = planTableEdits(cells, op);
    if (!plan.edits.length) continue; // not a table of ours (e.g. TikTok, LINE)
    touched = true;
    for (var e = 0; e < plan.edits.length; e++) {
      var ed = plan.edits[e];
      var key = PROP_PREFIX + op.id + '#' + t + ':' + ed.row + ':' + ed.col;
      var stored = props.getProperty(key);
      var decision = decideFill(ed.oldText, ed.newText, stored, !!force);
      if (decision === 'fill') {
        try {
          var gridCol = grid.cols[ed.row][ed.col];
          if (gridCol === undefined) throw new Error('ไม่มีคอลัมน์ที่ ' + ed.col + ' ในแถวนี้');
          setCellText_(table, ed.row, gridCol, ed.newText);
          counts.filled++;
          props.setProperty(key, ed.newText);
        } catch (err) {
          // e.g. a merged cell that is not the top-left one
          counts.not_found++;
          problems.push(op.id + ': เขียนเซลล์ไม่ได้ หน้า ' + slide.number + ' แถว ' + ed.row + ' คอลัมน์ ' + ed.col + ' (' + err.message + ')');
        }
      } else if (decision === 'unchanged') {
        counts.unchanged++;
        props.setProperty(key, ed.newText);
      } else {
        counts.skipped_edited++;
        problems.push(op.id + ': ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number + ' แถว ' + ed.row + ' คอลัมน์ ' + ed.col + ' เดิม "' + ed.oldText + '"');
      }
    }
    if (op.headerDates) applyHeaderDates_(table, grid, op, t, props, force, counts, problems, slide.number);
    for (var u = 0; u < plan.unmatchedRows.length; u++) problems.push('ℹ️ หน้า ' + slide.number + ' แถว "' + plan.unmatchedRows[u] + '" ไม่มีข้อมูลที่ชื่อตรงกัน (ไม่ได้แก้)');
    if (op.slide && plan.unusedCandidates.length) problems.push('ℹ️ หน้า ' + slide.number + ' ad set ที่ยังไม่มีแถวในตาราง: ' + plan.unusedCandidates.join(', '));
  }
  return touched;
}

function applyPayload(jsonText, force) {
  var payload = JSON.parse(jsonText);
  if (!payload || payload.schema !== SCHEMA) throw new Error('JSON นี้ไม่ใช่รูปแบบ ' + SCHEMA + ' — คัดลอกจากหัวข้อ "7. JSON สำหรับสคริปต์เติมสไลด์"');

  var props = PropertiesService.getDocumentProperties();
  var index = buildIndex_();
  var counts = { filled: 0, unchanged: 0, skipped_edited: 0, not_found: 0 };
  var problems = [];
  var debugShown = false;

  for (var i = 0; i < payload.fills.length; i++) {
    var op = payload.fills[i];
    if (op.kind === 'table' && !op.slide) {
      var any = false;
      for (var si = 0; si < index.length; si++) {
        if (applyTableOp_(op, index[si], props, force, counts, problems)) any = true;
      }
      if (!any) { counts.not_found++; problems.push(op.id + ': ไม่พบตารางสรุปที่มีแถวตรงกับแคมเปญ'); }
      continue;
    }

    var slide = findSlide_(index, op.slide);
    if (!slide) {
      counts.not_found++;
      problems.push(op.id + ': ไม่พบหน้า');
      if (op.slide.titlePrefix && !debugShown) {
        debugShown = true;
        problems.push('  debug (' + op.id + '): ' + (debugTitle_(op.slide).join(' ; ') || 'ไม่พบกล่องที่มีคำว่า Campaign + ชื่อสาขานี้เลย'));
      }
      continue;
    }

    if (op.kind === 'table') {
      if (!applyTableOp_(op, slide, props, force, counts, problems)) {
        counts.not_found++;
        problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบตารางที่หัวคอลัมน์มี "' + op.table.headerContains + '" และมีแถวตรงกับ ad set');
      }
      continue;
    }

    var edited = false;
    var done = false;
    for (var s = 0; s < slide.shapes.length && !done; s++) {
      var shape = slide.shapes[s];
      var text = shapeText_(shape);
      if (!shapeMatches_(text, op.shape)) continue;
      var edits = planShapeEdits(text, op);
      if (!edits.length) continue;

      for (var e = edits.length - 1; e >= 0; e--) {
        var key = PROP_PREFIX + op.id + '#' + e;
        var stored = props.getProperty(key);
        var decision = decideFill(edits[e].oldText, edits[e].newText, stored, !!force);
        if (decision === 'fill') {
          replaceRange_(shape, edits[e], op.tone);
          counts.filled++;
          props.setProperty(key, edits[e].newText);
        } else if (decision === 'unchanged') {
          counts.unchanged++;
          props.setProperty(key, edits[e].newText);
          applyTone_(shape, edits[e].start, edits[e].newText, op.tone);
        } else {
          counts.skipped_edited++;
          problems.push(op.id + ': ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number + ' เดิม "' + edits[e].oldText + '"');
        }
      }
      edited = true;
      done = true; // first matching shape only
    }
    if (!edited) { counts.not_found++; problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบกล่อง/บรรทัดที่ตรงกัน'); }
  }

  return {
    generated_at: payload.generated_at + ' · สคริปต์ ' + SCRIPT_VERSION,
    period: payload.period,
    counts: counts,
    problems: problems.slice(0, 40),
    needs_review: payload.needs_review || [],
  };
}
