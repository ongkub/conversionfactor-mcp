# Implementation Prompt: P2 — Output Quality
### ConversionFactor MCP · Ready-to-implement

---

## Fix 7: CTR Label ตาม Campaign Objective

**ปัญหา:** campaign_health_check แสดง CTR: 72.99% สำหรับ OUTCOME_ENGAGEMENT campaign
ซึ่งเป็น Engagement CTR (reactions + comments + shares) ไม่ใช่ Link Click CTR
ทำให้ interpret ผิดว่า "ad นี้ดึงดูดคนคลิก link มาก"

---

### Prompt สำหรับ ConversionFactor:

```
แก้ campaign_health_check ให้ label CTR ตาม optimization_goal

ปัญหาที่พบ:
  Campaign: ST_Engagement VDO Re 2026
  Optimization Goal: POST_ENGAGEMENT
  Output ปัจจุบัน: "Avg CTR: 72.99%"  ← อ่านแล้วเข้าใจผิด
  ควรแสดง: "Avg CTR (Engagement): 72.99%"

วิธีแก้:
  1. เมื่อ format CTR ใน output → ตรวจ optimization_goal ของ campaign นั้น
  
  2. Label rules:
     optimization_goal ∈ [POST_ENGAGEMENT, PAGE_LIKES, EVENT_RESPONSES]
       → "CTR (Engagement): X%"
       → เพิ่ม note: "(reactions + comments + shares ÷ impressions)"
     
     optimization_goal ∈ [LINK_CLICKS, LANDING_PAGE_VIEWS]
       → "CTR (Link Click): X%"
     
     optimization_goal ∈ [CONVERSATIONS, MESSAGES]
       → "CTR (Messaging): X%"
     
     optimization_goal ∈ [OFFSITE_CONVERSIONS, PURCHASE, LEAD_GENERATION]
       → "CTR (Outbound): X%"

  3. เพิ่ม context note ในส่วน summary:
     ⚠️ Engagement CTR ≠ Link Click CTR
     Campaign นี้ optimize ให้ได้ Reactions/Comments ไม่ใช่ Traffic หรือ Conversion

  ตัวอย่าง output ที่ต้องการ:
  🟢 ST_Engagement VDO Re 2026
    - Spend: ฿2,770
    - Avg CTR (Engagement): 72.99%  ← label ชัดเจน
    - CPM: ฿17.77
    - ⚠️ Objective: POST_ENGAGEMENT — Meta optimize ให้ได้ Reactions ไม่ใช่ Leads
```

---

## Fix 8: Creative Deduplication ใน get_ad_config

**ปัญหา:** creative เดียวกัน (body/headline เหมือนกัน) รันใน 50+ adsets
Output จึงซ้ำกัน 50 รอบ ทำให้ token พองโดยไม่ได้ข้อมูลเพิ่ม

---

### Prompt สำหรับ ConversionFactor:

```
เพิ่ม unique_creatives parameter ใน get_ad_config

Parameter ใหม่:
  unique_creatives: boolean (default: false)
  - ถ้า true: group ads ที่มี creative เหมือนกัน → แสดงแค่ตัวเดียว + จำนวน adsets ที่ใช้
  - ถ้า false: behavior เดิม (แสดงทุก ad)

Definition ของ "creative เหมือนกัน":
  เปรียบ hash ของ (body + headline + image_hash/video_id)
  ถ้า hash เหมือน → ถือว่า creative เดียวกัน

Output format เมื่อ unique_creatives: true:
  #### 3ST-13/01
  - **Creative count:** 47 ads ใน 47 adsets
  - **Body:** อาคารปัง งบไม่บาน งานไม่พัง เริ่มต้นได้จากการ "เลือกเกรดเหล็กเมทัลชีทให้ถูก"...
  - **Thumbnail:** ✅
  - **Adset IDs:** 120243037..., 120245579..., 120230601... (และอีก 44 adsets)

แทนที่จะแสดง "3ST-13/01" ซ้ำกัน 47 ครั้ง

Token saving ที่คาดหวัง:
  Sangthai มี 1,655 ads → unique creatives น่าจะเหลือ ~50–100 → ลด 95%

Implementation note:
  ถ้า sync: false → group จาก DB
  ถ้า sync: true → group หลังจากดึงจาก Meta API แล้ว
```

---

## Fix 9: work_positions Deduplication ใน get_adset_config

**ปัญหา:** ทุก adset ที่ใช้ template เดียวกันแสดง work_positions list 30 items ซ้ำกัน
ทำให้ output ยาวมากโดยไม่ได้ข้อมูลเพิ่ม

---

### Prompt สำหรับ ConversionFactor:

```
ลด work_positions / education_majors ที่ซ้ำกันใน get_adset_config output

ปัญหา:
  Adset 1 Layer 1: Construction engineering, [work_positions] Structural Engineer,
    General contractor, Civil engineering, Construction engineering, Civil engineer,
    Structural Design Engineer, Civil Engineer/Project Manager, Roofing Contractor,
    Civil Engineering Technician, Building Construction Contractor, Construction Supervisor,
    Civil Engineering Designer, Building Contractor, Civil Engineering Assistant,
    Construction Manager, Construction Project Manager, [education_majors] Civil engineering,
    Structural engineering, Construction engineering, Civil/Structural Engineering...
  
  Adset 2 Layer 1: (เหมือนกันทุกอย่าง — copy paste 100%)
  Adset 3 Layer 1: (เหมือนกันทุกอย่าง)
  ... ซ้ำกัน 50+ adsets

วิธีแก้:
  Option A (ง่ายสุด): จำกัด items ที่แสดง
    - แสดงแค่ 5 items แรกของแต่ละ type
    - ถ้ามีมากกว่า → "...และอีก N items"
    - เพิ่ม parameter: verbose: boolean (default: false)
      ถ้า verbose: true → แสดงทั้งหมด
      ถ้า false → แสดงแค่ summary

  Option B (ดีกว่า): ตรวจ duplicate ระหว่าง adsets ใน campaign เดียวกัน
    - ถ้า work_positions ของ adset ตรงกับ adset ก่อนหน้าใน campaign เดียวกัน
    - → แสดงแค่ "[same targeting as Ad Set X]"

  แนะนำ Option A ก่อนเพราะ implement ง่ายกว่า

ผลที่คาดหวัง:
  แต่ละ adset แสดง: Structural Engineer, General contractor, Civil engineer, 
    Roofing Contractor, Construction Manager ...+18 more
  แทนที่จะแสดงทุก item → ลด output ~60% ต่อ adset
```

---

## Fix 10: Output File Path ให้เข้าถึงได้จาก Bash

**ปัญหา:** เมื่อ output ใหญ่เกิน → save ไปที่ `/var/folders/.../tool-results/`
แต่ bash sandbox ใช้ path `/sessions/.../mnt/outputs/` → FileNotFoundError
ทำให้ไม่สามารถ parse large output ด้วย Python script ได้

---

### Prompt สำหรับ ConversionFactor / Claude Cowork config:

```
แก้ large output file ให้ save ในที่ที่ทั้ง file tools และ bash เข้าถึงได้

ปัญหาที่เจอ:
  Tool output > token limit → save ที่:
  /var/folders/8_/zd_.../tool-results/toolname-timestamp.json
  
  แต่ bash sandbox mount path คือ:
  /sessions/elegant-zealous-clarke/mnt/outputs/
  
  ทำให้ python3 ใน bash ไม่สามารถ open ไฟล์นั้นได้ → FileNotFoundError

วิธีแก้:
  Option A: Save large output ไปที่ outputs directory แทน
    Path: [session_outputs_dir]/tool-results/toolname-timestamp.txt
    โดย outputs directory นี้ต้อง accessible จากทั้ง file tools และ bash sandbox
  
  Option B: เพิ่ม symlink หรือ copy ไปที่ path ที่ bash เข้าถึงได้
  
  Option C: Document path mapping ให้ชัดเจน
    เพิ่มใน tool response: "bash_path: /sessions/.../mnt/outputs/tool-results/..."
    เพื่อให้ Claude รู้ว่าต้องใช้ path ไหนใน bash

หมายเหตุ: ปัญหานี้อาจเป็น Cowork/Claude infrastructure issue ไม่ใช่ ConversionFactor
ให้ตรวจสอบว่า large output file ควร save ที่ไหนเพื่อให้ทุก tool เข้าถึงได้
```

---

*Priority: P2 — ทำหลังจาก P0 และ P1 เสร็จ*
*อ้างอิง: system_improvements.md หมวด A4, C2, C3, D1*
*อัพเดท: 2026-05*
