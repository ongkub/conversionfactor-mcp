"""
fb_ads_mcp/tools/audience_tools.py

Audience Narrow-By Builder — Core feature of fb-ads-mcp
ออกแบบให้ AI สร้าง Audience Plan แบบ Layered AND logic
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import json


# ─────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────

@dataclass
class TargetingItem:
    """Interest, Behavior, or Demographic item"""
    id: Optional[str] = None          # Facebook Interest ID (ถ้ามี)
    name: str = ""
    type: str = "interest"             # "interest" | "behavior" | "demographic"
    audience_size_lower: Optional[int] = None
    audience_size_upper: Optional[int] = None


@dataclass
class NarrowByLayer:
    """
    หนึ่ง Layer ใน AND chain
    ภายใน Layer → OR logic (ตรงกับ Facebook's Narrow Audience feature)
    """
    layer_number: int
    name: str                           # เช่น "Core Interest", "Wealth Signal"
    rationale: str                      # ทำไมถึงต้องมี layer นี้
    items: list[TargetingItem] = field(default_factory=list)
    
    def add_interest(self, name: str, fb_id: Optional[str] = None) -> "NarrowByLayer":
        self.items.append(TargetingItem(id=fb_id, name=name, type="interest"))
        return self
    
    def add_behavior(self, name: str, fb_id: Optional[str] = None) -> "NarrowByLayer":
        self.items.append(TargetingItem(id=fb_id, name=name, type="behavior"))
        return self
    
    def to_facebook_spec(self) -> dict:
        """Convert to Facebook Marketing API targeting spec format"""
        interests = [{"id": i.id, "name": i.name} for i in self.items if i.type == "interest" and i.id]
        behaviors = [{"id": i.id, "name": i.name} for i in self.items if i.type == "behavior" and i.id]
        
        spec = {}
        if interests:
            spec["interests"] = interests
        if behaviors:
            spec["behaviors"] = behaviors
        return spec


@dataclass
class AudienceNarrowByPlan:
    """
    Full Audience Plan — หลาย Layer AND กัน
    
    Logic:
    Layer 1 (OR internally) AND Layer 2 (OR internally) AND Layer 3 (OR internally)
    """
    campaign_name: str
    business_context: str
    end_result: str                     # "Purchase" | "Lead" | "App Install"
    
    # Sizing
    monthly_budget_thb: float
    estimated_cpm_thb: float = 100.0
    target_frequency: float = 2.5
    
    # Layers
    layers: list[NarrowByLayer] = field(default_factory=list)
    
    # Demographics
    age_min: int = 18
    age_max: int = 65
    gender: str = "all"                 # "all" | "male" | "female"
    locations: list[str] = field(default_factory=lambda: ["Thailand"])
    
    # Estimates
    estimated_size_min: Optional[int] = None
    estimated_size_max: Optional[int] = None
    
    @property
    def estimated_reach(self) -> int:
        """คำนวณ Reach จาก Budget + CPM + Frequency"""
        impressions = (self.monthly_budget_thb / self.estimated_cpm_thb) * 1000
        return int(impressions / self.target_frequency)
    
    @property
    def required_audience_min(self) -> int:
        return self.estimated_reach * 5
    
    @property
    def required_audience_max(self) -> int:
        return self.estimated_reach * 15
    
    @property
    def size_assessment(self) -> dict:
        """ประเมินว่า Audience ที่ออกแบบเหมาะสมไหม"""
        if not self.estimated_size_min:
            return {"status": "unknown", "message": "ยังไม่ได้ประเมิน Audience size — ต้องดู Ads Manager"}
        
        mid = (self.estimated_size_min + self.estimated_size_max) / 2
        ratio = mid / self.estimated_reach
        
        if ratio < 3:
            return {
                "status": "too_narrow",
                "ratio": round(ratio, 1),
                "message": f"⚠️ Audience แคบเกินไป (ratio {ratio:.1f}x < 5x) "
                           f"→ เสี่ยง Ad Fatigue และ Learning Phase ไม่เสถียร "
                           f"แนะนำ: เพิ่ม Interest ใน Layer 1 หรือลด Narrow Layer"
            }
        elif ratio > 20:
            return {
                "status": "too_broad",
                "ratio": round(ratio, 1),
                "message": f"⚠️ Audience กว้างเกินไป (ratio {ratio:.1f}x > 15x) "
                           f"→ อาจเสียงบกับคนที่ไม่ใช่ target "
                           f"แนะนำ: เพิ่ม Narrow Layer หรือปรับ Demographics ให้เฉพาะขึ้น"
            }
        else:
            return {
                "status": "good",
                "ratio": round(ratio, 1),
                "message": f"✅ Audience size เหมาะสม (ratio {ratio:.1f}x อยู่ในช่วง 5–15x)"
            }
    
    def to_facebook_targeting_spec(self) -> dict:
        """
        แปลงเป็น Facebook Marketing API targeting spec
        
        Facebook AND logic ใช้ 'flexible_spec':
        [
          {Layer 1 — OR},
          {Layer 2 — OR, AND กับ Layer 1},
          {Layer 3 — OR, AND กับ Layer 1+2}
        ]
        """
        flexible_spec = [layer.to_facebook_spec() for layer in self.layers if layer.items]
        
        spec = {
            "age_min": self.age_min,
            "age_max": self.age_max,
            "geo_locations": {
                "countries": ["TH"] if "Thailand" in self.locations else self.locations
            },
            "flexible_spec": flexible_spec,
        }
        
        if self.gender != "all":
            spec["genders"] = [1] if self.gender == "male" else [2]
        
        return spec
    
    def to_summary(self) -> str:
        """สรุป Plan เป็นข้อความ สำหรับ Claude อ่านและนำเสนอ user"""
        lines = [
            f"## Audience Plan: {self.campaign_name}",
            f"",
            f"**Business:** {self.business_context}",
            f"**End Result:** {self.end_result}",
            f"**Budget:** {self.monthly_budget_thb:,.0f} บาท/เดือน",
            f"",
            f"**Sizing Analysis:**",
            f"- Estimated Reach: {self.estimated_reach:,} คน/เดือน",
            f"- Required Audience: {self.required_audience_min:,} – {self.required_audience_max:,} คน",
        ]
        
        if self.estimated_size_min:
            assessment = self.size_assessment
            lines.append(f"- Estimated Audience: {self.estimated_size_min:,} – {self.estimated_size_max:,} คน")
            lines.append(f"- Assessment: {assessment['message']}")
        
        lines.append("")
        lines.append("---")
        lines.append("")
        
        for i, layer in enumerate(self.layers):
            prefix = "**AND** " if i > 0 else ""
            lines.append(f"{prefix}**Layer {layer.layer_number} — {layer.name}** (OR within)")
            lines.append(f"*{layer.rationale}*")
            for item in layer.items:
                icon = "🎯" if item.type == "behavior" else "💡"
                lines.append(f"  {icon} {item.name}")
            lines.append("")
        
        lines.append("---")
        lines.append(f"**Demographics:** อายุ {self.age_min}–{self.age_max}, "
                    f"เพศ {self.gender}, ที่อยู่ {', '.join(self.locations)}")
        
        return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool Functions
# ─────────────────────────────────────────────

def validate_audience_plan(plan: AudienceNarrowByPlan) -> dict:
    """
    MCP Tool: ตรวจสอบ Audience Plan ว่าดีพอไหม
    
    Returns validation result พร้อม warnings และ recommendations
    """
    issues = []
    warnings = []
    recommendations = []
    
    # Check layer count
    if len(plan.layers) > 3:
        warnings.append(
            f"มี {len(plan.layers)} Layers — อาจ Narrow เกินไปสำหรับ TH market "
            "แนะนำไม่เกิน 3 Layers"
        )
    
    if len(plan.layers) == 0:
        issues.append("ไม่มี Targeting Layer — ต้องมีอย่างน้อย 1 Layer")
    
    # Check items per layer
    for layer in plan.layers:
        if len(layer.items) < 2:
            warnings.append(
                f"Layer {layer.layer_number} '{layer.name}' มีแค่ {len(layer.items)} item "
                "→ แนะนำอย่างน้อย 3–5 items เพื่อให้ OR pool กว้างพอ"
            )
        if len(layer.items) > 15:
            warnings.append(
                f"Layer {layer.layer_number} มี {len(layer.items)} items — มากเกินไป "
                "→ หลาย interests อาจ overlap กัน ไม่ได้เพิ่ม quality"
            )
    
    # Check audience size
    assessment = plan.size_assessment
    if assessment["status"] == "too_narrow":
        issues.append(assessment["message"])
        recommendations.append("เพิ่ม Interest ใน Layer 1 (Core) หรือลด Narrow layers")
    elif assessment["status"] == "too_broad":
        warnings.append(assessment["message"])
        recommendations.append("เพิ่ม AND Layer เพื่อ filter quality")
    
    # Check budget vs learning phase
    # Facebook ต้องการ 50 Conversions/week → ~7/day
    # Rough estimate: ถ้า budget น้อยเกินไป อาจไม่พอสำหรับ Learning Phase
    daily_budget = plan.monthly_budget_thb / 30
    if daily_budget < 300:
        warnings.append(
            f"Budget รายวัน ~{daily_budget:.0f} บาท อาจน้อยเกินไป "
            "Meta ต้องการ 50 Conversions/week สำหรับ Learning Phase — "
            "ถ้า CPA สูง อาจต้องเพิ่ม Budget หรือเลือก Proxy Event ที่มี Volume มากกว่า"
        )
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "recommendations": recommendations,
        "size_assessment": assessment,
    }


def build_narrow_audience_from_brief(
    business_type: str,
    product_description: str,
    price_range_thb: str,
    end_result: str,
    target_customer_description: str,
    monthly_budget_thb: float,
    location: str = "Thailand",
) -> dict:
    """
    MCP Tool: รับ Business Brief → Return Audience Plan Template
    
    Note: AI (Claude) จะ fill in Interests/Behaviors จาก knowledge
    Tool นี้ return template structure + sizing analysis
    AI จะเพิ่ม content ตาม industry knowledge
    
    Returns:
        dict ที่ Claude ใช้เป็น starting point แล้ว enrich ด้วย knowledge
    """
    estimated_cpm = 80.0  # TH average CPM (บาท)
    
    plan = AudienceNarrowByPlan(
        campaign_name=f"Cold Prospecting — {business_type}",
        business_context=f"{business_type}: {product_description} ({price_range_thb})",
        end_result=end_result,
        monthly_budget_thb=monthly_budget_thb,
        estimated_cpm_thb=estimated_cpm,
        locations=[location],
    )
    
    sizing_info = {
        "estimated_reach": plan.estimated_reach,
        "required_audience_min": plan.required_audience_min,
        "required_audience_max": plan.required_audience_max,
        "daily_budget_estimate": monthly_budget_thb / 30,
    }
    
    # Template layers (AI จะ fill content)
    layer_template = {
        "layer_1": {
            "name": "Core Interest",
            "rationale": "กำหนดกลุ่มหลักที่สนใจใน Category นี้",
            "fill_instruction": f"ใส่ Interest/Behavior ที่ตรงกับ '{product_description}' โดยตรง",
            "suggested_count": "4–8 items",
        },
        "layer_2": {
            "name": "Qualifying Signal",
            "rationale": "กรองคนที่มีคุณสมบัติตรงกับ Customer Profile",
            "fill_instruction": f"ใส่ Interest/Behavior ที่สะท้อน '{target_customer_description}'",
            "suggested_count": "3–6 items",
        },
        "layer_3": {
            "name": "Purchase Intent Signal",
            "rationale": "สัญญาณว่าพร้อมซื้อหรือกำลังหาซื้อ",
            "fill_instruction": "ใส่ Behaviors เช่น Engaged Shoppers, Online shoppers, Technology early adopters",
            "suggested_count": "2–4 items",
            "note": "Optional — ใช้เมื่อ Layer 1+2 ยัง Audience ใหญ่กว่า required_max",
        },
    }
    
    return {
        "status": "template_ready",
        "plan_template": {
            "campaign_name": plan.campaign_name,
            "business_context": plan.business_context,
            "end_result": end_result,
            "monthly_budget_thb": monthly_budget_thb,
        },
        "sizing_requirements": sizing_info,
        "layer_template": layer_template,
        "instructions_for_ai": (
            f"กรุณา fill Interests และ Behaviors ใน layer_template ด้วย knowledge เกี่ยวกับ {business_type}. "
            f"Target Audience Size ต้องอยู่ระหว่าง {sizing_info['required_audience_min']:,} "
            f"ถึง {sizing_info['required_audience_max']:,} คน. "
            f"ใช้ interests ที่ Available ใน Thailand market. "
            f"Verify ทุกครั้งว่า audience ไม่แคบหรือกว้างเกินไป."
        ),
    }


# ─────────────────────────────────────────────
# Example Usage (for testing)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # ตัวอย่าง: สร้าง Audience Plan สำหรับขายรถหรู
    plan = AudienceNarrowByPlan(
        campaign_name="Luxury Car — Cold Prospecting TH",
        business_context="ตัวแทนจำหน่ายรถหรู Mercedes-Benz, BMW, Lexus",
        end_result="Lead (Test Drive Booking)",
        monthly_budget_thb=100_000,
        estimated_cpm_thb=120.0,
        target_frequency=3.0,
        age_min=30,
        age_max=60,
        locations=["Thailand"],
    )
    
    # Layer 1: Core Interest (รถและ Luxury lifestyle)
    layer1 = NarrowByLayer(
        layer_number=1,
        name="Luxury Automotive Interest",
        rationale="คนที่สนใจรถหรูและ lifestyle พรีเมียม"
    )
    layer1.add_interest("Mercedes-Benz")
    layer1.add_interest("BMW")
    layer1.add_interest("Lexus")
    layer1.add_interest("Luxury vehicle")
    layer1.add_interest("Automotive")
    layer1.add_interest("Car enthusiast")
    plan.layers.append(layer1)
    
    # Layer 2: Wealth Signal
    layer2 = NarrowByLayer(
        layer_number=2,
        name="Wealth & Income Signal",
        rationale="คนที่มีกำลังซื้อสำหรับรถราคา 3–10 ล้านบาท"
    )
    layer2.add_behavior("Frequent international traveler", "6203537")
    layer2.add_interest("Private banking")
    layer2.add_interest("Investment")
    layer2.add_behavior("Small business owners")
    layer2.add_interest("Business executive")
    layer2.add_interest("Golf")
    plan.layers.append(layer2)
    
    # Layer 3: Purchase Intent
    layer3 = NarrowByLayer(
        layer_number=3,
        name="Purchase Intent",
        rationale="สัญญาณว่ากำลังพิจารณาซื้อรถ"
    )
    layer3.add_behavior("Engaged shoppers")
    layer3.add_interest("Car shopping")
    plan.layers.append(layer3)
    
    # Mock audience size estimate
    plan.estimated_size_min = 800_000
    plan.estimated_size_max = 1_200_000
    
    print(plan.to_summary())
    print("\n" + "="*60 + "\n")
    
    validation = validate_audience_plan(plan)
    print("Validation Result:")
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    print("\n" + "="*60 + "\n")
    
    print("Facebook API Targeting Spec:")
    print(json.dumps(plan.to_facebook_targeting_spec(), ensure_ascii=False, indent=2))
