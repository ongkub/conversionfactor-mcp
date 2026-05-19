# Knowledge 04: Landing Page & Post-Click Analysis (CRO)
### ConversionFactor MCP · AI Reference File

> โฆษณาดีแค่ไหนก็ตาม ถ้า Landing Page ห่วย = เสียเงินฟรี
> ทุกวินาทีที่หน้าโหลดช้า = Conversion Rate ลดลง 7–10%

---

## 1. ทำไม Post-Click Analysis ถึงสำคัญ

**อาการที่บ่งชี้ว่าปัญหาอยู่ที่ Landing Page:**
```
Hook Rate > 35% ✅ Creative ดี
oCTR > 1.5% ✅ คลิกมา
Bounce Rate > 80% ❌ แต่หนีไปทันที
CVR ≈ 0% ❌ ไม่มี Conversion
```

กรณีนี้: อย่าแก้ Creative — ไปแก้ Landing Page ก่อน

**จากงานวิจัย:** ถ้า Bounce Rate > 90% บน Paid Traffic นั่นหมายความว่าทุกคลิกที่จ่ายไปคือเสียเงินเปล่า

---

## 2. Message Match: กฎที่สำคัญที่สุด

**หลักการ:** คนที่คลิก Ad ต้องเจอข้อความเดิมบน Landing Page ภายใน 5 วินาที

**ถ้าไม่ match:**
- คนรู้สึกว่า "มาผิดที่" หรือ "โดนหลอก"
- Bounce ทันที
- Meta Quality Score ลดลง → CPM แพงขึ้น

**ตัวอย่าง:**
```
Ad: "ลดน้ำหนัก 5 กิโลใน 30 วัน โดยไม่อด"
Landing Page H1: "ยินดีต้อนรับสู่เว็บไซต์สุขภาพของเรา" ❌

Ad: "ลดน้ำหนัก 5 กิโลใน 30 วัน โดยไม่อด"
Landing Page H1: "โปรแกรมลดน้ำหนัก 30 วัน ไม่ต้องอด รับประกันผล 5 กิโล" ✅
```

---

## 3. CRO Checklist (ตรวจทีละข้อ)

### Performance
- [ ] Load Time < 3 วินาที (ตรวจด้วย PageSpeed Insights)
- [ ] Mobile-Responsive บนทุกขนาดจอ
- [ ] ไม่มี Pop-up รบกวนทันทีที่เข้าหน้า
- [ ] ไม่มี Error 404, Broken Images

### Message Match
- [ ] H1 หรือ Hero Text สอดคล้องกับ Ad Copy
- [ ] Visual/Image สอดคล้องกับ Ad Visual
- [ ] Offer ที่โฆษณาสัญญาปรากฏชัดเจนบนหน้า
- [ ] Tone of Voice ตรงกัน (ถ้า Ad ใช้ภาษาสบายๆ หน้าก็ต้องสบายๆ)

### Above the Fold (สิ่งที่เห็นโดยไม่ต้อง scroll)
- [ ] CTA Button มองเห็นได้ชัดเจน
- [ ] Headline บอกได้ทันทีว่าหน้านี้คือ/ให้อะไร
- [ ] Value Proposition ชัดเจนใน 5 วินาที

### Friction Reduction
- [ ] Form สั้น — เหลือเฉพาะ field ที่จำเป็น
- [ ] ไม่มี Navigation Menu ที่ทำให้คนหนีออกไป (สำหรับ Landing Page เฉพาะ)
- [ ] ลิงก์ภายนอกน้อยที่สุด (อย่าให้คนออกก่อน Convert)

### Trust Signals
- [ ] รีวิว/Rating จากลูกค้าจริง
- [ ] จำนวนลูกค้าที่ใช้แล้ว (Social Proof)
- [ ] โลโก้แบรนด์พาร์ทเนอร์ หรือ Media Mentions
- [ ] การรับประกัน/คืนเงิน
- [ ] ใบรับรอง/รางวัล (ถ้ามี)

### Conversion Action
- [ ] Form กรอกง่าย ไม่มี Confusion
- [ ] ปุ่ม CTA มีสีตัดกับ Background
- [ ] CTA Text บอกชัดว่าจะเกิดอะไรขึ้น ("รับฟรีทันที" ดีกว่า "Submit")
- [ ] มี CTA ซ้ำที่ท้ายหน้า (ถ้าหน้ายาว)

---

## 4. เครื่องมือวิเคราะห์ Post-Click

| เครื่องมือ | ใช้ทำอะไร |
|-----------|---------|
| **Google Analytics 4 (GA4)** | Bounce Rate, CVR, Funnel Analysis, Session Source |
| **Hotjar** | Heatmap, Session Recording, Scroll Depth |
| **Microsoft Clarity** | ฟรี! Heatmap + Session Recording คล้าย Hotjar |
| **Google PageSpeed Insights** | วัด Load Time + Core Web Vitals |

### วิธีหา Leak ด้วย GA4 Exploration:
1. สร้าง Exploration Report
2. Dimensions: `Landing page`, `Session medium`, `Device category`
3. Metrics: `Sessions`, `Session conversion rate`, `Bounce rate`
4. Filter: Paid channels เท่านั้น
5. ดูว่า Landing Page ไหน Bounce Rate > 80% + CVR ≈ 0%

---

## 5. Instant Experience: ทางเลือกสำหรับ Mobile

**เมื่อไหรควรใช้ Instant Experience (Canvas):**
- สินค้าที่ต้องการ Visual Storytelling (แฟชั่น, ความงาม, อาหาร, ท่องเที่ยว)
- Audience เป็น Mobile เป็นหลัก
- ต้องการ Discover Product มากกว่า Convert ทันที

**ข้อดี:**
- โหลดเร็วกว่า External Web (Preloaded ใน Platform)
- Engagement สูงกว่า 10–25% สำหรับ Discover
- ลด Friction จาก App-switching (ไม่ต้องออก Facebook)

**ข้อเสีย:**
- ติด Pixel ยาก
- ไม่เหมาะสำหรับ Form หรือ Purchase ที่ซับซ้อน

---

## 6. Speed Optimization Tips

**ถ้า Load Time > 3 วินาที:**
1. บีบอัด Image ให้ < 100KB ต่อภาพ (ใช้ WebP format)
2. ใช้ Lazy Loading สำหรับ Image ด้านล่างหน้า
3. ลด JavaScript ที่ไม่จำเป็น (โดยเฉพาะ Third-party scripts)
4. ใช้ CDN สำหรับ Asset delivery
5. ตรวจ Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## 7. Mobile vs Desktop: สิ่งที่ต้องตรวจต่างกัน

| ด้าน | Mobile Check | Desktop Check |
|------|-------------|--------------|
| Form | Keyboard type (tel, email) ถูกต้อง? | Tab order สมเหตุสมผล? |
| CTA | ขนาดปุ่ม > 44px (Tap target) | Hover state ชัดเจน? |
| Image | Crop สวยบน 375px? | ไม่ pixelated บน Retina? |
| Speed | < 3s on 4G | < 2s |
| Text | ขนาด > 16px (ไม่ต้อง Pinch Zoom) | Readable line width |

---

## 8. Diagnostic: อาการ → วิธีแก้

| อาการ | สาเหตุที่เป็นไปได้ | Action |
|-------|-----------------|--------|
| Bounce Rate > 90% บน Paid | Message Mismatch หรือ โหลดช้า | ตรวจ Message Match + Page Speed |
| CVR ต่ำ แต่ Session Time ดี | CTA ไม่ชัด หรือ Form ซับซ้อน | ลด Form fields, ทำ CTA เด่นขึ้น |
| Mobile CVR << Desktop CVR | Mobile UX มีปัญหา | ตรวจ Mobile CRO checklist |
| High CPC + Low CVR | Audience ไม่ตรง หรือ Offer ไม่ match | ตรวจ Audience + Landing Page Offer |
| Form Abandon Rate สูง | Form ยาวเกิน หรือ Field ไม่เหมาะ | Heatmap + Session Recording |

---

*อ้างอิง: Google PageSpeed, Hotjar Research, Meta Business Help, Gemini Research 2026*
