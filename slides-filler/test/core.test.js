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
