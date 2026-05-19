# Knowledge 05: Optimization Cycles — Weekly Cadence + Learning Phase Rules
### ConversionFactor MCP · AI Reference File

> อย่าแตะ Campaign บ่อยเกินไป — ทุกการเปลี่ยนแปลงที่สำคัญ = Reset Learning Phase
> Optimization ที่ดีคือ "รู้ว่าเมื่อไหรต้องแตะ และเมื่อไหรต้องรอ"

---

## 1. Learning Phase คืออะไร และทำไมต้องระวัง

**Learning Phase** คือช่วงที่ Algorithm ของ Meta กำลังเรียนรู้ว่าจะยิงโฆษณาให้ใคร เมื่อไหร่ และที่ไหน เพื่อให้ได้ Conversion สูงสุด

**ข้อเท็จจริง:**
- ต้องการ **50 Conversions ต่อ Ad Set ต่อสัปดาห์** เพื่อออกจาก Learning Phase
- ระหว่าง Learning Phase: CPA จะสูงกว่าปกติ, Performance ไม่เสถียร
- ถ้า Optimize ตอน Learning Phase → ข้อมูลไม่ Reliable → ตัดสินใจผิด

**สิ่งที่ทำให้ Learning Phase Reset (ต้องระวัง):**
- เพิ่ม/ลด Budget > 20% ในครั้งเดียว
- เปลี่ยน Audience Targeting
- เพิ่ม/ลบ Ad ใน Ad Set
- เปลี่ยน Bid Strategy หรือ Bid Amount
- เปลี่ยน Optimization Event
- Pause Campaign นานเกิน 7 วัน แล้ว Reactivate

**กฎทอง:** รอให้ Campaign มี **7 วัน หรือ 50 Conversions** ก่อนตัดสินใจเปลี่ยนอะไร

---

## 2. Cadence การ Review

### Daily Review (5–10 นาที)
ดูแค่ตัวเลขหลักเพื่อ Sanity Check:

```
ดู:
□ Cost per Key Event (CPL/CPA) เทียบกับ Target
□ Spend ใกล้เคียงกับ Budget ที่ตั้งไหม?
□ มีอะไร Error หรือ Delivery ปัญหาไหม?

หยุดทันทีถ้า:
□ CPA เกิน 2× Target ติดต่อกัน 3 วัน (ไม่ใช่แค่วันเดียว)
□ Spend หยุด Delivery โดยไม่มีเหตุผล
□ Relevance Score/Quality Ranking ตกฮวบ
```

**ห้าม:** เปลี่ยนอะไรโดยดูแค่ 1–2 วัน (ข้อมูลยังไม่เพียงพอ)

### Weekly Review (30–45 นาที)
```
□ Creative Performance:
  - Hook Rate, Hold Rate, Frequency ทุก Ad
  - ถ้า Frequency > 3.5 หรือ CTR ลด → เตรียม Creative ใหม่
  - ถ้า Hook Rate < 25% → เปลี่ยน Hook

□ Audience Health:
  - Audience Overlap ระหว่าง Ad Sets?
  - มี Ad Set ไหนที่ Reach Saturation แล้วหรือยัง?
  - Budget กระจายสมดุลไหม?

□ Creative Refresh:
  - เพิ่ม Creative ใหม่ 1–3 ชิ้น (ไม่ต้อง Pause ของเดิม)
  - ทดสอบ Hook ใหม่หรือ Angle ต่างออกไป

□ Conversion Quality:
  - ROAS จริงตรงกับใน Ads Manager ไหม?
  - นับเทียบกับ CRM หรือ Backend ของจริง?
```

### Bi-Weekly / Monthly Review (1–2 ชั่วโมง)
```
□ Audience Strategy:
  - Lookalike ยังทำงานได้ดีไหม? ลอง Seed ใหม่ไหม?
  - Custom Audience อัปเดตแล้วหรือยัง?
  - พิจารณา Advantage+ Audience?

□ Attribution Analysis:
  - ข้อมูลใน Ads Manager ตรงกับ Backend/CRM ไหม?
  - Attribution Window ที่ตั้งสมเหตุสมผลกับ Sales Cycle ไหม?

□ Budget Allocation:
  - Platform ไหนให้ nROAS ดีที่สุด?
  - Campaign ไหนควร Scale? ไหนควร Cut?

□ Benchmark Review:
  - CPA/ROAS เทียบกับ Industry benchmark?
  - Competitor ทำ Creative แบบไหนอยู่? (Meta Ad Library)
```

---

## 3. กฎการ Scale Budget

**เพิ่ม Budget ทีละ 20% ต่อครั้ง** — ไม่ใช่เพิ่มครั้งเดียว 2×

เหตุผล: การเพิ่มมากกว่า 20% อาจ Reset Learning Phase

```
ตัวอย่าง Scale อย่างถูกต้อง:
วันที่ 1:  1,000 บาท/วัน
วันที่ 8:  1,200 บาท/วัน (+20%)  ← รอ 7 วันก่อน
วันที่ 15: 1,440 บาท/วัน (+20%)
วันที่ 22: 1,730 บาท/วัน (+20%)
```

**Scale เมื่อไหร:**
- Campaign อยู่นอก Learning Phase แล้ว
- CPA อยู่ใกล้ Target (ไม่ต้องรอให้ CPA ต่ำมากก่อน Scale)
- Frequency ยังไม่สูงเกินไป

**ลด Budget เมื่อไหร:**
- CPA เกิน Target > 30% ติดต่อกัน 7 วัน
- Frequency > 4 + CTR ลดลงเรื่อยๆ
- Conversion Quality ตก (CVR ลด, AOV ลด)

---

## 4. Anomaly Detection — สัญญาณที่ต้องระวัง

### Red Flags (ต้องตรวจทันที)
| สัญญาณ | ความหมาย | Action |
|--------|---------|--------|
| CPA เพิ่ม > 50% ใน 3 วัน | Creative Fatigue หรือ Audience Saturation | ตรวจ Frequency + เตรียม Creative ใหม่ |
| CTR ลด > 30% สัปดาห์ต่อสัปดาห์ | Hook เริ่มไม่ work | เปลี่ยน Creative |
| Frequency > 3.5 | Ad Fatigue | เพิ่ม Creative ใหม่ หรือ Expand Audience |
| CPMr เพิ่มสูงขึ้น | Audience แคบเกิน หรือ Competition สูง | ตรวจ Audience Size |
| Spend ลด แต่ไม่ได้ Pause | Delivery ปัญหา หรือ Bid ต่ำเกิน | ตรวจ Delivery Status + Bid |
| Conversion หยุดทันที | Pixel/CAPI ขัดข้อง | ตรวจ Events Manager ทันที |

### Yellow Flags (ต้อง Monitor)
| สัญญาณ | ความหมาย |
|--------|---------|
| Frequency 2.5–3.5 | เริ่มน่ากังวล — เตรียม Creative |
| CPA เพิ่ม 20–30% | อาจเป็น Market Fluctuation หรือ Early Fatigue |
| Learning Phase ไม่ออกใน 2 สัปดาห์ | Budget ต่ำหรือ Conversion น้อยเกิน |

---

## 5. Campaign Structure Best Practices 2025

### ASC (Advantage+ Shopping Campaign) vs Manual
| ใช้ ASC เมื่อ | ใช้ Manual Campaign เมื่อ |
|-------------|----------------------|
| > 50 Conversions/สัปดาห์ | < 30 Conversions/สัปดาห์ |
| E-commerce ที่มี Product Catalog | B2B, Lead Gen |
| มี Creative หลายชิ้น (20+) | ต้องการ Control Audience เฉพาะ |
| ต้องการ Scale เร็ว | ทดสอบ Hypothesis ใหม่ |

### Portfolio แนะนำ (ถ้ามี Budget เพียงพอ)
```
60% → ASC (ให้ AI หาลูกค้าที่มีกำลังซื้อสูง)
30% → Manual Prospecting (ทดสอบ Audience/Creative ใหม่)
10% → Manual Retargeting (Hot Audience ที่ Intent สูง)
```

### Existing Customer Budget Cap
ใน ASC ให้ตั้ง Existing Customer Budget Cap ที่ **10–30%** เพื่อป้องกัน AI แสดงโฆษณาให้ลูกค้าเดิมมากเกินไป

---

## 6. Budget to Conversion Math

**สูตรคำนวณ Budget ขั้นต่ำ:**
```
ต้องการ 7 Conversions/วัน (= 49/สัปดาห์ ≈ ออก Learning Phase)
Budget/วัน = 7 × Target CPA

ตัวอย่าง: Target CPA = 500 บาท
Budget/วัน = 7 × 500 = 3,500 บาท/วัน

ถ้า Budget น้อยกว่า → เลือก Proxy Metric ที่เกิดบ่อยกว่า
```

---

## 7. KPI Dashboard ที่ควรดูทุกสัปดาห์

```
Platform Level:
├── nCPA (New Customer CPA)          Target: < [X] บาท
├── nROAS (New Customer ROAS)        Target: > [X]×
├── CPMr (Cost per 1,000 Reached)    Trend: ขึ้นหรือลง?
└── Cross-platform spend split        Meta vs Google %

Campaign Level:
├── CPA vs Target                    ±% จาก Benchmark
├── Learning Phase Status            ออกแล้วหรือยัง?
└── Budget Delivery %                ใช้งบครบไหม?

Ad Level:
├── Hook Rate                        > 25%?
├── Hold Rate                        > 40%?
├── Frequency                        < 3.5?
└── oCTR                             > 1%?
```

---

*อ้างอิง: Meta Business Help, Gemini Research 2026, ConversionFactor Framework*
