/**
 * SPARK Report filler — fills last month's deck copy with the numbers from get_monthly_report_data.
 * Container-bound script: Extensions → Apps Script on the TEST copy of the Sangthai report.
 * Core.gs holds the pure logic (tested with node); this file only talks to Slides.
 */

var SCHEMA = 'sangthai-slides/1';

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
function collectTables_(elements, out) {
  for (var i = 0; i < elements.length; i++) {
    var type = elements[i].getPageElementType();
    if (type === SlidesApp.PageElementType.GROUP) collectTables_(elements[i].asGroup().getChildren(), out);
    else if (type === SlidesApp.PageElementType.TABLE) out.push(elements[i].asTable());
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
    collectTables_(slide.getPageElements(), tables);
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

function tableCells_(table) {
  var rows = [];
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = [];
    for (var c = 0; c < table.getNumColumns(); c++) row.push(table.getCell(r, c).getText().asString());
    rows.push(row);
  }
  return rows;
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

// One "table" op: fills the numeric cells of every table on the slide whose header matches.
function applyTableOp_(op, slide, props, force, counts, problems) {
  var touched = false;
  for (var t = 0; t < slide.tables.length; t++) {
    var table = slide.tables[t];
    var cells = tableCells_(table);
    if (!cells.length || cells[0][0].indexOf(op.table.headerContains) < 0) continue;
    touched = true;
    var plan = planTableEdits(cells, op);
    for (var e = 0; e < plan.edits.length; e++) {
      var ed = plan.edits[e];
      var key = 'f:' + op.id + '#' + t + ':' + ed.row + ':' + ed.col;
      var stored = props.getProperty(key);
      var decision = decideFill(ed.oldText, ed.newText, stored, !!force);
      if (decision === 'fill') {
        setCellText_(table, ed.row, ed.col, ed.newText);
        counts.filled++;
        props.setProperty(key, ed.newText);
      } else if (decision === 'unchanged') {
        counts.unchanged++;
        props.setProperty(key, ed.newText);
      } else {
        counts.skipped_edited++;
        problems.push(op.id + ': ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number + ' แถว ' + ed.row + ' คอลัมน์ ' + ed.col + ' เดิม "' + ed.oldText + '"');
      }
    }
    for (var u = 0; u < plan.unmatchedRows.length; u++) problems.push('ℹ️ หน้า ' + slide.number + ' แถว "' + plan.unmatchedRows[u] + '" ไม่มี ad set ที่ชื่อตรงกัน (ไม่ได้แก้)');
    if (plan.unusedCandidates.length) problems.push('ℹ️ หน้า ' + slide.number + ' ad set ที่ยังไม่มีแถวในตาราง: ' + plan.unusedCandidates.join(', '));
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
        problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบตารางที่หัวคอลัมน์มี "' + op.table.headerContains + '"');
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
        var key = 'f:' + op.id + '#' + e;
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
    generated_at: payload.generated_at,
    period: payload.period,
    counts: counts,
    problems: problems.slice(0, 40),
    needs_review: payload.needs_review || [],
  };
}
