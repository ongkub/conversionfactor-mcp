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

test('table: one candidate is used once even if two rows share a prefix', () => {
  const rows = [TABLE[0], ['1. CA', 'x', 'x', 'x', 'x'], ['2. CA+LAL', 'x', 'x', 'x', 'x']];
  const plan = core.planTableEdits(rows, { candidates: CANDIDATES });
  assert.deepStrictEqual(plan.unmatchedRows, ['2. CA+LAL']);
});

