# Workflow: Creative Deep Dive
### ConversionFactor MCP · Guided Workflow

> ใช้เมื่อ: CTR ตก, CPA พุ่ง, Frequency สูง, หรือต้องการ audit creative ก่อน refresh

---

## เมื่อไหรควรใช้ Workflow นี้

```
□ Frequency > 3.0 ใน Ad Set ใดก็ตาม
□ CTR ลด > 20% เทียบสัปดาห์ก่อน
□ CPA เพิ่ม > 30% โดยไม่มีสาเหตุ
□ รับ Client ใหม่และต้องการ baseline creative quality
□ ก่อน Launch Creative ใหม่ เพื่อเปรียบกับของเดิม
```

---

## ขั้นตอน 1: ภาพรวม Creative Performance

```
□ Tool: campaign_health_check
□ สิ่งที่ต้องดู (Ad level):
  - ดู CTR และ Frequency ของทุก Ad
  - Rank: Ad ไหน CTR สูงสุด? ต่ำสุด?
  - Ad ไหน Frequency > 3.0 แล้ว?
  - มี Ad อายุเกิน 30 วัน + Frequency สูงไหม? → Creative fatigue แน่นอน
```

---

## ขั้นตอน 2: Video Metrics (Hook & Hold)

```
□ Tool: get_video_metrics  [pending — ดูจาก Ads Manager แทน]
□ ได้อะไร: Hook Rate, Hold Rate, Avg Watch Time ต่อ Ad

□ วิธีตรวจใน Ads Manager (ถ้า tool ยังไม่พร้อม):
  Columns → Customize → Video Engagement:
  - "3-second video plays" (สำหรับคำนวณ Hook Rate)
  - "ThruPlays" (สำหรับคำนวณ Hold Rate)
  - "Video average play time"

□ คำนวณเอง:
  Hook Rate = (3-sec plays / Impressions) × 100
  Hold Rate = (ThruPlays / 3-sec plays) × 100

□ Benchmark:
  Hook Rate:
  - < 15% → Hook แย่มาก → เปลี่ยนทันที
  - 15–25% → ต่ำกว่า benchmark → ปรับ Visual/Text แรก
  - 25–35% → มาตรฐาน
  - > 35% → ดีมาก → เก็บ DNA ไว้

  Hold Rate:
  - < 30% → Story ไม่ match Hook หรือ Boring
  - 30–50% → ปกติ
  - > 50% → Content ดึงดูดมาก
```

---

## ขั้นตอน 3: Creative Content Review

```
□ Tool: get_ad_config  [pending — ดูจาก Ads Manager แทน]
□ ได้อะไร: Headline, Body, CTA, Image/Video URL ทุก Ad

□ ประเมินแต่ละ Ad ตาม HOOK–STORY–OFFER Framework:

  HOOK (0–3 วิ):
  □ Visual แรกดึงดูดสายตาไหม? (Movement, Bold color, Face, Text overlay)
  □ Text แรก (ถ้ามี) ทำให้หยุดดูไหม?
  □ Format ถูก? (9:16 vertical หรือ 1:1 square สำหรับ Mobile)
  □ ไม่มี Logo ใหญ่ขึ้นมาก่อนใช่ไหม?

  STORY (3–15 วิ / ย่อหน้าที่ 2):
  □ พูดถึง Pain Point ของ Audience ไหม?
  □ ภาษาตรงกับที่ Audience ใช้จริงไหม? (ไม่ใช่ภาษา Corporate)
  □ มี Social Proof ไหม? (รีวิว, จำนวนคนใช้, Before/After)
  □ Story สอดคล้องกับ Hook ไหม? (ไม่ทำให้รู้สึก "โดนหลอก")

  OFFER + CTA:
  □ CTA ชัดเจนและตรงกับ Objective ไหม?
  □ Offer น่าสนใจไหม?
  □ CTA บน Creative ตรงกับ CTA Button ไหม?
```

---

## ขั้นตอน 4: Placement Breakdown

```
□ Tool: get_performance_breakdown (breakdown_type: placement)  [pending]
□ ดูจาก Ads Manager: Breakdown → Placement

□ สิ่งที่ต้องดู:
  - Feed vs Reels vs Stories → CTR และ CPA ต่างกันแค่ไหน?
  - Placement ไหน Spend เยอะแต่ CPA แย่? → Exclude ออก

□ Action:
  - ถ้า Reels CPA แย่กว่า Feed > 50% → Exclude Reels ออกจาก Placement
  - ถ้า Stories ไม่ได้ ratio ดี → พิจารณา Custom Creative สำหรับ Stories format
```

---

## ขั้นตอน 5: Audience-Creative Alignment

```
□ เปรียบ Creative กับ Audience Stage:

  Cold Audience → ควรใช้: Problem Hook, Educational, Awareness
  Warm Audience → ควรใช้: Product Demo, Comparison, Social Proof
  Hot Audience (Retargeting) → ควรใช้: Urgency, Offer, DPA

□ ถ้า Creative ไม่ match Stage:
  - Cold audience เจอ Offer ตรงๆ → Bounce สูง, CPA สูง
  - Hot audience เจอ Awareness → เสียโอกาส Convert

□ ตรวจ Creative Mix ใน Campaign:
  Trigger (15–20% budget): Problem/Solution
  Exploration (25%): Education/Story
  Evaluation (25%): Trust/Proof
  Offer (30–40%): Conversion
```

---

## ขั้นตอน 6: Action Plan Creative

```
🔴 Refresh ทันที (ถ้ามีข้อใดข้อหนึ่ง):
  □ Frequency > 3.5
  □ Hook Rate < 15%
  □ CTR ลด > 30% สัปดาห์ต่อสัปดาห์
  □ Ad อายุ > 45 วัน

🟠 ปรับใน 1–2 สัปดาห์:
  □ Hook Rate 15–25% → ทดสอบ Hook ใหม่ 3 แบบ
  □ Hold Rate < 30% → ปรับ Story ให้ match Hook

🟢 เก็บ DNA จาก Winner:
  □ Hook Rate > 35% → ทำ Variation (เปลี่ยน Background/Text ไม่เปลี่ยน Concept)
  □ ทดสอบ: Video vs Static, Hook A vs Hook B

Creative Refresh Plan:
  สร้าง: [X] ชิ้นใหม่ ภายใน [วันที่]
  Format: [Video/Static/Carousel]
  Hook concept: [บรรยาย]
  Target Audience Stage: [Cold/Warm/Hot]
```

---

*ใช้ร่วมกับ: Knowledge 02 (Creative Framework), Knowledge 07 (Tools Reference)*
*อัพเดท: 2026-05*
