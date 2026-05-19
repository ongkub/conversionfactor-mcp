# ConversionFactor MCP Client

เชื่อมต่อ Claude Desktop หรือ Claude.ai กับ **ConversionFactor** — ระบบ Conversion Tracking และ Ad Reporting ของ Spark Factor — เพื่อให้ AI วิเคราะห์ Ad Performance และ Conversion Data ได้โดยตรง

> ไม่ต้องติดตั้ง Server — MCP Server ทำงานบน Cloud แล้ว เพียงแค่ตั้งค่า API Key ของคุณ

---

## ขั้นตอนการตั้งค่า

### 1. ขอ MCP API Key

ไปที่ **https://conversion.sparkth.io/admin/mcp-keys**
กด **+ Generate New Key** → ตั้งชื่อ เช่น `"MacBook ชื่อคุณ"` → copy key ที่ได้

> Key จะแสดงครั้งเดียว — เก็บไว้ในที่ปลอดภัย

---

### 2a. ตั้งค่า Claude Desktop

เปิดไฟล์:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

วาง config นี้ (แทนที่ `YOUR_MCP_KEY_HERE` ด้วย Key ของคุณ):

```json
{
  "mcpServers": {
    "conversionfactor": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://conversion.sparkth.io/mcp/sse",
        "--header",
        "Authorization: Bearer YOUR_MCP_KEY_HERE"
      ]
    }
  }
}
```

> Claude Desktop ต้องใช้ `mcp-remote` เป็น proxy — ต้องมี Node.js ติดตั้งอยู่บนเครื่อง

**Restart Claude Desktop** — จะเห็น 🔌 icon ที่ chat bar

---

### 2b. ตั้งค่า Claude.ai (เว็บ)

ไปที่ **claude.ai → Settings → Integrations → Add Integration → Remote MCP Server**

| Field | ค่า |
|---|---|
| Name | ConversionFactor |
| URL | `https://conversion.sparkth.io/mcp/sse` |
| Authorization Header | `Bearer YOUR_MCP_KEY_HERE` |

---

### 3. ใส่ System Prompt ใน Claude Project

1. สร้าง **Project** ใหม่ใน Claude Desktop หรือ Claude.ai
2. ไปที่ **Project Instructions**
3. วางเนื้อหาจากไฟล์ `CONVERSIONFACTOR_PROMPT.md` ในโฟลเดอร์นี้

---

## ทดสอบว่าเชื่อมต่อสำเร็จ

ลองพิมพ์ใน Chat:

```
สรุปภาพรวมทุก Client ให้หน่อย
```

ถ้าเชื่อมต่อสำเร็จ Claude จะเรียก `get_client_summary` และแสดงข้อมูล Spend + Conversions

---

## ตัวอย่างคำถามที่ใช้ได้เลย

```
สรุปภาพรวมทุก Client ให้หน่อย
```
```
Sangthai มี anomaly อะไรบ้างสัปดาห์นี้
```
```
เปรียบ Meta vs Google ของ Solarwing 30 วันที่ผ่านมา แล้วควรย้าย budget ไปที่ไหน
```
```
ตรวจ Pixel ของ Disaya ให้หน่อย มี signal ปกติไหม
```
```
แนะนำ Audience Plan สำหรับแบรนด์เครื่องสำอาง ราคา 500-2,000 บาท
```

---

## MCP Tools ที่ให้บริการ

| Tool | คำอธิบาย |
|---|---|
| `get_client_summary` | ภาพรวม Spend + Conversions ทุก Platform 30 วัน |
| `campaign_health_check` | Health score ทุก Campaign — CPA, CTR, Frequency |
| `find_anomalies` | ตรวจจับค่าผิดปกติอัตโนมัติ (spike/drop > 30%) |
| `compare_platforms` | Meta vs Google Ads — Verdict + Budget Recommendation |
| `conversion_funnel` | Full Attribution: Ad Spend → Events → Revenue → True ROAS |
| `pixel_health_check` | ตรวจ Pixel/CAPI signal และ event volume drop |
| `suggest_audience_plan` | วางแผน Audience Targeting จาก business context |

---

## สิทธิ์การเข้าถึง

Key แต่ละดอกจะเห็นข้อมูลเฉพาะ Organization ที่บัญชีของคุณมีสิทธิ์เท่านั้น

- **Platform Owner** → เห็นทุก Client
- **Org Admin** → เห็นเฉพาะ Organization ของตัวเอง

ดูสิทธิ์ของตัวเองได้ที่ https://conversion.sparkth.io/admin/mcp-keys

---

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | คำอธิบาย |
|---|---|
| `CONVERSIONFACTOR_PROMPT.md` | System Prompt สำหรับใส่ใน Claude Project Instructions |
| `claude_desktop_config.json` | Template config สำหรับ Claude Desktop |
| `knowledge/` | Knowledge base — Audience Strategy, Creative Framework, Thai Market Context |
| `workflows/` | Workflow templates — Weekly Review, Full Audit |

---

## ข้อมูลเพิ่มเติม

- **Admin Portal:** https://conversion.sparkth.io/admin
- **Built by:** Spark Factor Co., Ltd.
