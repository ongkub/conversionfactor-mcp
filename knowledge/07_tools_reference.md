# Knowledge 07: MCP Tools Reference — เมื่อไหรใช้อะไร และ Chain อย่างไร
### ConversionFactor MCP · AI Reference File

> อ่านไฟล์นี้ก่อนตอบทุกคำถามเกี่ยวกับโฆษณา
> ห้าม assume ข้อมูล — ดึงจาก tool ก่อนเสมอ

---

## 1. Tool Map: ใช้เมื่อไหร

| Tool | ดึงข้อมูลอะไร | ใช้เมื่อ |
|---|---|---|
| `get_client_summary` | Org list, Spend รวม, CPA, CTR (30d) | **เริ่มต้นทุกครั้ง** — หา org_id ที่ถูกต้อง |
| `campaign_health_check` | Campaign/Ad level: Spend, CPA, CTR, CPM, Frequency | วิเคราะห์ performance ของ Campaign |
| `find_anomalies` | CPA spike, CTR drop, Spend spike เทียบ 7d avg | ตรวจว่ามีอะไรผิดปกติ |
| `compare_platforms` | Meta vs Google: Spend, CPA, ROAS | เปรียบ platform และ allocate budget |
| `conversion_funnel` | True ROAS, full attribution chain | ดู ROAS จริงที่รวม LINE conversion |
| `pixel_health_check` | Pixel event volume, CAPI signal, event drop | ตรวจ tracking infrastructure |
| `suggest_audience_plan` | Recommended Narrow-By layers (ไม่ query DB) | สร้าง Audience Plan ใหม่ |
| `get_adset_config` | Audience targeting จริงของแต่ละ Ad Set | ตรวจว่าเซต Audience ไว้อย่างไร |
| `get_ad_config` | Creative: Headline, Body, CTA, Image/Video URL | ตรวจ creative copy ที่รันอยู่ |
| `get_video_metrics` | Hook Rate, Hold Rate, Avg Watch Time | วิเคราะห์ video creative performance |
| `get_performance_breakdown` | Age/Gender/Placement/Device breakdown | หา segment ที่ perform ดีที่สุด |
| `get_pixel_quality` | EMQ Score ต่อ event, Audience size | ตรวจคุณภาพ tracking signal |
| `get_keyword_report` | Search Terms, Quality Score (Google) | วิเคราะห์ keyword performance |
| `get_budget_history` | ประวัติการเปลี่ยน Budget | ตรวจว่า budget เปลี่ยนเมื่อไหร่ |
| `get_campaign_config` | Objective, Bid Strategy, Schedule | ตรวจการตั้งค่า Campaign |

---

## 2. Tool Chains: ใช้ร่วมกันอย่างไร

### Chain A: Full Audit (ใหม่ / มีปัญหาไม่รู้จุด)
```
get_client_summary
  → campaign_health_check
    → find_anomalies
      → pixel_health_check + get_pixel_quality
        → get_adset_config
          → get_ad_config + get_video_metrics
            → get_performance_breakdown
```

### Chain B: Weekly Review (ประจำสัปดาห์)
```
get_client_summary
  → find_anomalies          ← ดูก่อนเสมอ มีอะไรด่วนไหม
    → campaign_health_check
      → get_video_metrics   ← ตรวจ creative fatigue
        → compare_platforms ← allocate budget สัปดาห์ถัดไป
```

### Chain C: Audience Deep Dive
```
get_client_summary
  → get_adset_config        ← ดู audience ที่เซตจริง
    → suggest_audience_plan ← compare กับ best practice
      → get_performance_breakdown (breakdown_type: age/gender) ← ใครตอบสนองจริง
```

### Chain D: Creative Investigation
```
campaign_health_check       ← พบ CTR drop หรือ CPA spike
  → get_ad_config           ← ดู creative ที่รันอยู่
    → get_video_metrics     ← Hook Rate / Hold Rate ต่ำไหม
      → get_performance_breakdown (breakdown_type: placement) ← placement ไหนแย่
```

### Chain E: Tracking Problem
```
pixel_health_check          ← พบ Conversion = 0
  → get_pixel_quality       ← EMQ ต่ำไหม
    → conversion_funnel     ← True ROAS รวม LINE
```

---

## 3. กฎการใช้ Tools

### กฎที่ 1: เริ่มด้วย get_client_summary เสมอ
ห้าม assume org_id จากชื่อ — ต้องดึงมาจาก tool เท่านั้น

### กฎที่ 2: ดึงข้อมูลก่อน วิเคราะห์ทีหลัง
อย่าตอบจากความจำ แม้จะรู้ benchmark — ข้อมูลจริงอาจต่างกัน

### กฎที่ 3: ถ้าพบ anomaly → บอก action ทันที
อย่าแค่รายงานปัญหา — บอกด้วยว่าต้องทำอะไรต่อ

### กฎที่ 4: ข้อมูลที่ยังไม่มี tool → บอกตรงๆ
ถ้า tool ยังไม่พร้อม (pending implementation) ให้บอก user และแนะนำวิธีดูจาก Ads Manager แทน

---

## 4. Tools ที่กำลัง Implement (Pending)

Tools เหล่านี้อยู่ใน roadmap แต่ยังไม่ available — ถ้า user ถามเรื่องที่เกี่ยวข้อง ให้บอกว่ายังต้องดูจาก Ads Manager โดยตรง:

- `get_adset_config` — ดึง Audience targeting จริง
- `get_ad_config` — ดึง Creative config
- `get_video_metrics` — Hook Rate, Hold Rate
- `get_performance_breakdown` — Age/Gender/Placement breakdown
- `get_pixel_quality` — EMQ Score
- `get_keyword_report` — Google Search Terms
- `get_budget_history` — Budget change log
- `get_campaign_config` — Campaign objective/bid strategy

---

## 5. Trigger Rules: เมื่อไหรต้องรัน Tool อะไร

| User พูดว่า | Tool ที่ต้องรัน |
|---|---|
| "สรุปภาพรวม", "ดูทุก client" | `get_client_summary` |
| "วิเคราะห์ campaign", "CPA ดีไหม" | `get_client_summary` → `campaign_health_check` |
| "มีอะไรผิดปกติ", "ทำไม CPA พุ่ง" | `get_client_summary` → `find_anomalies` |
| "เปรียบ Meta กับ Google" | `compare_platforms` |
| "ROAS จริงเท่าไหร่", "LINE conversion" | `conversion_funnel` |
| "Pixel ทำงานไหม", "ทำไมไม่มี conversion" | `pixel_health_check` → `get_pixel_quality` |
| "Audience ตั้งค่ายังไง", "เซตถูกไหม" | `get_adset_config` → `suggest_audience_plan` |
| "Creative เป็นยังไง", "hook ดีไหม" | `get_ad_config` → `get_video_metrics` |
| "ใครดูโฆษณา", "กลุ่มไหน convert" | `get_performance_breakdown` |
| "keyword ไหนดี", "search term" | `get_keyword_report` |
| "budget เปลี่ยนเมื่อไหร่" | `get_budget_history` |

---

## 6. Output Format Standard

ทุกครั้งที่วิเคราะห์ข้อมูลจาก tools ให้จัดรูปแบบดังนี้:

```
## [ชื่อ Section]

### ข้อมูลที่พบ
[สรุปตัวเลขสำคัญ]

### ⚠️ Issues
[ปัญหาที่พบ พร้อมระดับความร้ายแรง 🔴/🟠/🟡]

### ✅ Action ที่ต้องทำ
[Action list เรียงตาม priority — บอก "ทำอะไร" ไม่ใช่แค่ "มีปัญหา"]
```

---

*อัพเดทล่าสุด: 2026-05 | ใช้คู่กับ CONVERSIONFACTOR_PROMPT.md*
