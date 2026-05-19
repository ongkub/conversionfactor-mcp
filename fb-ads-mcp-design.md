# fb-ads-mcp — Facebook Ads Optimization MCP Server
### Design Blueprint v1.0 by Ong / Spark Factor

> สถาปัตยกรรม MCP Server สำหรับ Optimize Facebook Ads ด้วย AI แบบครบวงจร  
> เน้น: Audience Narrow-By Strategy · Creative Audit · Conversion Tracking · Multi-Platform Ready

---

## 1. ทำไมต้อง fb-ads-mcp?

LINE Ads MCP (`line-ads-mcp`) ทำได้ดีในแง่ API wrapper — แต่ Facebook Ads มีความซับซ้อนที่ต่างออกไปชัดเจน:

| มิติ | LINE Ads MCP | fb-ads-mcp ที่ต้องการ |
|---|---|---|
| API Scope | Report + Campaign CRUD | Report + Audience Builder + Creative Audit + CAPI Health |
| Audience Logic | ไม่มี Narrow By concept | **Narrow-By Layer Strategy** เป็น core feature |
| Knowledge | Basic | Full optimization framework (Phase 0–6) |
| Workflow | ไม่มี guided flow | Step-by-step optimization workflow พร้อม AI reasoning |
| Platform | LINE เท่านั้น | Facebook ก่อน, ต่อยอด Google Ads ได้ |

---

## 2. Repository Structure

```
fb-ads-mcp/
├── knowledge/                          # ความรู้ที่ AI อ้างอิง
│   ├── 00_business_brief_framework.md  # Phase 0: ตั้งเป้าก่อนดู Ads Manager
│   ├── 01_audience_narrow_by.md        # ★ Core: Narrow-By Strategy (ดูหัวข้อ 4)
│   ├── 02_creative_framework.md        # HOOK-STORY-OFFER + Creative Metrics
│   ├── 03_conversion_tracking.md       # Pixel + CAPI + Deduplication
│   ├── 04_landing_page_cro.md          # Post-click analysis
│   ├── 05_optimization_cycles.md       # Weekly cadence + กฎ Learning Phase
│   └── 06_thai_market_context.md       # LINE Commerce, Chat-to-buy behavior
│
├── workflows/                          # Guided workflow สำหรับ Claude
│   ├── audit_full.md                   # Full campaign audit (ครั้งแรก)
│   ├── audience_builder.md             # สร้าง Audience ด้วย Narrow-By
│   ├── creative_review.md              # วิเคราะห์ Hook/Hold/CTR
│   ├── conversion_health_check.md      # ตรวจ Pixel + CAPI
│   └── weekly_optimization.md          # รีวิวรายสัปดาห์
│
├── src/fb_ads_mcp/
│   ├── server.py                       # MCP server entry point
│   ├── auth.py                         # Meta Marketing API auth
│   ├── common.py                       # Shared utils
│   └── tools/
│       ├── campaign_tools.py           # list/create/update/pause campaigns
│       ├── adset_tools.py              # list/create/update ad sets
│       ├── ad_tools.py                 # list/create ads + creative
│       ├── audience_tools.py           # ★ Narrow-By builder + Lookalike
│       ├── report_tools.py             # Performance reports + custom columns
│       ├── creative_audit_tools.py     # Hook Rate, Hold Rate, Frequency
│       ├── pixel_tools.py              # Pixel health + CAPI check + EMQ
│       └── insight_tools.py            # AI-assisted analysis prompts
│
├── tests/
├── .env.example
├── pyproject.toml
├── CLAUDE.md                           # Rules สำหรับ Claude agent
├── CLAUDE_PROJECT_PROMPT.md            # System prompt สำหรับ Project
├── AGENTS.md
└── README.md
```

---

## 3. Core Tools ที่ต้องสร้าง

### 3.1 Read Tools (ดึงข้อมูล — ไม่มี side effect)

| Tool | ทำอะไร | API Endpoint |
|---|---|---|
| `list_campaigns` | ดู campaign ทั้งหมด + status | `GET /act_{ad_account_id}/campaigns` |
| `list_adsets` | ดู ad set ทั้งหมด + Audience info | `GET /act_{id}/adsets` |
| `list_ads` | ดู ad ทั้งหมด + creative thumbnail | `GET /act_{id}/ads` |
| `get_campaign_insights` | Performance: CPM, CTR, CPA, ROAS | `GET /{campaign_id}/insights` |
| `get_adset_insights` | Performance ระดับ Ad Set | `GET /{adset_id}/insights` |
| `get_ad_insights` | Performance + Video metrics ระดับ Ad | `GET /{ad_id}/insights` (video fields) |
| `get_creative_metrics` | Hook Rate, Hold Rate, oCTR คำนวณ | derived จาก video_p3_watched_actions, thruplay |
| `check_pixel_health` | Pixel event volume + EMQ score | `GET /{pixel_id}/stats` |
| `check_capi_health` | Server-side event vs browser ratio | `GET /act_{id}/matched_events` |
| `get_audience_insights` | ดู Audience Size estimate | `POST /act_{id}/reachestimate` |
| `list_saved_audiences` | ดู Custom/Lookalike/Saved audiences | `GET /act_{id}/customaudiences` |

### 3.2 Write Tools (เปลี่ยนแปลงข้อมูล — dry_run=True เสมอ)

| Tool | ทำอะไร | Safety |
|---|---|---|
| `pause_campaign` | หยุดแคมเปญ | Preview ก่อน confirm |
| `resume_campaign` | เปิดแคมเปญ | Preview ก่อน confirm |
| `update_campaign_budget` | เปลี่ยน budget (+20% max ต่อครั้ง) | แสดง before/after |
| `pause_adset` / `resume_adset` | หยุด/เปิด Ad Set | Preview ก่อน confirm |
| `create_adset_draft` | สร้าง Ad Set พร้อม Audience ที่ออกแบบแล้ว | dry_run เสมอ |
| `build_narrow_audience` | ★ สร้าง Audience แบบ Narrow-By | ดูหัวข้อ 4 |

### 3.3 Analysis Tools (AI-assisted — ไม่ touch API)

| Tool | ทำอะไร |
|---|---|
| `run_campaign_audit` | รัน full audit workflow + สรุปผล |
| `suggest_audience_strategy` | รับ Business Brief → แนะนำ Narrow-By groups |
| `analyze_creative_performance` | คำนวณ Hook Rate, Hold Rate จาก raw data |
| `generate_optimization_report` | สร้าง weekly report พร้อม action items |

---

## 4. ★ Core Feature: Audience Narrow-By Builder

นี่คือ differentiator หลักที่ทำให้ fb-ads-mcp ต่างจากทุก tool ที่มีอยู่

### 4.1 ทำไม Narrow By ถึงสำคัญ?

เมื่อเราใส่ Interest ใน Facebook Ads Manager แบบธรรมดา ระบบใช้ **OR logic**:
```
Interest A OR Interest B OR Interest C
→ ได้คนที่สนใจ A หรือ B หรือ C (กว้างมาก, diluted)
```

แต่ **Narrow By** ใช้ **AND logic**:
```
Group 1 (Interest A OR B OR C) 
AND 
Group 2 (Interest D OR E OR F)
AND
Group 3 (Interest G OR H)
→ ได้คนที่สนใจ (A หรือ B หรือ C) พร้อมกับ (D หรือ E หรือ F)
  = คนที่มีหลาย signal ตรงกัน → Quality สูงกว่ามาก
```

### 4.2 ตัวอย่าง: ขายรถหรู

**❌ แบบผิด (OR ทั้งหมด):**
```
Interests: Luxury brands, Private banking, Mercedes-Benz, BMW, Forbes
→ Audience: 5 ล้านคน แต่รวมคนที่ชอบรถแต่ไม่มีเงิน + คนรวยแต่ไม่สนใจรถ
```

**✅ แบบถูก (Narrow By 3 Layers):**
```
Layer 1 — Luxury Lifestyle (OR):
  Mercedes-Benz, BMW, Porsche, Luxury goods, High-end fashion

AND Narrow By Layer 2 — Wealth Signals (OR):
  Private banking, Investment behavior, High-net-worth individuals,
  Business executives, Frequent international travelers

AND Narrow By Layer 3 — Purchase Intent (OR):
  Car shopping, Auto enthusiast, Recently browsed car websites (Behavior)
```

ผลลัพธ์: Audience เล็กลง แต่ทุกคนในนั้นมีทั้งกำลังซื้อ + สนใจรถ + กำลังหาซื้อ

### 4.3 Narrow-By Architecture ใน Code

```python
# tools/audience_tools.py

class NarrowByLayer:
    """One layer in the AND chain"""
    name: str           # "Luxury Lifestyle", "Wealth Signals", etc.
    rationale: str      # ทำไมถึงใส่ layer นี้
    interests: list[Interest]     # OR logic within layer
    behaviors: list[Behavior]     # OR logic within layer
    demographics: dict            # อายุ, เพศ, ที่อยู่

class AudienceNarrowByPlan:
    """Full audience plan with multiple AND layers"""
    business_context: str
    target_end_result: str
    layers: list[NarrowByLayer]   # AND กันทุก layer
    estimated_size_min: int
    estimated_size_max: int
    reach_target: int
    size_ratio: float             # ควรอยู่ที่ 5–15x
    recommendation: str           # "Good", "Too narrow", "Too broad"
    
def build_narrow_audience(
    business_type: str,
    product_price_range: str,
    end_result: str,            # "Purchase", "Lead", "App Install"
    target_reach: int,
    layer_suggestions: list[dict],  # จาก AI suggestion
    location: str = "Thailand",
    age_range: tuple = (25, 54),
) -> AudienceNarrowByPlan:
    ...
```

### 4.4 Workflow สำหรับ Audience Builder

```
User: "ช่วยสร้าง Audience สำหรับขายกล้อง Mirrorless ราคา 50,000 บาทขึ้นไป"

Claude (ใช้ suggest_audience_strategy):
1. วิเคราะห์ Business Context:
   - สินค้า: กล้อง Mirrorless ระดับ Pro
   - Price point: 50,000+
   - End Result: Purchase
   - ไม่ใช่ Impulse buy → ต้องมี Intent + Budget

2. เสนอ Narrow-By Plan:
   Layer 1 — Photography Interest (OR)
   ├── Photography (Behavior: Engaged shoppers + Technology)
   ├── Digital cameras (Interest)
   ├── Sony Alpha, Canon EOS R, Fujifilm (Brand interest)
   └── Photography Magazine, 1x.com (Media interest)

   AND Layer 2 — Prosumer/Budget Signal (OR)
   ├── Small business owners (Demographics)
   ├── Freelancers (Behavior)
   ├── Creative professionals (Interest)
   └── High-income demographic (Facebook Segment)

   AND Layer 3 — Purchase Readiness (OR)
   ├── Online shoppers (Behavior: 30-day purchasers)
   ├── Technology early adopters (Interest)
   └── Engaged shoppers (Behavior: FB defined)

3. ประเมิน Size:
   - Estimated Audience: ~800,000–1,200,000 (TH)
   - Target Reach: 100,000/month
   - Ratio: 8–12x ✅ อยู่ในช่วง 5–15x ที่ดี

4. เสนอ Ad Set Structure:
   Ad Set A: Narrow-By (Layer 1 + 2 + 3) → High intent, เล็กกว่า
   Ad Set B: Narrow-By (Layer 1 + 2) → Broader, เป็น backup
   Ad Set C: 1% Lookalike of Past Purchasers → AI-driven
```

---

## 5. Multi-Platform Architecture (Future-proof)

โครงสร้างที่ออกแบบให้ต่อยอดไป Google Ads ได้:

```
ads-optimizer/                          # Monorepo
├── packages/
│   ├── fb-ads-mcp/                    # Facebook/Meta (สร้างก่อน)
│   ├── google-ads-mcp/                # Google Ads (อนาคต)
│   ├── line-ads-mcp/                  # มีแล้ว (ต่อ monorepo)
│   └── tiktok-ads-mcp/               # อนาคต
│
├── shared/
│   ├── knowledge/                     # Cross-platform knowledge
│   │   ├── audience_theory.md        # ทฤษฎี Audience sizing
│   │   ├── creative_framework.md     # Universal HOOK-STORY-OFFER
│   │   └── conversion_tracking.md    # Cross-platform tracking
│   ├── workflows/                    # Shared optimization workflows
│   └── common/                       # Shared Python utils
│       ├── audience_models.py        # NarrowByLayer, AudiencePlan
│       ├── metrics.py                # Hook Rate, ROAS, CPL formulas
│       └── report_formatter.py      # Unified report format
│
└── CLAUDE_PROJECT_PROMPT.md          # Master system prompt
```

**Google Ads Parallel:**
- Narrow By ≈ **Layered Targeting** ใน Google (In-market + Affinity + Demographics AND กัน)
- Custom Audience ≈ **Customer Match** + **Similar Segments**
- Conversion API ≈ **Enhanced Conversions** + **Google Tag (server-side)**

---

## 6. Knowledge Files — สาระสำคัญที่ต้องมี

### 6.1 `knowledge/01_audience_narrow_by.md` (เพิ่มจาก framework เดิม)

เนื้อหาที่ต้องครอบคลุม:
- หลักการ OR vs AND targeting
- กฎ 5–15x Audience Size Rule + วิธีคำนวณ
- **Narrow-By Best Practices:**
  - Layer 1 ควรเป็น Core Interest/Behavior (กว้างพอ)
  - Layer 2 ควรเป็น Qualifying Signal (กรองคุณสมบัติ)
  - Layer 3 ควรเป็น Intent Signal (พร้อมซื้อ)
  - อย่า Narrow เกิน 3 layers (Audience จะ <100K ใน TH)
- Interest Research Process: ใช้ Facebook Audience Insights + AI
- Behavior Targeting ที่มีประโยชน์ใน TH market
- เมื่อไหร่ควร Broad vs Narrow vs Lookalike

### 6.2 `knowledge/00_business_brief_framework.md`

- 4 คำถามหลักก่อนดู Ads Manager
- Objective-to-KPI Mapping table
- Proxy Metric selection guide (เมื่อ Conversion <50/week)

### 6.3 `knowledge/02_creative_framework.md`

- HOOK-STORY-OFFER framework
- Hook Rate formula + benchmarks (>25% ok, >35% gold)
- Hold Rate formula + benchmarks (>40% ok)
- Creative-Audience alignment matrix
- Ad Fatigue signals + ระยะเวลา Refresh

---

## 7. CLAUDE_PROJECT_PROMPT.md (Draft)

```markdown
# Facebook Ads Optimization Agent

คุณคือ Facebook Ads Optimization Specialist ที่มีความเชี่ยวชาญในการวิเคราะห์
และปรับปรุงแคมเปญ Facebook Ads อย่างเป็นระบบ

## บทบาทและวิธีคิด

เมื่อได้รับ request ใดๆ ให้เริ่มจาก:
1. **Business Context First** — ถามหรือยืนยัน: ธุรกิจคืออะไร, End Result คืออะไร, KPI เป้าหมาย
2. **Data Before Opinion** — ดึงข้อมูลจาก API ก่อนวิเคราะห์ ไม่ assume
3. **Narrow-By Mindset** — เมื่อพูดถึง Audience ต้องคิดเป็น Layer ไม่ใช่ Interest รวมกัน

## Audience Strategy Rules (สำคัญมาก)

- ห้ามแนะนำการใส่ Interest แบบ OR ล้วนโดยไม่มี Narrow By เมื่อ audience >5M
- ทุก Audience Plan ต้องระบุ: Layer จำนวน, Estimated Size, Ratio vs Reach Target
- Ratio ที่ดี: 5–15x ถ้าต่ำกว่า 5x → แนะนำขยาย ถ้าสูงกว่า 15x → แนะนำ Narrow

## Safety Rules

- Write operations ทุกอย่างต้อง dry_run=True ก่อน
- Budget changes: แสดง before/after + คำนวณผลกระทบ
- ไม่เปลี่ยน Campaign structure บ่อย (reset Learning Phase)
- บอก user เสมอว่า action นี้ irreversible หรือไม่

## Workflow Guide

เมื่อ user พูดว่า "audit" หรือ "วิเคราะห์" → รัน `run_campaign_audit`
เมื่อ user พูดว่า "audience" → รัน `suggest_audience_strategy` ก่อนสร้าง
เมื่อ user พูดว่า "creative" → ดึง creative metrics แล้วคำนวณ Hook/Hold Rate
เมื่อ user พูดว่า "conversion" หรือ "pixel" → รัน `check_pixel_health` + `check_capi_health`
```

---

## 8. Development Roadmap

### Phase 1 (MVP — 2–3 สัปดาห์)
- [x] Repo structure + pyproject.toml setup
- [ ] Meta Marketing API auth (App Token + User Token)
- [ ] Read tools: campaigns, adsets, ads, insights
- [ ] `check_pixel_health` + `check_capi_health`
- [ ] Knowledge files (01–03)
- [ ] CLAUDE_PROJECT_PROMPT.md

### Phase 2 (Audience Builder — 1–2 สัปดาห์)
- [ ] `suggest_audience_strategy` (AI-powered)
- [ ] `build_narrow_audience` with layer validation
- [ ] Audience Size estimation via Reach API
- [ ] Knowledge file: `01_audience_narrow_by.md` (ครบ)

### Phase 3 (Creative + Conversion — 1 สัปดาห์)
- [ ] `analyze_creative_performance` (Hook Rate, Hold Rate)
- [ ] `generate_optimization_report` (weekly)
- [ ] Write tools ครบ: pause/resume/update budget
- [ ] `create_adset_draft` with Narrow-By payload

### Phase 4 (Multi-platform foundation — 2 สัปดาห์)
- [ ] ย้าย `line-ads-mcp` เข้า monorepo `ads-optimizer`
- [ ] สร้าง `shared/` package
- [ ] Scaffold `google-ads-mcp`

---

## 9. การต่อ Meta Marketing API

ต่างจาก LINE Ads ตรงที่ Meta ใช้ OAuth 2.0 + Long-lived Token:

```python
# auth.py
import os
import requests

FB_API_VERSION = "v21.0"
FB_BASE_URL = f"https://graph.facebook.com/{FB_API_VERSION}"

def get_headers():
    return {
        "Authorization": f"Bearer {os.getenv('META_ACCESS_TOKEN')}"
    }

def get_ad_account_id():
    return f"act_{os.getenv('META_AD_ACCOUNT_ID')}"
```

`.env` ที่ต้องการ:
```
META_ACCESS_TOKEN=your_long_lived_access_token
META_AD_ACCOUNT_ID=123456789          # ไม่ต้องใส่ act_ prefix
META_APP_ID=your_app_id               # สำหรับ CAPI
META_PIXEL_ID=your_pixel_id
```

**วิธีได้ Token:**
1. สร้าง App ใน Meta for Developers (Business type)
2. เพิ่ม Marketing API product
3. ขอ `ads_read`, `ads_management`, `business_management` permissions
4. Generate Long-lived User Token (60 วัน) หรือ System User Token (ไม่หมดอายุ)

---

## 10. ตัวอย่าง Conversation ที่ fb-ads-mcp ทำได้

```
User: วิเคราะห์ campaign ทั้งหมดให้หน่อย มี budget เดือนละ 50,000 บาท

Claude:
[list_campaigns] → พบ 3 campaigns active
[get_campaign_insights] → ดึง 30 วันย้อนหลัง
[check_pixel_health] → EMQ score: 7.2/10
[analyze_creative_performance] → Hook Rate avg: 22% (ต่ำกว่าเกณฑ์)

📊 Campaign Audit Summary:
- Campaign "Retargeting Purchase" → ROAS 3.2x ✅ (เป้า 2.5x)  
- Campaign "Cold Prospecting" → CPL 450฿ ❌ (เป้า 300฿), Hook Rate 18%
- Campaign "LAL Buyers" → ปิดอยู่ ควร review

⚠️ Issues พบ:
1. Hook Rate ต่ำกว่า 25% ใน Cold Prospecting → Creative ต้องปรับ
2. EMQ 7.2 → ขาด phone number parameter ใน CAPI events
3. Cold Prospecting Audience: 12M คน → กว้างเกินไปสำหรับ budget 30K/เดือน
   ควรเหลือ 1.5–4.5M (Reach ~300K × 5–15x)

Action Items:
1. [เร่งด่วน] Refresh creative ใน Cold Prospecting — test hook ใหม่ 3 แบบ
2. เพิ่ม phone hash ใน CAPI event payload เพื่อยก EMQ เป็น 8+
3. เพิ่ม Narrow-By layer ใน Cold Prospecting → ดู audience plan?
```

```
User: ช่วยทำ Audience plan สำหรับ Cold Prospecting ใหม่ได้เลย
      ธุรกิจขายซอฟต์แวร์ HR ราคา 50,000-200,000 บาท/ปี กลุ่ม SME

Claude:
[suggest_audience_strategy] → วิเคราะห์ B2B HR Software

📋 Audience Plan: HR Software for SME

Target Reach: 150,000/month → Audience ควรอยู่ที่ 750K–2.25M

Layer 1 — Business Decision Makers (OR):
├── Small business owners (Behavior)
├── Business management (Interest)  
├── Entrepreneurs (Interest)
├── HR management (Interest)
└── CEO, Managing Director (Job title behavior)

AND Narrow By Layer 2 — Company Size Signal (OR):
├── Small business (FB Segment)
├── Business administration (Interest)
├── LinkedIn (Behavior: cross-platform)
└── Payroll, Employee management (Interest)

AND Narrow By Layer 3 — Tech Adoption (OR):
├── SaaS (Interest)
├── Business software (Interest)
├── Online shoppers: Technology (Behavior)
└── Early technology adopters (FB Segment)

📊 Estimated Size: ~900,000–1,400,000 (Thailand)
📊 Ratio: 6–9x ✅ เหมาะสม

ต้องการให้สร้าง Ad Set draft สำหรับ plan นี้ไหม?
```

---

*Blueprint v1.0 — fb-ads-mcp / Spark Factor*
*สร้างเป็น Phase เพื่อให้ ship ได้เร็ว แล้ว iterate*
