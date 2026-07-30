import os
import time
import json
import argparse
import requests
from dotenv import load_dotenv

load_dotenv()

GRAPH = "https://graph.facebook.com/v21.0"


def get_all_page_tokens(system_token: str) -> dict[str, dict]:
    r = requests.get(f"{GRAPH}/me/accounts", params={"access_token": system_token})
    r.raise_for_status()
    return {p["id"]: {"token": p["access_token"], "name": p["name"]} for p in r.json().get("data", [])}


def fetch_conversations(page_token: str, page_id: str, limit: int = 20) -> list[dict]:
    r = requests.get(
        f"{GRAPH}/{page_id}/conversations",
        params={
            "platform": "messenger",
            "fields": "id,updated_time,participants",
            "limit": limit,
            "access_token": page_token,
        },
    )
    if not r.ok:
        print(f"  [warn] conversations error {r.status_code}: {r.text[:200]}")
        return []
    return r.json().get("data", [])


def fetch_messages(page_token: str, conv_id: str, limit: int = 20) -> list[dict]:
    r = requests.get(
        f"{GRAPH}/{conv_id}/messages",
        params={
            "fields": "id,message,from,created_time",
            "limit": limit,
            "access_token": page_token,
        },
    )
    if not r.ok:
        print(f"  [warn] messages error {r.status_code}: {r.text[:200]}")
        return []
    return list(reversed(r.json().get("data", [])))


def fetch_all_conversations_with_messages(page_id: str | None = None, limit: int = 10) -> list[dict]:
    """
    ดึง conversations พร้อม messages ทั้งหมด — Claude จะเรียกฟังก์ชันนี้แล้ววิเคราะห์เอง
    Return: list of {page_name, page_id, conversation_id, updated_time, participants, messages}
    """
    system_token = os.environ["META_PAGE_ACCESS_TOKEN"]
    pages = get_all_page_tokens(system_token)

    if page_id:
        pages = {page_id: pages[page_id]} if page_id in pages else {}

    results = []
    for pid, info in pages.items():
        convs = fetch_conversations(info["token"], pid, limit=limit)
        for conv in convs:
            msgs = fetch_messages(info["token"], conv["id"])
            if len(msgs) < 2:
                continue
            participants = [p["name"] for p in conv.get("participants", {}).get("data", [])]
            results.append({
                "page_name": info["name"],
                "page_id": pid,
                "conversation_id": conv["id"],
                "updated_time": conv.get("updated_time"),
                "participants": participants,
                "messages": [
                    {
                        "time": m.get("created_time", "")[:16],
                        "sender": m.get("from", {}).get("name", "?"),
                        "text": m.get("message", ""),
                    }
                    for m in msgs if m.get("message")
                ],
            })
    return results


def send_qualified_lead_capi(
    conversation_id: str, page_id: str, score: int, summary: str,
) -> bool:
    capi_token = os.environ.get("META_CAPI_TOKEN", os.environ["META_PAGE_ACCESS_TOKEN"])
    pixel_id   = os.environ["META_PIXEL_ID"]
    payload = {
        "data": [{
            "event_name": "QualifiedLead",
            "event_time": int(time.time()),
            "action_source": "other",
            "custom_data": {
                "lead_score": score,
                "lead_summary": summary,
                "conversation_id": conversation_id,
                "page_id": page_id,
            },
        }],
        "access_token": capi_token,
    }
    r = requests.post(f"{GRAPH}/{pixel_id}/events", json=payload)
    if not r.ok:
        print(f"[warn] CAPI error: {r.text[:200]}")
    return r.ok


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Messenger conversations for Claude to analyze")
    parser.add_argument("--page-id", help="Page ID (ถ้าไม่ระบุ = ทุก page)")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    data = fetch_all_conversations_with_messages(page_id=args.page_id, limit=args.limit)
    print(json.dumps(data, ensure_ascii=False, indent=2))
