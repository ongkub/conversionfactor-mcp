import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN   = os.environ["META_PAGE_ACCESS_TOKEN"]
PAGE_ID = os.environ["META_PAGE_ID"]

def fetch_conversations(limit=5):
    url = f"https://graph.facebook.com/v21.0/{PAGE_ID}/conversations"
    params = {
        "platform": "messenger",
        "fields": "id,updated_time,participants",
        "limit": limit,
        "access_token": TOKEN,
    }
    r = requests.get(url, params=params)
    if not r.ok:
        print("HTTP", r.status_code, r.text)
        r.raise_for_status()
    return r.json()

def fetch_messages(conversation_id, limit=10):
    url = f"https://graph.facebook.com/v21.0/{conversation_id}/messages"
    params = {
        "fields": "id,message,from,created_time",
        "limit": limit,
        "access_token": TOKEN,
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()

def get_page_token(system_token, page_id):
    r = requests.get(
        f"https://graph.facebook.com/v21.0/{page_id}",
        params={"fields": "access_token", "access_token": system_token},
    )
    if not r.ok:
        print("Failed to exchange token:", r.text)
        r.raise_for_status()
    return r.json()["access_token"]

if __name__ == "__main__":
    print("Exchanging System User Token → Page Access Token...")
    TOKEN = get_page_token(TOKEN, PAGE_ID)
    print("OK\n")
    print(f"Fetching conversations for Page {PAGE_ID}...\n")
    convs = fetch_conversations(limit=3)

    if "error" in convs:
        print("ERROR:", convs["error"])
    else:
        data = convs.get("data", [])
        print(f"Found {len(data)} conversations\n")
        for conv in data:
            print(f"Conversation {conv['id']} | updated: {conv.get('updated_time')}")
            participants = [p["name"] for p in conv.get("participants", {}).get("data", [])]
            print(f"  Participants: {', '.join(participants)}")

            msgs = fetch_messages(conv["id"], limit=5)
            for m in msgs.get("data", []):
                sender = m.get("from", {}).get("name", "?")
                print(f"  [{m['created_time']}] {sender}: {m.get('message', '')[:100]}")
            print()
