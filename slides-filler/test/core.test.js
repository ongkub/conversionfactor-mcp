// Run: node --test slides-filler/test
const test = require('node:test');
const assert = require('node:assert');
const core = require('../Core.gs');

// Real text from the OCT test copy of the Sangthai deck (slide 4 and slide 45)
const OVERVIEW = [
  'รายละเอียดรายแพลตฟอร์ม',
  '1. Facebook Ads',
  'ยอดใช้จ่ายจริง: 10,737.20 THB (แผนที่ตั้งไว้: 10,700 THB)',
  'Engagement: 7,721 engagement (-1,739) | ใช้งบไป 9,315.62 THB',
  'Pagelike: 1,272 Pagelike | ใช้งบไป 1,421.58 THB',
  '2. Google Ads',
  'ยอดใช้จ่ายจริง: 38,334.1 THB (แผนที่ตั้งไว้: 28,150 THB)',
  'Search: 371.09 Conversion (-7%) | ใช้งบไป 16,983.40 THB',
  'GDN: 51 Conversion (-2%) | ใช้งบไป 3,070 THB',
  'Google my business: 3,517 Conversion (-47%) | ใช้งบไป 9,214.47 THB',
  'VDO: 40,655 Views (-6%) | ใช้งบไป 3,243.19 THB',
].join('\n');

const BRANCH = 'Optimisation goal : Conversations\nงบประมาณ : ฿3,416.29 THB (-39%)\nราคาต่อหน่วย :  ฿16.04 (-35%)\nจำนวน : 213 ครั้ง  (-14%)                    ';
const ov = { section: undefined };

const run = (text, op) => core.applyEdits_(text, core.planShapeEdits(text, op));

test('normKey makes deck titles and campaign names equal', () => {
  assert.strictEqual(core.normKey('ขอนแก่น--อ.บ้านไผ่'), core.normKey('ขอนแก่นบ้านไผ่'));
  assert.strictEqual(core.normKey('  \t ร้อยเอ็ด - จตุ '), 'ร้อยเอ็ดจตุ');
});

test('branch headline: replaces only the values and keeps labels and spacing', () => {
  let t = BRANCH;
  t = run(t, { mode: 'after_colon', label: 'งบประมาณ', value: '฿3,416.29 THB (-39%)' });
  t = run(t, { mode: 'after_colon', label: 'ราคาต่อหน่วย', value: '฿16.04 (-35%)' });
  t = run(t, { mode: 'after_colon', label: 'จำนวน', value: '213 ครั้ง (-6%)' });
  assert.strictEqual(t, 'Optimisation goal : Conversations\nงบประมาณ : ฿3,416.29 THB (-39%)\nราคาต่อหน่วย :  ฿16.04 (-35%)\nจำนวน : 213 ครั้ง (-6%)                    ');
});

test('overview: section scoping picks the right "ยอดใช้จ่ายจริง" line', () => {
  let t = run(OVERVIEW, { mode: 'after_colon', section: '2. Google Ads', label: 'ยอดใช้จ่ายจริง', value: '32,511.06 THB (แผนที่ตั้งไว้: 28,150 THB)' });
  assert.ok(t.includes('1. Facebook Ads\nยอดใช้จ่ายจริง: 10,737.20 THB (แผนที่ตั้งไว้: 10,700 THB)'));
  assert.ok(t.includes('2. Google Ads\nยอดใช้จ่ายจริง: 32,511.06 THB (แผนที่ตั้งไว้: 28,150 THB)'));
});

test('colon_until_paren keeps the team plan text', () => {
  const t = run(OVERVIEW, { mode: 'colon_until_paren', section: '1. Facebook Ads', label: 'ยอดใช้จ่ายจริง', value: '10,737.20 THB' });
  assert.ok(t.includes('ยอดใช้จ่ายจริง: 10,737.20 THB (แผนที่ตั้งไว้: 10,700 THB)'));
  const t2 = run(OVERVIEW, { mode: 'colon_until_paren', section: '1. Facebook Ads', label: 'ยอดใช้จ่ายจริง', value: '9,000 THB' });
  assert.ok(t2.includes('ยอดใช้จ่ายจริง: 9,000 THB (แผนที่ตั้งไว้: 10,700 THB)'));
});

test('after_marker replaces only the spend, not the team engagement result', () => {
  const t = run(OVERVIEW, { mode: 'after_marker', section: '1. Facebook Ads', label: 'Engagement', marker: 'ใช้งบไป ', value: '9,315.62 THB' });
  assert.ok(t.includes('Engagement: 7,721 engagement (-1,739) | ใช้งบไป 9,315.62 THB'));
  const t2 = run(OVERVIEW, { mode: 'after_marker', section: '1. Facebook Ads', label: 'Engagement', marker: 'ใช้งบไป ', value: '8,373.49 THB' });
  assert.ok(t2.includes('Engagement: 7,721 engagement (-1,739) | ใช้งบไป 8,373.49 THB'));
});

test('labels do not match longer labels or other sections', () => {
  assert.deepStrictEqual(core.planShapeEdits(OVERVIEW, { mode: 'after_colon', section: '2. Google Ads', label: 'Pagelike', value: 'x' }), []);
  assert.deepStrictEqual(core.planShapeEdits('Engagement VDO: 1', { mode: 'after_colon', label: 'Engagement', value: 'x' }), []);
});

test('Google lines get the full value', () => {
  const t = run(OVERVIEW, { mode: 'after_colon', section: '2. Google Ads', label: 'Search', value: '371.09 Conversion (-7%) | ใช้งบไป 16,983.4 THB' });
  assert.ok(t.includes('Search: 371.09 Conversion (-7%) | ใช้งบไป 16,983.4 THB\nGDN:'));
});

test('regex mode replaces the date range everywhere in the shape', () => {
  const t = run('สรุปภาพรวมโฆษณา ประจำเดือน 16/08/2026 - 15/09/2026  ', {
    mode: 'regex', pattern: '\\d{2}/\\d{2}/\\d{4}\\s*-\\s*\\d{2}/\\d{2}/\\d{4}', value: '16/09/2026 - 15/10/2026',
  });
  assert.strictEqual(t, 'สรุปภาพรวมโฆษณา ประจำเดือน 16/09/2026 - 15/10/2026  ');
});

test('vertical-tab line breaks work like newlines', () => {
  const t = run('A\u000bงบประมาณ : ฿1 THB (+1%)\u000bB', { mode: 'after_colon', label: 'งบประมาณ', value: '฿2 THB' });
  assert.strictEqual(t, 'A\u000bงบประมาณ : ฿2 THB\u000bB');
});

test('decideFill: unchanged / fill / skip when the team edited', () => {
  assert.strictEqual(core.decideFill('213 ครั้ง', '213 ครั้ง', null, false), 'unchanged');
  assert.strictEqual(core.decideFill('213 ครั้ง (-14%)', '213 ครั้ง (-6%)', null, false), 'fill'); // first run overwrites last month
  assert.strictEqual(core.decideFill('213 ครั้ง (-6%)', '214 ครั้ง (-5%)', '213 ครั้ง (-6%)', false), 'fill'); // still our value
  assert.strictEqual(core.decideFill('ทีมแก้เอง', '214 ครั้ง (-5%)', '213 ครั้ง (-6%)', false), 'skipped_edited');
  assert.strictEqual(core.decideFill('ทีมแก้เอง', '214 ครั้ง (-5%)', '213 ครั้ง (-6%)', true), 'fill'); // force
});

test('slide selectors', () => {
  const sel = { titlePrefix: 'Message Campaign', titleKey: 'ขอนแก่นบ้านไผ่' };
  assert.ok(core.slideTitleMatches_('Message Campaign                         ขอนแก่นบ้านไผ่', sel));
  assert.ok(core.slideTitleMatches_('Message Campaign\t\tขอนแก่น--อ.บ้านไผ่ ', { ...sel }));
  assert.ok(!core.slideTitleMatches_('Summary : Message Campaign', sel));
  assert.ok(!core.slideTitleMatches_('Page Like Campaign   ขอนแก่นบ้านไผ่', sel));
  assert.ok(core.shapeMatches_('Optimisation goal : Conversations', { containsText: 'Optimisation goal' }));
  assert.ok(core.shapeMatches_('16/09/2026 - 15/10/2026', { matches: '\\d{2}/\\d{2}/\\d{4}' }));
});

test('percentRange finds the "(…%)" tail used for colouring', () => {
  assert.deepStrictEqual(core.percentRange('213 ครั้ง (-6%)'), { from: 10, to: 15 });
  assert.deepStrictEqual(core.percentRange('฿16.04 (-35%)'), { from: 7, to: 13 });
  assert.strictEqual(core.percentRange('1,394 ครั้ง'), null);
  assert.strictEqual(core.percentRange('฿4.28'), null);
  assert.strictEqual(core.TONE_COLORS.good, '#22BA4F');
});

test('"=" works as the label separator (Ads Creative boxes)', () => {
  const box = '1\nMessage = 211\nCTR = 5.72%';
  let t = run(box, { mode: 'after_colon', label: 'Message', value: '211' });
  t = run(t, { mode: 'after_colon', label: 'CTR', value: '5.73%' });
  assert.strictEqual(t, '1\nMessage = 211\nCTR = 5.73%');
  assert.ok(new RegExp('^\\s*1\\s+Message\\s*=').test(box));
  assert.ok(!new RegExp('^\\s*2\\s+Message\\s*=').test(box));
});

// OCT table of the บางเลน slide (team labels) vs. the ad sets from the Meta API
const TABLE = [
  ['Ads Target   ', 'Result', 'CPA', 'Budget', 'MoM (Budget)'],
  ['1. CA+LAL', '118', '฿16.47', '฿1,942.98', '-54%'],
  ['2. Retar ลอนผนังเหลี่ยม', '89', '฿14.61', '฿1,300.07', '+167%'],
  ['3. Construction', '3', '฿33.37', '฿100.10', '-86%'],
  ['4. Business Owner', '3', '฿23.25', '฿69.75', '-34%'],
];
const CANDIDATES = [
  { name: 'CA+LAL', key: 'CA+LAL', cells: { 1: '118', 2: '฿16.47', 3: '฿1,942.98', 4: '-54%' } },
  { name: 'Retar ลอนผนังเหลี่ยม+ST-850-09/2026', key: 'Retarลอนผนังเหลี่ยม+ST-850-09/2026', cells: { 1: '89', 2: '฿14.61', 3: '฿1,300.07', 4: '+167%' } },
  { name: 'Construction', key: 'Construction', cells: { 1: '3', 2: '฿33.37', 3: '฿100.10', 4: '-87%' } },
  { name: 'Business Owner', key: 'BusinessOwner', cells: { 1: '3', 2: '฿23.25', 3: '฿69.75', 4: '-35%' } },
  { name: '1%LAL inbox เพจหลัก', key: '1%LALinboxเพจหลัก', cells: { 1: '0', 2: '-', 3: '฿3.39', 4: 'N/A' } },
];

test('table: rows are matched by the team label, only numeric cells change', () => {
  const plan = core.planTableEdits(TABLE, { candidates: CANDIDATES });
  const changed = plan.edits.filter((e) => e.oldText !== e.newText);
  assert.deepStrictEqual(changed.map((e) => [e.row, e.col, e.oldText, e.newText]), [[3, 4, '-86%', '-87%'], [4, 4, '-34%', '-35%']]);
  assert.strictEqual(plan.edits.length, 16); // 4 rows x 4 numeric cells, first column untouched
  assert.ok(plan.edits.every((e) => e.col >= 1));
  assert.deepStrictEqual(plan.unmatchedRows, []);
  assert.deepStrictEqual(plan.unusedCandidates, ['1%LAL inbox เพจหลัก']); // ad set without a row in the table
});

test('table: a team row with no data is reported, a label prefix still matches', () => {
  const rows = [TABLE[0], ['1. CA+LAL', '', '', '', ''], ['2. Lookalike เก่า', '9', '฿1', '฿1', '+1%']];
  const plan = core.planTableEdits(rows, { candidates: CANDIDATES });
  assert.deepStrictEqual(plan.unmatchedRows, ['2. Lookalike เก่า']);
  assert.strictEqual(plan.edits[0].oldText, '');
});

test('table: an exact label wins over a prefix, and a candidate is used once', () => {
  const rows = [TABLE[0], ['1. CA', 'x', 'x', 'x', 'x'], ['2. CA+LAL', 'x', 'x', 'x', 'x']];
  const plan = core.planTableEdits(rows, { candidates: CANDIDATES });
  assert.deepStrictEqual(plan.unmatchedRows, ['1. CA']);
  assert.ok(plan.edits.every((e) => e.row === 2));
});

// Summary tables (slides 24-39): labels the team wrote vs campaign names / aliases from the API
const SUMMARY = {
  candidates: ([
    { name: 'Search-Tier 1&2 -MaxConv.', key: 'Search-Tier1&2-MaxConv.', cells: { 1: 'S12' } },
    { name: 'Search Tier3 mid 5 สาขา - 4 จังหวัด #2', key: 'SearchTier3mid5สาขา-4จังหวัด#2', cells: { 1: 'S3M' } },
    { name: 'GDN-Tier 1&2 - Custom intent  70%', key: 'GDN-Tier1&2-Customintent70%', cells: { 1: 'GDN70' } },
    { name: 'GDN-Tier 1&2 - Core Audience 30%', key: 'GDN-Tier1&2-CoreAudience30%', cells: { 1: 'GDN30' } },
    { name: 'GMB Tier 1 (ชลบุรี,นครปฐม, ระยอง)', key: 'GMBTier1(ชลบุรี,นครปฐม,ระยอง)', cells: { 1: 'G1' } },
    { name: 'GMB แสงไทย Tier2  (นครราชสีมา,เชียงใหม่ - ลำพูน, ขอนแก่น,อุดรธานี,สุรินทร์))', key: 'x', cells: { 1: 'G2' } },
    { name: 'Video views Re 2025', key: 'Videoviewsre2025', aliases: ['VDO'], cells: { 1: 'VDO' } },
    { name: 'Engagement VDO', key: 'EngagementVDO', cells: { 1: 'EVDO' } },
    { name: 'Engagement', key: 'Engagement', cells: { 1: 'ENG' } },
    { name: 'Page Like', key: 'PageLike', cells: { 1: 'PL' } },
  ]).map((c) => ({ ...c, key: core.normKey(c.name) })), // keys come from the same normaliser as the backend
};
const rowsOf = (...labels) => [['Campaign', 'Amount spent', 'Result', 'Cost'], ...labels.map((l) => [l, 'old', '', '', '', '', '', ''])];
const matched = (plan) => plan.edits.map((e) => `${e.row}:${e.newText}`);

test('summary tables: team labels match campaigns (prefix, case-insensitive, last segment, alias)', () => {
  assert.deepStrictEqual(matched(core.planTableEdits(rowsOf('Search-Tier 1&2', 'Search Tier3 Mid '), SUMMARY)), ['1:S12', '2:S3M']);
  assert.deepStrictEqual(matched(core.planTableEdits(rowsOf('GDN-Sangthai - Custom intent 70%', 'GDN-Sangthai - Core Audience 30%'), SUMMARY)), ['1:GDN70', '2:GDN30']);
  assert.deepStrictEqual(matched(core.planTableEdits(rowsOf('GMB Tier 1 (ชลบุรี,นครปฐม, ระยอง)', 'GMB แสงไทย Tier 2  (นครราชสีมา,เชียงใหม่ - ลำพูน, ขอนแก่น,อุดรธานี,สุรินทร์))'), SUMMARY)), ['1:G1', '2:G2']);
  assert.deepStrictEqual(matched(core.planTableEdits(rowsOf('VDO Awareness '), SUMMARY)), ['1:VDO']);
});

test('summary tables: Engagement / Engagement VDO / Page Like do not steal each other', () => {
  for (const [label, want] of [['Engagement', 'ENG'], ['Engagement VDO', 'EVDO'], ['Page Like', 'PL']]) {
    assert.deepStrictEqual(matched(core.planTableEdits(rowsOf(label), SUMMARY)), [`1:${want}`]);
  }
});

test('summary tables: a table of another platform matches nothing', () => {
  const plan = core.planTableEdits(rowsOf('TIKTOK 6-second view', 'Follower'), SUMMARY);
  assert.strictEqual(plan.edits.length, 0);
});

test('header dates: replaces both dates of Current and Previous only when they differ', () => {
  const header = [['Campaign', 'Amount spent', 'Result'], ['Current\n16/08/2026\n-\n 15/09/2026', 'Previous\n16/07/2026\n-\n 15/08/2026', 'Difference']];
  const hd = { current: ['16/09/2026', '15/10/2026'], previous: ['16/08/2026', '15/09/2026'] };
  const edits = core.planHeaderDateEdits(header, hd);
  assert.deepStrictEqual(edits.map((e) => [e.col, e.oldText, e.newText]), [
    [0, '16/08/2026', '16/09/2026'], [0, '15/09/2026', '15/10/2026'], [1, '16/07/2026', '16/08/2026'], [1, '15/08/2026', '15/09/2026'],
  ]);
  const same = [['Campaign'], ['Current\n16/09/2026\n-\n 15/10/2026', 'Previous\n16/08/2026\n-\n 15/09/2026']];
  assert.deepStrictEqual(core.planHeaderDateEdits(same, hd), []);
});

// Slide 24 of the OCT deck: 9 grid columns, the label spans columns 0-1 (column 1 is merged away)
test('buildGrid: a label spanning two columns shifts the visible columns, cols maps them back to the grid', () => {
  const merged = { '2:1': true, '0:1': true, '0:4': true, '0:5': true, '0:7': true, '0:8': true, '1:0': true, '1:1': true };
  const data = [
    ['Campaign', '', 'Amount spent', 'Result', '', '', 'Cost per Result', '', ''],
    ['', '', 'Current', 'Previous', 'Difference', 'Current', 'Previous', 'Difference', ''],
    ['Search-Tier 1&2', '', '฿9,625.83', '1,515 clicks', '1,659 clicks', '-144 clicks', 'CPC : 6.35', 'CPC : 6.88', 'CPC : -฿0.53'],
  ];
  const grid = core.buildGrid(3, 9, (r, c) => {
    if (merged[`${r}:${c}`]) throw new Error('only the top-left cell of a merge');
    return data[r][c];
  });
  assert.strictEqual(grid.texts[2][0], 'Search-Tier 1&2');
  assert.strictEqual(grid.texts[2][1], '฿9,625.83'); // "Amount spent" is visible column 1 ...
  assert.strictEqual(grid.cols[2][1], 2); // ... but grid column 2: this was the off-by-one that wrote into the wrong cells
  assert.deepStrictEqual(grid.cols[2], [0, 2, 3, 4, 5, 6, 7, 8]);
  // the plan uses visible columns, the writer maps them back
  const plan = core.planTableEdits(grid.texts, { candidates: [{ name: 'Search-Tier 1&2 -MaxConv.', key: 'SearchTier1&2MaxConv', cells: { 1: 'SPEND', 2: 'RES' } }] });
  assert.deepStrictEqual(plan.edits.map((e) => [e.row, grid.cols[e.row][e.col], e.oldText]), [[2, 2, '฿9,625.83'], [2, 3, '1,515 clicks']]);
});

test('table: the second header row (Current / Previous dates) is not reported as an unmatched data row', () => {
  const rows = [
    ['Campaign', 'Amount spent', 'Result', 'Cost per Result'],
    ['Current\n16/09/2026\n-\n 15/10/2026', 'Previous\n16/08/2026\n-\n 15/09/2026', 'Difference'],
    ['Engagement', 'x', 'x', 'x', 'x', 'x', 'x', 'x'],
  ];
  const plan = core.planTableEdits(rows, SUMMARY);
  assert.deepStrictEqual(plan.unmatchedRows, []);
  assert.deepStrictEqual(plan.edits.map((e) => e.row), [2]);
});


test('pull mode: report key format', () => {
  assert.equal(core.isReportKey('cfr_' + 'A'.repeat(32)), true);
  assert.equal(core.isReportKey('cfl_' + 'A'.repeat(32)), false); // Looker key is not a report key
  assert.equal(core.isReportKey('cfr_short'), false);
  assert.equal(core.isReportKey(''), false);
});

test('pull mode: export url never contains the key and validates inputs', () => {
  assert.equal(core.exportUrl({}), 'https://conversion.sparkth.io/api/report-exports/latest');
  assert.equal(core.exportUrl({ periodEnd: '2026-10-15' }), 'https://conversion.sparkth.io/api/report-exports/latest?period_end=2026-10-15');
  assert.equal(core.exportUrl({ snapshotId: '3f2a8c1e-5b7d-4e19-9a42-0c1d2e3f4a5b' }), 'https://conversion.sparkth.io/api/report-exports/3f2a8c1e-5b7d-4e19-9a42-0c1d2e3f4a5b');
  assert.throws(() => core.exportUrl({ periodEnd: '15/10/2026' }));
  assert.throws(() => core.exportUrl({ snapshotId: '../../admin' }));
});

test('pull mode: status messages and payload summary', () => {
  assert.match(core.explainExportStatus(401), /คีย์/);
  assert.match(core.explainExportStatus(404), /ข้อมูลครบ/);
  assert.match(core.explainExportStatus(429), /1 นาที/);
  assert.match(core.explainExportStatus(503), /503/);
  assert.deepEqual(core.describePayload({ period: { current: '16/09/2026 - 15/10/2026' }, generated_at: 'x', fills: [1, 2] }), { period: '16/09/2026 - 15/10/2026', generated_at: 'x', fills: 2 });
});

test('table matching: Meta ad-set names vs the labels the team typed (Engagement VDO slide)', () => {
  const cell = (label) => [label, '', '', '', ''];
  const cells = [
    ['Ads Target', 'Result', 'CPA', 'Budget', 'MoM (Budget)'],
    cell('1. Retargeting + 1% lookalike'),
    cell('2. Retargeting ลอนผนัง, ST850PN+1%lookalike '),
    cell('3. 2% lookalike Sangthai Page Retargeting'),
    cell('4. Construction '),
  ];
  const name = (n) => ({ name: n, key: n.replace(/[\s\-–. ]/g, ''), cells: { '1': n } });
  const plan = core.planTableEdits(cells, { candidates: [
    name('1_Sangthai Page Retargeting + 1%Lookalike'),
    name('2_Retargetingลอนผนัง +ST850+ 1%Lookalike'),
    name('3_2% lookalike Sangthai Page Retargeting'),
    name('5_Construction 05/2026 (min500.-/m. 28/09)'),
  ] });
  assert.deepEqual(plan.unmatchedRows, []);
  assert.deepEqual(plan.unusedCandidates, []);
  const filled = plan.edits.map((e) => [e.row, e.newText]);
  assert.deepEqual(filled, [
    [1, '1_Sangthai Page Retargeting + 1%Lookalike'],
    [2, '2_Retargetingลอนผนัง +ST850+ 1%Lookalike'],
    [3, '3_2% lookalike Sangthai Page Retargeting'],
    [4, '5_Construction 05/2026 (min500.-/m. 28/09)'],
  ]);
});

test('table matching: does not pair unrelated names', () => {
  const cells = [['Ads Target', 'Result'], ['1. Core Audience', ''], ['2. Construction', '']];
  const plan = core.planTableEdits(cells, { candidates: [
    { name: 'Business Owner', key: 'BusinessOwner', cells: { '1': 'x' } },
    { name: 'CA+LAL', key: 'CA+LAL', cells: { '1': 'y' } },
  ] });
  assert.equal(plan.edits.length, 0);
  assert.equal(plan.unmatchedRows.length, 2);
});

test('dice similarity', () => {
  assert.equal(core.diceBigrams('abc', 'abc'), 1);
  assert.ok(core.diceBigrams('retargetingลอนผนัง,st850pn+1%lookalike', 'retargetingลอนผนัง+st850+1%lookalike') > 0.8);
  assert.ok(core.diceBigrams('coreaudience', 'businessowner') < 0.3);
});

test('charts: picks the picture under the label, prefers a tagged one, ignores other charts', () => {
  // geometry of the Engagement VDO slide (points): two chart pictures stacked at the left, creatives at the far right
  const engLabel = { left: 70, top: 252, width: 110, height: 22 };
  const reachLabel = { left: 70, top: 449, width: 60, height: 22 };
  const imgEng = { left: 66, top: 275, width: 460, height: 125, title: '' };
  const imgReach = { left: 66, top: 472, width: 460, height: 170, title: '' };
  const creative = { left: 670, top: 400, width: 125, height: 200, title: '' };
  const logo = { left: 40, top: 20, width: 60, height: 60, title: '' };
  const all = [creative, logo, imgReach, imgEng];
  assert.equal(core.pickChartImage_(engLabel, all, 'spark:chart:e'), imgEng);
  assert.equal(core.pickChartImage_(reachLabel, all, 'spark:chart:r'), imgReach);
  // next month: tagged pictures are found by tag even if moved, and are not stolen by the other label
  const taggedEng = { left: 300, top: 600, width: 460, height: 125, title: 'spark:chart:e' };
  assert.equal(core.pickChartImage_(engLabel, [creative, taggedEng, imgReach], 'spark:chart:e'), taggedEng);
  assert.equal(core.pickChartImage_(reachLabel, [creative, imgReach, taggedEng], 'spark:chart:r'), imgReach);
  assert.equal(core.pickChartImage_(engLabel, [creative, logo], 'spark:chart:e'), null);
});

test('charts: pixel size keeps the aspect and caps the width', () => {
  assert.deepEqual(core.chartPixelSize(300, 100), { width: 900, height: 300 });
  const big = core.chartPixelSize(600, 200);
  assert.equal(big.width, 1200);
  assert.equal(big.height, 400);
});

test('creative pictures: the picture above each rank box, tagged ones first, charts and logos ignored', () => {
  // slide 36 geometry (points): rank boxes under three portrait pictures (2 | 1 | 3), charts at the left
  const box2 = { left: 668, top: 605, width: 125, height: 60 };
  const box1 = { left: 793, top: 592, width: 125, height: 56 };
  const box3 = { left: 922, top: 605, width: 125, height: 60 };
  const pic2 = { left: 668, top: 402, width: 125, height: 203, title: '' };
  const pic1 = { left: 793, top: 363, width: 125, height: 229, title: '' };
  const pic3 = { left: 922, top: 407, width: 125, height: 198, title: '' };
  const chart = { left: 66, top: 275, width: 460, height: 125, title: 'spark:chart:main.x' };
  const logo = { left: 40, top: 20, width: 60, height: 60, title: '' };
  const all = [chart, logo, pic3, pic1, pic2];
  assert.equal(core.pickCreativeImage_(box1, all, 'spark:creative:1'), pic1);
  assert.equal(core.pickCreativeImage_(box2, all, 'spark:creative:2'), pic2);
  assert.equal(core.pickCreativeImage_(box3, all, 'spark:creative:3'), pic3);
  const tagged = { left: 700, top: 300, width: 125, height: 200, title: 'spark:creative:2' };
  assert.equal(core.pickCreativeImage_(box2, [pic2, tagged], 'spark:creative:2'), tagged);
  assert.equal(core.pickCreativeImage_(box2, [pic1, tagged], 'spark:creative:3'), null); // 1's picture is not above box 2 and the tag is another
  assert.equal(core.pickCreativeImage_(box1, [{ left: 793, top: 100, width: 125, height: 50, title: '' }], 'x'), null);
});

test('albumLayout: two tiles split horizontally with a 2pt gutter', () => {
  assert.deepEqual(core.albumLayout({ left: 10, top: 20, width: 102, height: 80 }, 2), [
    { left: 10, top: 20, width: 50, height: 80 },
    { left: 62, top: 20, width: 50, height: 80 },
  ]);
});

test('albumLayout: three tiles use a 60% top image and two bottom halves', () => {
  const tiles = core.albumLayout({ left: 10, top: 20, width: 102, height: 102 }, 3);
  assert.deepEqual(tiles, [
    { left: 10, top: 20, width: 102, height: 60 },
    { left: 10, top: 82, width: 50, height: 40 },
    { left: 62, top: 82, width: 50, height: 40 },
  ]);
});

test('headerValue_ finds a header whatever its case', () => {
  assert.equal(core.headerValue_({ 'x-report-snapshot-id': 'abc' }, 'X-Report-Snapshot-Id'), 'abc');
  assert.equal(core.headerValue_({ 'X-Report-Snapshot-Id': 'abc' }, 'x-report-snapshot-id'), 'abc');
  assert.equal(core.headerValue_({ 'Content-Type': 'x' }, 'X-Report-Snapshot-Id'), '');
});

test('orderByPosition_: orders rows top-to-bottom and same-row (< 5pt top diff) left-to-right', () => {
  const b1 = { id: 'r1c2', top: 102, left: 300 };
  const b2 = { id: 'r1c1', top: 100, left: 100 };
  const b3 = { id: 'r1c3', top: 104, left: 500 };
  const b4 = { id: 'r2c1', top: 105, left: 50 }; // diff 5pt from 100 -> next row
  const b5 = { id: 'r3c1', top: 250, left: 100 };
  const input = [b5, b1, b4, b3, b2];
  const ordered = core.orderByPosition_(input);
  assert.deepStrictEqual(ordered.map((x) => x.id), ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r3c1']);
  // does not mutate input
  assert.deepStrictEqual(input.map((x) => x.id), ['r3c1', 'r1c2', 'r2c1', 'r1c3', 'r1c1']);
  assert.deepStrictEqual(core.orderByPosition_([]), []);
});

test('planLineEdits: BKI adsets box matches Vehicle/Retired/Investor, ignores label-less lines, reports Retarget Video Promotion', () => {
  const box = [
    'Target audience (Adset)',
    '',
    'Vehicle\t\t\t             \tResult:  617,153',
    'Retarget Video Promotion         \tResult : 371,660',
    'Everyday Safety\t\t           \tResult : 72,474',
    'Retired\t\t\t           \tResult : 47,686',
    'Investor\t\t\t           \tResult : 28,200',
  ].join('\n');
  const plan = core.planLineEdits(box, {
    marker: 'Result',
    candidates: [
      { name: 'Vehicle Insurance', key: 'VehicleInsurance', value: '618,000' },
      { name: 'Everyday Safety', key: 'EverydaySafety', value: '73,000' },
      { name: 'Retired Insurance', key: 'RetiredInsurance', value: '48,000' },
      { name: 'Investor', key: 'Investor', aliases: ['Investors'], value: '28,007' },
      { name: 'Unused Adset', key: 'UnusedAdset', value: '999' },
    ],
  });
  assert.deepStrictEqual(plan.unmatchedLabels, ['Retarget Video Promotion']);
  assert.deepStrictEqual(plan.unusedCandidates, ['Unused Adset']);
  assert.deepStrictEqual(plan.edits.map((e) => [e.label, e.oldText, e.newText]), [
    ['Vehicle', '617,153', '618,000'],
    ['Everyday Safety', '72,474', '73,000'],
    ['Retired', '47,686', '48,000'],
    ['Investor', '28,200', '28,007'],
  ]);
  const out = core.applyEdits_(box, plan.edits);
  assert.strictEqual(out, [
    'Target audience (Adset)',
    '',
    'Vehicle\t\t\t             \tResult:  618,000',
    'Retarget Video Promotion         \tResult : 371,660',
    'Everyday Safety\t\t           \tResult : 73,000',
    'Retired\t\t\t           \tResult : 48,000',
    'Investor\t\t\t           \tResult : 28,007',
  ].join('\n'));
});

test('planLineEdits: BKI objective box strips leading numbering and replaces values at right offsets', () => {
  const box = [
    'Objective',
    '',
    '',
    '    1.  เพิ่มค่า Engagement หน้าเพจ\t               Result: 16,831',
    '    2.  เก็บ Data กลุ่มเป้าหมาย\t\tResult: 45,601',
  ].join('\n');
  const plan = core.planLineEdits(box, {
    candidates: [
      { name: 'เพิ่มค่า Engagement หน้าเพจ', key: core.normKey('เพิ่มค่า Engagement หน้าเพจ'), value: '17,000' },
      { name: 'เก็บ Data กลุ่มเป้าหมาย', key: core.normKey('เก็บ Data กลุ่มเป้าหมาย'), value: '46,000' },
    ],
  });
  assert.deepStrictEqual(plan.unmatchedLabels, []);
  assert.deepStrictEqual(plan.unusedCandidates, []);
  assert.deepStrictEqual(plan.edits.map((e) => e.label), [
    'เพิ่มค่า Engagement หน้าเพจ',
    'เก็บ Data กลุ่มเป้าหมาย',
  ]);
  assert.strictEqual(core.applyEdits_(box, plan.edits), [
    'Objective',
    '',
    '',
    '    1.  เพิ่มค่า Engagement หน้าเพจ\t               Result: 17,000',
    '    2.  เก็บ Data กลุ่มเป้าหมาย\t\tResult: 46,000',
  ].join('\n'));
});

test('planLineEdits: BKI third box matches case-insensitively (Health concern -> health concern) and handles empty spans', () => {
  const box = [
    'Health concern\t\tResult: 12,288',
    'Vehicles\t\t\tResult: 2,663',
    '1% LAL + Retarget\t\tResult: 1,223',
    'Core insurance\t\tResult:',
  ].join('\n');
  const plan = core.planLineEdits(box, {
    candidates: [
      { name: 'health concern', key: 'healthconcern', value: '12,500' },
      { name: 'Vehicles', key: 'Vehicles', value: '2,700' },
      { name: '1% LAL + Retarget', key: '1%LAL+Retarget', value: '1,300' },
      { name: 'Core insurance', key: 'Coreinsurance', value: '700' },
    ],
  });
  assert.deepStrictEqual(plan.unmatchedLabels, []);
  assert.deepStrictEqual(plan.unusedCandidates, []);
  assert.strictEqual(plan.edits[3].start, plan.edits[3].end);
  assert.strictEqual(plan.edits[3].oldText, '');
  assert.strictEqual(core.applyEdits_(box, plan.edits), [
    'Health concern\t\tResult: 12,500',
    'Vehicles\t\t\tResult: 2,700',
    '1% LAL + Retarget\t\tResult: 1,300',
    'Core insurance\t\tResult:700',
  ].join('\n'));
});

test('planLineEdits: ignores marker lines with no label before the marker', () => {
  const box1 = 'Optimization goal:\tReach\nResult:\t\t1,098,983';
  const box2 = 'ยางรถยนต์ของเราหมดอายุหรือยังนะ\n\nResult:\t\t189,641\nCTR: \t\t0.34%';
  const cands = [{ name: 'Reach', key: 'Reach', value: '999' }];
  assert.deepStrictEqual(core.planLineEdits(box1, { candidates: cands }), {
    edits: [],
    unmatchedLabels: [],
    unusedCandidates: ['Reach'],
  });
  assert.deepStrictEqual(core.planLineEdits(box2, { candidates: cands }), {
    edits: [],
    unmatchedLabels: [],
    unusedCandidates: ['Reach'],
  });
});

// ---- Google Ads slides (gchart / gtable / gad) ----

test('anchorMatchesText_: exact label ignores case and padding, regex matches "Most … ad" variants', () => {
  assert.ok(core.anchorMatchesText_('  Demographics \n', { label: 'Demographics' }));
  assert.ok(core.anchorMatchesText_('demographics', { label: 'Demographics' }));
  assert.ok(!core.anchorMatchesText_('Demographics of users', { label: 'Demographics' }));
  const most = { matches: '^\\s*Most\\s+\\w+\\s+ad\\s*$' };
  ['Most clicked ad', 'Most Conversion ad  ', 'Most Views ad'].forEach((t) => assert.ok(core.anchorMatchesText_(t, most), t));
  assert.ok(!core.anchorMatchesText_('Most clicked ad copy', most));
  assert.ok(!core.anchorMatchesText_('x', {}));
  assert.strictEqual(core.findAnchorShape_(['Search Campaign', 'Campaign  ', 'Keyword'], { label: 'Campaign' }), 1);
  assert.strictEqual(core.findAnchorShape_(['a'], { label: 'Campaign' }), -1);
});

const img = (left, top, width, height, title) => ({ left, top, width, height, title: title || '' });

test('pickScreenshotBelow_: nearest picture below the label, ignores our own and ones to the side', () => {
  const label = { left: 40, top: 200, width: 120, height: 20 };
  const demo = img(40, 225, 300, 150);
  const other = img(380, 225, 300, 150); // right column, far from the label
  const ours = img(40, 222, 300, 150, 'spark:gtable:google.search.demographics');
  const above = img(40, 100, 300, 80);
  assert.strictEqual(core.pickScreenshotBelow_(label, [other, ours, above, demo]), demo);
  assert.strictEqual(core.pickScreenshotBelow_(label, [other, above]), null);
  // a picture that is centred under a narrow label is accepted even when it starts left of it
  assert.strictEqual(core.pickScreenshotBelow_({ left: 100, top: 50, width: 80, height: 20 }, [img(20, 80, 300, 100)]) !== null, true);
});

test('pickTopLeftPicture_: tag first, then the big top-left picture; small icons and right-hand pictures are skipped', () => {
  const page = { width: 960, height: 540 };
  const icon = img(10, 10, 30, 30);
  const chart = img(30, 90, 520, 200);
  const right = img(600, 80, 300, 300);
  assert.strictEqual(core.pickTopLeftPicture_([icon, right, chart], page, 'spark:gchart:x'), chart);
  const mine = img(30, 95, 520, 200, 'spark:gchart:x');
  assert.strictEqual(core.pickTopLeftPicture_([chart, mine], page, 'spark:gchart:x'), mine);
  // our other visuals never count as the screenshot
  assert.strictEqual(core.pickTopLeftPicture_([img(30, 90, 520, 200, 'spark:gad:y:img')], page, 'spark:gchart:x'), null);
  assert.strictEqual(core.pickTopLeftPicture_([icon, right], page, 'spark:gchart:x'), null);
});

test('taggedElements_ + unionBox_: finds our parts by tag and gives their common box', () => {
  const els = [img(10, 10, 100, 100, 'spark:gad:a:img'), img(120, 10, 100, 60, 'spark:gad:a:stats'), img(0, 0, 5, 5, 'spark:gad:b'), img(0, 0, 5, 5, 'other')];
  const mine = core.taggedElements_(els, 'spark:gad:a');
  assert.strictEqual(mine.length, 2);
  assert.deepStrictEqual(core.unionBox_(mine), { left: 10, top: 10, width: 210, height: 100 });
  assert.strictEqual(core.unionBox_([]), null);
  // a prefix of another id is not the same tag
  assert.strictEqual(core.taggedElements_([img(0, 0, 1, 1, 'spark:gad:ab')], 'spark:gad:a').length, 0);
});

test('tableGeometry_: widths add up to the box, first column widest, font follows row height', () => {
  const box = { left: 0, top: 0, width: 400, height: 140 };
  const rows = [['Search-Tier1 (ชลบุรี)', '120', '฿5.50', '฿660'], ['Total', '120', '฿5.50', '฿660']];
  const g = core.tableGeometry_(box, rows, ['Campaign', 'Conversions', 'Cost/conv.', 'Cost']);
  assert.strictEqual(g.cols, 4);
  assert.strictEqual(g.rows, 3);
  assert.ok(Math.abs(g.colWidths.reduce((a, b) => a + b, 0) - 400) < 0.5);
  assert.ok(g.colWidths[0] > g.colWidths[1] && g.colWidths[0] > g.colWidths[3]);
  assert.ok(g.fontSize >= 7 && g.fontSize <= 11);
  const tight = core.tableGeometry_({ left: 0, top: 0, width: 400, height: 40 }, rows, ['a', 'b', 'c', 'd']);
  assert.strictEqual(tight.fontSize, 7);
  assert.strictEqual(core.tableGeometry_(box, [], []).cols, 0);
});

test('heat colours: white at 0, blue at 1, clamped, readable text colour', () => {
  assert.strictEqual(core.heatColor_(0), '#FFFFFF');
  assert.strictEqual(core.heatColor_(1), '#4285F4');
  assert.strictEqual(core.heatColor_(7), '#4285F4');
  assert.strictEqual(core.heatColor_(-1), '#FFFFFF');
  assert.strictEqual(core.heatColor_(undefined), '#FFFFFF');
  assert.strictEqual(core.heatTextColor_(0.2), '#202124');
  assert.strictEqual(core.heatTextColor_(0.9), '#FFFFFF');
});

test('fitInside_ keeps the aspect and centres; adLayout_ splits the box in two halves', () => {
  const r = core.fitInside_({ left: 0, top: 0, width: 200, height: 100 }, 400, 400);
  assert.deepStrictEqual(r, { left: 50, top: 0, width: 100, height: 100 });
  assert.deepStrictEqual(core.fitInside_({ left: 5, top: 5, width: 50, height: 20 }, 0, 0), { left: 5, top: 5, width: 50, height: 20 });
  const l = core.adLayout_({ left: 10, top: 20, width: 308, height: 90 });
  assert.deepStrictEqual(l.left, { left: 10, top: 20, width: 150, height: 90 });
  assert.deepStrictEqual(l.right, { left: 168, top: 20, width: 150, height: 90 });
});

test('planCaptionEdit_: keeps the team first line, replaces the second', () => {
  const text = 'คนที่เกิด Conversion โฆษณาส่วนใหญ่เป็น  \nกลุ่มเพศชายอายุ 25-34 ปี (9 Conversion)  ';
  const caption = 'คนที่เกิด Conversion โฆษณาส่วนใหญ่เป็น กลุ่มเพศหญิง อายุ 35-44 ปี (12 Conversion)';
  const edit = core.planCaptionEdit_(text, caption);
  assert.strictEqual(core.applyEdits_(text, [edit]), 'คนที่เกิด Conversion โฆษณาส่วนใหญ่เป็น  \nกลุ่มเพศหญิง อายุ 35-44 ปี (12 Conversion)  ');
  // single line: the value follows the marker
  const one = 'คนดูโฆษณาส่วนใหญ่เป็น กลุ่มเพศชาย (5 Views)';
  const e1 = core.planCaptionEdit_(one, 'คนดูโฆษณาส่วนใหญ่เป็น กลุ่มเพศหญิง (9 Views)');
  assert.strictEqual(core.applyEdits_(one, [e1]), 'คนดูโฆษณาส่วนใหญ่เป็น กลุ่มเพศหญิง (9 Views)');
  // no marker in the shape, or in the caption: nothing to do
  assert.strictEqual(core.planCaptionEdit_('Demographics', caption), null);
  assert.strictEqual(core.planCaptionEdit_(text, 'ไม่มีคำนั้น'), null);
});

test('tag prefixes are distinct from the older chart / creative tags', () => {
  [core.GCHART_TAG_PREFIX, core.GTABLE_TAG_PREFIX, core.GAD_TAG_PREFIX].forEach((p) => {
    assert.ok(p.startsWith('spark:'));
    assert.ok(p !== core.CHART_TAG_PREFIX && p !== core.CREATIVE_TAG_PREFIX);
  });
  // the old chart picker must not take a picture the Google ops tagged
  const old = core.pickChartImage_({ left: 40, top: 100, width: 100, height: 20 }, [img(40, 130, 400, 200, 'spark:gchart:google.search.chart')], 'spark:chart:x');
  assert.strictEqual(old === null || old.title !== 'spark:gchart:google.search.chart', true);
});

test('visibleShare_: inside, half-off left, outside, and zero-size point boxes', () => {
  const page = { width: 960, height: 540 };
  assert.strictEqual(core.visibleShare_({ left: 10, top: 20, width: 100, height: 50 }, page), 1);
  assert.strictEqual(core.visibleShare_({ left: -50, top: 20, width: 100, height: 50 }, page), 0.5);
  assert.strictEqual(core.visibleShare_({ left: -200, top: 20, width: 100, height: 50 }, page), 0);
  assert.strictEqual(core.visibleShare_({ left: 1000, top: 20, width: 100, height: 50 }, page), 0);
  assert.strictEqual(core.visibleShare_({ left: 100, top: 100, width: 0, height: 0 }, page), 1);
  assert.strictEqual(core.visibleShare_({ left: -10, top: 100, width: 0, height: 50 }, page), 0);
  assert.strictEqual(core.visibleShare_({ left: 960, top: 100, width: 0, height: 0 }, page), 0);
});

test('pickTopLeftPicture_: skips off-slide parked pictures and off-slide tagged pictures', () => {
  const page = { width: 960, height: 540 };
  const parked = img(-400, 80, 450, 220); // mostly off the left edge (50/450 < 0.5)
  const onPage = img(30, 90, 500, 200);
  assert.strictEqual(core.pickTopLeftPicture_([parked, onPage], page, 'spark:gchart:x'), onPage);
  const offTagged = img(-500, 80, 500, 200, 'spark:gchart:x');
  assert.strictEqual(core.pickTopLeftPicture_([offTagged, onPage], page, 'spark:gchart:x'), onPage);
  assert.strictEqual(core.pickTopLeftPicture_([offTagged], page, 'spark:gchart:x'), null);
});

test('pickScreenshotBelow_ with page: skips off-page pictures under the label', () => {
  const page = { width: 960, height: 540 };
  const label = { left: 40, top: 200, width: 120, height: 20 };
  const offPage = img(40, 225, 300, 150);
  offPage.left = -200; // 100/300 = 0.33 < 0.5 visible
  const onPage = img(40, 260, 300, 150);
  assert.strictEqual(core.pickScreenshotBelow_(label, [offPage, onPage], page), onPage);
  assert.strictEqual(core.pickScreenshotBelow_(label, [offPage], page), null);
});

test('anchorMatchesText_: first non-empty line matches label, Search Campaign does not match Campaign', () => {
  assert.ok(core.anchorMatchesText_('Campaign\u000b(เรียงลำดับจาก Conversion)', { label: 'Campaign' }));
  assert.ok(core.anchorMatchesText_('\n  Campaign  \n(เรียงลำดับจาก Conversion)', { label: 'Campaign' }));
  assert.ok(!core.anchorMatchesText_('Search Campaign', { label: 'Campaign' }));
  assert.ok(!core.anchorMatchesText_('Search Campaign\nCampaign', { label: 'Campaign' }));
  assert.ok(core.anchorMatchesText_('  Demographics  ', { label: 'demographics' }));
});

test('topTextIndex_: picks highest non-empty text, tie within 3pt prefers smaller left, all empty returns -1', () => {
  assert.strictEqual(
    core.topTextIndex_(
      ['   ', 'Right title', 'Left title', 'Body'],
      [{ top: 5, left: 5 }, { top: 20, left: 300 }, { top: 22, left: 40 }, { top: 100, left: 20 }]
    ),
    2
  );
  assert.strictEqual(
    core.topTextIndex_(
      ['Higher', 'Lower'],
      [{ top: 20, left: 300 }, { top: 23, left: 40 }]
    ),
    0
  );
  assert.strictEqual(core.topTextIndex_(['', '  \n\t  '], [{ top: 10, left: 10 }, { top: 20, left: 20 }]), -1);
  assert.strictEqual(core.topTextIndex_([], []), -1);
});

test('demographicBars_: builds title, labels with percentage, and parsed numeric values', () => {
  const bars = core.demographicBars_({
    header: ['กลุ่ม', 'Conversions', 'สัดส่วน'],
    rows: [
      ['อายุ 25-34', '9,867', '26%'],
      ['อายุ 35-44', '฿ 1,234.5', '12%'],
      ['ไม่ทราบ', '-', '0%'],
    ],
  });
  assert.deepStrictEqual(bars, {
    title: 'Conversions',
    labels: ['อายุ 25-34 (26%)', 'อายุ 35-44 (12%)', 'ไม่ทราบ (0%)'],
    values: [9867, 1234.5, 0],
  });
});

test('fitFontSize_: picks largest fitting integer 14..7, falls back to 7', () => {
  assert.strictEqual(core.fitFontSize_(['Status: Enabled'], { width: 300, height: 100 }), 14);
  const medium = core.fitFontSize_(['Headline that wraps a couple times', 'Description text here', 'Clicks: 100'], { width: 120, height: 55 });
  assert.ok(medium >= 7 && medium < 14);
  assert.strictEqual(core.fitFontSize_([ 'A'.repeat(400), 'B'.repeat(400) ], { width: 60, height: 20 }), 7);
});

test('adStatLines_: formats header and row columns as "Header: value"', () => {
  assert.deepStrictEqual(
    core.adStatLines_({
      header: ['Status', 'Conversions', 'Clicks', 'CTR'],
      row: ['Enabled', '24', '239', '6.29%'],
    }),
    ['Status: Enabled', 'Conversions: 24', 'Clicks: 239', 'CTR: 6.29%']
  );
});

test('orderProblems_: real problems first, skips moved to end and collapsed after 8, limit respected', () => {
  const skips = Array.from({ length: 11 }, (_, i) => `op${i}: ทีมแก้ไว้แล้ว (ข้าม)`);
  const input = [skips[0], 'err1: ไม่พบหน้า', skips[1], skips[2], 'err2: โหลดรูปไม่ได้', ...skips.slice(3)];
  const ordered = core.orderProblems_(input, 60);
  assert.strictEqual(ordered[0], 'err1: ไม่พบหน้า');
  assert.strictEqual(ordered[1], 'err2: โหลดรูปไม่ได้');
  assert.strictEqual(ordered.length, 2 + 8 + 1);
  assert.strictEqual(ordered[9], skips[7]);
  assert.strictEqual(ordered[10], '…และข้ามจุดที่ทีมแก้ไว้อีก 3 จุด (ติ๊ก "ทับกล่องที่ทีมแก้ไว้ด้วย" ถ้าต้องการให้ทับ)');
  assert.strictEqual(core.orderProblems_(input, 5).length, 5);
});
