# Messenger Lead Scoring
### knowledge/08_messenger_lead_scoring.md

> Knowledge file นี้ใช้เมื่อ Claude วิเคราะห์ Messenger conversations เพื่อ score lead และตัดสินใจส่ง QualifiedLead event ไปยัง Meta CAPI

---

## 1. วิธีดึงข้อมูล

รัน script เพื่อดึง conversations:
```bash
cd /Users/ongkub/ConversionFactor-MCP
python3 messenger_tools.py --page-id <PAGE_ID> --limit 20
```

Pages ที่ใช้งานได้:
- Spark Factor: `102836812491228`
- Sangthai Metalsheet: `201811789899409` (อาจมีปัญหา API — ดู knowledge นี้ข้อ 5)

---

## 2. Lead Scoring Criteria (1–10)

### บวกคะแนน
| สัญญาณ | คะแนน |
|---|---|
| ถามราคา / ขอ quote | +3 |
| ให้ชื่อ + เบอร์โทร หรือ ชื่อบริษัท | +3 |
| อธิบาย use case / ความต้องการชัดเจน | +2 |
| มีการโต้ตอบ 2 ฝ่าย (ไม่ใช่แค่ข้อความเดียว) | +1 |
| บอก timeline / urgency | +1 |

### ลบคะแนน / ตัดทิ้ง
| สัญญาณ | การตัดสิน |
|---|---|
| ข้อความ phishing / scam / spam | Score = 0, ข้าม |
| ข้อความเดียวแล้วหาย ไม่มีการตอบรับ | Score ≤ 3 |
| ถามแล้วไม่ตอบเพิ่ม (cold inquiry) | Score ≤ 5 |
| ข้อความ irrelevant กับบริการของ page | Score = 0 |

### เกณฑ์ Qualified
- **Score ≥ 7** → Qualified Lead → ส่ง CAPI
- **Score < 7** → Not qualified → ไม่ส่ง

---

## 3. Intent Classification

| Intent | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| `ซื้อ` | ตั้งใจซื้อ / ถามราคา / ขอเริ่มใช้บริการ | "ขอ quote ได้ไหมครับ" |
| `สอบถาม` | อยากรู้ข้อมูลแต่ยังไม่ตัดสินใจ | "มีบริการ X ไหมครับ" |
| `เปรียบเทียบ` | กำลังเปรียบเทียบกับเจ้าอื่น | "คุณกับ Y ต่างกันยังไง" |
| `ไม่สนใจ` | spam, ผิด page, หรือไม่มี intent | phishing, wrong number |

---

## 4. วิธีส่ง QualifiedLead ไป CAPI

หลัง score แล้ว ถ้า qualified ให้เรียกฟังก์ชันนี้ใน Python:

```python
from messenger_tools import send_qualified_lead_capi

send_qualified_lead_capi(
    conversation_id="t_XXXXXXXXX",
    page_id="102836812491228",
    score=9,
    summary="B2B lead จาก Galaxy Automotive สนใจ Manychat ให้ contact info ครบ",
)
```

หรือถ้าต้องการรัน full pipeline พร้อม scoring แบบ manual:
1. รัน `python3 messenger_tools.py` → ได้ JSON
2. Claude วิเคราะห์ตาม criteria ข้อ 2
3. Claude เรียก `send_qualified_lead_capi()` สำหรับ conversation ที่ qualified

---

## 5. Known Issue — Sangthai Page

Sangthai Metalsheet (ID: `201811789899409`) return HTTP 500 `is_transient` จาก Conversations API ทุกครั้ง ทั้งที่ Spark Factor ทำงานได้ปกติ

สาเหตุที่ต้องตรวจสอบ:
- Page อาจเป็น Partner access (ไม่ได้ own โดยตรง)
- Page อาจใช้ third-party inbox ที่ lock Messenger API
- Page อาจมีข้อจำกัดพิเศษจาก Meta สำหรับ Local Business ในไทย

**Checklist การ diagnose:**

| ลำดับ | สิ่งที่ตรวจ | ผลที่คาดหวัง |
|---|---|---|
| 1 | Business Settings → Pages → ดู Owned/Partner | ถ้าเป็น Partner ให้ขอสิทธิ์ full control หรือย้ายมา Owned |
| 2 | Page Settings → Messaging → Messenger API status | ต้องเป็น Enabled และแอปต้อง subscribe field `messages`, `messaging_postbacks` |
| 3 | ดูว่ามี third-party inbox ผูกอยู่ไหม | ถ้ามี ให้ปลด subscribe เดิม แล้ว subscribe แอปใหม่ |
| 4 | Subscribe app ผ่าน `/me/accounts` token แล้วรอ 10–15 นาที retry | ใช้ตรวจว่า error เป็น transient จริงหรือ permission ค้าง |
