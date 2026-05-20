# Implementation Prompt: P1 — Filters & Audience Fix
### ConversionFactor MCP · Ready-to-implement

---

## Fix 4: has_spend_days filter (ทุก config tools)

**ปัญหา:** tools ดึงข้อมูลของ campaign ที่ไม่ได้ใช้เงินมาหลายเดือนมาด้วย
**เป้าหมาย:** filter เฉพาะ campaign/adset/ad ที่มี spend จริงใน N วันล่าสุด

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม has_spend_days parameter ใน config tools ทั้งหมด

Context:
- Sangthai มี 269 adsets แต่มีแค่ 3 campaigns ที่ใช้เงินจริงในสัปดาห์นี้
- ปัจจุบัน status_filter: "ACTIVE" ไม่ช่วย เพราะ expired campaigns ยัง status ACTIVE
- ต้องการ filter โดยใช้ spend data จาก ad_snapshots table

Tools ที่ต้องเพิ่ม parameter:
- get_campaign_config
- get_adset_config  
- get_ad_config
- get_video_metrics
- get_performance_breakdown

Parameter ใหม่:
  has_spend_days: number (optional)
  - ถ้าระบุ: return เฉพาะ records ที่มี SUM(spend) > 0 ในช่วง has_spend_days วันล่าสุด
  - ถ้าไม่ระบุ: behavior เดิม (ไม่กรอง)
  - ค่าแนะนำ: 7, 14, 30

SQL Query Pattern:
  -- หา campaign_ids ที่ active จริง
  SELECT DISTINCT campaign_id
  FROM ad_snapshots
  WHERE organization_id = $org_id
    AND date_start >= NOW() - INTERVAL '$has_spend_days days'
    AND spend > 0

  -- ใช้ filter ใน query หลัก
  WHERE campaign_id IN (active_campaign_ids)

Implementation:
  1. เพิ่ม parameter ใน tool schema definition ของทุก tool ที่ระบุ
  2. สร้าง helper function getActiveCampaignIds(orgId, days) → string[]
  3. ถ้า has_spend_days ระบุ → call helper แล้วใช้ผลลัพธ์เป็น campaign_id filter
  4. รวมกับ campaign_id filter ที่มีอยู่แล้ว (AND condition)

ตัวอย่างผลลัพธ์:
  get_adset_config({ organization_id: "...", has_spend_days: 7 })
  → แทนที่จะได้ 269 adsets → ได้แค่ ~15 adsets ของ 3 campaigns ที่ active
```

---

## Fix 5: get_active_campaign_ids — New Lightweight Tool

**ปัญหา:** ต้อง parse campaign_health_check output เพื่อหา campaign_ids ที่ active
ทุกครั้ง ก่อนจะเรียก get_adset_config หรือ get_ad_config
**เป้าหมาย:** tool ใหม่ที่คืนแค่ list ของ campaign_ids ที่มี spend จริง

---

### Prompt สำหรับ ConversionFactor:

```
สร้าง MCP tool ใหม่: get_active_campaign_ids

Purpose:
  คืน list ของ campaign_ids ที่มี spend > 0 ในช่วง N วันล่าสุด
  ใช้เป็น "step 1" ก่อนเรียก get_adset_config / get_ad_config เพื่อลด token

Parameters:
  organization_id: string (required)
  days: number (default: 7) — ช่วงเวลาที่ตรวจ spend
  platform: "meta" | "google_ads" | undefined — filter platform (optional)

Output format (compact — ไม่เกิน 500 tokens):
  ## Active Campaigns (มี spend ใน 7 วัน)
  Organization: xxx | Platform: META | พบ 3 campaigns

  | campaign_id | name | spend_7d | platform |
  |---|---|---|---|
  | 120230601... | ST_Engagement VDO Re 2026 | ฿2,770 | META |
  | 120243037... | ST_Engagement - Re 2026 | ฿1,310 | META |
  | 120204668... | ST_FB_Message - บางเลน | ฿903 | META |

SQL:
  SELECT 
    campaign_id,
    campaign_name,
    SUM(spend) as total_spend,
    platform
  FROM ad_snapshots
  WHERE organization_id = $org_id
    AND date_start >= NOW() - INTERVAL '$days days'
    AND spend > 0
  GROUP BY campaign_id, campaign_name, platform
  ORDER BY total_spend DESC

Tool Description (สำหรับ MCP schema):
  "ดู campaign_ids ที่มี spend จริงใน N วันล่าสุด — ใช้ก่อนเรียก get_adset_config
  หรือ get_ad_config เพื่อกรองเฉพาะ campaign ที่ active และลด token 90%+"
```

---

## Fix 6: แก้ suggest_audience_plan — B2B Construction Classification

**ปัญหา:** เรียกด้วย "เมทัลชีท B2B ขายให้ผู้รับเหมา เจ้าของโรงงาน" 
→ ได้ Real Estate plan (Condominium, House hunting, Mortgage loans) ซึ่งผิดทั้งหมด
**เป้าหมาย:** tool ระบุ business category ได้ถูกต้องและเลือก template ที่เหมาะ

---

### Prompt สำหรับ ConversionFactor:

```
แก้ suggest_audience_plan ให้ classify B2B Construction ถูกต้อง

ปัญหาที่พบ:
  Input: business_type = "เมทัลชีท B2B ขายให้ผู้รับเหมา เจ้าของโรงงาน เจ้าของบ้าน ช่างก่อสร้าง"
  Output ที่ได้: Real Estate plan (Layer 1: Condominium, House hunting, Mortgage loans)
  Output ที่ควรได้: B2B Construction plan (Layer 1: Construction engineering, Civil engineer, etc.)

สาเหตุ:
  Tool น่าจะตีความ "เจ้าของบ้าน" และ "บ้าน" → Real Estate
  แต่ context จริงคือ "ขายวัสดุมุงหลังคาให้ช่างก่อสร้างและผู้รับเหมา"

วิธีแก้ — เพิ่ม business category detection ใน prompt ของ tool:

  ก่อนสร้าง audience plan ให้ classify business_type เป็น category ก่อน:

  CATEGORIES:
  - B2B_CONSTRUCTION: ขายวัสดุก่อสร้าง, เมทัลชีท, เหล็ก, ซีเมนต์, กระเบื้อง ให้ผู้รับเหมา/โรงงาน
    Keywords: เมทัลชีท, ผู้รับเหมา, โรงงาน, ช่างก่อสร้าง, วัสดุก่อสร้าง, หลังคา, เหล็ก, ซีเมนต์
  - B2C_REAL_ESTATE: ขายบ้าน, คอนโด, ที่ดิน ให้ผู้ซื้อโดยตรง
    Keywords: บ้านพร้อมอยู่, คอนโด, โครงการ, ผ่อนบ้าน, กู้ซื้อบ้าน
  - HOME_IMPROVEMENT: รับสร้างบ้าน, ต่อเติม, ซ่อมแซม
  - INDUSTRIAL_EQUIPMENT: เครื่องจักร, อุปกรณ์โรงงาน
  - [อื่นๆ ตามที่เหมาะสม]

  Template สำหรับ B2B_CONSTRUCTION:
  
  Layer 1 (Who they are — OR):
    [work_positions] General contractor, Roofing Contractor, Construction Manager,
    Construction Project Manager, Building Construction Contractor, Civil engineer,
    Construction engineering, Structural Engineer
    [industries] Construction and Extraction, Architecture and Engineering
    Interests: Construction engineering, Home construction (construction)
  
  Layer 2 (Qualifying Signal — OR):
    Behaviors: Small business owners
    [work_employers] ธุรกิจส่วนตัว(เป็นนายตัวเอง)
    [work_positions] Business Owner
    Interests: DeWalt, Makita, Bosch Global, Hilti
    (คนที่ใช้เครื่องมือช่างระดับ Professional = ช่างก่อสร้างจริง)
  
  Layer 3 (Intent Signal — optional):
    Interests: Roof (architecture), Building material, Hardware store
    Behaviors: Engaged Shoppers (ถ้า audience ยังใหญ่เกินไป)

  ถ้า category = B2B_CONSTRUCTION → ใช้ template นี้แทน Real Estate template
```

---

*Priority: P1 — ทำหลังจาก P0 เสร็จ*
*อ้างอิง: system_improvements.md หมวด A2, C1, E1*
*อัพเดท: 2026-05*
