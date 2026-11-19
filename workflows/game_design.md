# Workflow: สร้างและดีไซน์เกมกิจกรรม (Game v2)
### ConversionFactor MCP · Guided Workflow

> ใช้เมื่อทีมหรือลูกค้าต้องการเกมกิจกรรมบน LINE ที่ตรงกับแบรนด์ หรือส่งรูปดีไซน์มาให้ทำตาม
> เกมเปิดใน LINE (LIFF) ผู้เล่นยืนยันตัวตนด้วย LINE และผลเล่นส่ง event เข้า Meta CAPI / GA4 เหมือนเกมเดิม

---

## 1. ข้อมูลที่ต้องถามลูกค้าก่อนเริ่ม

```
□ campaign ในแอดมิน (ต้องสร้างก่อน — tool ไม่สร้าง campaign) → campaign_id
□ เกมไหน: catch · match · sort · spot · ai_or_real · wheel · pick_side
□ ช่วงวันที่กิจกรรม (activity_start / activity_end)
□ เล่นบน LINE หรือเว็บทั่วไป (play_mode) — LINE ต้องมี LIFF ID ของแบรนด์ · เว็บไม่ต้องมี แต่ไม่มีรางวัลและไม่ส่ง conversion
□ LIFF ID ของแบรนด์ (ถ้าเล่นบน LINE)
□ เล่นได้กี่ครั้ง: 1 ครั้ง หรือเล่นซ้ำเก็บคะแนนดีสุด (plays_per_user 1 / 0)
□ รางวัล: ไม่มี / ได้เมื่อเล่นจบ / ได้เมื่อถึงคะแนน (ลิงก์รางวัลใส่ในหน้าแอดมินเกม คนละ 1 รางวัล)
□ ข้อความเงื่อนไขกิจกรรม (ใช้ข้อความจากลูกค้าเท่านั้น)
□ ฟอร์มเก็บข้อมูล: ช่องอะไรบ้าง และกรอกตอนไหน (ก่อนเล่น / หลังเล่น / พร้อมการเลือก)
□ ลิงก์ปลายทาง (https) เช่นปุ่ม "อ่านรายละเอียด"
□ รูปดีไซน์ / โลโก้ / ภาพหลัก (png, jpeg, webp, gif ไม่เกิน 3MB ต่อรูป)
```

| เกม | เหมาะกับ |
|---|---|
| `catch` Catch Rush | เก็บของที่ใช่ หลบของที่ไม่ใช่ — สื่อข้อดีสินค้า |
| `match` Memory Match | จับคู่การ์ด 8 คู่ — หน้าการ์ดเป็นสินค้า |
| `sort` Sort Rush | แยกหมวด — สอนว่าบริการไหนอยู่กลุ่มไหน |
| `spot` Spot 5 | หาจุดต่าง — ให้คนจ้องภาพแบรนด์นานขึ้น |
| `ai_or_real` จริงหรือ AI? | ทายภาพจริง/AI พร้อมเฉลย |
| `wheel` วงล้อเสี่ยงโชค | หมุนคนละครั้ง รางวัลมีโควตา ระบบตัดสินเอง |
| `pick_side` เลือกทีม | โหวตฝั่ง 2–4 ฝั่ง + เงื่อนไข + ฟอร์ม + ผลโหวต % + ปุ่มไปเว็บของฝั่งนั้น |

---

## 2. ขั้นตอน

1. `list_game_types` → ดู config schema และช่องดีไซน์ของเกมที่เลือก
2. รูปจริงของลูกค้า: `get_game_asset_upload_link` → ส่งลิงก์ให้ผู้ใช้อัปโหลดในแอดมิน (กล่อง "รูปของเกม") → `list_game_assets` เอา `asset_id` · รูปเล็กที่ AI สร้างเองใช้ `upload_game_asset` ได้
3. `create_game` (dry_run ค่าเริ่ม = true) → อ่าน warnings และ diff · แก้จนไม่มีปัญหา
4. `create_game` อีกครั้งด้วย `dry_run: false` → บันทึกเป็น **draft** (ยังไม่ขึ้นจริง)
5. `get_game_preview` → ส่งลิงก์ preview (อายุ 24 ชม.) ให้ทีม/ลูกค้าดูบนมือถือ — โหมดพรีวิวไม่บันทึกผล
6. ปรับด้วย `update_game` (patch: object รวมกัน, array แทนทั้งก้อน, `null` = ลบ) → dry_run ก่อน แล้ว `dry_run: false`
7. `publish_game` dry_run เพื่อดู diff ของ live → **ถามผู้ใช้ยืนยัน** → `publish_game` ด้วย `dry_run: false`

### ทำตามรูปดีไซน์ที่ลูกค้าส่งมา
- สีหลักในรูป → `design.tokens.colors` (primary, secondary, accent, bg, surface, text)
- ฟอนต์ → เลือกที่ใกล้สุด: Kanit, Sarabun, Prompt, Noto Sans Thai, IBM Plex Sans Thai, Mitr, Chakra Petch, Anuphan, Bai Jamjuree
- ภาพจริง (hero, ภาพของแต่ละฝั่ง, โลโก้) → อัปโหลดแล้วใส่ asset_id ใน `design.assets`
- ข้อความทุกปุ่ม/หัวข้อ → `design.texts` · เงื่อนไขกิจกรรม → `design.blocks.terms`
- จัดตำแหน่ง/ขนาด/มุมโค้ง → `design.custom_css` (ใช้ `url()` ได้เฉพาะรูปที่อัปโหลด)

---

## 3. ตัวอย่างเต็ม: แคมเปญออมสิน "เลือกทีม" (`pick_side`)

อัปโหลด 3 รูปก่อน (ภาพหลัก, ภาพทีมกองทุน, ภาพทีมประกัน) แล้วเรียก `create_game`:

```json
{
  "campaign_id": "<campaign_id>",
  "game_type": "pick_side",
  "dry_run": true,
  "config": {
    "play_mode": "line",
    "liff_id": "<LIFF ID ของแบรนด์ หรือ https://liff.line.me/...>",
    "activity_start": "2026-12-01",
    "activity_end": "2026-12-31",
    "options": [
      { "key": "a", "label": "ทีมกองทุน", "color": "#2B4BD8", "cta_label": "คลิกอ่านรายละเอียด", "cta_url": "https://<ลิงก์จากลูกค้า>" },
      { "key": "b", "label": "ทีมประกัน", "color": "#E6007E", "cta_label": "คลิกอ่านรายละเอียด", "cta_url": "https://<ลิงก์จากลูกค้า>" }
    ],
    "consent": { "enabled": true, "version": "v1", "label": "ฉันได้อ่านและรับทราบรายละเอียดเงื่อนไขกิจกรรมเรียบร้อย" },
    "lead_form": {
      "enabled": true,
      "when": "with_choice",
      "fields": [
        { "key": "name", "label": "ชื่อ-นามสกุล", "type": "text", "required": true, "maxLength": 120 },
        { "key": "address", "label": "ที่อยู่", "type": "textarea", "required": true, "maxLength": 300 }
      ]
    }
  },
  "design": {
    "tokens": {
      "colors": { "primary": "#2B4BD8", "secondary": "#E6007E", "accent": "#FFC145", "bg": "#EAF4FF", "surface": "#FFFFFF", "text": "#1A1A2E" },
      "font": { "heading": "Kanit", "body": "Sarabun" },
      "radius": 18
    },
    "assets": {
      "hero": "<asset_id ภาพหลัก>",
      "option_a_hero": "<asset_id ภาพทีมกองทุน>",
      "option_b_hero": "<asset_id ภาพทีมประกัน>"
    },
    "texts": { "title": "วันภาษีนี้ต้องไว เลือกทีม", "subtitle": "ที่ตรงกับเป้าหมายของคุณ!" },
    "blocks": { "terms": "<h3>รายละเอียดเงื่อนไขกิจกรรม</h3><ul><li><ข้อความจากลูกค้า></li></ul>" }
  }
}
```

ผลที่ได้: หน้ายอมรับเงื่อนไข → ภาพหลัก + เลือกทีม + ฟอร์มจัดส่ง → หน้าผลพร้อมภาพของทีม แถบผลโหวต % และปุ่มสีของทีมไปลิงก์ปลายทาง
ผู้เล่น 1 บัญชี LINE เลือกได้ครั้งเดียว เปิดซ้ำจะเห็นผลเดิม · ข้อมูลชื่อ/ที่อยู่เข้ารหัสในระบบ ดาวน์โหลด CSV ได้จากหน้าแอดมินเกม (เฉพาะแอดมินแบรนด์)

---

## 4. Checklist ก่อน Publish

```
□ เกมบน LINE: LIFF ID ถูกแบรนด์ และ LIFF app เปิด scope openid (ไม่มี LIFF ID จะ publish ไม่ได้)
□ ช่วงวันที่กิจกรรมถูกต้อง
□ ลิงก์ปลายทางทุกลิงก์เป็น https และตรงกับที่ลูกค้าให้
□ ข้อความเงื่อนไขและรางวัลมาจากลูกค้า ไม่ได้แต่งเอง
□ ไม่มี warnings ค้างในผล dry_run
□ ลองเล่นจริงบนมือถือใน LINE อย่างน้อย 1 รอบ
□ ผู้ใช้ยืนยันให้ publish แล้ว
```

---

## 5. ข้อจำกัด
- ไม่รองรับ JavaScript ของลูกค้า (ปรับหน้าตาได้ด้วย tokens, รูป, ข้อความ, blocks และ CSS)
- เกมบนเว็บ (`play_mode: "web"`): ผู้เล่นใส่ชื่อเล่นก่อนเล่น ไม่มีรางวัล (ระบบตั้ง `reward.mode` เป็น none) วงล้อเสี่ยงโชคเลือกเว็บไม่ได้ และไม่ส่ง conversion ไปแพลตฟอร์มโฆษณา
- รูปไม่เกิน 3MB ต่อรูป · อัปโหลดผ่านหน้าแอดมิน หรือ base64 สำหรับรูปเล็ก (ไม่ดึงจาก URL)
- เกมที่มีจอ Host บนเวทีแบบสด (Speed Quiz, Vote จอใหญ่, ทายใจ, Date Match) ยังไม่รองรับในเฟสนี้
