# Implementation Prompt: P0 Quick Wins
### ConversionFactor MCP · Ready-to-implement

> Copy prompt แต่ละส่วนไปให้ ConversionFactor implement ได้เลย
> Architecture: TypeScript · Railway · PostgreSQL · ad_snapshots table

---

## Fix 1: เพิ่ม campaign_id filter ใน get_ad_config tool

**ปัญหา:** get_ad_config ดึง 1,655 ads ทุกครั้ง (276K tokens) เพราะไม่มี campaign_id filter
**เป้าหมาย:** ดึงได้เฉพาะ ads ของ campaign ที่ต้องการ (~30-50 ads, ลด 95%)

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม campaign_id parameter ใน get_ad_config MCP tool

Context:
- Tool นี้อยู่ใน ConversionFactor MCP server (TypeScript)
- ปัจจุบันรับ: organization_id, status_filter, adset_id, sync
- ปัญหา: ไม่มี campaign_id filter ทำให้ดึง ads ทั้ง org มาทุกครั้ง (1,655+ ads)

สิ่งที่ต้องทำ:

1. เพิ่ม parameter ใน tool schema:
   campaign_id: string (optional) — filter เฉพาะ ads ที่อยู่ใน campaign_id นี้

2. เพิ่ม query logic:
   ถ้า campaign_id ถูกระบุ → JOIN หา adset_ids ที่อยู่ใน campaign นั้น → filter ads ตาม adset_ids นั้น
   
   SQL pattern:
   WHERE adset_id IN (
     SELECT adset_id FROM adsets WHERE campaign_id = $campaign_id AND organization_id = $org_id
   )
   
   หรือถ้า table structure ต่างออกไป → ใช้ join ที่เหมาะสม

3. อัพเดท tool description:
   เพิ่ม "campaign_id: filter เฉพาะ campaign_id (optional)" ใน parameter description

4. ตรวจสอบว่า adset_id filter (ที่มีอยู่แล้ว) ยังทำงานได้ปกติ

ผลลัพธ์ที่คาดหวัง:
get_ad_config({ organization_id: "xxx", campaign_id: "yyy", status_filter: "ACTIVE" })
→ ดึงเฉพาะ ads ใน campaign yyy ของ org xxx
```

---

## Fix 2: ENDED status สำหรับ Campaign ที่หมด schedule

**ปัญหา:** Campaign ที่ end_date ผ่านไปแล้ว (บางตัวนานกว่า 8 เดือน) ยัง status: ACTIVE
ทำให้ get_campaign_config / get_adset_config ดึงมาด้วย เพิ่ม token โดยไม่จำเป็น
**เป้าหมาย:** กรอง campaign ที่หมดอายุออกได้ + แสดง status ที่ถูกต้อง

---

### Prompt สำหรับ ConversionFactor:

```
แก้ campaign status logic เพื่อ detect expired campaigns

Context:
- Meta API คืน status: "ACTIVE" แม้ campaign จะเลย end_time ไปแล้ว
- ConversionFactor ควร normalize status นี้เมื่อ sync และเมื่อ query
- พบ campaigns ที่ end_time = Sep 2025 แต่ status ยังเป็น ACTIVE ใน May 2026

สิ่งที่ต้องทำ:

1. เพิ่ม field ใน campaign data (ใน response ของ get_campaign_config):
   
   is_actually_running: boolean
   คำนวณจาก:
     status == "ACTIVE"
     AND (end_time IS NULL OR end_time > NOW())
     AND (spend_last_7d > 0 หรือ ไม่มี constraint นี้ก็ได้)
   
   effective_status: "ACTIVE" | "ENDED" | "PAUSED"
   คำนวณจาก:
     ถ้า status == "ACTIVE" AND end_time IS NOT NULL AND end_time < NOW() → "ENDED"
     ถ้า status == "ACTIVE" AND (end_time IS NULL OR end_time > NOW()) → "ACTIVE"
     ถ้า status == "PAUSED" → "PAUSED"

2. อัพเดท status_filter ให้รองรับ effective_status:
   status_filter: "ACTIVE" → กรองด้วย effective_status == "ACTIVE" (ไม่รวม ENDED)
   status_filter: "ALL" → ดึงทั้งหมดรวม ENDED
   status_filter: "ENDED" → เฉพาะ campaign ที่หมด schedule แล้ว (ใหม่)

3. แสดง effective_status ใน output แทน status raw จาก Meta:
   - **Status:** ENDED (หมด 24/09/2568)   ← แทนที่จะแสดง ACTIVE
   - **is_actually_running:** false

4. ถ้า sync ข้อมูลลงใน DB → store effective_status ด้วยเพื่อ query performance

ผลลัพธ์ที่คาดหวัง:
get_campaign_config({ status_filter: "ACTIVE" }) 
→ คืนเฉพาะ campaigns ที่ยังไม่หมด schedule และ status ไม่ใช่ PAUSED
→ Sangthai: 3 campaigns แทน 6 campaigns (กรอง 3 campaigns ที่หมดอายุออก)
```

---

## Fix 3: JSON Output เป็น Multi-line (readable format)

**ปัญหา:** เมื่อ output ใหญ่เกิน → save เป็น JSON file แบบ single-line ทั้งหมด
ทำให้ Read tool (offset/limit by line number) อ่านทีละ section ไม่ได้
และ Grep ในไฟล์ก็ทำไม่ได้เพราะทุกอย่างอยู่ใน 1 line

---

### Prompt สำหรับ ConversionFactor:

```
แก้ format ของ large output ที่ถูก save เป็นไฟล์

Context:
- เมื่อ tool output เกิน token limit → MCP framework save ไปที่ไฟล์แทน
- ปัญหา: ไฟล์ที่ save เป็น JSON single-line ทั้งหมด (6 lines แต่ 276K tokens)
- ผลกระทบ: Read tool ไม่สามารถ offset/limit ได้ตามส่วนที่ต้องการ

สิ่งที่ต้องทำ:

Option A (แนะนำ): เปลี่ยน output format จาก JSON เป็น Markdown text
- Tools ที่มี output ใหญ่ (get_ad_config, get_adset_config) ควร format เป็น Markdown
  เพราะ Markdown มี 1 record ต่อหลาย lines ทำให้ Read ด้วย offset/limit ได้
- ปัจจุบันก็ output เป็น Markdown text อยู่แล้วใน text field
  แต่ถูก wrap ใน JSON {"type": "text", "text": "..."} ที่ทำให้เป็น single-line

Option B: เพิ่ม newlines ใน JSON output
  JSON.stringify(data, null, 2) แทน JSON.stringify(data)
  ทำให้แต่ละ field อยู่คนละ line → Read tool สามารถ offset ได้

Option C: Save เป็น JSONL (1 record per line)
  แต่ละ ad/adset เป็น 1 line ใน .jsonl file
  ทำให้ `head -n 50` หรือ Read offset=0 limit=50 ได้ 50 records แรก

แนะนำ Option A เพราะ tools ทำ Markdown formatting อยู่แล้ว
ให้แน่ใจว่าเมื่อ save ไฟล์ → save Markdown text โดยตรง ไม่ใช่ JSON wrapper
```

---

*Priority: P0 — ทำก่อนทุกอย่าง*
*อ้างอิง: system_improvements.md หมวด A1, B1, D2*
*อัพเดท: 2026-05*
