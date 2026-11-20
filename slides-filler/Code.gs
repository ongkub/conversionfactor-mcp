/**
 * SPARK Report filler — fills last month's deck copy with the numbers from get_monthly_report_data.
 * Container-bound script: Extensions → Apps Script on the TEST copy of the Sangthai report.
 * Core.gs holds the pure logic (tested with node); this file only talks to Slides.
 */

var SCHEMA = 'sangthai-slides/1';
// Shown in the result so it is obvious which copy of this script is running
var SCRIPT_VERSION = 'v4.8.1-google-fit-2026-11-20';
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
  return { payload: payload, snapshotId: headerValue_(res.getHeaders(), 'X-Report-Snapshot-Id') };
}

/** Step 1: show which report would be used (period, time, size) before anything is written to the deck. */
function previewLatest(periodEnd) {
  var r = fetchExport_({ periodEnd: periodEnd || '' });
  var d = describePayload(r.payload);
  d.snapshotId = r.snapshotId;
  return d;
}

/** Step 2: fetch that exact snapshot again and fill the deck. */
function applyLatest(snapshotId, force, withCharts, withImages, withGoogle) {
  // never fall back to "latest": that could fill a different period than the one the person checked
  if (!snapshotId) throw new Error('ไม่ได้รหัสรายงานจากขั้นตอนตรวจ — กดตรวจรายงานที่จะใช้อีกครั้งก่อนยืนยัน');
  var r = fetchExport_({ snapshotId: snapshotId });
  return applyPayloadObject_(r.payload, force, withCharts, withImages, withGoogle);
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
      var tableTitle = '';
      try { tableTitle = el.getTitle() || ''; } catch (e) {}
      if (isSparkTitle_(tableTitle)) continue; // tables this script inserted (Google Ads slides) are not the team's summary tables
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
      if (!outside) out.push({ shape: el.asShape(), top: top, left: left });
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
    var shapeItems = [];
    collectShapes_(slide.getPageElements(), w, h, shapeItems);
    var shapes = shapeItems.map(function (it) { return it.shape; });
    var shapePositions = shapeItems.map(function (it) { return { top: it.top, left: it.left }; });
    var tables = [];
    collectTables_(slide.getPageElements(), w, h, tables);
    var images = [];
    collectImages_(slide.getPageElements(), w, h, images);
    // Read every text once: finding a slide for each of ~200 ops would otherwise re-read the whole deck each time
    var texts = shapes.map(function (sh) { try { return sh.getText().asString(); } catch (e) { return ''; } });
    return { number: i + 1, page: slide, shapes: shapes, shapePositions: shapePositions, texts: texts, tables: tables, images: images };
  });
}

function shapeText_(shape) {
  return shape.getText().asString();
}

function findSlide_(index, selector) {
  if (!selector) return null;
  var want = selector.nth || 1;
  if (want < 1) return null;
  var seen = 0;
  for (var i = 0; i < index.length; i++) {
    var texts = index[i].texts;
    var matched = false;
    if (selector.topTitle) {
      var ti = topTextIndex_(texts, index[i].shapePositions);
      if (ti >= 0) {
        var topText = texts[ti];
        if (selector.containsText && topText.indexOf(selector.containsText) >= 0) matched = true;
        if (selector.titlePrefix && slideTitleMatches_(topText, selector)) matched = true;
      }
    } else {
      for (var j = 0; j < texts.length; j++) {
        var t = texts[j];
        if (selector.containsText && t.indexOf(selector.containsText) >= 0) { matched = true; break; }
        if (selector.titlePrefix && slideTitleMatches_(t, selector)) { matched = true; break; }
      }
    }
    if (matched) {
      seen++;
      if (seen === want) return index[i];
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
  // the picture is shown at ~1/3 of its pixel size, so text sizes scale with the width to read like ~9 pt on the slide
  var font = Math.max(11, Math.round(width / 46));
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
    .setDimensions(width, height)
    // setOption replaces the whole 'legend' object, so the position must be part of it
    .setOption('legend', { position: 'bottom', maxLines: 2, textStyle: { fontSize: Math.max(10, Math.round(width / 54)) } })
    .setOption('hAxis', { textStyle: { fontSize: font } })
    .setOption('vAxis', { format: 'short', textStyle: { fontSize: font }, minValue: 0 })
    .setOption('bar', { groupWidth: '70%' })
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

/** Replace the picture above a creative's rank box with the ad's picture; tag it so next month finds it. */
function applyImageOp_(op, slide, counts, problems) {
  // main campaign boxes say Engagement / Page Like; branch boxes say Message or "Pagelike" (one word)
  var re = new RegExp('^\\s*' + op.rank + '\\s+(?:Engagement|Page\\s*Like|Message)\\s*=', 'i');
  var boxShape = null;
  for (var i = 0; i < slide.shapes.length && !boxShape; i++) if (re.test(slide.texts[i])) boxShape = slide.shapes[i];
  if (!boxShape) { counts.not_found++; problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบกล่องอันดับ ' + op.rank); return; }
  var box = { left: boxShape.getLeft(), top: boxShape.getTop(), width: boxShape.getWidth(), height: boxShape.getHeight() };
  var tag = CREATIVE_TAG_PREFIX + op.id;
  var images = slide.images.map(function (im) {
    var title = '';
    try { title = im.el.getTitle() || ''; } catch (e) {}
    return { el: im.el, left: im.left, top: im.top, width: im.width, height: im.height, title: title };
  });
  var target = pickCreativeImage_(box, images, tag);
  if (!target) { counts.not_found++; problems.push(op.id + ': พบกล่องอันดับ ' + op.rank + ' หน้า ' + slide.number + ' แต่ไม่พบรูปเหนือกล่อง'); return; }
  var urls = op.urls && op.urls.length >= 2 ? op.urls.slice(0, 3) : null;
  var blobs = [];
  if (urls) {
    try {
      for (var u = 0; u < urls.length; u++) {
        var albumRes = UrlFetchApp.fetch(urls[u], { muteHttpExceptions: true, followRedirects: true });
        if (albumRes.getResponseCode() !== 200) throw new Error('HTTP ' + albumRes.getResponseCode());
        blobs.push(albumRes.getBlob());
      }
    } catch (albumError) {
      urls = null;
      blobs = [];
    }
  }
  // Meta's links expire: a failed download only skips this picture (the old one stays)
  var res = null;
  if (!urls) {
    res = UrlFetchApp.fetch(op.urls && op.urls.length ? op.urls[0] : op.url, { muteHttpExceptions: true, followRedirects: true });
  }
  if (res && res.getResponseCode() !== 200) {
    counts.images_failed++;
    problems.push(op.id + ': โหลดรูปไม่ได้ (รหัส ' + res.getResponseCode() + ' — ลิงก์อาจหมดอายุ สร้างรายงานใหม่แล้วเติมทันที) คงรูปเดิมไว้');
    return;
  }
  if (urls) {
    var pageElements = slide.page.getPageElements();
    for (var pe = pageElements.length - 1; pe >= 0; pe--) {
      var oldTitle = '';
      try { oldTitle = pageElements[pe].getTitle() || ''; } catch (e) {}
      if (oldTitle.indexOf(tag + ':') === 0) pageElements[pe].remove();
    }
    var tiles = albumLayout(target, urls.length);
    var image = target.el.asImage();
    image.replace(blobs[0], true);
    image.setLeft(tiles[0].left).setTop(tiles[0].top).setWidth(tiles[0].width).setHeight(tiles[0].height);
    image.setTitle(tag);
    for (var a = 1; a < urls.length; a++) {
      var tile = tiles[a];
      var added = slide.page.insertImage(blobs[a], tile.left, tile.top, tile.width, tile.height);
      added.setTitle(tag + ':' + a);
    }
    if (op.more > 0) {
      var last = tiles[tiles.length - 1];
      var overlay = slide.page.insertTextBox('+' + op.more, last.left, last.top, last.width, last.height);
      overlay.setTitle(tag + ':more');
      overlay.getText().getTextStyle().setForegroundColor('#FFFFFF').setBold(true).setFontSize(28);
      overlay.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      overlay.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      overlay.getFill().setSolidFill('#000000', 0.45);
    }
    counts.filled++;
    counts.images++;
    return;
  }
  var image = target.el.asImage();
  image.replace(res.getBlob(), true);
  image.setTitle(tag);
  counts.filled++;
  counts.images++;
}

// ---- Google Ads slides (gchart / gtable / gad): screenshots of the Google Ads UI replaced by drawn visuals ----

function tableBox_(el) {
  var table = el.asTable();
  var width = 0;
  var height = 0;
  var cols = table.getNumColumns();
  for (var c = 0; c < cols; c++) width += table.getColumn(c).getWidth();
  var rows = table.getNumRows();
  for (var r = 0; r < rows; r++) height += table.getRow(r).getMinimumHeight();
  return { left: el.getLeft(), top: el.getTop(), width: width, height: height };
}

function pageElementBoxes_(slide) {
  return slide.page.getPageElements().map(function (el) {
    var title = '';
    try { title = el.getTitle() || ''; } catch (e) {}
    var left = el.getLeft();
    var top = el.getTop();
    var width = el.getWidth();
    var height = el.getHeight();
    if ((!(width > 0) || !(height > 0)) && el.getPageElementType() === SlidesApp.PageElementType.TABLE) {
      try {
        var tb = tableBox_(el);
        if (!(width > 0)) width = tb.width;
        if (!(height > 0)) height = tb.height;
      } catch (e) {}
    }
    return { el: el, title: title, left: left, top: top, width: width, height: height };
  });
}

function removeBoxes_(boxes) {
  for (var i = 0; i < boxes.length; i++) { try { boxes[i].el.remove(); } catch (e) {} }
}

function shapeBox_(shape) {
  return { left: shape.getLeft(), top: shape.getTop(), width: shape.getWidth(), height: shape.getHeight() };
}

function round1_(v) {
  return Math.round(Number(v) * 10) / 10;
}

/** Where does a Google op put its visual? Our own visible element from the last run (found by tag), else the team's screenshot. */
function locateGoogleTarget_(op, slide, tag, props) {
  var pres = SlidesApp.getActivePresentation();
  var page = { width: pres.getPageWidth(), height: pres.getPageHeight() };
  var boxes = pageElementBoxes_(slide);
  var mine = taggedElements_(boxes, tag).filter(function (b) { return visibleShare_(b, page) >= 0.5; });
  var boxKey = PROP_PREFIX + 'gbox:' + op.id;
  if (mine.length) {
    var storedBox = null;
    if (props) {
      try {
        var parsed = JSON.parse(props.getProperty(boxKey));
        if (parsed && parsed.width > 0 && parsed.height > 0 && isFinite(parsed.left) && isFinite(parsed.top)) {
          storedBox = { left: parsed.left, top: parsed.top, width: parsed.width, height: parsed.height };
        }
      } catch (e) {}
    }
    var tableItem = null;
    for (var mi = 0; mi < mine.length; mi++) {
      if (mine[mi].el.getPageElementType() === SlidesApp.PageElementType.TABLE) {
        tableItem = mine[mi];
        break;
      }
    }
    var resolvedBox = null;
    if (!tableItem) {
      var positive = mine.filter(function (b) { return b.width > 0 && b.height > 0; });
      resolvedBox = unionBox_(positive) || storedBox;
    } else {
      var tb = null;
      try { tb = tableBox_(tableItem.el); } catch (e) {}
      var tWidth = storedBox ? storedBox.width : (tb ? tb.width : 0);
      var tHeight = storedBox ? storedBox.height : (tb ? tb.height : 0);
      var tLeft = tableItem.el.getLeft();
      var tTop = tableItem.el.getTop();
      if (tWidth > 0 && tHeight > 0 && isFinite(tLeft) && isFinite(tTop)) {
        resolvedBox = { left: tLeft, top: tTop, width: tWidth, height: tHeight };
      }
    }
    if (!resolvedBox || !(resolvedBox.width > 0) || !(resolvedBox.height > 0)) {
      return { error: 'กล่องเดิมมีขนาดเป็น 0' };
    }
    return { box: resolvedBox, remove: mine };
  }
  var images = boxes.filter(function (b) { return b.el.getPageElementType() === SlidesApp.PageElementType.IMAGE; });
  var pic = null;
  if (op.anchor && op.anchor.topLeftPicture) {
    pic = pickTopLeftPicture_(images, page, tag);
    if (!pic) return { error: 'ไม่พบภาพแคปหน้าจอที่มุมซ้ายบน' };
  } else {
    var idx = findAnchorShape_(slide.texts, op.anchor);
    if (idx < 0) return { error: 'ไม่พบหัวข้อ "' + (op.anchor.label || op.anchor.matches) + '"' };
    pic = pickScreenshotBelow_(shapeBox_(slide.shapes[idx]), images, page);
    if (!pic) return { error: 'พบหัวข้อ "' + (op.anchor.label || op.anchor.matches) + '" แต่ไม่พบภาพแคปหน้าจอใต้หัวข้อ' };
  }
  var box = { left: pic.left, top: pic.top, width: pic.width, height: pic.height };
  if (props) {
    props.setProperty(boxKey, JSON.stringify({
      left: round1_(box.left),
      top: round1_(box.top),
      width: round1_(box.width),
      height: round1_(box.height),
    }));
  }
  return { box: box, remove: [pic], picture: pic };
}

/** Line chart (Charts service) as a PNG blob. Series with axis 1 use the right-hand scale. */
function drawLineChartBlob_(op, width, height) {
  var font = Math.max(11, Math.round(width / 46));
  var data = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'Date');
  op.series.forEach(function (s) { data.addColumn(Charts.ColumnType.NUMBER, s.name); });
  op.categories.forEach(function (c, i) {
    var row = [c];
    op.series.forEach(function (s) { row.push(s.values[i] || 0); });
    data.addRow(row);
  });
  var seriesOpt = {};
  op.series.forEach(function (s, i) { seriesOpt[i] = { targetAxisIndex: s.axis === 1 ? 1 : 0 }; });
  var chart = Charts.newLineChart()
    .setDataTable(data.build())
    .setColors(op.series.map(function (s) { return s.color; }))
    .setDimensions(width, height)
    .setTitle(op.title)
    .setOption('titleTextStyle', { fontSize: Math.max(12, Math.round(width / 40)) })
    .setOption('legend', { position: 'bottom', textStyle: { fontSize: Math.max(10, Math.round(width / 54)) } })
    .setOption('hAxis', { textStyle: { fontSize: font }, showTextEvery: Math.max(1, Math.ceil(op.categories.length / 8)) })
    .setOption('series', seriesOpt)
    .setOption('vAxes', { 0: { textStyle: { fontSize: font }, minValue: 0 }, 1: { textStyle: { fontSize: font }, minValue: 0 } })
    .setOption('lineWidth', 3)
    .build();
  return chart.getAs('image/png');
}

/** Horizontal bar chart (Charts service) for Demographics as a PNG blob. */
function drawBarChartBlob_(bars, width, height) {
  var labelFont = barLabelFontPx_(height, bars.labels.length);
  var valueFont = Math.max(8, labelFont - 2);
  var data = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, 'Group')
    .addColumn(Charts.ColumnType.NUMBER, 'อายุ')
    .addColumn(Charts.ColumnType.NUMBER, 'เพศ');
  for (var i = 0; i < bars.labels.length; i++) {
    var isGender = bars.groups && bars.groups[i] === 'gender';
    var val = bars.values[i] || 0;
    data.addRow([bars.labels[i], isGender ? 0 : val, isGender ? val : 0]);
  }
  var chart = Charts.newBarChart()
    .setDataTable(data.build())
    .setColors(['#4285F4', '#F4B400'])
    .setDimensions(width, height)
    .setLegendPosition(Charts.Position.NONE)
    .setOption('isStacked', true)
    .setOption('chartArea', { left: '30%', top: '2%', width: '66%', height: '86%' })
    .setOption('hAxis', { textStyle: { fontSize: valueFont }, minValue: 0, gridlines: { count: 3 } })
    .setOption('vAxis', { textStyle: { fontSize: labelFont } })
    .build();
  return chart.getAs('image/png');
}

/** KPI + daily line: replace the screenshot under the title with a drawn line chart, tagged for the next run. */
function applyGoogleChartOp_(op, slide, props, counts, problems) {
  var tag = GCHART_TAG_PREFIX + op.id;
  var target = locateGoogleTarget_(op, slide, tag, props);
  if (target.error) { counts.not_found++; problems.push(op.id + ': หน้า ' + slide.number + ' ' + target.error + ' (ไม่แตะรูปเดิม)'); return; }
  var size = chartPixelSize(target.box.width, target.box.height);
  var blob = drawLineChartBlob_(op, size.width, size.height);
  var existing = target.remove[0];
  if (existing.el.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
    var image = existing.el.asImage();
    image.replace(blob, false);
    image.setTitle(tag);
  } else {
    var inserted = slide.page.insertImage(blob, target.box.left, target.box.top, target.box.width, target.box.height);
    inserted.setTitle(tag);
    removeBoxes_(target.remove);
  }
  counts.filled++;
  counts.google_charts++;
}

/**
 * Native table at (left, top, width, height). header = array or null (then every row is data). opts: boldLast, heat
 * (same shape as rows, share 0..1 or null per body cell). Returns the Table.
 */
function insertGridTable_(page, box, header, rows, opts) {
  opts = opts || {};
  var hasHeader = !!(header && header.length);
  var fit = fitTableText_(box, hasHeader ? header : null, rows);
  var all = (hasHeader ? [header] : []).concat(fit.rows);
  var geo = tableGeometry_(box, fit.rows, hasHeader ? header : null);
  var table = page.insertTable(geo.rows, geo.cols, box.left, box.top, box.width, box.height);
  for (var c = 0; c < geo.cols; c++) {
    try { table.getColumn(c).setWidth(geo.colWidths[c]); } catch (e) {}
  }
  for (var r = 0; r < all.length; r++) {
    for (var k = 0; k < geo.cols; k++) {
      var cell = table.getCell(r, k);
      var value = all[r][k] === undefined ? '' : String(all[r][k]);
      var text = cell.getText();
      text.setText(value);
      var style = text.getTextStyle();
      var isHeader = hasHeader && r === 0;
      var bodyIndex = r - (hasHeader ? 1 : 0);
      style.setFontSize(fit.fontSize).setForegroundColor('#202124');
      style.setBold(isHeader || (!!opts.boldLast && r === all.length - 1) || (!hasHeader && k === 0));
      if (k > 0 && !(!hasHeader && geo.cols === 2)) {
        try { text.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END); } catch (e) {}
      }
      try {
        if (isHeader) {
          cell.getFill().setSolidFill('#F1F3F4');
        } else if (opts.heat && opts.heat[bodyIndex] && opts.heat[bodyIndex][k] !== null && opts.heat[bodyIndex][k] !== undefined) {
          var share = opts.heat[bodyIndex][k];
          cell.getFill().setSolidFill(heatColor_(share));
          style.setForegroundColor(heatTextColor_(share));
        } else {
          cell.getFill().setSolidFill('#FFFFFF');
        }
      } catch (e) {}
    }
  }
  return table;
}

function tagElement_(el, tag, problems, id) {
  try { el.setTitle(tag); }
  catch (e) { problems.push(id + ': ตั้งชื่อ (tag) ให้ตารางไม่ได้ — รอบหน้าจะหาตารางเดิมไม่เจอ (' + e.message + ')'); }
}

/** Demographics (bar chart picture) / Campaign (native table) at the screenshot's bounds, then the old element goes. */
function applyGoogleTableOp_(op, slide, props, force, counts, problems) {
  var tag = GTABLE_TAG_PREFIX + op.id;
  var target = locateGoogleTarget_(op, slide, tag, props);
  if (target.error) { counts.not_found++; problems.push(op.id + ': หน้า ' + slide.number + ' ' + target.error + ' (ไม่แตะรูปเดิม)'); return; }
  if (op.heat) {
    var bars = demographicBars_(op);
    var size = chartPixelSize(target.box.width, target.box.height);
    var blob = drawBarChartBlob_(bars, size.width, size.height);
    var existing = target.remove[0];
    if (existing && existing.el.getPageElementType() === SlidesApp.PageElementType.IMAGE && (existing.title === tag || existing.title.indexOf(tag + ':') === 0)) {
      var image = existing.el.asImage();
      image.replace(blob, false);
      image.setTitle(tag);
      if (target.remove.length > 1) removeBoxes_(target.remove.slice(1));
    } else {
      var inserted = slide.page.insertImage(blob, target.box.left, target.box.top, target.box.width, target.box.height);
      tagElement_(inserted, tag, problems, op.id);
      removeBoxes_(target.remove);
    }
    counts.filled++;
    counts.google_charts++;
  } else {
    var table = insertGridTable_(slide.page, target.box, op.header, op.rows, { heat: op.heat, boldLast: op.boldLastRow });
    tagElement_(table, tag, problems, op.id);
    removeBoxes_(target.remove); // inserted first, so a failure above never loses the team's picture
    counts.filled++;
    counts.google_tables++;
  }
  if (op.caption) applyGoogleCaption_(op, slide, props, force, counts, problems);
}

// The one-sentence line under Demographics ("…ส่วนใหญ่เป็น" + group and number): only when that anchor text is on the slide
function applyGoogleCaption_(op, slide, props, force, counts, problems) {
  for (var i = 0; i < slide.shapes.length; i++) {
    var text = slide.texts[i];
    var edit = planCaptionEdit_(text, op.caption);
    if (!edit) continue;
    var key = PROP_PREFIX + op.id + '#caption';
    var decision = decideFill(edit.oldText, edit.newText, props.getProperty(key), !!force);
    if (decision === 'fill') {
      replaceRange_(slide.shapes[i], edit, null);
      counts.filled++;
      props.setProperty(key, edit.newText);
    } else if (decision === 'unchanged') {
      counts.unchanged++;
      props.setProperty(key, edit.newText);
    } else {
      counts.skipped_edited++;
      problems.push(op.id + ': ประโยคใต้ Demographics ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number);
    }
    return;
  }
}

/** Most clicked ad: picture on the left + stat text box on the right, or a single text box for a text ad. */
function applyGoogleAdOp_(op, slide, props, counts, problems) {
  var tag = GAD_TAG_PREFIX + op.id;
  var target = locateGoogleTarget_(op, slide, tag, props);
  if (target.error) { counts.not_found++; problems.push(op.id + ': หน้า ' + slide.number + ' ' + target.error + ' (ไม่แตะรูปเดิม)'); return; }

  // download first: a failed picture must not cost the team's screenshot (the text box is the fallback)
  var blob = null;
  if (op.imageUrl) {
    try {
      var res = UrlFetchApp.fetch(op.imageUrl, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
      blob = res.getBlob();
    } catch (e) {
      counts.images_failed++;
      problems.push(op.id + ': โหลดรูปโฆษณาไม่ได้ (' + e.message + ')' + (op.text ? ' — ใช้ข้อความแทน' : ' — คงรูปเดิมไว้'));
    }
  }
  if (!blob && !op.text) return;

  if (blob) {
    var layout = adLayout_(target.box);
    var added = slide.page.insertImage(blob);
    var fit = fitInside_(layout.left, added.getWidth(), added.getHeight());
    added.setLeft(fit.left).setTop(fit.top).setWidth(fit.width).setHeight(fit.height);
    added.setTitle(tag + ':img');
    var statLines = adStatLines_(op);
    var statSize = fitFontSize_(statLines, layout.right);
    var statsBox = slide.page.insertTextBox(statLines.join('\n'), layout.right.left, layout.right.top, layout.right.width, layout.right.height);
    statsBox.getText().getTextStyle().setFontSize(statSize).setForegroundColor('#202124');
    tagElement_(statsBox, tag + ':stats', problems, op.id);
  } else {
    var headline = String((op.text && op.text.headline) || '');
    var description = String((op.text && op.text.description) || '');
    var statsLine = adStatLines_(op).join('  ·  ');
    var f = fitFontSize_([headline, description, statsLine], target.box);
    var headSize = Math.min(16, f + 2);
    var parts = [];
    if (headline) parts.push({ text: headline, size: headSize, bold: true, color: '#1A0DAB' });
    if (description) parts.push({ text: description, size: f, bold: false, color: '#4D5156' });
    if (statsLine) parts.push({ text: statsLine, size: f, bold: false, color: '#202124' });
    var fullText = parts.map(function (p) { return p.text; }).join('\n');
    var textBox = slide.page.insertTextBox(fullText, target.box.left, target.box.top, target.box.width, target.box.height);
    var textRange = textBox.getText();
    var pos = 0;
    for (var pi = 0; pi < parts.length; pi++) {
      var part = parts[pi];
      var len = part.text.length;
      if (len > 0) {
        var st = textRange.getRange(pos, pos + len).getTextStyle();
        st.setFontSize(part.size).setBold(part.bold).setForegroundColor(part.color);
      }
      pos += len + 1;
    }
    tagElement_(textBox, tag + ':text', problems, op.id);
  }
  removeBoxes_(target.remove);
  counts.filled++;
  counts.google_ads++;
}

function applyTextEdits_(shape, edits, props, force, counts, problems, opts) {
  for (var e = edits.length - 1; e >= 0; e--) {
    var ed = edits[e];
    var key = opts.keyFor(ed, e);
    var stored = props.getProperty(key);
    var decision = decideFill(ed.oldText, ed.newText, stored, !!force);
    if (decision === 'fill') {
      replaceRange_(shape, ed, opts.tone);
      counts.filled++;
      props.setProperty(key, ed.newText);
    } else if (decision === 'unchanged') {
      counts.unchanged++;
      props.setProperty(key, ed.newText);
      if (opts.tone) applyTone_(shape, ed.start, ed.newText, opts.tone);
    } else {
      counts.skipped_edited++;
      problems.push(opts.skipMessage(ed));
    }
  }
}

function applyLinesOp_(op, slide, props, force, counts, problems) {
  var marker = op.marker || 'Result';
  var remaining = (op.candidates || []).slice();
  var qualified = false;
  var unmatchedAll = [];

  for (var s = 0; s < slide.shapes.length; s++) {
    var shape = slide.shapes[s];
    var text = shapeText_(shape);
    var plan = planLineEdits(text, { marker: marker, candidates: remaining });
    if (!plan.edits.length && !plan.unmatchedLabels.length) continue;
    qualified = true;

    applyTextEdits_(shape, plan.edits, props, force, counts, problems, {
      tone: null,
      keyFor: function (ed) { return PROP_PREFIX + op.id + '#' + normKey(ed.label); },
      skipMessage: function (ed) {
        return op.id + ': ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number + ' บรรทัด "' + ed.label + '" เดิม "' + ed.oldText + '"';
      },
    });

    for (var u = 0; u < plan.unmatchedLabels.length; u++) unmatchedAll.push(plan.unmatchedLabels[u]);

    var nextRemaining = [];
    var ui = 0;
    for (var r = 0; r < remaining.length; r++) {
      if (ui < plan.unusedCandidates.length && remaining[r].name === plan.unusedCandidates[ui]) {
        nextRemaining.push(remaining[r]);
        ui++;
      }
    }
    remaining = nextRemaining;
  }

  if (!qualified) {
    counts.not_found++;
    problems.push(op.id + ': พบหน้า ' + slide.number + ' แต่ไม่พบบรรทัดที่มี "' + marker + ' :"');
    return;
  }
  for (var ul = 0; ul < unmatchedAll.length && ul < 10; ul++) {
    problems.push(op.id + ': บรรทัด "' + unmatchedAll[ul] + '" ไม่ตรงกับ ad set ใด (ทีมกรอกเอง)');
  }
  for (var uc = 0; uc < remaining.length && uc < 10; uc++) {
    problems.push(op.id + ': ไม่มีบรรทัดสำหรับ "' + remaining[uc].name + '" = ' + remaining[uc].value);
  }
}

function applyPayload(jsonText, force, withCharts, withImages, withGoogle) {
  var payload = JSON.parse(jsonText);
  if (!payload || payload.schema !== SCHEMA) throw new Error('JSON นี้ไม่ใช่รูปแบบ ' + SCHEMA + ' — คัดลอกจากหัวข้อ "7. JSON สำหรับสคริปต์เติมสไลด์"');
  return applyPayloadObject_(payload, force, withCharts, withImages, withGoogle);
}

function applyPayloadObject_(payload, force, withCharts, withImages, withGoogle) {

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
  var counts = { filled: 0, unchanged: 0, skipped_edited: 0, not_found: 0, charts: 0, charts_skipped: 0, images: 0, images_skipped: 0, images_failed: 0, google_charts: 0, google_tables: 0, google_ads: 0, google_skipped: 0 };
  var problems = [];
  var debugShown = false;

  try {
  for (var i = 0; i < payload.fills.length; i++) {
    var op = payload.fills[i];
    if (op.kind && op.kind !== 'image' && op.kind !== 'chart' && op.kind !== 'table' && op.kind !== 'lines' && op.kind !== 'gchart' && op.kind !== 'gtable' && op.kind !== 'gad') {
      problems.push(op.id + ': ชนิดคำสั่ง "' + op.kind + '" ไม่รองรับในสคริปต์เวอร์ชันนี้');
      continue;
    }
    if ((op.kind === 'gchart' || op.kind === 'gtable' || op.kind === 'gad') && !withGoogle) { counts.google_skipped++; continue; }
    if (op.kind === 'table' && !op.slide) {
      var any = false;
      for (var si = 0; si < index.length; si++) {
        if (applyTableOp_(op, index[si], props, force, counts, problems)) any = true;
      }
      if (!any) { counts.not_found++; problems.push(op.id + ': ไม่พบตารางสรุปที่มีแถวตรงกับแคมเปญ'); }
      continue;
    }

    var selector = op.slide;
    if (selector && (op.kind === 'gchart' || op.kind === 'gtable' || op.kind === 'gad')) {
      var copy = {};
      for (var sk in selector) {
        if (Object.prototype.hasOwnProperty.call(selector, sk)) copy[sk] = selector[sk];
      }
      copy.topTitle = true;
      selector = copy;
    }
    var cacheKey = JSON.stringify(selector);
    if (!Object.prototype.hasOwnProperty.call(slideCache, cacheKey)) slideCache[cacheKey] = findSlide_(index, selector);
    var slide = slideCache[cacheKey];
    if (!slide) {
      counts.not_found++;
      problems.push(op.id + ': ไม่พบหน้า');
      if (selector && selector.titlePrefix && !debugShown) {
        debugShown = true;
        problems.push('  debug (' + op.id + '): ' + (debugTitle_(selector).join(' ; ') || 'ไม่พบกล่องที่มีคำว่า Campaign + ชื่อสาขานี้เลย'));
      }
      continue;
    }

    if (op.kind === 'image') {
      if (!withImages) { counts.images_skipped++; continue; }
      try { applyImageOp_(op, slide, counts, problems); }
      catch (e) { counts.images_failed++; problems.push(op.id + ': ใส่รูปไม่สำเร็จ — ' + e.message); }
      continue;
    }

    if (op.kind === 'gchart') {
      try { applyGoogleChartOp_(op, slide, props, counts, problems); }
      catch (e) { counts.not_found++; problems.push(op.id + ': วาดกราฟ Google Ads ไม่สำเร็จ — ' + e.message); }
      continue;
    }

    if (op.kind === 'gtable') {
      try { applyGoogleTableOp_(op, slide, props, force, counts, problems); }
      catch (e) { counts.not_found++; problems.push(op.id + ': สร้างตาราง Google Ads ไม่สำเร็จ — ' + e.message); }
      continue;
    }

    if (op.kind === 'gad') {
      try { applyGoogleAdOp_(op, slide, props, counts, problems); }
      catch (e) { counts.not_found++; problems.push(op.id + ': ใส่โฆษณา Google Ads ไม่สำเร็จ — ' + e.message); }
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

    if (op.kind === 'lines') {
      applyLinesOp_(op, slide, props, force, counts, problems);
      continue;
    }

    var normalOpts = {
      tone: op.tone,
      keyFor: function (ed, idx) { return PROP_PREFIX + op.id + '#' + idx; },
      skipMessage: function (ed) {
        return op.id + ': ทีมแก้ไว้แล้ว (ข้าม) หน้า ' + slide.number + ' เดิม "' + ed.oldText + '"';
      },
    };
    var edited = false;
    if (op.shape && op.shape.nth) {
      var matchingShapes = [];
      for (var ms = 0; ms < slide.shapes.length; ms++) {
        var mText = shapeText_(slide.shapes[ms]);
        if (!shapeMatches_(mText, op.shape)) continue;
        matchingShapes.push({
          shape: slide.shapes[ms],
          text: mText,
          top: slide.shapePositions[ms].top,
          left: slide.shapePositions[ms].left,
        });
      }
      var orderedShapes = orderByPosition_(matchingShapes);
      var picked = orderedShapes[op.shape.nth - 1];
      if (picked) {
        var nthEdits = planShapeEdits(picked.text, op);
        if (nthEdits.length) {
          applyTextEdits_(picked.shape, nthEdits, props, force, counts, problems, normalOpts);
          edited = true;
        }
      }
    } else {
      var done = false;
      for (var s = 0; s < slide.shapes.length && !done; s++) {
        var shape = slide.shapes[s];
        var text = shapeText_(shape);
        if (!shapeMatches_(text, op.shape)) continue;
        var edits = planShapeEdits(text, op);
        if (!edits.length) continue;
        applyTextEdits_(shape, edits, props, force, counts, problems, normalOpts);
        edited = true;
        done = true; // first matching shape only
      }
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
    problems: orderProblems_(problems, 60),
    needs_review: payload.needs_review || [],
  };
}
