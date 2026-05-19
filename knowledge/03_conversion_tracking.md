# Knowledge 03: Conversion Tracking — Pixel + CAPI + Deduplication
### ConversionFactor MCP · AI Reference File

> หัวใจของ AI Optimization คือ **คุณภาพของ Conversion Signal** ที่ส่งให้ Meta
> ถ้าส่งข้อมูลผิด AI เรียนรู้ผิด → แคมเปญพัง

---

## 1. ทำไม Conversion Tracking ถึงสำคัญที่สุด

```
Meta AI เรียนรู้จาก Conversion Signal ที่คุณส่งให้
Signal ดี → AI หาคนที่ Convert ได้ → CPA ถูกลง
Signal แย่ → AI งง → ยิงโฆษณาไปให้คนที่ไม่ Convert → เสียเงินฟรี
```

ตัวอย่าง:
- ถ้า Optimize สำหรับ "Link Click" → AI ส่งโฆษณาไปให้คนที่ชอบคลิก (ไม่ใช่ซื้อ)
- ถ้า Optimize สำหรับ "Purchase" → AI ส่งโฆษณาไปให้คนที่มีแนวโน้มซื้อ

**กฎ: เลือก Conversion Event ที่ใกล้ "เงิน" ที่สุด ที่ยังมี Volume เพียงพอ**

---

## 2. 3 ชั้นของ Conversion Tracking

### ชั้น 1: Meta Pixel (Browser-Side)
ติดตาม User action บนเว็บไซต์ผ่าน JavaScript ใน Browser

**Standard Events ที่ต้องติดตั้ง:**
| Event | เมื่อไหร | ความสำคัญ |
|-------|--------|---------|
| `PageView` | ทุกหน้า | พื้นฐาน |
| `ViewContent` | ดูหน้าสินค้า/บริการ | Warm Signal |
| `AddToCart` | เพิ่มสินค้าใน Cart | Strong Signal |
| `InitiateCheckout` | เริ่มชำระเงิน | Very Strong |
| `Purchase` | ซื้อสำเร็จ | **สำคัญที่สุด** |
| `Lead` | กรอก Form สำเร็จ | สำคัญสำหรับ Lead Gen |
| `CompleteRegistration` | สมัครสมาชิก | Awareness → Acquisition |

**ข้อจำกัดหลัง iOS 14+:**
- Safari และ Firefox บล็อก 3rd-party cookies
- Ad Blockers ทำให้ Pixel ไม่ทำงาน
- ข้อมูลสูญหาย 15–40% ขึ้นอยู่กับ Traffic source

### ชั้น 2: Conversions API — CAPI (Server-Side)
ส่งข้อมูล Conversion จาก Server ของคุณตรงไปยัง Meta Server

**ทำไม CAPI จึงสำคัญ:**
- ไม่โดนบล็อกจาก Ad Blocker
- ไม่ถูกจำกัดจาก iOS Privacy
- ส่งข้อมูลที่ Browser ส่งไม่ได้: เช่น ยอดขายจาก Call Center, LINE

**ConversionFactor ใช้ CAPI อยู่แล้วผ่าน `meta-capi.ts`**
- รองรับ flow: Ad Click → LINE Follow → Purchase event ส่งกลับ Meta
- นี่คือ Competitive Advantage ของ ConversionFactor เพราะ native Facebook MCP ไม่เห็นข้อมูลนี้

### ชั้น 3: Offline Conversion
สำหรับธุรกิจที่ปิดการขายนอกออนไลน์

- Lead มาจาก Form บน Facebook
- แต่ปิดการขายผ่านโทรศัพท์หรือ Sales Team
- ต้องส่งข้อมูล "ปิดการขายสำเร็จ" กลับให้ Meta เพื่อให้ AI เรียนรู้จาก Revenue จริง

---

## 3. Proxy Metric: เมื่อ Conversion ยังน้อยเกินไป

Meta Algorithm ต้องการ **อย่างน้อย 50 Conversions ต่อสัปดาห์** ต่อ Ad Set เพื่อออกจาก Learning Phase

ถ้ายังไม่ถึง ให้ใช้ Proxy Metric ที่ใกล้ End Result มากที่สุด:

```
Purchase                 ← ที่ดีที่สุด (ถ้ามี volume)
  ↑
Initiate Checkout        ← ดีมาก (ใกล้ Purchase)
  ↑
Add to Cart              ← ดี
  ↑
Landing Page View        ← ใช้ได้ (แต่ตรวจ Quality)
  ↑
Link Click               ← หลีกเลี่ยง ถ้าทำได้
```

**กฎ:** เลือก Event ที่ Volume มากกว่า 50/สัปดาห์ โดยอยู่ใกล้ Purchase มากที่สุด

---

## 4. Event Match Quality (EMQ)

คะแนน 0–10 ที่บอกว่า Meta จับคู่ Conversion กับ User ได้แม่นแค่ไหน

**EMQ สูง = Attribution แม่น = AI เรียนรู้ดีขึ้น**

| คะแนน | ความหมาย |
|-------|---------|
| 0–5 | ต่ำมาก — ขาดข้อมูลสำคัญ |
| 6–7 | พอใช้ |
| 8–10 | ดีมาก |

**ข้อมูลที่ช่วยเพิ่ม EMQ:**
```
อีเมล (Email)           → ยิ่งมาก ยิ่งดี
เบอร์โทร (Phone)        → ควรมี
ชื่อ-นามสกุล           → มีก็ดี
วันเกิด                → optional
IP Address             → ควรส่งทุกครั้ง
User Agent             → ควรส่งทุกครั้ง
External ID            → ใช้ Customer ID ของคุณ
```

**วิธีตรวจ EMQ:** Meta Events Manager → เลือก Dataset → ดู "Match Quality" column

---

## 5. Deduplication — จุดที่คนมักพลาด

**ปัญหา:** ถ้าใช้ Pixel + CAPI พร้อมกัน Event เดียวกันจะถูกส่ง 2 ครั้ง
→ Meta นับ Conversion เบิ้ล
→ ROAS ดูดีเกินจริง
→ AI เรียนรู้จากข้อมูลผิด

**วิธีแก้:** ใช้ `event_id` เดียวกัน ทั้งฝั่ง Pixel และ CAPI

```javascript
// Pixel (Browser)
fbq('track', 'Purchase', {
  value: 1500,
  currency: 'THB'
}, {
  eventID: 'purchase_order_12345'  // ← ID เดียวกัน
});

// CAPI (Server)
{
  "event_name": "Purchase",
  "event_id": "purchase_order_12345",  // ← ต้องตรงกัน
  "event_time": 1234567890,
  ...
}
```

Meta จะ Deduplicate ภายใน 48 ชั่วโมง ถ้า `event_id` และ `event_name` ตรงกัน

**ตรวจสอบ:** Meta Events Manager → Test Events → ดู "Deduplicated Events" label

---

## 6. Data Hashing (SHA-256)

ข้อมูลส่วนบุคคลทั้งหมดที่ส่งผ่าน CAPI ต้องเข้ารหัสด้วย SHA-256

**ขั้นตอนก่อน Hash:**
1. แปลงเป็น lowercase ทั้งหมด
2. ลบ space หัวท้าย (trim)
3. ลบ character พิเศษ (เบอร์โทร: เหลือแค่ตัวเลข + country code)

```
email: "User@Gmail.com" → "user@gmail.com" → SHA256 hash
phone: "+66 081-234-5678" → "66812345678" → SHA256 hash
```

**ถ้า Hash ผิด → Meta ปฏิเสธข้อมูลทั้งชุด → EMQ ต่ำ**

---

## 7. ConversionFactor ช่วยแก้ปัญหาอะไร

### ปัญหาที่ Native Facebook MCP แก้ไม่ได้:
```
Ad Click → LINE Follow → Purchase (ซื้อผ่าน LINE)
          (Meta ไม่เห็นตรงนี้)     (Meta ไม่รู้ว่ามาจาก Ad ไหน)
```

### ConversionFactor แก้ได้:
```
Ad Click (preclick URL บันทึก fbclid)
  → LINE Follow (จับคู่ fbclid กับ LINE UID)
    → Purchase Event (ส่งกลับ Meta CAPI พร้อม fbclid + UID)
```

→ Meta เห็น Full Attribution Chain
→ AI เรียนรู้ว่า "Ad นี้ทำให้คนซื้อผ่าน LINE"
→ ROAS แม่นขึ้น, AI Optimize ได้ดีขึ้น

---

## 8. Checklist: Conversion Tracking สมบูรณ์แล้วหรือยัง?

- [ ] Pixel ติดตั้งบนทุกหน้าและ Fire ครบ Events
- [ ] Test Events ผ่านใน Meta Events Manager (ไม่มี Error)
- [ ] CAPI ทำงาน (Server-side events ปรากฏใน Events Manager)
- [ ] EMQ >= 7.0 ทุก Event
- [ ] `event_id` ตรงกันระหว่าง Pixel และ CAPI (Deduplication ทำงาน)
- [ ] SHA-256 Hashing ถูกต้อง (ตรวจจาก Events Manager)
- [ ] Campaign Optimize สำหรับ Event ที่ใกล้ "Purchase" มากที่สุด
- [ ] มี > 50 Conversions/สัปดาห์ ต่อ Ad Set (ถ้าไม่ถึง ใช้ Proxy Metric)
- [ ] สำหรับ LINE Commerce: fbclid ถูก pass ผ่าน preclick URL

---

*อ้างอิง: Meta Business Help Center, Gemini Research 2026, ConversionFactor CAPI Implementation*
