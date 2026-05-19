# Workflow: Weekly Optimization Review
### ConversionFactor MCP · Guided Workflow

> ใช้ทุกสัปดาห์ เวลา 30–45 นาที
> เป้าหมาย: ตัดสินใจ 3–5 Action ที่ชัดเจนสำหรับสัปดาห์ถัดไป

---

## เตรียมก่อน Review

```
□ เรียก Tool: get_client_summary เพื่อดูภาพรวมและยืนยัน org_id
□ เตรียม Target KPI: CPA เป้า, ROAS เป้า, Budget/สัปดาห์
```

---

## Section 1: Anomaly Check (5 นาที)

```
□ Tool: find_anomalies
□ ดูว่ามีอะไรผิดปกติจาก 7 วันที่ผ่านมา:
  - CPA spike > 30%? → ตรวจ Creative Frequency และ Landing Page
  - CTR drop > 30%? → Refresh Creative หรือ Audience ใหม่
  - Spend spike > 50%? → ตรวจ Budget Cap และ Bid Strategy
  - Frequency > 3.5? → เตือน Ad Fatigue ทันที
  - Conversion หยุดทันที? → รัน pixel_health_check ทันที

□ ถ้ามี Red Flag → ระบุ action ก่อนไปขั้นตอนถัดไป
```

---

## Section 2: Campaign Performance (10 นาที)

```
□ Tool: campaign_health_check
□ ดูทีละ Campaign:

  Performance vs Target:
  - CPA สัปดาห์นี้ vs Target: +/-?%
  - ROAS สัปดาห์นี้ vs Target?
  - Budget ถูกใช้งานครบไหม?

  Learning Phase:
  - Campaign ไหนยังใน Learning Phase?
  - ถ้า Learning นานเกิน 7 วัน → ตรวจ Conversion Volume (ต้องการ 50/สัปดาห์)

  Verdict per Campaign:
  ✅ On track (CPA ±15%) → ไม่ต้องทำอะไร (อย่าแตะ!)
  ⚠️ Underperforming → Plan action
  ❌ CPA เกิน 2× Target → Pause หรือ Restructure

□ Tool: get_budget_history  [pending]
□ ตรวจว่า Budget เปลี่ยนอะไรไปบ้างใน 7 วัน ถ้าเปลี่ยน > 20% → อาจ Reset Learning Phase
```

---

## Section 3: Creative Health (10 นาที)

```
□ Tool: get_video_metrics  [pending — ดูจาก Ads Manager Custom Columns แทน]
□ ดูทุก Active Ad:
  - Hook Rate < 25% → เปลี่ยน Hook ด่วน
  - Hold Rate < 30% → ปรับ Story
  - Frequency > 3.5 → เร่งด่วน เพิ่ม Creative ใหม่

□ Tool: get_ad_config  [pending]
□ ดู Creative ที่รันอยู่:
  - Headline/Body ตรงกับ Audience Stage ไหม? (Cold/Warm/Hot)
  - CTA ตรงกับ Optimization Goal ไหม?
  - มี Creative อายุเกิน 30 วัน + Frequency สูง → Refresh ด่วน

□ Rank Ads: Winner / Middle / Loser
  - Winner → Budget เพิ่มได้ถ้า Frequency < 2.5
  - Loser → Pause ถ้ามีข้อมูล > 3 วัน และ > 2,000 Impressions
  - สร้าง Creative ใหม่จาก DNA ของ Winner (เปลี่ยน Hook หรือ Angle)
```

---

## Section 4: Audience Health (5 นาที)

```
□ Tool: get_adset_config  [pending — ดูจาก Ads Manager แทน]
□ ตรวจ:
  - Narrow-By Layer ยังสมเหตุสมผลไหม?
  - Frequency สูงใน Ad Set ไหน? → Audience อาจ saturate

□ ถ้า Audience Saturate:
  - ขยาย Lookalike % (1% → 2–3%)
  - เพิ่ม Interest group ใหม่ใน Layer 1
  - พิจารณา Advantage+ Audience (ถ้ามี Conversion > 50/สัปดาห์)

□ ตรวจ CPM trend:
  - CPM เพิ่มขึ้นทุกสัปดาห์ → Audience แคบ หรือ Competition สูง
```

---

## Section 5: Cross-Platform Comparison (5 นาที)

```
□ Tool: compare_platforms
□ เปรียบ Meta vs Google vs LINE:
  - Platform ไหน CPA ดีที่สุดสัปดาห์นี้?
  - ควรโยก Budget ไป Platform ไหน?

□ Tool: conversion_funnel
□ ตรวจ True ROAS:
  - True ROAS (รวม LINE) ต่างจาก Reported ROAS แค่ไหน?
  - ถ้าต่างมาก → LINE Purchase event ยังไม่ sync กลับ Meta
```

---

## Section 6: สรุป Action Items (5 นาที)

```
📅 Weekly Review: [วันที่]
👤 Client: [ชื่อ]

📊 KPI Summary (7 วัน):
  - Total Spend: ฿XX,XXX
  - Total Conversions: XX
  - CPA: ฿X,XXX (Target: ฿X,XXX) → [+/-]%
  - True ROAS: X.X× (รวม LINE)

🔴 แก้ด่วนสัปดาห์นี้:
  1. [Action ที่ทำได้จริง]

🟠 ทดสอบสัปดาห์นี้:
  1. [Action]

💡 Monitor:
  1. [สิ่งที่ต้องติดตาม]
```

---

## กฎห้ามทำ (Don'ts)

```
❌ ห้ามเปลี่ยน Budget > 20% ในครั้งเดียว
❌ ห้าม Pause Campaign ที่ยังใน Learning Phase (< 7 วัน)
❌ ห้ามเปลี่ยน Audience และ Creative พร้อมกัน
❌ ห้ามตัดสินใจจาก 1–2 วัน
❌ ห้ามเพิ่ม Creative ใหม่เกิน 3–5 ชิ้น/สัปดาห์
```

---

## สัญญาณ "ไม่ต้องทำอะไร"

```
✅ Campaign ใน Learning Phase < 7 วัน → รอ
✅ CPA ±15% จาก Target → ไม่ต้องแตะ
✅ Frequency < 2.5 → Creative ยังไม่ Fatigue
✅ ทุกอย่างดี → อย่าเปลี่ยนอะไรเพราะกลัว
```

---

*ใช้ร่วมกับ: Knowledge 01–07 | อัพเดท: 2026-05*
