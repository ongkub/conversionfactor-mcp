# Feature Request: Token-Efficient Query Filters
### ConversionFactor MCP · Feature Request

> ปัญหา: tool ปัจจุบันดึงข้อมูลทั้งหมดโดยไม่กรอง campaign ที่ไม่มี spend
> ผลลัพธ์: get_adset_config คืน 269 adsets (363KB), get_ad_config คืน 1,655 ads (415KB)
> เป้าหมาย: ลด token 80–90% โดยกรองเฉพาะ campaign ที่ Active จริง (มี spend ในช่วงเวลาที่กำหนด)

---

## Feature 1: `has_spend_days` Parameter

### เพิ่มใน Tools ต่อไปนี้
- `get_campaign_config`
- `get_adset_config`
- `get_ad_config`
- `get_video_metrics`
- `get_performance_breakdown`

### Spec

**Parameter:**
```
has_spend_days: number (optional)
  - ถ้าระบุ: return เฉพาะ records ที่มี spend > 0 ในช่วง N วันล่าสุด
  - ถ้าไม่ระบุ: behavior เดิม (return ทั้งหมด)
  - ค่าแนะนำ: 7 (weekly), 14, 30
```

**Logic ที่ ConversionFactor ควร implement:**
```
1. Query ad_snapshots สำหรับ org ที่ระบุ
2. กรองเฉพาะ campaign_id ที่มี SUM(spend) > 0 ในช่วง has_spend_days วันล่าสุด
3. Return config เฉพาะของ campaign_id / adset_id / ad_id ที่ผ่านการกรองนั้น
```

**ตัวอย่าง Query ที่ควรใช้:**
```sql
-- หา campaign_ids ที่ Active จริงใน 7 วันล่าสุด
SELECT DISTINCT campaign_id
FROM ad_snapshots
WHERE organization_id = $1
  AND date >= NOW() - INTERVAL '7 days'
  AND spend > 0
```

---

## Feature 2: `campaign_id` Filter ใน `get_ad_config`

### ปัญหา
`get_adset_config` มี `campaign_id` filter แล้ว แต่ `get_ad_config` ยังไม่มี
ทำให้เมื่อต้องการดู creative ของ campaign เดียว ต้องดึงมาทั้งหมด 1,655+ ads

### Spec

**เพิ่ม parameter:**
```
campaign_id: string (optional)
  - ถ้าระบุ: return เฉพาะ ads ที่อยู่ใน campaign_id นั้น
  - ควรใช้ร่วมกับ has_spend_days เพื่อ filter ซ้อนกัน
```

**ตัวอย่าง call ที่ควรทำได้:**
```json
{
  "organization_id": "...",
  "campaign_id": "120230601065220531",
  "status_filter": "ACTIVE",
  "has_spend_days": 7
}
```

---

## Feature 3: Summary Mode ใน `get_adset_config` และ `get_ad_config`

### ปัญหา
บางครั้งต้องการ "ภาพรวม" ไม่ใช่ full config ของทุก adset
เช่น รู้แค่ว่า "มี 269 adsets, pattern Layer 2 คืออะไร" ไม่ต้องการ JSON ทุก field

### Spec

**เพิ่ม parameter:**
```
summary_only: boolean (default: false)
  - ถ้า true: return สรุปแทน full config
    - จำนวน adsets/ads ทั้งหมด
    - Pattern ที่พบบ่อยที่สุด (Layer 1 top interests, Layer 2 top signals)
    - จำนวน Broad adsets (ไม่มี Narrow-By)
    - Warning summary (กี่ adsets มีปัญหา)
  - Token ที่คาดหวัง: ~2,000 tokens แทน 90,000+
```

---

## Recommended Query Chain (หลัง implement แล้ว)

```
Step 1: get_campaign_config (has_spend_days: 7)
  → ได้ campaign_ids ที่รันจริงในสัปดาห์นี้ (คาดว่า 3–5 campaigns)

Step 2: get_adset_config (campaign_id: X, has_spend_days: 7)
  → ได้เฉพาะ adsets ของ campaigns ที่ active (คาดว่า ~15–30 adsets แทน 269)

Step 3: get_ad_config (campaign_id: X, has_spend_days: 7)
  → ได้เฉพาะ ads ที่รันอยู่จริง (คาดว่า ~30–50 ads แทน 1,655)
```

**Token saving ที่คาดหวัง:**
| Tool | ปัจจุบัน | หลัง filter | ลด |
|---|---|---|---|
| get_adset_config | ~90,000 tokens | ~5,000 tokens | 94% |
| get_ad_config | ~276,000 tokens | ~15,000 tokens | 95% |
| get_campaign_config | ~5,000 tokens | ~1,000 tokens | 80% |

---

## Priority

1. 🔴 **`has_spend_days` ใน `get_campaign_config`** — ช่วยได้ทันทีที่ขั้นตอนแรก
2. 🔴 **`campaign_id` ใน `get_ad_config`** — fix ปัญหา 1,655 ads
3. 🟠 **`has_spend_days` ใน `get_adset_config` และ `get_ad_config`** — filter ซ้อน
4. 🟡 **`summary_only` mode** — ใช้เมื่อต้องการ audit ภาพรวมก่อนเจาะลึก

---

*อัพเดท: 2026-05*
