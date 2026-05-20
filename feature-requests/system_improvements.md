# Feature Request: System Improvements
### ConversionFactor MCP · Audit จากการใช้งานจริง

> รวบรวมจากปัญหาที่เจอจริงใน session การวิเคราะห์ Sangthai Metalsheet
> จัดเรียงตาม Priority และ Category

---

## หมวด A: Output Size Control (Token ใหญ่เกิน)

ปัญหาหลักที่ทำให้ context limit เกินและ tool ทำงานไม่ได้

### A1. 🔴 get_ad_config ไม่มี campaign_id filter
- **ปัญหา:** ดึง 1,655 ads (415KB / 276K tokens) ทุกครั้ง — เกิน context limit
- **แก้:** เพิ่ม `campaign_id: string (optional)` parameter
- **คาดว่าลดได้:** 1,655 → 30–50 ads (95% reduction)

### A2. 🔴 get_adset_config / get_ad_config ไม่มี has_spend_days
- **ปัญหา:** ดึงทุก adset รวม campaign ที่หยุดรันแล้วหลายเดือน
- **แก้:** เพิ่ม `has_spend_days: number` — กรองเฉพาะ campaign ที่มี spend > 0 ใน N วันล่าสุด
- **Logic:** `WHERE campaign_id IN (SELECT campaign_id FROM ad_snapshots WHERE spend > 0 AND date >= NOW() - INTERVAL 'N days')`

### A3. 🟠 ไม่มี Field Selection / Projection
- **ปัญหา:** tools คืน full object ทุก field แม้ต้องการแค่บางส่วน
  - get_adset_config: Layer structure คือ 30% ของ output แต่ดึง 100% มาทั้งหมด
  - work_positions list (30+ items) ซ้ำกันทุก adset ทำให้ output พองมาก
- **แก้:** เพิ่ม `fields: string[] (optional)` — เลือก field ที่ต้องการ
  ```
  fields: ["narrow_by_layers", "optimization_goal", "custom_audiences"]
  ```
- **หรือ:** เพิ่ม `summary_only: boolean` — คืนแค่ pattern summary ไม่คืน full config

### A4. 🟠 get_ad_config ไม่ deduplicate creative ที่ซ้ำกัน
- **ปัญหา:** creative เดิม (body/headline/thumbnail เหมือนกัน) รันใน 50+ adsets
  ทำให้ output 50x ใหญ่กว่าที่จำเป็น
- **แก้:** เพิ่ม `unique_creatives: boolean (default: false)`
  - ถ้า true: group ads ที่มี creative เหมือนกัน → คืนแค่ตัวเดียว + count
  ```
  "3ST-13/01" body: "อาคารปัง งบไม่บาน..." — used in 47 adsets
  ```
- **Token saving:** ~70% สำหรับ account ที่มี creative ซ้ำเยอะ

### A5. 🟡 ไม่มี Pagination
- **ปัญหา:** ถ้า org ใหญ่มาก ไม่มีทาง page ข้อมูลออกมาทีละส่วน
- **แก้:** เพิ่ม `limit: number` และ `offset: number`
  ```
  get_ad_config(campaign_id: X, limit: 50, offset: 0)
  ```

---

## หมวด B: Status / Activity Mismatch

ข้อมูล "ACTIVE" ไม่ตรงกับ "กำลังรันอยู่จริง"

### B1. 🔴 Campaign ที่หมด end_date ยังแสดง status: ACTIVE
- **ปัญหา:** Sangthai มี 3 campaigns ที่ end_date ผ่านไปแล้ว (บางตัวนานกว่า 8 เดือน)
  แต่ status ยังเป็น ACTIVE ทำให้ tools ดึงมาด้วย
- **สาเหตุ:** Meta API คืน status ตามที่ตั้งไว้ ไม่ได้ auto-update เมื่อหมด schedule
- **แก้ใน ConversionFactor:** เพิ่ม logic ตรวจ `end_time` เมื่อ sync
  - ถ้า `end_time < now()` → แสดง status เป็น `ENDED` แทน `ACTIVE`
  - หรือเพิ่ม field `is_actually_running: boolean` = `status == ACTIVE && (end_time == null || end_time > now()) && spend_last_7d > 0`

### B2. 🟠 status_filter: ACTIVE ไม่กรอง "Paused by schedule"
- **ปัญหา:** Campaign ที่ schedule หยุดชั่วคราวยังถูกนับว่า ACTIVE
- **แก้:** เพิ่ม status option `RUNNING` = currently delivering (ต่างจาก ACTIVE ที่แค่ไม่ถูก Pause manually)

---

## หมวด C: Data Quality / Accuracy

ข้อมูลที่ดึงมาไม่ถูกต้องหรือ misleading

### C1. 🔴 suggest_audience_plan จัด B2B Construction เป็น Real Estate
- **ปัญหา:** เรียกด้วย `business_type: "เมทัลชีท B2B ขายให้ผู้รับเหมา เจ้าของโรงงาน"`
  ได้กลับมาเป็น Real Estate plan (Layer 1: Condominium, House hunting, Mortgage loans)
- **สาเหตุ:** Model prompt ภายใน tool ไม่ distinguish B2B Construction vs B2C Real Estate
- **แก้:** ปรับ system prompt ของ tool ให้ตีความ business_type ให้ถูก
  - ถ้า business_type มี keyword: เมทัลชีท, ก่อสร้าง, ผู้รับเหมา, โรงงาน, วัสดุก่อสร้าง → ใช้ Construction B2B template
  - Construction B2B Layer 1 ควรเป็น: work_positions (Contractor, Civil engineer), industries (Construction and Extraction)
  - Construction B2B Layer 2 ควรเป็น: Tool brands (DeWalt, Makita, Bosch), Small business owners

### C2. 🟠 get_adset_config คืน work_positions list ที่ยาวมากโดยไม่จำเป็น
- **ปัญหา:** ทุก adset ที่มี work_positions จะแสดง list ยาว 20–30 items
  ซ้ำกันทุก adset เพราะ template เดียวกัน
- **แก้:** เมื่อ work_positions / education_majors เหมือนกันใน adsets ของ campaign เดียวกัน
  → แสดงแค่ครั้งแรก ที่เหลือบอกแค่ "[same as Ad Set X]"

### C3. 🟡 campaign_health_check CTR = Engagement CTR ไม่ใช่ Link CTR
- **ปัญหา:** Campaign ที่ใช้ OUTCOME_ENGAGEMENT แสดง CTR 72.99%
  ซึ่งเป็น Engagement CTR (reactions + comments) ไม่ใช่ Link Click CTR
  ทำให้ interpret ผิดได้ว่า "ad นี้ดึงดูดคนคลิกมาก"
- **แก้:** เพิ่ม field `ctr_type: "link_click" | "engagement"` ใน output
  หรือ label CTR ตาม objective: `CTR (Engagement): 72.99%` แทน `CTR: 72.99%`

---

## หมวด D: Output File Accessibility

ปัญหาไฟล์ที่ tool save ไม่สามารถ read ต่อได้

### D1. 🔴 Tool output ที่ "too large" ถูก save ไปที่ /var/folders ซึ่ง bash sandbox เข้าไม่ได้
- **ปัญหา:** เมื่อ output เกิน token limit → save ไปที่ `/var/folders/.../tool-results/`
  แต่ bash sandbox มี path ที่ต่างกัน (`/sessions/.../mnt/`) → `FileNotFoundError`
  ทำให้ไม่สามารถ parse ไฟล์ด้วย python ได้
- **แก้:** Save output ไปที่ outputs directory ที่ทั้ง file tools และ bash เข้าได้
  หรือ document path mapping ให้ชัดเจน

### D2. 🟠 Output ที่ใหญ่เกิน token limit ถูก save เป็น JSON single-line
- **ปัญหา:** ไฟล์ JSON มี 6 lines แต่ 276K tokens เพราะ content ทั้งหมดอยู่ใน 1 line
  ทำให้ Read tool ด้วย offset/limit ไม่ได้ผล (limit = จำนวน line ไม่ใช่ token)
  และ Grep ก็หาค่าใน JSON string ไม่ได้
- **แก้:** Save เป็น JSONL (1 record per line) หรือ formatted JSON with newlines
  เพื่อให้ Read tool สามารถอ่านทีละ section ได้

---

## หมวด E: Tool Chain / Workflow Gaps

ช่องว่างใน workflow ที่ทำให้ต้องทำงานซ้ำ

### E1. 🟠 ไม่มี "Active Campaigns with Spend" Summary Tool
- **ปัญหา:** ต้อง call campaign_health_check → ดู spend → จด campaign_ids เอง
  ทุกครั้งที่จะ filter adsets/ads
- **แก้:** เพิ่ม tool ใหม่ `get_active_campaign_ids(organization_id, days)` → คืนแค่ list ของ campaign_ids ที่มี spend ใน N วัน พร้อม campaign name
  ```
  [
    { campaign_id: "xxx", name: "ST_Engagement VDO Re 2026", spend_7d: 2770 },
    ...
  ]
  ```
  ขนาด output: ~500 tokens แทนที่จะต้อง parse จาก campaign_health_check

### E2. 🟡 sync:true มักจะ timeout บน get_adset_config
- **ปัญหา:** sync:true (ดึงสดจาก Meta API) timeout บน adset ที่มีจำนวนมาก
- **แก้:** เพิ่ม `sync_campaign_ids: string[]` — sync เฉพาะ campaign ที่ระบุ แทน sync ทั้ง org
  หรือ เพิ่ม timeout warning และ fallback ไป sync:false อัตโนมัติ

### E3. 🟡 pixel_health_check ไม่แยก event ตาม campaign
- **ปัญหา:** รู้แค่ว่า org มี 245 Lead events แต่ไม่รู้ว่า event มาจาก campaign ไหน
- **แก้:** เพิ่ม `breakdown_by_campaign: boolean` ใน pixel_health_check
  → แสดง event count ต่อ campaign_id เพื่อ diagnose ได้ว่า campaign ไหนไม่ส่ง event

---

## Priority Summary

| # | Issue | Impact | Effort | Priority |
|---|---|---|---|---|
| A1 | campaign_id ใน get_ad_config | Token 95% reduction | Low | 🔴 P0 |
| B1 | ENDED status สำหรับ expired campaigns | Data accuracy | Low | 🔴 P0 |
| A2 | has_spend_days filter | Token 80% reduction | Medium | 🔴 P1 |
| C1 | suggest_audience_plan B2B vs Real Estate | Wrong recommendations | Medium | 🔴 P1 |
| D1 | Output file path inaccessible from bash | Workflow broken | Low | 🔴 P1 |
| A4 | Deduplicate creative | Token 70% reduction | Medium | 🟠 P2 |
| D2 | JSON single-line format | Can't parse large output | Low | 🟠 P2 |
| C3 | CTR label ตาม objective | Misleading metric | Low | 🟠 P2 |
| E1 | get_active_campaign_ids tool ใหม่ | Faster workflow | Medium | 🟠 P2 |
| A3 | Field selection | Flexible output | High | 🟡 P3 |
| C2 | Deduplicate work_positions in output | Cleaner output | Low | 🟡 P3 |
| B2 | RUNNING vs ACTIVE status | More accurate filter | Medium | 🟡 P3 |
| E2 | sync timeout handling | Better UX | Low | 🟡 P3 |
| E3 | pixel event breakdown by campaign | Better diagnosis | Medium | 🟡 P3 |
| A5 | Pagination | Large org support | High | 🟡 P3 |

---

## Quick Wins (ทำได้เร็ว Impact สูง)

ถ้าต้องเลือก 3 อย่างทำก่อน:

1. **campaign_id ใน get_ad_config** — แก้ 1 line ใน route handler, ลด token 95%
2. **ENDED status logic** — เพิ่ม `end_time < now()` check ตอน sync, แก้ data accuracy
3. **JSON output เป็น multi-line** — แก้ JSON.stringify format, ทำให้ parse ขนาดใหญ่ได้

---

*อ้างอิง: session วิเคราะห์ Sangthai Metalsheet, 2026-05*
*ใช้คู่กับ: feature-requests/token_efficient_filters.md*
