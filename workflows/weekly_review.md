# Workflow: Weekly Optimization Review
### ConversionFactor MCP · Guided Workflow

> ใช้ทุกสัปดาห์ เวลา 30–45 นาที
> เป้าหมาย: ตัดสินใจ 3–5 Action ที่ชัดเจนสำหรับสัปดาห์ถัดไป

---

## เตรียมก่อน Review

```
□ เปิด Ads Manager (7-day view, Breakdown by Day)
□ เปิด ConversionFactor Dashboard (ถ้ามี)
□ เตรียม Target KPI: CPA เป้า, ROAS เป้า, Budget/สัปดาห์
□ เรียก Tool: get_client_summary เพื่อดูภาพรวม
```

---

## Section 1: Anomaly Check (5 นาที)

```
□ เรียก Tool: find_anomalies
□ ดูว่ามีอะไรผิดปกติจาก 7 วันที่ผ่านมา:
  - CPA spike > 2× ติดต่อกัน 3 วัน?
  - Spend หยุดกะทันหัน?
  - CTR ลดฮวบ?
  - Conversion หยุดทันที? (ตรวจ Pixel ด้วย)

□ ถ้ามี Red Flag → ไปแก้ก่อนทำขั้นตอนอื่น
```

---

## Section 2: Campaign Performance (10 นาที)

```
□ เรียก Tool: campaign_health_check (ทุก Campaign)
□ ดูทีละ Campaign:

  Performance vs Target:
  - CPA สัปดาห์นี้ vs Target: +/- ?%
  - ROAS สัปดาห์นี้ vs Target?
  - Budget ถูกใช้งานครบไหม?

  Learning Phase:
  - Campaign ไหนยังใน Learning Phase?
  - ถ้า Learning นานเกิน 7 วัน → ตรวจ Conversion Volume

  Verdict per Campaign:
  ✅ On track → ไม่ต้องทำอะไร (อย่าแตะ!)
  ⚠️ Underperforming → Plan action
  ❌ Losing money → Pause หรือ Restructure
```

---

## Section 3: Creative Health (10 นาที)

```
□ ดูทุก Active Ad:
  - Hook Rate: ถ้า < 25% → เปลี่ยน Hook
  - Hold Rate: ถ้า < 30% → ปรับ Story
  - oCTR: ถ้า < 1% → ปรับ Offer/CTA
  - Frequency: ถ้า > 3.5 → เร่งด่วน เพิ่ม Creative

□ Rank Ads: Winner / Middle / Loser
  - Winner: ใส่ Budget เพิ่ม (ถ้า Frequency ยังโอเค)
  - Loser: Pause ถ้ามี Data เพียงพอ (> 3 วัน, > 2,000 Impressions)

□ Creative Refresh Plan:
  - ถ้า Top Ad มี Frequency > 2.5 → เริ่มสร้าง Creative ใหม่แล้ว
  - สร้างอย่างน้อย 1–2 Variation จาก Winner (เปลี่ยน Hook หรือ Visual)
```

---

## Section 4: Audience & Delivery (5 นาที)

```
□ ตรวจ Audience Meter (ใน Ad Set):
  - กว้าง/แคบเกินไปไหม?
  - มี Overlap ระหว่าง Ad Sets ไหม?

□ ตรวจ Delivery:
  - CPM เพิ่มขึ้นเรื่อยๆ ไหม? (สัญญาณ Audience แคบหรือ Competition สูง)
  - Budget กระจายไม่ทั่ว Ad Sets ไหม?

□ ถ้า Audience Saturate:
  - ขยาย Lookalike % (1% → 2–3%)
  - เพิ่ม Interest group ใหม่
  - พิจารณา Advantage+ Audience
```

---

## Section 5: Cross-Platform Comparison (5 นาที)

```
□ เรียก Tool: compare_platforms
□ เปรียบ Meta vs Google vs LINE (ถ้ามี):
  - Platform ไหน CPA ดีที่สุดสัปดาห์นี้?
  - ควรโยก Budget ไป Platform ไหน?
  - มีแพลตฟอร์มไหนที่ควรลดงบหรือหยุดชั่วคราว?
```

---

## Section 6: สรุป Action Items (5 นาที)

**Template สรุปประจำสัปดาห์:**

```
📅 Weekly Review: [วันที่]
👤 Client: [ชื่อ]
📊 KPI Summary:
  - Total Spend: XX,XXX บาท
  - Total Conversions: XX
  - CPA: X,XXX บาท (Target: X,XXX) → [+/-]%
  - ROAS: X.X× (Target: X×) → [+/-]%

🔴 แก้ด่วนสัปดาห์นี้:
  1. [Action]
  2. [Action]

🟡 ทดสอบสัปดาห์นี้:
  1. [Action]
  2. [Action]

💡 Monitor:
  1. [สิ่งที่ต้องติดตาม]
```

---

## กฎห้ามทำ (Don'ts ในการ Weekly Review)

```
❌ ห้ามเปลี่ยน Budget > 20% ในครั้งเดียว
❌ ห้าม Pause Campaign ที่ยังใน Learning Phase (< 7 วัน)
❌ ห้ามเปลี่ยน Audience และ Creative พร้อมกัน
❌ ห้ามตัดสินใจจาก 1–2 วัน (ข้อมูลไม่พอ)
❌ ห้ามเพิ่ม Creative ใหม่เยอะเกิน 3–5 ชิ้น/สัปดาห์ (Algorithm ปรับตัวไม่ทัน)
```

---

## สัญญาณ "ไม่ต้องทำอะไร" (Leave it alone)

```
✅ Campaign ใน Learning Phase และยังไม่ถึง 7 วัน → รอ
✅ CPA อยู่ใน Target ± 15% → ไม่ต้องแตะ
✅ Frequency < 2.5 → ไม่ต้องเปลี่ยน Creative ด่วน
✅ ทุกอย่างดี → อย่าเปลี่ยนอะไรเพราะกลัว
```

---

*ใช้ร่วมกับ: Knowledge 01 (Audience), 02 (Creative), 03 (Tracking), 05 (Optimization Cycles)*
