# Codex Handoff Prompt — ConversionFactor MCP Phase B

## Context: สิ่งที่สร้างไปแล้ว (Phase A — ห้ามแก้)

ConversionFactor เป็น TypeScript/Hono backend บน Railway ที่ track conversion จาก Facebook/Google Ads → LINE OA → Purchase
เราเพิ่ง implement **MCP Server** (Model Context Protocol) เพื่อให้ Claude AI วิเคราะห์ Ad performance ได้โดยตรง

### Live endpoint
```
GET  https://conversion.sparkth.io/mcp/sse
POST https://conversion.sparkth.io/mcp/messages?sessionId=xxx
Auth: Authorization: Bearer <MCP_API_KEY>
```

### ไฟล์ที่สร้างแล้ว (อย่าเปลี่ยน logic หลัก)
```
backend/src/mcp/
├── auth.ts                    # API key check (Bearer + x-api-key)
├── server.ts                  # MCP SSE server + JSON-RPC 2.0 handler
└── tools/
    ├── format.ts              # formatPercent() helper (fix CTR bug)
    ├── get-client-summary.ts  # tool: ดู org overview + 30d spend/CPA
    ├── find-anomalies.ts      # tool: CPA spike, CTR drop, Spend spike
    ├── campaign-health.ts     # tool: per-campaign health + frequency
    ├── compare-platforms.ts   # tool: Meta vs Google comparison
    └── conversion-funnel.ts   # tool: Ad → Events → Revenue (True ROAS)
```

### ไฟล์ที่ mount ไว้ใน index.ts แล้ว
```typescript
import { mcpRouter } from './mcp/server.js';
app.route('/mcp', mcpRouter);
```

### Database (PostgreSQL)
- `ad_snapshots` — daily campaign metrics: spend, impressions, clicks, reach, frequency, cpm, ctr, cpa, conversions
- `ad_account_mapping` — maps ad_account_id → organization_id
- `platform_credentials` — encrypted Meta/Google API tokens
- `events` — Purchase, Lead, AddToCart events tracked from LINE/Web

---

## Phase B งานที่ต้องทำต่อ

### Task 1: เพิ่ม Tool `pixel_health_check`

**File:** `backend/src/mcp/tools/pixel-health.ts`

Tool นี้ตรวจสุขภาพ Pixel + CAPI ของ organization โดย query ข้อมูลจาก DB:

```typescript
// Input
interface PixelHealthArgs {
  organization_id: string;
}

// Output (markdown string) ควรรายงาน:
// 1. จำนวน events ในช่วง 7 วัน แยกตาม event_name + origin
// 2. วันล่าสุดที่มี event (ถ้าไม่มีเลย = "ไม่มี event 7 วันที่ผ่านมา")
// 3. Check: มี Purchase event ไหม? มี Lead event ไหม?
// 4. Warning ถ้า events หายไปกะทันหัน (วันนี้ vs avg 7d)
// 5. แจ้งว่า CAPI ทำงานอยู่ไหม: ถ้า origin='capi' มี event → ✅ ถ้าไม่มี → ⚠️
```

Query ที่ใช้ได้:
```sql
SELECT event_name, origin, COUNT(*) as count, MAX(created_at)::date as last_date
FROM events
WHERE organization_id = $1
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name, origin
ORDER BY count DESC
```

**หลังจากสร้าง:** เพิ่ม tool นี้ใน `server.ts` ทั้งใน `TOOLS` array และใน `callTool()` switch

---

### Task 2: เพิ่ม Tool `suggest_audience_plan`

**File:** `backend/src/mcp/tools/suggest-audience.ts`

Tool นี้ **ไม่ได้ดึงข้อมูลจาก DB** แต่เป็น Knowledge Tool ที่ generate Audience Plan จาก input ที่ Claude ส่งมา

```typescript
// Input
interface SuggestAudienceArgs {
  business_type: string;         // เช่น "ขายรถ Luxury", "ประกันสุขภาพ"
  product_price_range?: string;  // เช่น "50,000–500,000 บาท"
  target_reach?: number;         // เป้า Reach เช่น 100000
  geography?: string;            // default "Thailand"
}

// Output (markdown string):
// 1. Audience Size target = target_reach × 5 ถึง × 15
// 2. Narrow-By Plan: 3 layers (OR logic ภายใน layer, AND ระหว่าง layer)
//    - Layer 1: Core Interest/Category (4–8 items)
//    - Layer 2: Qualifying Signal — wealth, profession, behavior (3–6 items)  
//    - Layer 3: Intent Signal (optional, ถ้า audience ยังใหญ่เกิน)
// 3. Estimated Audience Size range
// 4. Alternative: Lookalike 1% vs Advantage+ recommendation
// 5. Warning ถ้า estimated audience < 5× reach หรือ > 15× reach
```

**ตัวอย่าง output สำหรับ "ขายรถ Luxury, reach 50,000":**
```
Target Audience: 250,000–750,000 คน (5–15× จาก 50,000 reach)

Layer 1 (Core — OR): Luxury vehicles, BMW, Mercedes-Benz, Audi, Lexus...
  AND
Layer 2 (Wealth Signal — OR): Private banking, Wealth management, High-income...
  AND  
Layer 3 (Intent — OR): Car purchase, New car, Auto loan...

→ Facebook flexible_spec format:
[{interests: [Layer1 IDs]}, {interests: [Layer2 IDs]}, {interests: [Layer3 IDs]}]
```

**หลังจากสร้าง:** เพิ่มใน `server.ts` ด้วย

---

### Task 3: สร้าง `CLAUDE.md` สำหรับ MCP Project

**File:** `backend/CLAUDE.md`

ไฟล์นี้ Claude Code / Codex จะอ่านเพื่อเข้าใจ project rules:

```markdown
# ConversionFactor Backend — CLAUDE.md

## Stack
- Runtime: Node.js (ESM), TypeScript strict
- Framework: Hono v4
- DB: PostgreSQL via `pg` Pool (see src/db/client.ts)
- Deploy: Railway

## MCP Server (src/mcp/)
- Transport: HTTP + SSE (JSON-RPC 2.0)
- Auth: MCP_API_KEY env var required
- All tools return markdown string for Claude to render

## Rules
- ใช้ ESM imports (.js extension เสมอ)
- ไม่มี test framework — ใช้ QA scripts ใน src/qa/
- DB queries อยู่ใน src/db/queries/ — เพิ่ม queries ตรงนั้น
- ห้าม write to ad platforms โดยไม่มี dry_run check ก่อน
- `tsc --noEmit` ต้องผ่าน 0 errors ก่อน commit ทุกครั้ง

## Adding a new MCP tool
1. สร้างไฟล์ใน src/mcp/tools/<tool-name>.ts
2. Export async function ที่รับ Args interface และ return Promise<string>
3. เพิ่มใน TOOLS array ใน src/mcp/server.ts
4. เพิ่มใน callTool() switch ใน src/mcp/server.ts
5. Run: npx tsc --noEmit
```

---

### Task 4: Phase B Write Operations (อ่านก่อน ทำทีหลัง)

> ⚠️ Phase B ต้องทำหลัง Phase A stable แล้ว และต้องมี Team approve ก่อน

เมื่อต้องการให้ Claude **ลงมือทำ** ได้ (pause campaign, adjust budget):

**File:** `backend/src/mcp/tools/meta-write.ts`

```typescript
// Tools เพิ่มเติม:
// - pause_campaign(campaign_id, dry_run=true)  → Meta API POST /{id}?status=PAUSED
// - adjust_budget(adset_id, new_daily_budget, dry_run=true) → Meta API POST /{id}
// - resume_campaign(campaign_id, dry_run=true)

// กฎ:
// 1. dry_run=true เสมอ เป็น default
// 2. ถ้า dry_run=true → แสดง Preview เท่านั้น ไม่ call API
// 3. ถ้า dry_run=false → ต้องมี confirmation string "CONFIRM:<campaign_id>" ใน args
// 4. Budget change ต้องไม่เกิน ±20% ต่อครั้ง (ป้องกัน Learning Phase reset)
// 5. บันทึก action log ลง DB ทุกครั้ง

// Meta API token ดึงจาก:
import { getPlatformCredential } from '../../db/queries/ad-reporting.js';
const cred = await getPlatformCredential('meta');
// token = Meta User Access Token
```

---

## ขั้นตอนที่ต้องทำ (Priority Order)

1. **ทำก่อน:** Task 1 (`pixel_health_check`) — ง่าย, ใช้ DB query, ไม่มี risk
2. **ทำต่อ:** Task 2 (`suggest_audience_plan`) — pure logic, ไม่ต้อง DB
3. **ทำต่อ:** Task 3 (`CLAUDE.md`) — docs
4. **รอ approve:** Task 4 (write operations) — ต้อง team confirm ก่อน

---

## หลังทำแต่ละ Task

```bash
# ตรวจ TypeScript ก่อนทุกครั้ง
cd backend && npx tsc --noEmit

# ถ้า 0 errors → commit + push → Railway auto-deploy
```

---

## Reference Files (อ่านเพิ่มเติม)

```
ConversionFactor-MCP/
├── knowledge/01_audience_narrow_by.md    # Narrow-By logic สำหรับ Task 2
├── knowledge/03_conversion_tracking.md   # Pixel + CAPI สำหรับ Task 1
├── CLAUDE_PROJECT_PROMPT.md              # System prompt ของ project นี้
└── workflows/full_audit.md               # Workflow reference
```

---

*Phase A complete: 5 tools, live at https://conversion.sparkth.io/mcp/sse*  
*Phase B: pixel_health_check → suggest_audience_plan → CLAUDE.md → write ops*
