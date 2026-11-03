/**
 * SPARK Report filler — fills last month's deck copy with the numbers from get_monthly_report_data.
 * Container-bound script: Extensions → Apps Script on the TEST copy of the Sangthai report.
 * Core.gs holds the pure logic (tested with node); this file only talks to Slides.
 */

var SCHEMA = 'sangthai-slides/1';
// Shown in the result so it is obvious which copy of this script is running
var SCRIPT_VERSION = 'v4.1-charts-2026-11-03';
// Prefix of the remembered values. Bumped (v2, v3) when earlier runs left wrong values behind, so that memory is not trusted.
var PROP_PREFIX = 'v3:';

function onOpen() {
  SlidesApp.getUi()
    .createMenu('SPARK Report')
    .addItem('ดึงข้อมูลล่าสุดจากระบบ…', 'showPullDialog')
    .addItem('เติมข้อมูลจาก JSON…', 'showFillDialog')
    .addSeparator()
    .addItem('ตั้งค่าคีย์เชื่อมต่อ…', 'showSettingsDialog')
    .addToUi();
}

function showPullDialog() {
  var html = HtmlService.createHtmlOutputFromFile('PullDialog').setWidth(620).setHeight(520);
  SlidesApp.getUi().showModalDialog(html, 'ดึงข้อมูลรายงานล่าสุดจากระบบ');
}

function showSettingsDialog() {
  var html = HtmlService.createHtmlOutputFromFile('SettingsDialog').setWidth(520).setHeight(320);
  SlidesApp.getUi().showModalDialog(html, 'ตั้งค่าคีย์เชื่อมต่อ');
}

// ---- Pull mode ----
// The key is kept in Script Properties: every editor of this script can read it, so use it only in decks that
// trusted colleagues edit. It is never sent back to the dialogs (only a masked form).
var KEY_PROP = 'CF_REPORT_KEY';

function getSettings() {
  var key = PropertiesService.getScriptProperties().getProperty(KEY_PROP);
  return { hasKey: !!key, masked: key ? key.slice(0, 8) + '••••••••' : '' };
}

function saveSettings(key) {
  key = String(key || '').trim();
  if (!isReportKey(key)) throw new Error('รูปแบบคีย์ไม่ถูกต้อง ต้องขึ้นต้น cfr_ และยาว 36 ตัวอักษร');
  PropertiesService.getScriptProperties().setProperty(KEY_PROP, key);
  return getSettings();
}

function clearSettings() {
  PropertiesService.getScriptProperties().deleteProperty(KEY_PROP);
  return getSettings();
}

function fetchExport_(opts) {
  var key = PropertiesService.getScriptProperties().getProperty(KEY_PROP);
  if (!key) throw new Error('ยังไม่ได้ตั้งค่าคีย์ — เมนู SPARK Report → ตั้งค่าคีย์เชื่อมต่อ…');
  var res = UrlFetchApp.fetch(exportUrl(opts), {
    method: 'get',
    headers: { Authorization: 'Bearer ' + key },
    muteHttpExceptions: true,
    followRedirects: false,
  });
  var status = res.getResponseCode();
  if (status !== 200) throw new Error(explainExportStatus(status));
  var payload = JSON.parse(res.getContentText());
  if (!payload || payload.schema !== SCHEMA) throw new Error('ข้อมูลที่ได้ไม่ใช่รูปแบบ ' + SCHEMA);
  return { payload: payload, snapshotId: res.getHeaders()['X-Report-Snapshot-Id'] || '' };
}

/** Step 1: show which report would be used (period, time, size) before anything is written to the deck. */
function previewLatest(periodEnd) {
  var r = fetchExport_({ periodEnd: periodEnd || '' });
  var d = describePayload(r.payload);
  d.snapshotId = r.snapshotId;
  return d;
}

/** Step 2: fetch that exact snapshot again and fill the deck. */
function applyLatest(snapshotId, force, withCharts) {
  var r = fetchExport_({ snapshotId: snapshotId });
  return applyPayloadObject_(r.payload, force, withCharts);
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

function collectImages_(elements, pageW, pageH, out) {
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var type = el.getPageElementType();
    if (type === SlidesApp.PageElementType.GROUP) {
      collectImages_(el.asGroup().getChildren(), pageW, pageH, out);
    } else if (type === SlidesApp.PageElementType.IMAGE) {
      var left = el.getLeft();
      var top = el.getTop();
      var width = el.getWidth();
      var height = el.getHeight();
      var outside = isFinite(left) && isFinite(top) && (left >= pageW || left + width <= 0 || top >= pageH || top + height <= 0);
      if (!outside) out.push({ el: el, left: left, top: top, width: width, height: height });
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
    var images = [];
    collectImages_(slide.getPageElements(), w, h, images);
    // Read every text once: finding a slide for each of ~200 ops would otherwise re-read the whole deck each time
    var texts = shapes.map(function (sh) { try { return sh.getText().asString(); } catch (e) { return ''; } });
    return { number: i + 1, shapes: shapes, texts: texts, tables: tables, images: images };
  });
}

function shapeText_(shape) {
  return shape.getText().asString();
}

function findSlide_(index, selector) {
  for (var i = 0; i < index.length; i++) {
    var texts = index[i].texts;
    for (var j = 0; j < texts.length; j++) {
      var t = texts[j];
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

/** Draw the column chart (Charts service) as a PNG blob of the given pixel size. */
function drawChartBlob_(op, width, height) {
  var data = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'Age');
  op.series.forEach(function (s) { data.addColumn(Charts.ColumnType.NUMBER, s.name); });
  op.categories.forEach(function (c, i) {
    var row = [c];
    op.series.forEach(function (s) { row.push(s.values[i] || 0); });
    data.addRow(row);
  });
  var chart = Charts.newColumnChart()
    .setDataTable(data.build())
    .setColors(op.series.map(function (s) { return s.color; }))
    .setLegendPosition(Charts.Position.BOTTOM)
    .setDimensions(width, height)
    .setOption('legend', { textStyle: { fontSize: 13 } })
    .setOption('hAxis', { textStyle: { fontSize: 13 } })
    .setOption('vAxis', { format: 'short', textStyle: { fontSize: 13 }, minValue: 0 })
    .setOption('bar', { groupWidth: '70%' })
    .setOption('chartArea', { width: '88%', height: '62%' })
    .build();
  return chart.getAs('image/png');
}

/** Replace the team's picture under the op's label with a freshly drawn chart; tag it so next month finds it. */
function applyChartOp_(op, slide, counts, problems) {
  var label = null;
  for (var i = 0; i < slide.shapes.length && !label; i++) {
    if (String(slide.texts[i]).replace(/^\s+|\s+$/g, '').toLowerCase() === op.slot.toLowerCase()) label = slide.shapes[i];
  }
  if (!label) { counts.not_found++; problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบหัวข้อ "' + op.slot + '"'); return; }
  var box = { left: label.getLeft(), top: label.getTop(), width: label.getWidth(), height: label.getHeight() };
  var tag = CHART_TAG_PREFIX + op.id;
  var images = slide.images.map(function (im) {
    var title = '';
    try { title = im.el.getTitle() || ''; } catch (e) {}
    return { el: im.el, left: im.left, top: im.top, width: im.width, height: im.height, title: title };
  });
  var target = pickChartImage_(box, images, tag);
  if (!target) { counts.not_found++; problems.push(op.id + ': พบหัวข้อ "' + op.slot + '" หน้า ' + slide.number + ' แต่ไม่พบรูปกราฟใต้หัวข้อ'); return; }
  var size = chartPixelSize(target.width, target.height);
  var image = target.el.asImage();
  image.replace(drawChartBlob_(op, size.width, size.height), false);
  image.setTitle(tag);
  counts.filled++;
  counts.charts++;
}

function applyPayload(jsonText, force, withCharts) {
  var payload = JSON.parse(jsonText);
  if (!payload || payload.schema !== SCHEMA) throw new Error('JSON นี้ไม่ใช่รูปแบบ ' + SCHEMA + ' — คัดลอกจากหัวข้อ "7. JSON สำหรับสคริปต์เติมสไลด์"');
  return applyPayloadObject_(payload, force, withCharts);
}

function applyPayloadObject_(payload, force, withCharts) {

  // Remembered values: read once, collect writes, save once at the end (hundreds of single calls made the run very slow)
  var docProps = PropertiesService.getDocumentProperties();
  var storedMap = docProps.getProperties();
  var pending = {};
  var props = {
    getProperty: function (k) {
      if (Object.prototype.hasOwnProperty.call(pending, k)) return pending[k];
      return Object.prototype.hasOwnProperty.call(storedMap, k) ? storedMap[k] : null;
    },
    setProperty: function (k, v) { pending[k] = v; },
  };
  var slideCache = {};
  var index = buildIndex_();
  var counts = { filled: 0, unchanged: 0, skipped_edited: 0, not_found: 0, charts: 0, charts_skipped: 0 };
  var problems = [];
  var debugShown = false;

  try {
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

    var cacheKey = JSON.stringify(op.slide);
    if (!Object.prototype.hasOwnProperty.call(slideCache, cacheKey)) slideCache[cacheKey] = findSlide_(index, op.slide);
    var slide = slideCache[cacheKey];
    if (!slide) {
      counts.not_found++;
      problems.push(op.id + ': ไม่พบหน้า');
      if (op.slide.titlePrefix && !debugShown) {
        debugShown = true;
        problems.push('  debug (' + op.id + '): ' + (debugTitle_(op.slide).join(' ; ') || 'ไม่พบกล่องที่มีคำว่า Campaign + ชื่อสาขานี้เลย'));
      }
      continue;
    }

    if (op.kind === 'chart') {
      if (!withCharts) { counts.charts_skipped++; continue; }
      try { applyChartOp_(op, slide, counts, problems); }
      catch (e) { counts.not_found++; problems.push(op.id + ': วาดกราฟไม่สำเร็จ — ' + e.message); }
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

  } finally {
    try { docProps.setProperties(pending, false); } catch (e) {}
  }

  return {
    generated_at: payload.generated_at + ' · สคริปต์ ' + SCRIPT_VERSION,
    period: payload.period,
    counts: counts,
    problems: problems.slice(0, 40),
    needs_review: payload.needs_review || [],
  };
}
