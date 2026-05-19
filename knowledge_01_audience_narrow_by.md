# Audience Narrow-By Strategy
### knowledge/01_audience_narrow_by.md

> Knowledge file นี้ใช้สำหรับ AI อ้างอิงเมื่อวิเคราะห์หรือสร้าง Audience Plan

---

## 1. OR vs AND — ความแตกต่างที่สำคัญที่สุด

### OR Logic (ค่า default ของ Facebook)
เมื่อใส่ Interest หลายอันในช่องเดียว Facebook จะหาคนที่ตรงกับ **อย่างใดอย่างหนึ่ง**:
```
Interest: Photography, Sony, Camera equipment
→ คนที่ชอบ Photography OR ชอบ Sony OR ชอบ Camera equipment
→ รวมถึงคนที่ชอบ Sony แต่ไม่สนใจกล้องเลย (ชอบ Sony TV หรือ Sony Headphones)
```
ผลลัพธ์: Audience ใหญ่, Quality ต่ำ เพราะ Signal เจือจาง

### AND Logic (Narrow By)
ใช้ฟีเจอร์ "Narrow audience" ใน Ads Manager เพิ่ม Layer ด้วย AND:
```
Layer 1: Photography OR Camera equipment
AND
Layer 2: Sony Alpha OR Mirrorless camera OR Photography Magazine
→ ได้คนที่ (สนใจ Photography หรือ Camera) พร้อมกับ (สนใจ Sony Alpha หรือ Mirrorless)
→ Signal แน่นกว่ามาก, คนใน audience นี้มีแนวโน้มสนใจกล้อง Mirrorless จริงๆ
```

---

## 2. กฎการออกแบบ Narrow-By Layers

### กฎที่ 1: Layer ไม่เกิน 3 ชั้น (ในตลาดไทย)
- Thailand มี Facebook users ~56 ล้านคน
- แต่ Active users ที่มี data ครบ ~30–40 ล้านคน
- Narrow By 3 layers จะเหลือ Audience ~500K–3M (ขึ้นอยู่กับ product)
- ถ้า Narrow เกิน 3 layers มักจะเหลือ <100K → ไม่เพียงพอสำหรับ Learning Phase

### กฎที่ 2: Layer แต่ละชั้นมีบทบาทชัดเจน

| Layer | บทบาท | ตัวอย่าง |
|---|---|---|
| **Layer 1 (Core Interest)** | Define กลุ่มหลัก (กว้างพอ) | Photography, Automotive, Health & Fitness |
| **Layer 2 (Qualifying Signal)** | กรองคุณสมบัติเพิ่ม (ด้าน wealth, profession, behavior) | High income, Business owner, Frequent traveler |
| **Layer 3 (Intent Signal)** | สัญญาณพร้อมซื้อ | Online shoppers, Engaged shoppers (Behavior) |

### กฎที่ 3: OR ภายใน Layer ต้องกว้างพอ
แต่ละ Layer ควรมี Interest/Behavior อย่างน้อย 3–8 อัน เพื่อให้มีพื้นที่เพียงพอ:
```
Layer 2 — Wealth Signals:
✅ ดี: Private banking, Investment behavior, Frequent international traveler,
        Small business owner, Business executive, Luxury goods (7 items)

❌ แคบเกินไป: Private banking เท่านั้น (1 item → Audience อาจ <50K ใน TH)
```

### กฎที่ 4: Behavior > Interest เมื่อต้องการ Purchase Intent
Facebook Behaviors มีข้อมูลที่แม่นกว่า Interest มาก:
- **Engaged Shoppers** = คนที่คลิก "Shop Now" ใน 7 วันที่ผ่านมา
- **Frequent international traveler** = มีพฤติกรรม travel จริง (จาก mobile data)
- **Small business owner** = Facebook ดึงจากข้อมูล Page + LinkedIn cross-ref

---

## 3. กฎ 5–15x Audience Size

```
Target Reach (คนที่ต้องการเข้าถึง/เดือน) × 5  = Audience ขนาดต่ำสุด
Target Reach                                × 15 = Audience ขนาดสูงสุดที่ดี
```

**ตัวอย่างการคำนวณ:**
```
Budget: 50,000 บาท/เดือน
CPM เฉลี่ย: 100 บาท (TH market)
Impressions: 500,000 impressions/เดือน
Estimated Reach (Frequency 2.5): 500,000 / 2.5 = 200,000 คน

Audience ที่เหมาะสม:
- Min: 200,000 × 5  = 1,000,000 คน
- Max: 200,000 × 15 = 3,000,000 คน
→ ควรตั้ง Audience ที่ 1M–3M คน
```

**ถ้า Audience น้อยกว่า 5x:**
- Ad Fatigue เร็ว (Frequency พุ่งในสัปดาห์แรก)
- CPM สูงขึ้นเพราะ competition ใน audience pool นี้สูง
- แนะนำ: เพิ่ม Interest ใน Layer 1, ลด Narrow layers, หรือขยาย Geography

**ถ้า Audience กว้างกว่า 15x:**
- Algorithm มีพื้นที่มากพอ แต่อาจเสียงบกับคนที่ไม่ใช่ target
- แนะนำ: เพิ่ม Narrow Layer, หรือใช้ Advantage+ Audience แทน

---

## 4. Audience Types และเมื่อไหรใช้อะไร

### 4.1 Core Audience + Narrow-By
**ใช้เมื่อ:** Cold Prospecting ที่มี specific ICP (Ideal Customer Profile)
**ข้อดี:** ควบคุม signal ได้ด้วยตัวเอง
**ข้อเสีย:** ต้องอาศัยความรู้เรื่อง Interest ของ target

```
Best for: B2B, Luxury, Niche products, Specific demographics
```

### 4.2 Lookalike Audience
**ใช้เมื่อ:** มี Custom Audience ที่มีคุณภาพ (Purchasers, High-value customers)
**ข้อดี:** AI หาคนคล้ายๆ กับลูกค้าจริงโดยไม่ต้องรู้ว่า Interest คืออะไร
**ข้อเสีย:** ต้องมี Seed Audience ที่ดีและมีขนาดพอ (อย่างน้อย 100–1,000 คน)

```
Priority of Seed (จากดีสุดไปน้อยสุด):
1. Past Purchasers (Best)
2. High-value customers (LTV top 25%)
3. Initiate Checkout
4. Add to Cart
5. Website Visitors (ไม่แนะนำถ้า traffic quality ต่ำ)
```

**% Lookalike:**
- 1% → เล็ก (~500K–800K ใน TH), แม่นที่สุด, เหมาะ Testing
- 2–5% → กลาง, เหมาะ Scaling
- 6–10% → ใหญ่, แม่นน้อยกว่า, เหมาะตอน budget สูงและ Frequency ชนเพดาน

### 4.3 Advantage+ Audience (Meta AI)
**ใช้เมื่อ:** มี Conversion Data เพียงพอ (>50 Purchase/สัปดาห์)
**ข้อดี:** Meta AI จัดการทุกอย่าง, มักให้ ROAS ดีกว่า Manual 15–22%
**ข้อเสีย:** ควบคุมได้น้อย, ต้องมีข้อมูลมากพอ

```
Recommended Setup:
- ใส่ "Audience Suggestion" เป็น hint (AI จะพิจารณา แต่ไม่ lock)
- เปิด Advantage+ Creative ควบคู่
- ดู Audience Breakdown เพื่อ monitor ว่า AI ยิงไปกลุ่มไหน
```

### 4.4 Custom Audience (Retargeting)
**ใช้เมื่อ:** มีคนที่เคย interact แล้ว (Warm/Hot Audience)
**ข้อดี:** Intent สูงสุด, Conversion Rate ดีที่สุด
**ข้อเสีย:** Audience เล็ก (ขึ้นอยู่กับ traffic volume)

```
Retargeting Stack (จาก Hot → Warm):
1. Abandoned Cart (7 วัน) → โชว์ urgency, discount
2. Initiate Checkout (14 วัน) → reinforce offer
3. View Content / Add to Cart (30 วัน) → social proof, comparison
4. Website Visitors All (60 วัน) → awareness + trust
5. Video Viewers 75%+ (90 วัน) → engaged users
```

---

## 5. Interest Research Process

**ขั้นตอนหา Interest ที่ดี:**

1. **Facebook Audience Insights** (ถ้ายังมีใน account)
   - ดูว่า Page fans ของ competitor มี overlap กับ Interest อะไร

2. **Meta Ad Library Analysis**
   - ดู ads ของ competitor ที่รันมานาน (>90 วัน = profitable)
   - ถอดรหัสว่าพวกเขา target ใคร

3. **AI Prompt สำหรับ Interest Research:**
   ```
   ธุรกิจ: [ระบุ]
   ICP: [ระบุ]
   
   ช่วยแนะนำ Facebook Interest และ Behavior ที่เหมาะสม แบ่งเป็น 3 groups:
   - Group 1: Core Interest ที่กว้างที่สุด (ยังตรงกลุ่ม)
   - Group 2: Qualifying Signal (ด้าน wealth/profession/behavior)
   - Group 3: Purchase Intent Signal
   
   สำหรับแต่ละ group ให้ระบุ Interest/Behavior ที่ Available ใน Facebook อย่างน้อย 5 อัน
   ```

4. **Validate ใน Ads Manager:**
   - พิมพ์ Interest ที่ AI แนะนำในช่อง Detailed Targeting
   - ตรวจว่า Available ใน TH หรือไม่ (บาง Interest ไม่มีใน TH market)
   - ดู Audience size estimate ทันทีที่ใส่แต่ละ Layer

---

## 6. Common Mistakes ที่ต้องหลีกเลี่ยง

### ❌ Mistake 1: ใส่ Interest ทุกอย่างที่เกี่ยวข้องใน Layer เดียว
```
ตัวอย่างผิด: ขายอาหารเสริม → ใส่ Interest 30+ อัน ใน 1 Layer (หมด OR)
→ Audience 10M+ คน, ไม่ filter ใคร, CPM ถูกแต่ Conversion ต่ำ
```

### ❌ Mistake 2: Narrow โดยไม่ดู Estimated Size
```
ผิด: Narrow 3 Layers แล้ว Audience เหลือ 50K ใน TH
→ Meta Learning Phase ต้องการ 50 Conversions/week = ต้องการ Audience ที่มากกว่านี้
→ CPM พุ่ง เพราะ competition สูงมากในกลุ่มเล็ก
```

### ❌ Mistake 3: ใช้ Interest ที่ Overlap กันมากเกินไปใน Layer เดียว
```
ผิด: Layer 1: Photography, Camera, Canon, Nikon, Sony, Fujifilm, Olympus
→ ทุกคนที่ชอบ Photography อยู่ใน interest เหล่านี้อยู่แล้ว
→ การเพิ่มหลาย Brand เพิ่ม OR แต่ไม่ได้เพิ่ม Quality
ควร: เอา Brand interests ไว้ใน Layer 2 เพื่อ AND กับ Layer 1
```

### ❌ Mistake 4: ไม่มี Retargeting Campaign แยก
```
ผิด: ใส่ Retargeting Custom Audience รวมกับ Prospecting Audience
→ Budget ถูกกิน inconsistently, ไม่รู้ว่า Prospecting ทำงานได้ดีแค่ไหน
ควร: แยก Campaign ให้ชัด: Prospecting | Retargeting | Loyalty
```

---

## 7. Audience Plan Template

ทุกครั้งที่สร้าง Audience ให้ output ในรูปแบบนี้:

```
## Audience Plan: [Campaign Name]

Business: [ระบุ]
End Result: [Purchase / Lead / Install]
Monthly Budget: [THB]
Target Reach: [จำนวนคน/เดือน]
Required Audience Size: [5x] – [15x] = [Min] – [Max] คน

---

Layer 1 — [ชื่อ Group] (OR within)
├── [Interest/Behavior 1]
├── [Interest/Behavior 2]
├── [Interest/Behavior 3]
└── [Interest/Behavior 4]

AND Narrow By Layer 2 — [ชื่อ Group] (OR within)
├── [Interest/Behavior 1]
├── [Interest/Behavior 2]
└── [Interest/Behavior 3]

AND Narrow By Layer 3 — [ชื่อ Group] (OR within) [optional]
├── [Behavior 1]
└── [Behavior 2]

---
Demographics: อายุ [x–y], เพศ [ทั้งหมด/ชาย/หญิง], ที่อยู่ [จังหวัด/ประเทศ]
Estimated Audience Size: [X,XXX,XXX – X,XXX,XXX]
Size Ratio: [X.Xx] → [✅ Good / ⚠️ Too narrow / ⚠️ Too broad]
Recommendation: [สิ่งที่ควรทำ]
```

---

*ไฟล์นี้เป็นส่วนหนึ่งของ fb-ads-mcp knowledge base*
*อ้างอิง: Meta Ads Help Center, Performance Marketing research 2025–2026*
