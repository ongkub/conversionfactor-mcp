# Workflow: Full Campaign Audit (ครั้งแรก)
### ConversionFactor MCP · Guided Workflow

> ใช้ Workflow นี้เมื่อ: รับลูกค้าใหม่, แคมเปญมีปัญหาไม่รู้จะเริ่มจากไหน, หรือต้องการ review ครั้งใหญ่

---

## ขั้นตอน 1: Business Brief (ก่อนดู Data)

**คำถามที่ต้องถามก่อนเสมอ:**

```
1. ธุรกิจขายอะไร? ราคาเท่าไหร่? (สินค้า/บริการ, AOV)
2. End Result ที่แท้จริงคืออะไร?
   - Purchase บนเว็บ?
   - Lead Form?
   - ทัก LINE?
   - โทรหา Sales?
   - ซื้อผ่าน LINE โดยตรง?
3. KPI Target คืออะไร? (CPA เป้า, ROAS เป้า, CPL เป้า)
4. Budget/เดือนเท่าไหร่?
5. เป้าหมาย Reach/เดือนเท่าไหร่?
```

**ถ้าไม่รู้ End Result → อย่าดู Data ก่อน — ต้องตอบข้อนี้ให้ได้ก่อน**

---

## ขั้นตอน 2: ภาพรวม Client

```
□ Tool: get_client_summary
□ ได้อะไร: org_id ที่ถูกต้อง, Spend รวม 30d, CPA, Platform ที่ใช้
□ สิ่งที่ต้องดู:
  - Org มีกี่ Platform? (Meta, Google, LINE)
  - Total Spend สมเหตุสมผลกับ Budget ไหม?
  - CPA ห่างจาก Target แค่ไหน?

⚠️ ถ้า org ไม่มีชื่อ (แสดงแค่ UUID) → แจ้ง user ให้ตั้งชื่อ Org ใน ConversionFactor
```

---

## ขั้นตอน 3: ตรวจ Conversion Tracking (รากฐาน)

```
□ Tool: pixel_health_check
□ ได้อะไร: Event volume, CAPI signal, event drop

□ Tool: get_pixel_quality  [pending — ดูจาก Meta Events Manager แทน]
□ ได้อะไร: EMQ Score ต่อ event type, Custom Audience size

□ สิ่งที่ต้องดู:
  - Purchase event มีไหม? (ถ้าไม่มีแต่มี Spend → ปัญหาใหญ่)
  - CAPI ส่ง signal ถึง Meta ไหม?
  - EMQ >= 7 ไหม?
  - มี event drop กะทันหันไหม?

□ Action ตาม rule:
  - ไม่มี Purchase event แต่มี Spend → ตรวจ Pixel/CAPI ก่อน
  - EMQ < 7 → เพิ่ม phone/email parameter ใน CAPI payload
  - ไม่มี CAPI signal → ตรวจ server-side implementation
  - มี Lead แต่ไม่มี Purchase → ตรวจว่า sync Purchase จาก LINE กลับแล้วหรือยัง
```

---

## ขั้นตอน 4: Campaign Health Check

```
□ Tool: campaign_health_check
□ ได้อะไร: Spend, CPA, CTR, CPM, Frequency ทุก Campaign และ Ad

□ Tool: find_anomalies
□ ได้อะไร: CPA spike, CTR drop, Spend spike เทียบ 7d avg

□ สิ่งที่ต้องดู:
  Campaign Level:
  - CPA vs Target ±% เท่าไหร่?
  - Budget ถูกใช้ครบไหม?
  - มี Ad Set ที่ Spend แต่ไม่ Convert เลยไหม?

  Ad Level:
  - Frequency > 3.5 → เตือน Ad Fatigue ทันที
  - CPA spike > 30% → ตรวจ Creative Frequency และ Landing Page
  - CTR drop > 30% → แนะนำ Refresh Creative หรือ Audience ใหม่
  - Spend spike > 50% → ตรวจ Budget Cap และ Bid Strategy
```

---

## ขั้นตอน 5: Audience Audit

```
□ Tool: get_adset_config  [pending — ดู Audience จาก Ads Manager แทน]
□ ได้อะไร: Narrow-By Layers จริง, Custom Audience, Lookalike, Demographics, is_advantage_plus

□ Tool: suggest_audience_plan
□ ใช้เพื่อ: สร้าง Best Practice Plan เพื่อเปรียบกับที่เซตจริง

□ สิ่งที่ต้องดู:
  - มี Narrow-By กี่ Layer? (ควร 2–3)
  - แต่ละ Layer มี items พอไหม? (ควร 3–8 items)
  - Audience Type ถูกไหม?
  - is_advantage_plus = true ไหม? (ต้องมี Conversion data >50/สัปดาห์)

□ Action ตาม rule:
  - Layer < 2 หรือไม่มี Narrow-By → แนะนำ restructure
  - Audience ไม่ตรง Business type → เปรียบกับ suggest_audience_plan
  - Frequency > 3.5 → Audience อาจ saturate → ขยาย
```

---

## ขั้นตอน 6: Creative Audit

```
□ Tool: get_ad_config  [pending — ดู Creative จาก Ads Manager แทน]
□ ได้อะไร: Headline, Body, CTA, Image/Video URL ทุก Ad

□ Tool: get_video_metrics  [pending — ดูจาก Ads Manager Custom Columns แทน]
□ ได้อะไร: Hook Rate, Hold Rate, Avg Watch Time

□ สิ่งที่ต้องดู:
  - Hook Rate < 25% → เปลี่ยน Visual/Text แรก
  - Hold Rate < 30% → ปรับ Story ให้ match กับ Hook
  - Frequency > 3.5 + CTR ลด → Creative Fatigue → Refresh ด่วน
  - oCTR ดีแต่ Conversion = 0 → Landing Page หรือ Pixel มีปัญหา

□ ประเมิน HOOK–STORY–OFFER ตาม Knowledge 02
```

---

## ขั้นตอน 7: Performance Breakdown

```
□ Tool: get_performance_breakdown  [pending — ดูจาก Ads Manager Breakdown แทน]
□ ได้อะไร: Spend/CPA/CTR แยกตาม Age, Gender, Placement, Device

□ สิ่งที่ต้องดู:
  Age/Gender:
  - กลุ่มไหน CPA ดีที่สุด? → พิจารณา Narrow Demographics
  - กลุ่มไหน Spend มากแต่ไม่ Convert? → ตัดออก

  Placement:
  - Feed vs Reels vs Stories → ไหน perform ดีสุด?
  - ถ้า Reels แย่แต่ Spend เยอะ → Exclude Reels

  Device:
  - Mobile vs Desktop CVR ต่างกันมากไหม? → ตรวจ Mobile Landing Page
```

---

## ขั้นตอน 8: Cross-Platform View

```
□ Tool: compare_platforms
□ ได้อะไร: Meta vs Google vs LINE — Spend, CPA, ROAS

□ Tool: conversion_funnel
□ ได้อะไร: True ROAS รวม LINE Conversion

□ สิ่งที่ต้องดู:
  - Platform ไหน nROAS ดีที่สุด? → allocate budget มากกว่า
  - True ROAS ต่างจาก Reported ROAS มากไหม? → ถ้าต่างมาก = LINE ไม่ถูก track
  - มี Attribution Overlap ระหว่าง Platform ไหม?
```

---

## ขั้นตอน 9: สรุปและ Action Plan

```
🔴 Critical Issues (ต้องแก้ทันที):
  1. [ปัญหา] → [Action ที่ทำได้จริง]

🟠 Issues (แก้ใน 1–2 สัปดาห์):
  1. [ปัญหา] → [Action]

🟢 Opportunities (Scale):
  1. [โอกาส] → [Action]

Priority Actions สัปดาห์นี้:
  □ Action 1
  □ Action 2
  □ Action 3
```

---

## Time Estimate

| ขั้นตอน | เวลา | Tools |
|---|---|---|
| Business Brief | 10 นาที | — |
| ภาพรวม Client | 2 นาที | `get_client_summary` |
| Tracking Check | 5 นาที | `pixel_health_check` |
| Campaign Health | 10 นาที | `campaign_health_check`, `find_anomalies` |
| Audience Audit | 10 นาที | `get_adset_config`, `suggest_audience_plan` |
| Creative Audit | 10 นาที | `get_ad_config`, `get_video_metrics` |
| Breakdown | 5 นาที | `get_performance_breakdown` |
| Cross-Platform | 5 นาที | `compare_platforms`, `conversion_funnel` |
| สรุป | 10 นาที | — |
| **รวม** | **~67 นาที** | |

---

*ใช้ร่วมกับ: Knowledge 01–07 | อัพเดท: 2026-05*
