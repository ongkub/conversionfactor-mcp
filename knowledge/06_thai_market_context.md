# Knowledge 06: Thai Market Context — LINE Commerce + Chat-to-Buy
### ConversionFactor MCP · AI Reference File

> ตลาดไทยมีพฤติกรรมที่แตกต่างจาก Western Market อย่างมาก
> การ Optimize โดยไม่เข้าใจ Context นี้ = แก้ผิดจุด

---

## 1. ภาพรวมตลาด Digital ไทย 2025–2026

| ตัวเลข | ค่า |
|--------|-----|
| ผู้ใช้อินเทอร์เน็ต | ~67 ล้านคน |
| Social Commerce Penetration | 88% ของผู้ใช้ Online |
| LINE Users | ~56 ล้านคน (82.6% ของผู้ใช้ Internet) |
| Facebook/Instagram Users | ~52+ ล้านคน |
| Mobile-first Shoppers | > 75% ของ Online Shoppers |

**ไทยเป็น Social Commerce Leader ระดับโลก** — คนไทยซื้อของผ่าน Social Media มากกว่าประเทศอื่นในเอเชียตะวันออกเฉียงใต้

---

## 2. พฤติกรรม Chat-to-Buy ที่ไม่พบใน Western Market

### Customer Journey แบบไทย (ไม่ใช่แบบ Western)

**Western Model (จบบน Web):**
```
Facebook Ad → Landing Page → Add to Cart → Checkout → Purchase ✅
```

**Thai Model (ผ่าน LINE):**
```
Facebook Ad → Landing Page → ทักไลน์ → พูดคุย → โอนเงิน ✅
หรือ
Facebook Ad → ทักหา Inbox → ถามราคา → โอนเงิน ✅
```

### ทำไมคนไทยชอบ Chat ก่อนซื้อ?
1. **ต้องการยืนยันว่าเป็นของจริง** — Scam มีเยอะ ทักถามเพื่อ Trust
2. **ต้องการราคาพิเศษ/ต่อรอง** — "มีโปรโมชั่นอะไรเพิ่มไหม?"
3. **ต้องการ Personalization** — ถามขนาด สี สต็อก
4. **ไม่สะดวก Payment Gateway** — โอนผ่าน PromptPay ง่ายกว่า
5. **ชอบ Human Touch** — ไว้ใจคนมากกว่าระบบ Auto

---

## 3. ผลกระทบต่อ Conversion Tracking

### ปัญหาหลัก: Broken Attribution
```
Facebook Pixel เห็น:
Ad Click → Landing Page Visit → [หายไป] → [ไม่รู้ว่า Convert หรือเปล่า]

ความจริงคือ:
Ad Click → LINE → Chat → โอนเงิน → ซื้อแล้ว! แต่ Meta ไม่รู้
```

**ผล:**
- Reported ROAS ต่ำกว่าความเป็นจริง (เพราะ Conversion ไม่ถูก Track)
- Algorithm เรียนรู้ผิด — คิดว่า Ad ไม่ Work
- Campaign ถูก Pause ทั้งที่จริงๆ ทำเงินได้

### ConversionFactor แก้ปัญหานี้:
```
preclick URL บันทึก fbclid
  → User ทัก LINE (จับ LINE UID + fbclid คู่กัน)
    → Sale ปิดได้ (ส่ง Purchase Event ผ่าน CAPI + fbclid)
      → Meta รู้ว่า Ad นั้น Convert จริง ✅
```

**นี่คือ Unique Value ของ ConversionFactor ที่ Native Facebook MCP ทำไม่ได้**

---

## 4. LINE Ecosystem ที่สำคัญ

### LINE Official Account (LINE OA)
- เป็น Primary CRM channel ของธุรกิจไทย
- Broadcast messages ไปหา Followers
- Chat 1:1 กับลูกค้า
- Rich menu, Flex Message, LIFF apps

### LINE Ads
- สามารถยิงโฆษณาไปยัง LINE users
- Objective หลัก: LINE Follows (เพิ่ม Follower), Traffic, Awareness
- ConversionFactor มี LINE Ads MCP แยกอยู่แล้ว (`line-ads-mcp`)

### LIFF (LINE Front-end Framework)
- Mini web app ที่รันใน LINE App
- ใช้สำหรับ: Form กรอก, เก็บข้อมูล, Payment, Games
- ดีกว่า External Website เพราะ: โหลดเร็ว, ไม่ต้อง Re-login, ไว้ใจได้

### LINE Pay / PromptPay
- Payment method หลักของลูกค้า LINE
- Integration กับ LINE OA ทำให้ปิดการขายใน Platform ได้เลย

---

## 5. แผน Audience สำหรับตลาดไทย

### Audience Sizing สำหรับ Thailand
| ขนาด Campaign | Target Audience ที่แนะนำ |
|--------------|------------------------|
| Budget < 10,000 บาท/เดือน | 500K–2M คน |
| Budget 10K–50K บาท/เดือน | 1M–5M คน |
| Budget > 50K บาท/เดือน | 3M+ คน หรือ Broad |

### Platform Breakdown ที่ใช้ได้ในไทย
**Facebook/Instagram:**
- ดีสำหรับ: E-commerce, Brand Awareness, Lead Gen, B2C ทุกประเภท
- Peak time: 18:00–22:00 น. (Scroll หลังเลิกงาน)
- Creative ที่ work: Video ภาษาไทย, UGC Style, Before/After

**TikTok:**
- ดีสำหรับ: Gen Z, Lifestyle, Beauty, Food, Entertainment
- Hook ต้องเร็วมาก (< 2 วิ)
- Sound-on format สำคัญมาก

**LINE:**
- ดีสำหรับ: Retention, Re-engagement, Local Business
- เหมาะ: Voucher Broadcast, Appointment Reminder, Flash Sale

---

## 6. Thai Consumer Psychology: สิ่งที่ drive Conversion

### ปัจจัยที่ทำให้คนไทยซื้อ:
1. **ราคา + ส่วนลด** — "ลดราคา X%, ของแถม, ส่งฟรี" ยังได้ผลดีมาก
2. **Social Proof หนักๆ** — "10,000+ รีวิว", ดาราใช้, Influencer recommend
3. **ความเร่งด่วน** — "เหลือ 2 ชั่วโมง", "สต็อกเหลือ 5 ชิ้น"
4. **ความไว้ใจ** — ร้านมี OA, มีรีวิวใน Facebook Page, มี Shopee/Lazada
5. **ความสะดวก** — "ทักมา LINE ได้เลย", "รับที่บ้าน"
6. **FOMO (Fear of Missing Out)** — Flash Sale, Limited Edition

### ภาษาและ Tone ที่ Work ในไทย:
- ใช้ภาษาสบายๆ ไม่เป็นทางการ (ยกเว้น B2B หรือ Luxury)
- Emoji ช่วยเพิ่ม Engagement ใน Caption
- ใช้คำไทยที่คนพูดจริง ไม่ใช่ภาษา Corporate
- Testimonial จาก "คนธรรมดา" ดีกว่า Formal spokesperson

---

## 7. KPI ที่ต้องปรับสำหรับตลาดไทย

### ปรับ Attribution Window
ลูกค้าไทยมักใช้เวลา "คิด" นานกว่าก่อนซื้อ โดยเฉพาะสินค้าราคาสูง

แนะนำ Attribution: **7-day click + 1-day view** (ไม่ใช่ 1-day click)

### Benchmark CPA สำหรับไทย (ประมาณ)
| ประเภทธุรกิจ | CPA Range |
|------------|----------|
| E-commerce (Fashion/Beauty) | 150–500 บาท |
| E-commerce (Electronics) | 500–2,000 บาท |
| Insurance/Financial | 500–3,000 บาท |
| Real Estate Lead | 1,000–5,000 บาท |
| LINE Follow | 10–50 บาท |
| App Install | 30–150 บาท |

*ขึ้นอยู่กับ Industry, Audience, และ Creative Quality อย่างมาก*

### Cross-Platform Attribution ที่ถูกต้องสำหรับไทย
```
แทนที่จะดู:
"Meta ROAS = 3.2×"

ควรดู:
"Meta Ad Spend → LINE Follows → Purchase Events (via CAPI)
= True ROAS ที่นับ Conversion บน LINE ด้วย"
```

---

## 8. Common Mistakes ที่คนไทยมักเจอ

1. **ปิด Campaign เพราะ ROAS ต่ำ** แต่จริงๆ Conversion ผ่าน LINE ไม่ถูก Track
2. **Optimize สำหรับ Link Click** แทนที่จะเป็น Lead หรือ Messenger
3. **ไม่ทำ LINE Follow Campaign** ทั้งที่ LINE คือ Retention channel ที่ ROI สูงสุด
4. **ใช้ภาษา Formal เกินไป** ทำให้ไม่ Connect กับ Audience
5. **ไม่ใส่ PromptPay/LINE Pay** เป็น Payment Option ทำให้ Checkout ลำบาก
6. **ไม่ส่ง Offline Conversion กลับ Meta** ทำให้ Algorithm เรียนรู้ผิด

---

*อ้างอิง: Thailand Digital Stat 2025, Datareportal, LINE Business, Gemini Research 2026*
