# Implementation Prompt: P3 — Advanced Improvements
### ConversionFactor MCP · Ready-to-implement

> P3 = ทำหลังจาก P0/P1/P2 เสร็จแล้ว
> เป็น features ที่เพิ่ม flexibility และ scale สำหรับ org ขนาดใหญ่

---

## Fix 11 (A3): Field Selection / Projection

**ปัญหา:** tools คืน full object ทุก field แม้ต้องการแค่บางส่วน
เช่น ต้องการแค่ "Layer structure" แต่ได้ work_positions list 30 items + education_majors + demographics ทุกอย่าง
ทำให้ token ใหญ่โดยไม่จำเป็น

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม fields parameter ใน get_adset_config และ get_ad_config

Parameter ใหม่:
  fields: string[] (optional)
  - ถ้าระบุ: return เฉพาะ fields ที่ระบุ
  - ถ้าไม่ระบุ: return ทั้งหมด (behavior เดิม)

Available fields สำหรับ get_adset_config:
  "name"                 - ชื่อ ad set
  "status"               - ACTIVE / PAUSED / ENDED
  "optimization_goal"    - POST_ENGAGEMENT / CONVERSATIONS / etc.
  "budget"               - daily/lifetime budget
  "narrow_by_layers"     - Narrow-By layer structure (ที่ใช้บ่อยที่สุด)
  "custom_audiences"     - Custom Audience list
  "excluded_audiences"   - Excluded Audience list
  "demographics"         - age, gender, locations
  "destination_type"     - MESSENGER / ON_POST / WEBSITE
  "bid"                  - bid strategy
  "warnings"             - warnings ที่ระบบตรวจพบ

Available fields สำหรับ get_ad_config:
  "name"                 - ชื่อ ad
  "status"               - ACTIVE / PAUSED
  "adset_id"             - adset ที่ ad อยู่
  "body"                 - ad copy text
  "headline"             - headline
  "cta"                  - call to action button
  "link"                 - destination URL
  "thumbnail"            - มี thumbnail ไหม (boolean)
  "video_id"             - video id ถ้าเป็น video ad
  "image_hash"           - image hash ถ้าเป็น image ad

ตัวอย่างการใช้งาน:

  1. ต้องการแค่ Layer structure:
     get_adset_config({
       campaign_id: "xxx",
       fields: ["name", "narrow_by_layers", "optimization_goal", "warnings"]
     })
     → ลด token ~70% เพราะไม่ต้องดึง demographics, budget, bid, custom_audiences

  2. ต้องการแค่ ad copy:
     get_ad_config({
       campaign_id: "xxx",
       fields: ["name", "body", "headline", "cta"],
       unique_creatives: true
     })
     → ลด token ~85%

  3. Quick audience check:
     get_adset_config({
       campaign_id: "xxx",
       fields: ["name", "narrow_by_layers", "custom_audiences", "warnings"]
     })

Implementation:
  1. รับ fields array ใน tool handler
  2. หลังจาก query / format output แล้ว → filter เฉพาะ fields ที่ระบุก่อน return
  3. ถ้า fields ไม่ระบุ → return ทั้งหมด (backward compatible)
  4. ถ้า field ไม่รู้จัก → ignore (ไม่ error)

Output format เมื่อใช้ fields:
  ควรเพิ่ม note ที่หัว: "Showing fields: name, narrow_by_layers, warnings (3 of 11)"
```

---

## Fix 12 (B2): RUNNING vs ACTIVE — Delivery Status

**ปัญหา:** status: ACTIVE มีความหมาย 2 แบบ:
- Campaign ที่ user ไม่ได้ Pause (Meta definition)
- Campaign ที่กำลัง deliver จริง (ที่เราต้องการ)
Campaign ที่ schedule หยุดชั่วคราว, budget หมด, หรืออยู่นอก delivery window ยัง ACTIVE แต่ไม่ได้รัน

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม delivery_status field และ RUNNING filter option

Background:
  Meta effective_status มีหลาย state:
  ACTIVE, PAUSED, DELETED, ARCHIVED,
  CAMPAIGN_PAUSED, ADSET_PAUSED,
  IN_PROCESS, WITH_ISSUES,
  PENDING_REVIEW, DISAPPROVED,
  PREAPPROVED, PENDING_BILLING_INFO,
  CAMPAIGN_GROUP_PAUSED

  "RUNNING" ที่แท้จริง = status ACTIVE + effective_status ACTIVE + spend > 0

Field ใหม่ใน output:
  delivery_status: "RUNNING" | "ACTIVE_NOT_DELIVERING" | "PAUSED" | "ENDED" | "ISSUES"
  
  Logic:
  - RUNNING: effective_status == "ACTIVE" AND spend_last_24h > 0
  - ACTIVE_NOT_DELIVERING: effective_status == "ACTIVE" AND spend_last_24h == 0
    (budget หมด, นอก schedule window, หรือ learning ติด)
  - PAUSED: effective_status ∈ ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"]
  - ENDED: end_time < NOW()
  - ISSUES: effective_status ∈ ["WITH_ISSUES", "DISAPPROVED", "PENDING_REVIEW"]

เพิ่ม status_filter option ใหม่:
  status_filter: "RUNNING"
  → กรองเฉพาะ campaign ที่กำลัง deliver จริงในขณะนั้น
  → ใช้ได้ใน get_campaign_config, get_adset_config

ตัวอย่าง output:
  🟢 ST_Engagement VDO Re 2026
    - **Status:** ACTIVE
    - **Delivery:** 🟢 RUNNING (ใช้เงินใน 24h ล่าสุด)
  
  🟡 ST_Engagement - Re 2026
    - **Status:** ACTIVE  
    - **Delivery:** 🟡 ACTIVE_NOT_DELIVERING (budget วันนี้หมดแล้ว?)
  
  ⚫ ST_Engagement [Activity] รุ่นไหนบ้าน
    - **Status:** ACTIVE
    - **Delivery:** ⚫ ENDED (หมด schedule 24/09/2568)

Data source:
  spend_last_24h ดึงจาก ad_snapshots WHERE date = TODAY AND spend > 0
  effective_status ดึงจาก Meta API ตอน sync (store ใน DB ด้วย)
```

---

## Fix 13 (E2): Sync Timeout Handling

**ปัญหา:** sync:true บน get_adset_config timeout เมื่อ org มี adsets จำนวนมาก
ไม่มี fallback → tool fail โดยไม่คืนข้อมูลอะไรเลย

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม graceful timeout handling สำหรับ sync:true

ปัญหาที่พบ:
  get_adset_config({ organization_id: "xxx", sync: true })
  → ดึง Meta API สำหรับ org ที่มี 269 adsets
  → Timeout หลังรอนาน
  → Tool return error โดยไม่มีข้อมูลเลย

วิธีแก้ 3 ชั้น:

  ชั้น 1: เพิ่ม sync_campaign_ids parameter
    sync_campaign_ids: string[] (optional)
    - ถ้าระบุ: sync เฉพาะ campaigns ที่อยู่ใน list (ไม่ sync ทั้ง org)
    - ทำให้ sync เร็วขึ้น 10-50x สำหรับ org ใหญ่
    
    ตัวอย่าง:
    get_adset_config({
      organization_id: "xxx",
      sync: true,
      sync_campaign_ids: ["campaign_id_1", "campaign_id_2"]
      // sync แค่ 2 campaigns แทน sync ทั้ง org
    })

  ชั้น 2: Partial sync fallback
    ถ้า sync ทั้ง org timeout → 
    - คืนข้อมูลจาก DB (เหมือน sync:false)
    - แต่ระบุใน output ว่า: "⚠️ Sync timeout — แสดงข้อมูล cache ล่าสุด (19/5/2569)"
    - ไม่ return error (ให้ยังคืนข้อมูลเก่าได้ดีกว่าไม่ได้อะไรเลย)

  ชั้น 3: Background sync
    เพิ่ม endpoint / cron job ที่ sync ข้อมูลทุก N นาที (background)
    ทำให้ sync:false มีข้อมูลที่ fresh พอในทุกกรณี
    MCP tools ไม่ต้อง sync real-time เองแล้ว

  Implementation priority: ชั้น 1 ก่อน → ชั้น 2 → ชั้น 3

ตัวอย่าง output เมื่อ fallback:
  ## Adset Config
  ⚠️ Sync timeout after 30s — showing cached data (last sync: 19/5/2569 23:38)
  Filter: ACTIVE | พบ 269 adsets (cached)
  ...
```

---

## Fix 14 (E3): Pixel Event Breakdown by Campaign

**ปัญหา:** pixel_health_check บอกแค่ว่า org มี 245 Lead events แต่ไม่รู้ว่ามาจาก campaign ไหน
ทำให้ไม่สามารถ diagnose ได้ว่า campaign ไหนที่ tracking หาย

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม breakdown_by_campaign option ใน pixel_health_check

Parameter ใหม่:
  breakdown_by_campaign: boolean (default: false)
  - ถ้า true: แสดง event count แยกตาม campaign_id
  - ถ้า false: แสดง org-level summary (behavior เดิม)

Output เมื่อ breakdown_by_campaign: true:

  ## Pixel Health Check
  Organization: Sangthai | ช่วง: 7 วัน

  ### Org Summary
  - Total Lead events: 245
  - Total Purchase events: 0
  - CAPI signal: ✅ active

  ### Breakdown by Campaign
  | Campaign | Lead | Purchase | View Content | Add to Cart |
  |---|---|---|---|---|
  | ST_FB_Message - บางเลน | 198 | 0 | 450 | 12 |
  | ST_Engagement VDO Re 2026 | 47 | 0 | 1,240 | 0 |
  | ST_Engagement - Re 2026 | 0 | 0 | 320 | 0 |
  | Expired campaigns (3) | 0 | 0 | 0 | 0 |

  ### ⚠️ Issues
  - ST_Engagement - Re 2026: ไม่มี Lead event แม้มี Spend ฿1,310/สัปดาห์
    → ตรวจ Pixel บน Landing Page / เปลี่ยนจาก Engagement เป็น Message campaign
  - Purchase event: 0 ทุก campaign
    → ต้อง sync Purchase จาก LINE → CAPI

Data source:
  SELECT 
    campaign_id,
    event_name,
    COUNT(*) as event_count
  FROM pixel_events  -- หรือ table ที่เก็บ pixel events
  WHERE organization_id = $org_id
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY campaign_id, event_name
  
  JOIN campaigns table เพื่อได้ campaign_name

หมายเหตุ:
  ถ้า pixel events ไม่ได้เก็บ campaign_id ใน DB → 
  ตรวจสอบว่า Meta CAPI payload ส่ง custom_data.campaign_id มาด้วยหรือไม่
  ถ้าไม่ → เพิ่ม campaign_id ใน CAPI payload ที่ส่งจาก LINE webhook
```

---

## Fix 15 (A5): Pagination

**ปัญหา:** org ขนาดใหญ่ที่มี ads หลายพัน ไม่มีทาง page ข้อมูลออกมาทีละส่วน
ต้องดึงทั้งหมดในครั้งเดียว → token เกิน limit ทุกครั้ง

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม pagination ใน get_ad_config และ get_adset_config

Parameters ใหม่:
  limit: number (default: 50, max: 200)
  offset: number (default: 0)
  
  เพิ่ม pagination metadata ใน output:
  total: number     - จำนวนทั้งหมด
  returned: number  - จำนวนที่คืนในครั้งนี้
  has_more: boolean - ยังมีข้อมูลต่อไปไหม

ตัวอย่าง output format:

  ## Ad Config
  Filter: ACTIVE | Total: 1,655 ads | Showing: 1–50 | has_more: true
  
  [50 ads]
  
  ---
  Next page: get_ad_config({ ..., offset: 50, limit: 50 })

ตัวอย่างการใช้งาน:

  // Page 1
  get_ad_config({ campaign_id: "xxx", limit: 50, offset: 0 })
  → 50 ads แรก
  
  // Page 2
  get_ad_config({ campaign_id: "xxx", limit: 50, offset: 50 })
  → 50 ads ถัดไป

SQL implementation:
  SELECT * FROM ads
  WHERE [filters]
  ORDER BY ad_id
  LIMIT $limit OFFSET $offset

หมายเหตุสำคัญ:
  Pagination ควรเป็น last resort — ถ้า implement P0/P1/P2 ครบแล้ว
  การใช้ campaign_id + has_spend_days + unique_creatives ควรลด ads เหลือ
  ไม่เกิน 50 ชิ้น โดยไม่ต้องใช้ pagination เลย
  
  Pagination มีประโยชน์มากสำหรับ:
  - org ที่มี campaigns ใหม่หลายร้อย campaign จริงๆ
  - historical data analysis
  - export / reporting workflows

  Default limit: 50 สำหรับ get_ad_config, 30 สำหรับ get_adset_config
```

---

## สรุป P3 Implementation Order

```
Fix 12 (B2: RUNNING status)      ← ทำก่อน เพราะ data accuracy สูง + ง่าย
Fix 13 (E2: Sync timeout)        ← ทำพร้อมกัน เพราะแก้ UX ที่น่ารำคาญมาก
Fix 14 (E3: Pixel breakdown)     ← ทำถัดไป เพราะ insight มีคุณค่าสูง
Fix 11 (A3: Field selection)     ← ทำหลัง เพราะ effort สูงกว่า
Fix 15 (A5: Pagination)          ← ทำสุดท้าย เพราะ P0/P1/P2 แก้ปัญหาส่วนใหญ่แล้ว
```

---

*Priority: P3 — ทำหลังจาก P0/P1/P2 implement และ test แล้ว*
*อ้างอิง: system_improvements.md หมวด A3, A5, B2, E2, E3*
*อัพเดท: 2026-05*
