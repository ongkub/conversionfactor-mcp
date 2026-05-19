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

## ขั้นตอน 2: ตรวจ Conversion Tracking (รากฐาน)

```
□ เรียก Tool: pixel_health_check หรือดูจาก Meta Events Manager
□ ตรวจ:
  - Pixel Fire ครบทุก Page ไหม?
  - CAPI ทำงานอยู่ไหม?
  - EMQ Score >= 7 ไหม?
  - มี Deduplication (event_id) ไหม?
  - Conversion Event ที่ Optimize ถูกต้องไหม?

□ ถ้าพบปัญหา → แจ้งก่อนดู Performance
  "ข้อมูล Performance ที่เห็นอาจไม่แม่น เพราะ Tracking มีปัญหา"
```

---

## ขั้นตอน 3: Audience Audit

```
□ ดู Campaign Structure:
  - มีกี่ Ad Sets?
  - แต่ละ Ad Set ตั้ง Audience ขนาดเท่าไหร่?
  - ใช้ Interest เยอะเกินไปไหม? (ควร 3–5 Interest ต่อ Ad Set)
  - มี Narrow By ไหม? (ดู Knowledge 01: Audience Narrow By)
  - มี Custom Audience สำหรับ Retargeting แยกต่างหากไหม?

□ ตรวจ Audience Sizing Rule (5–15x):
  - Reach ที่ต้องการ = X คน
  - Audience ควรมีขนาด 5X–15X
  - ถ้าแคบเกิน → CPM จะสูง, Fatigue เร็ว
  - ถ้ากว้างเกิน → เสียงบกับคนที่ไม่ใช่ Target

□ ตรวจ Narrow By Structure:
  หลักการ: Audience = กลุ่ม A ∩ กลุ่ม B ∩ กลุ่ม C (AND logic)
  ตัวอย่างสินค้า Luxury:
    Layer 1 (OR): Luxury brands, Luxury lifestyle
    AND Layer 2 (OR): High income, Wealth management, Private banking
    AND Layer 3 (OR): Car enthusiast, Automotive interest
```

---

## ขั้นตอน 4: Campaign Health Check

```
□ เรียก Tool: campaign_health_check หรือดู Ads Manager
□ ดูทีละ Level: Campaign → Ad Set → Ad

Campaign Level:
  - Objective ถูกต้องตาม Business Goal ไหม?
  - Budget เพียงพอให้ออก Learning Phase ไหม? (Budget ≥ 7 × Target CPA/วัน)
  - Advantage Campaign Budget เปิดอยู่ไหม?

Ad Set Level:
  - Learning Phase Status: Active / Learning / Limited?
  - CPA vs Target: ±% เท่าไหร่?
  - Frequency: > 3.5 แล้วหรือยัง?

Ad Level:
  - Hook Rate, Hold Rate, oCTR แต่ละ Ad?
  - Ad ไหนเป็น Winner? ไหนเป็น Loser?
```

---

## ขั้นตอน 5: Creative Audit

```
□ ดูแต่ละ Ad และประเมิน:

HOOK (0–3 วิ):
  - มี Visual ดึงดูดทันทีไหม?
  - Text แรกทำให้หยุดดูไหม?
  - Format ถูก (9:16 หรือ 1:1)?

STORY (3–15 วิ):
  - พูดถึง Pain Point ของ Audience ไหม?
  - มี Social Proof ไหม?
  - ภาษาตรงกับที่ Audience ใช้ไหม?

OFFER + CTA:
  - CTA ชัดเจนและตรงกับ Objective ไหม?
  - Offer น่าสนใจไหม?
  - CTA ตรงกับ Button ไหม?

□ ดู Creative Metrics:
  - Hook Rate: < 25% = ปัญหา
  - Hold Rate: < 30% = ปัญหา
  - oCTR: < 1% = ปัญหา
  - Frequency: > 3.5 = เร่งด่วน
```

---

## ขั้นตอน 6: Post-Click Analysis

```
□ ถ้า Objective คือ Traffic/Conversion ไปยังเว็บ:
  - ตรวจ Landing Page ด้วย Checklist ใน Knowledge 04
  - ตรวจ GA4: Bounce Rate, CVR, Session Duration
  - ตรวจ Page Speed: < 3 วินาที?
  - ตรวจ Message Match: Ad Copy ตรงกับ Landing Page H1 ไหม?

□ ถ้า Objective คือ LINE / Messenger:
  - ตรวจ Reply Rate ของ LINE OA
  - ตรวจว่า fbclid ถูก Track ไหม (ConversionFactor)
  - ตรวจ Conversion Rate จาก Chat → Purchase
```

---

## ขั้นตอน 7: Cross-Platform View

```
□ เรียก Tool: compare_platforms
□ ดู:
  - Meta vs Google: Spend, CPA, ROAS, Conversions
  - Platform ไหนให้ nROAS ดีที่สุด?
  - Budget allocation ปัจจุบัน vs แนะนำ?
  - มี Attribution Overlap ระหว่าง Platform ไหม?
```

---

## ขั้นตอน 8: สรุปและ Action Plan

**Output ที่ต้องให้ลูกค้า:**

```
🔴 Critical Issues (ต้องแก้ทันที):
  1. [ปัญหา] → [Action]
  2. ...

🟡 Issues (แก้ใน 1–2 สัปดาห์):
  1. [ปัญหา] → [Action]
  2. ...

🟢 Opportunities (ทำเพิ่มเพื่อ Scale):
  1. [โอกาส] → [Action]
  2. ...

Priority Actions (สัปดาห์นี้):
  □ Action 1
  □ Action 2
  □ Action 3
```

---

## Time Estimate

| ขั้นตอน | เวลาประมาณ |
|--------|---------|
| Business Brief | 10–15 นาที |
| Tracking Check | 5–10 นาที |
| Audience Audit | 10–15 นาที |
| Campaign Health | 15–20 นาที |
| Creative Audit | 20–30 นาที |
| Post-Click | 10–15 นาที |
| Cross-Platform | 10 นาที |
| สรุป + Report | 15–20 นาที |
| **รวม** | **~90–120 นาที** |
