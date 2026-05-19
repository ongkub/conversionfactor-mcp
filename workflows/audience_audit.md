# Workflow: Audience Audit
### ConversionFactor MCP · Guided Workflow

> ใช้เมื่อ: CPM สูงขึ้นเรื่อยๆ, CPA แย่ลงแม้ Creative ดี, สงสัยว่า Audience ตั้งค่าถูกไหม

---

## เมื่อไหรควรใช้ Workflow นี้

```
□ CPM เพิ่มขึ้น > 20% ต่อสัปดาห์ (Audience แคบหรือ saturate)
□ CPA สูงแม้ Creative ดี (Hook Rate > 25%)
□ Frequency พุ่งเร็ว (> 3.0 ใน < 2 สัปดาห์) → Audience เล็กเกินไป
□ รับ Client ใหม่ → audit audience setup ตั้งแต่ต้น
□ ต้องการ restructure Audience ใหม่ทั้งหมด
```

---

## ขั้นตอน 1: ภาพรวม Performance ระดับ Audience

```
□ Tool: get_client_summary
□ สิ่งที่ต้องดู:
  - Platform ที่ใช้ (Meta / Google / LINE)
  - CPA และ CTR โดยรวม

□ Tool: campaign_health_check
□ สิ่งที่ต้องดู:
  - Frequency ของแต่ละ Ad Set
  - CPM trend (เพิ่มขึ้นไหม)
  - Ad Set ไหน Spend เยอะสุดแต่ CPA แย่สุด
```

---

## ขั้นตอน 2: ดู Audience ที่เซตจริง

```
□ Tool: get_adset_config  [pending — ดูจาก Ads Manager แทน]
□ ได้อะไร:
  - Narrow-By Layers (flexible_spec)
  - Custom Audience / Lookalike ที่ใช้
  - Demographics (Age, Gender, Location)
  - is_advantage_plus
  - Optimization Goal

□ วิธีดูจาก Ads Manager (ถ้า tool ยังไม่พร้อม):
  Ads Manager → Ad Sets → เลือก Ad Set → Edit
  ดูส่วน "Audience" ทั้งหมด

□ บันทึกข้อมูลต่อไปนี้ต่อ Ad Set:
  - Audience Type: Interest / Custom / Lookalike / Advantage+
  - Layer Count (ถ้าใช้ Interest)
  - Items ต่อ Layer
  - Estimated Audience Size (ดูจาก Ads Manager)
```

---

## ขั้นตอน 3: ประเมิน Audience Quality

```
□ ตรวจ Narrow-By Structure:

  Layer Count:
  - 0 Layer (Broad) → เสี่ยง Quality ต่ำ สำหรับ B2B/Niche
  - 1 Layer → ยังเป็น OR ล้วน → แนะนำเพิ่ม Layer 2
  - 2–3 Layers → ✅ เหมาะสม
  - > 3 Layers → ⚠️ อาจแคบเกิน

  Items per Layer:
  - < 2 items → OR pool แคบเกิน → เพิ่ม Interest
  - 3–8 items → ✅ เหมาะสม
  - > 15 items → ⚠️ Overlap มากเกิน → ลด

  Audience Size Rule (5–15x):
  - คำนวณ: Target Reach = Budget/CPM × 1000 / Frequency
  - Required: Target Reach × 5 ถึง × 15
  - ถ้า Estimated Size < 5× → Too Narrow
  - ถ้า Estimated Size > 15× → Too Broad

□ ตรวจ Audience Type ถูกกับ Campaign ไหม:
  Cold Prospecting → Interest + Narrow-By หรือ Lookalike 1–2%
  Retargeting → Custom Audience (Pixel-based)
  Scale → Lookalike 2–5% หรือ Advantage+
```

---

## ขั้นตอน 4: เปรียบกับ Best Practice

```
□ Tool: suggest_audience_plan
□ Input: business_type, geography, product_price_range, target_reach

□ เปรียบ Output กับ Audience จริงที่ดูใน Step 2:
  - Interest ที่ suggest ตรงกับ Business type ไหม?
  - Layer structure คล้ายกันไหม?
  - Size ratio อยู่ใน 5–15x ไหม?

□ ถ้า Audience จริงต่างจาก Best Practice มาก → Restructure
```

---

## ขั้นตอน 5: Demographic Breakdown

```
□ Tool: get_performance_breakdown (breakdown_type: age/gender)  [pending]
□ ดูจาก Ads Manager: Breakdown → Age / Gender

□ สิ่งที่ต้องดู:
  - Age group ไหน CPA ดีที่สุด?
  - Gender ไหน Convert ดีกว่า?
  - ช่วงอายุที่ Spend เยอะแต่ไม่ Convert → ตัดออกได้

□ Action:
  - ถ้า Age 18–24 CPA สูงกว่า Average > 50% → Narrow Demographics เพิ่ม
  - ถ้า Gender หนึ่งไม่ Convert เลย → Filter ออก (ถ้า Business เหมาะ)
```

---

## ขั้นตอน 6: Custom Audience Health

```
□ Tool: get_pixel_quality  [pending — ดูจาก Meta Audiences แทน]
□ ได้อะไร: Custom Audience size, แหล่งข้อมูล, วันที่ update

□ วิธีดูจาก Ads Manager:
  Business Manager → Audiences → ดู Size และ "Availability"

□ สิ่งที่ต้องดู:
  - Retargeting audience > 1,000 คนไหม? (ถ้าน้อยกว่า Learning Phase ยาก)
  - Custom Audience อัปเดตล่าสุดเมื่อไหร่? (ถ้า > 30 วัน → Refresh)
  - Lookalike Seed quality ดีพอไหม?

□ Priority of Lookalike Seed (จากดีสุดไปน้อยสุด):
  1. Past Purchasers
  2. High-value customers (LTV top 25%)
  3. Initiate Checkout
  4. Add to Cart
  5. Website Visitors All (ต่ำสุด)
```

---

## ขั้นตอน 7: Action Plan Audience

```
🔴 Restructure ทันที:
  □ ไม่มี Narrow-By และ CPM > Benchmark
  □ Audience < 100K (TH) — Learning Phase จะไม่เสถียร
  □ Audience type ไม่ตรงกับ Funnel Stage

🟠 ปรับใน 1–2 สัปดาห์:
  □ Layer 1 แต่ยังไม่มี Layer 2 → เพิ่ม Qualifying Signal
  □ Items < 3 ต่อ Layer → เพิ่ม Interest

🟢 Opportunities:
  □ Lookalike Seed จาก LINE Purchasers (ถ้ายังไม่ได้ทำ)
  □ Advantage+ ถ้ามี Conversion > 50/สัปดาห์
  □ Separate Retargeting Campaign ออกจาก Prospecting

Audience Restructure Plan:
  Ad Set 1 — Cold Prospecting (Interest + Narrow-By):
    Layer 1: [Core Interest]
    Layer 2: [Qualifying Signal]
    Demographics: อายุ [X–Y], เพศ [ทั้งหมด/ชาย/หญิง]
    Est. Size: [X]M คน → Ratio [X]×

  Ad Set 2 — Lookalike 1% (ถ้ามี Seed):
    Seed: [Purchase / Lead จาก LINE]
    Size: ~500K–800K (TH)

  Ad Set 3 — Retargeting:
    Custom Audience: [Pixel Visitors 30d / LINE Followers]
    Exclude: Past Purchasers
```

---

*ใช้ร่วมกับ: Knowledge 01 (Audience Narrow-By), Knowledge 07 (Tools Reference)*
*อัพเดท: 2026-05*
