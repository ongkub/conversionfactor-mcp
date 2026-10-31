# Workflow: Monthly Slide Report (Sangthai Metalsheet)
### ConversionFactor MCP · Guided Workflow

> ใช้ทุกเดือน หลังปิดรอบวันที่ 15
> เป้าหมาย: ดึงตัวเลขรอบ 16–15 (เทียบรอบก่อน) มาลงสไลด์ให้ทีม ลดเวลาเติมตัวเลข
> ระบบช่วยแค่ "ตัวเลข + ผลต่าง" — ข้อสังเกต (Key finding), Next step, Creative, Competitor เป็นงานของทีม
> ไม่ต้องมีหน้า Contest

---

## เตรียมก่อน

```
□ org_id แสงไทย: 81d7250f-5a46-4b39-881c-47f799f55055
□ แผนงบเดือนนี้: Sheet "Sangthai - Dynamic budget" (Updated Dynamic budget - 2026) คอลัมน์ของเดือนนั้น
   รวมแถวตามแพลตฟอร์ม: Facebook = Engagement + Engagement VDO (+ Page like ถ้ามี) ·
   Google = Search ทุก Tier + GDN + GMB ทุก Tier + Video View
   (หน้า Overview ของรีพอทไม่รวม "งบแยกสาขา" และ Contest)
□ ไฟล์กลางบน Google Slides ของเดือนนี้ (ทำสำเนาก่อนแก้)
```

---

## Step 1: ดึงตัวเลข

```
□ Tool: get_monthly_report_data
    organization_id: 81d7250f-5a46-4b39-881c-47f799f55055
    period_end: <วันที่ 15 ที่ปิดรอบ เช่น 2026-10-15>   (เว้นได้ = 15 ล่าสุดที่ผ่านแล้ว)
    plan: { facebook: <แผน FB>, google: <แผน Google>, line: <แผน LINE>, tiktok: <แผน TikTok> }
□ เครื่องมือดึงสดจาก API ใช้เวลาหลายวินาที — เรียกครั้งเดียวต่อรอบ
□ ถ้ามีหัวข้อ "ดึงข้อมูลบางบัญชีไม่ได้" → อย่าเอาตัวเลขไปใช้ แก้ token / สิทธิ์ก่อน (ดูหัวข้อ Troubleshooting)
```

---

## Step 2: จับคู่ตัวเลขกับหน้าสไลด์

**วิธีเติมอัตโนมัติ (Phase 1):** คัดลอก JSON จากหัวข้อ **"7. JSON สำหรับสคริปต์เติมสไลด์"** ไปวางที่เมนู
**SPARK Report → เติมข้อมูลจาก JSON…** ในไฟล์สำเนา (ติดตั้งสคริปต์ตาม `slides-filler/README.md`)
สคริปต์เติมวันที่รอบรายงาน, หน้า Overview และหัวตัวเลขของหน้าสาขา 17 หน้า + Page Like โดยแทนเฉพาะ "ค่า" ไม่แตะข้อความของทีม
และข้ามกล่องที่ทีมแก้ไว้แล้ว (แจ้งในสรุป) — ตาราง Google/Facebook และตารางรายครีเอทีฟ/กลุ่มเป้าหมายยังเป็นงานทีมจนกว่าจะถึง Phase 2

**วิธีสำรอง:** หัวข้อ **"5. ข้อความพร้อมวาง"** เป็นข้อความรูปแบบเดียวกับที่ทีมพิมพ์ในสไลด์ (เช่น `Search: 399.69 Conversion (-36%) | ใช้งบไป 20,133.47 THB`) คัดลอกไปวางทับเอง
ช่องแผนที่ไม่ได้ส่งให้ tool จะขึ้น `<แผน>` และ LINE/TikTok ขึ้นว่า "ทีมกรอกเอง"

| หน้าในรีพอท | ตัวเลขจาก tool |
|---|---|
| 01 Overview — งบจริง vs แผนรายแพลตฟอร์ม | ตาราง **1. Overview** (Facebook ไม่รวมสาขา/Contest) |
| 03 Google Ads — Search / GDN / VDO | ตาราง **2** กลุ่ม Search, GDN, VDO (VDO ผลลัพธ์ = views) |
| 03 Google My Business — Tier 1–4 | ตาราง **2** รายแคมเปญที่ชื่อ GMB (Tier 1, 2, 3, 4) |
| 04 Facebook — Engagement / Engagement VDO | ตาราง **3** (ผลลัพธ์ = post engagement) |
| 04 Facebook — Message แยกสาขา | ตาราง **4** (ผลลัพธ์ = chats = conversations) · รวม Message อยู่ใต้ตาราง |
| 04 Facebook — Page Like | ตาราง **4** แถว ST_Pagelike |
| Difference (Current vs Previous) | คอลัมน์ Δ ในทุกตาราง |

ตัวเลขรอบ SEP 2026 ที่ทดสอบแล้วว่า **ตรงกับรีพอทเดิม**: Google Search 20,133.47 · GDN 3,110.00 · VDO 3,988.04 (44,011 views) · GMB 11,122.59 ·
Facebook Overview 11,229.16 · Message รวม 2,078 แชต (90,278.98 บาท)

---

## Step 3: สิ่งที่ระบบ "ไม่มี" — ทีมเติมเอง

```
□ LINE OA: ข้อความที่ได้รับ/ส่ง/ทักทาย/แอคทีฟแชท ดูจาก OA Manager แล้วส่งให้ tool เป็น `line_oa` (ดูข้างล่าง) · Broadcast open rate รายข้อความกรอกเอง
  (LINE Ads และเพื่อนสะสม LINE OA ระบบเติมให้แล้ว — ตัวเลขเพื่อนจาก API อาจต่างจาก OA Manager เล็กน้อย)
□ TikTok Ads (6-sec view, Follower)
□ Website & SEO (GA4 / Search Console / อันดับคีย์เวิร์ด)
□ Creative (High performing creative) และ Competitor (Fanpage Karma — API ต้องอัปเกรดแผน)
□ ข้อสังเกตและ Next step ทุกหน้า
```

---

## พารามิเตอร์ `line_oa` (ไม่บังคับ)

```
line_oa: { received:{cur:2784,prev:3275}, sent:{cur:2259,prev:3052}, greeting:{cur:658,prev:843}, active_chats:{cur:1041,prev:1183} }
```
cur = รอบนี้, prev = รอบก่อน — ระบบคำนวณ % ให้และเติมบรรทัด Broadcast ในหน้า LINE (การ์ด "ข้อความทักทาย" ทีมแก้เอง)

## ถ้า tool ตอบว่าหมดเวลา / รอ
รอ ~1 นาทีแล้วเรียกซ้ำ **ด้วยค่าเดิมทุกตัว** จะได้ผลที่ดึงค้างไว้ทันที (เก็บ 10 นาที) — รายละเอียดใน `monthly_report_new_client.md`

## ข้อควรรู้เรื่องตัวเลข

- ผลลัพธ์ Facebook: Message = `messaging_conversation_started_7d` · Engagement/VDO = `post_engagement` · Page Like = `like`
- กลุ่มแคมเปญมาจากการตั้งชื่อ: `ST_Message <สาขา>`, `ST_Pagelike <สาขา>`, ชื่อมี `Contest`, `GMB`, `Engagement VDO`
  — ถ้าทีมตั้งชื่อแคมเปญรูปแบบใหม่ ตัวเลขอาจไปอยู่กลุ่ม "other" ให้แจ้งเพื่อปรับกติกา
- GMB conversions อาจต่างจากรีพอทเดิมเล็กน้อย (conversion lag) · ยอด Google ในรีพอทเดือน SEP มีผลรวมต่างจากผลบวกกลุ่ม 20 บาท (พิมพ์ผิดในรีพอท)
- ทุกตัวเลขเป็นวันตามเขตเวลาของบัญชีโฆษณา

---

## Troubleshooting

| อาการ | สาเหตุที่พบ | แก้ |
|---|---|---|
| `Token has been expired or revoked` (Google) | refresh token หมดอายุ/ถูกเพิกถอน | ขอ refresh token ใหม่ ใส่ที่ /admin/ad-reporting แล้วกด "ทดสอบ Google OAuth" |
| `The token has expired` (Meta) | token แบบ User หมดอายุ 60 วัน | สร้าง System User token แบบ Never expire ใส่ที่ /admin/ad-reporting |
| `403 The caller does not have permission` (Google) | บัญชีไม่ได้อยู่ใต้ MCC ที่ระบบใช้ | Link account เข้า MCC แล้วกด Accept ฝั่งบัญชี |
| ไม่เห็นสาขาหรือบัญชี | ยังไม่ผูก ad account กับ org | เพิ่มที่ /admin/orgs/<org_id>/ad-accounts (Meta สาขา: 1051694453476074 · Google GMB: 572-546-8729) |
