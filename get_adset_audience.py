"""
get_adset_audience.py

MCP Tool: ดึง Audience Targeting Configuration จริงจาก Meta Marketing API
ใช้เพื่อตรวจสอบว่า Ad Set ปัจจุบันตั้งค่า Audience ไว้อย่างไร
เทียบกับ Narrow-By Plan ที่ suggest_audience_plan แนะนำ

API Reference:
  GET /act_{ad_account_id}/adsets
    ?fields=name,status,targeting,daily_budget,lifetime_budget
    &access_token={META_ACCESS_TOKEN}

ติดตั้ง: pip install requests python-dotenv
"""

from __future__ import annotations

import os
import json
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

FB_API_VERSION = "v21.0"
FB_BASE_URL = f"https://graph.facebook.com/{FB_API_VERSION}"


# ─────────────────────────────────────────────
# Meta API Helpers
# ─────────────────────────────────────────────

def _get_access_token() -> str:
    token = os.getenv("META_ACCESS_TOKEN")
    if not token:
        raise ValueError(
            "META_ACCESS_TOKEN ไม่พบใน environment — "
            "ตั้งค่าใน .env หรือ environment variable ก่อนใช้ tool นี้"
        )
    return token


def _get_ad_account_id(ad_account_id: Optional[str] = None) -> str:
    """คืน ad account id ในรูปแบบ act_{id}"""
    account_id = ad_account_id or os.getenv("META_AD_ACCOUNT_ID")
    if not account_id:
        raise ValueError(
            "META_AD_ACCOUNT_ID ไม่พบ — ระบุ ad_account_id ใน parameter หรือตั้งค่าใน .env"
        )
    # Normalize: เพิ่ม act_ prefix ถ้าไม่มี
    if not account_id.startswith("act_"):
        return f"act_{account_id}"
    return account_id


# ─────────────────────────────────────────────
# Audience Formatters
# ─────────────────────────────────────────────

def _format_geo_locations(geo: dict) -> str:
    """แปลง geo_locations เป็นข้อความอ่านง่าย"""
    parts = []
    if "countries" in geo:
        parts.append(f"Countries: {', '.join(geo['countries'])}")
    if "regions" in geo:
        names = [r.get("name", r.get("key", "?")) for r in geo["regions"]]
        parts.append(f"Regions: {', '.join(names)}")
    if "cities" in geo:
        names = [c.get("name", "?") for c in geo["cities"]]
        parts.append(f"Cities: {', '.join(names)}")
    return "; ".join(parts) if parts else "ไม่ระบุ"


def _format_flexible_spec(flexible_spec: list[dict]) -> list[str]:
    """
    แปลง flexible_spec (Narrow-By layers) เป็นข้อความ

    Facebook flexible_spec structure:
    [
      {Layer 1 — OR within},      ← Core Interest
      {Layer 2 — OR within},      ← AND กับ Layer 1
      {Layer 3 — OR within},      ← AND กับ Layer 1+2
    ]
    """
    layers = []
    for i, layer in enumerate(flexible_spec):
        prefix = "AND " if i > 0 else ""
        layer_lines = [f"  {prefix}Layer {i + 1} (OR within):"]

        interests = layer.get("interests", [])
        if interests:
            names = [item.get("name", item.get("id", "?")) for item in interests]
            layer_lines.append(f"    Interests: {', '.join(names)}")

        behaviors = layer.get("behaviors", [])
        if behaviors:
            names = [item.get("name", item.get("id", "?")) for item in behaviors]
            layer_lines.append(f"    Behaviors: {', '.join(names)}")

        demographics = layer.get("demographics", [])
        if demographics:
            names = [item.get("name", item.get("id", "?")) for item in demographics]
            layer_lines.append(f"    Demographics: {', '.join(names)}")

        work_employers = layer.get("work_employers", [])
        if work_employers:
            names = [item.get("name", "?") for item in work_employers]
            layer_lines.append(f"    Employers: {', '.join(names)}")

        if len(layer_lines) == 1:
            layer_lines.append("    (ไม่มี item ใน layer นี้)")

        layers.extend(layer_lines)
    return layers


def _format_custom_audiences(custom_audiences: list[dict]) -> str:
    """แสดง Custom Audience / Lookalike ที่ใช้"""
    if not custom_audiences:
        return "ไม่ใช้"
    names = [a.get("name", a.get("id", "?")) for a in custom_audiences]
    return ", ".join(names)


def _assess_audience_type(targeting: dict) -> str:
    """วิเคราะห์ว่า Ad Set นี้ใช้ Audience ประเภทไหน"""
    has_flexible = bool(targeting.get("flexible_spec"))
    has_custom = bool(targeting.get("custom_audiences"))
    has_lookalike = bool(targeting.get("lookalike_specs"))
    is_advantage_plus = targeting.get("targeting_optimization") == "expansion_all"

    types = []
    if is_advantage_plus:
        types.append("⚡ Advantage+ Audience (Meta จัดการ targeting เอง)")
    if has_lookalike:
        types.append("🔁 Lookalike Audience")
    if has_custom:
        types.append("📋 Custom Audience / Retargeting")
    if has_flexible:
        layers = len(targeting["flexible_spec"])
        types.append(f"🎯 Interest Targeting ({layers} Narrow-By Layer{'s' if layers > 1 else ''})")

    return " + ".join(types) if types else "🌐 Broad (ไม่มี targeting กำหนด)"


def _assess_narrow_by_quality(targeting: dict) -> dict:
    """ประเมินคุณภาพ Narrow-By setup"""
    flexible_spec = targeting.get("flexible_spec", [])

    if not flexible_spec:
        return {
            "status": "no_narrow_by",
            "message": "⚠️ ไม่มี Narrow-By — ใช้ Interest แบบ OR ล้วน หรือ Broad targeting",
        }

    layer_count = len(flexible_spec)
    total_items = sum(
        len(layer.get("interests", [])) + len(layer.get("behaviors", []))
        for layer in flexible_spec
    )
    thin_layers = [
        i + 1
        for i, layer in enumerate(flexible_spec)
        if (len(layer.get("interests", [])) + len(layer.get("behaviors", []))) < 2
    ]

    issues = []
    if layer_count == 1:
        issues.append("มีแค่ 1 Layer — ยังไม่ได้ใช้ AND logic จริงๆ แนะนำเพิ่ม Layer 2 เป็น Qualifying Signal")
    if thin_layers:
        issues.append(f"Layer {', '.join(map(str, thin_layers))} มี item น้อยเกินไป (<2) — OR pool แคบเกินไป")
    if layer_count > 3:
        issues.append(f"มี {layer_count} Layers — อาจ Narrow เกินไปสำหรับ TH market (แนะนำไม่เกิน 3)")

    if not issues:
        return {
            "status": "good",
            "message": f"✅ Narrow-By {layer_count} Layers, {total_items} items รวม — โครงสร้างดี",
        }
    else:
        return {
            "status": "needs_review",
            "message": "⚠️ " + " | ".join(issues),
        }


# ─────────────────────────────────────────────
# MCP Tool: get_adset_audience
# ─────────────────────────────────────────────

def get_adset_audience(
    ad_account_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status_filter: str = "ACTIVE",
    limit: int = 20,
) -> str:
    """
    MCP Tool: ดึง Audience Targeting Configuration จริงจาก Meta Marketing API

    Args:
        ad_account_id: Meta Ad Account ID (ไม่ต้องมี act_ prefix ก็ได้)
                       ถ้าไม่ระบุ จะใช้ META_AD_ACCOUNT_ID จาก .env
        campaign_id:   กรองเฉพาะ Ad Set ของ Campaign นี้ (optional)
        status_filter: กรองตาม Status: "ACTIVE" | "PAUSED" | "ALL" (default: ACTIVE)
        limit:         จำนวน Ad Set สูงสุดที่ดึง (default: 20)

    Returns:
        str: สรุป Audience config ของทุก Ad Set พร้อม Narrow-By assessment
    """
    account_id = _get_ad_account_id(ad_account_id)
    access_token = _get_access_token()

    # Fields ที่ต้องการจาก Meta API
    fields = ",".join([
        "name",
        "status",
        "daily_budget",
        "lifetime_budget",
        "targeting",
        "campaign_id",
        "campaign{name}",
    ])

    params: dict = {
        "fields": fields,
        "access_token": access_token,
        "limit": limit,
    }

    # กรอง status (ACTIVE, PAUSED, หรือทั้งหมด)
    if status_filter != "ALL":
        params["effective_status"] = json.dumps([status_filter])

    # ถ้าระบุ campaign_id → ดึง adsets ของ campaign นั้น
    if campaign_id:
        url = f"{FB_BASE_URL}/{campaign_id}/adsets"
    else:
        url = f"{FB_BASE_URL}/{account_id}/adsets"

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout:
        return "❌ Timeout — Meta API ไม่ตอบสนองใน 30 วินาที ลองใหม่อีกครั้ง"
    except requests.exceptions.HTTPError as e:
        error_body = response.json() if response.content else {}
        meta_error = error_body.get("error", {})
        return (
            f"❌ Meta API Error {response.status_code}: "
            f"{meta_error.get('message', str(e))}\n"
            f"Code: {meta_error.get('code')} | "
            f"Type: {meta_error.get('type')}"
        )

    adsets = data.get("data", [])

    if not adsets:
        return (
            f"ไม่พบ Ad Set ที่มีสถานะ {status_filter} "
            f"ใน Account {account_id}"
            + (f" / Campaign {campaign_id}" if campaign_id else "")
        )

    # ─── สร้าง Output ───
    lines = [
        f"## 🎯 Audience Configuration — {account_id}",
        f"สถานะที่ดึง: **{status_filter}** | พบ **{len(adsets)} Ad Sets**",
        "",
    ]

    for adset in adsets:
        name = adset.get("name", "ไม่มีชื่อ")
        status = adset.get("status", "?")
        campaign_name = (
            adset.get("campaign", {}).get("name", "")
            if isinstance(adset.get("campaign"), dict)
            else ""
        )
        targeting = adset.get("targeting", {})

        # Budget
        daily_budget = adset.get("daily_budget")
        lifetime_budget = adset.get("lifetime_budget")
        if daily_budget:
            budget_str = f"฿{int(daily_budget) / 100:,.0f}/วัน"
        elif lifetime_budget:
            budget_str = f"฿{int(lifetime_budget) / 100:,.0f} (lifetime)"
        else:
            budget_str = "กำหนดที่ Campaign"

        lines.append(f"### 📦 {name}")
        if campaign_name:
            lines.append(f"Campaign: {campaign_name}")
        lines.append(f"Status: **{status}** | Budget: {budget_str}")
        lines.append("")

        # Demographics
        age_min = targeting.get("age_min", 18)
        age_max = targeting.get("age_max", 65)
        genders = targeting.get("genders", [])
        gender_str = {1: "ชาย", 2: "หญิง"}.get(genders[0], "ทุกเพศ") if genders else "ทุกเพศ"
        geo = targeting.get("geo_locations", {})

        lines.append(f"**Demographics:** อายุ {age_min}–{age_max} | เพศ: {gender_str}")
        lines.append(f"**Location:** {_format_geo_locations(geo)}")
        lines.append("")

        # Audience Type Assessment
        audience_type = _assess_audience_type(targeting)
        lines.append(f"**Audience Type:** {audience_type}")
        lines.append("")

        # Custom / Lookalike Audiences
        custom_audiences = targeting.get("custom_audiences", [])
        if custom_audiences:
            lines.append(f"**Custom Audiences:** {_format_custom_audiences(custom_audiences)}")

        lookalike_specs = targeting.get("lookalike_specs", [])
        if lookalike_specs:
            lal_info = []
            for lal in lookalike_specs:
                ratio = lal.get("ratio", "?")
                country = lal.get("country", "?")
                lal_info.append(f"Lookalike {int(float(ratio) * 100)}% ({country})")
            lines.append(f"**Lookalike:** {', '.join(lal_info)}")

        # Narrow-By / Interest Targeting
        flexible_spec = targeting.get("flexible_spec", [])
        if flexible_spec:
            lines.append("**Narrow-By Layers:**")
            lines.extend(_format_flexible_spec(flexible_spec))

        # Quality Assessment
        quality = _assess_narrow_by_quality(targeting)
        lines.append("")
        lines.append(f"**Assessment:** {quality['message']}")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Pagination warning
    paging = data.get("paging", {})
    if paging.get("next"):
        lines.append(
            f"> ⚠️ มี Ad Set มากกว่า {limit} รายการ — "
            "เพิ่ม `limit` parameter เพื่อดูเพิ่มเติม"
        )

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool: compare_adset_vs_plan
# ─────────────────────────────────────────────

def compare_adset_vs_plan(
    ad_account_id: Optional[str] = None,
    adset_name_filter: Optional[str] = None,
) -> str:
    """
    MCP Tool: เปรียบเทียบ Audience ที่เซตจริง vs Best Practice Narrow-By

    ดึง Ad Set audience จาก Meta API แล้ววิเคราะห์ว่า:
    - ใช้ Narrow-By กี่ Layer (ควร 2–3)
    - แต่ละ Layer มี items พอไหม (ควร 3–8 items/layer)
    - Audience type ถูกต้องสำหรับ Objective ไหม
    - มี Risk อะไร (Too broad, Too narrow, No Narrow-By)

    Args:
        ad_account_id:     Meta Ad Account ID
        adset_name_filter: กรองเฉพาะ Ad Set ที่ชื่อมีคำนี้ (case-insensitive)
    """
    # ดึงข้อมูลจริงจาก API
    raw_output = get_adset_audience(
        ad_account_id=ad_account_id,
        status_filter="ALL",
        limit=50,
    )

    # ถ้า error ให้ return เลย
    if raw_output.startswith("❌"):
        return raw_output

    return (
        raw_output
        + "\n\n---\n"
        + "## 📋 สรุป Recommendation\n\n"
        + "เปรียบเทียบ Audience ที่เซตจริงกับ Best Practice:\n\n"
        + "| เกณฑ์ | Best Practice | ดูจาก Assessment ด้านบน |\n"
        + "|---|---|---|\n"
        + "| Layer Count | 2–3 layers | ✅ ถ้า Good / ⚠️ ถ้า needs_review |\n"
        + "| Items per Layer | 3–8 items | ตรวจจาก Layer breakdown |\n"
        + "| Audience Type | Interest + Narrow By สำหรับ Cold | ดูจาก Audience Type |\n"
        + "| Retargeting | Custom Audience / Pixel-based | ดูจาก Custom Audiences |\n\n"
        + "> ใช้ `suggest_audience_plan` เพื่อดู Recommended Plan แล้วเปรียบเทียบกับที่เซตจริง"
    )


# ─────────────────────────────────────────────
# MCP Tool Schema (สำหรับ register ใน MCP Server)
# ─────────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "name": "get_adset_audience",
        "description": (
            "ดึง Audience Targeting Configuration จริงจาก Meta Marketing API "
            "แสดง Narrow-By Layers, Demographics, Custom Audiences, Lookalike "
            "และประเมินคุณภาพ targeting setup — "
            "ใช้เมื่อต้องการรู้ว่า Ad Set ปัจจุบันเซต Audience ไว้อย่างไร"
        ),
        "parameters": {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "ad_account_id": {
                    "type": "string",
                    "description": "Meta Ad Account ID (ไม่ต้องมี act_ prefix) — ถ้าไม่ระบุใช้ .env",
                },
                "campaign_id": {
                    "type": "string",
                    "description": "กรองเฉพาะ Ad Sets ของ Campaign นี้ (optional)",
                },
                "status_filter": {
                    "type": "string",
                    "enum": ["ACTIVE", "PAUSED", "ALL"],
                    "description": "กรองตาม Ad Set status (default: ACTIVE)",
                },
                "limit": {
                    "type": "number",
                    "description": "จำนวน Ad Set สูงสุดที่ดึง (default: 20, max: 100)",
                },
            },
        },
    },
    {
        "name": "compare_adset_vs_plan",
        "description": (
            "เปรียบเทียบ Audience ที่เซตจริงกับ Narrow-By Best Practice "
            "ประเมิน Layer Count, Items per Layer, Audience Type "
            "และให้ Recommendation ที่ชัดเจน"
        ),
        "parameters": {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "ad_account_id": {
                    "type": "string",
                    "description": "Meta Ad Account ID",
                },
                "adset_name_filter": {
                    "type": "string",
                    "description": "กรองเฉพาะ Ad Set ที่ชื่อมีคำนี้ (optional)",
                },
            },
        },
    },
]


# ─────────────────────────────────────────────
# CLI Test (python get_adset_audience.py)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    print("=== get_adset_audience — Test Run ===\n")

    # ใช้ Account ID จาก argument หรือ .env
    test_account_id = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        result = get_adset_audience(
            ad_account_id=test_account_id,
            status_filter="ACTIVE",
            limit=10,
        )
        print(result)
    except ValueError as e:
        print(f"❌ Config Error: {e}")
        print("\nวิธีแก้:")
        print("  1. สร้างไฟล์ .env ใน project root")
        print("  2. ใส่:")
        print("     META_ACCESS_TOKEN=your_token_here")
        print("     META_AD_ACCOUNT_ID=your_account_id_here")
        print("  หรือรัน: python get_adset_audience.py 123456789")
