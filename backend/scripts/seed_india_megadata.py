
#!/usr/bin/env python
"""India mega Firestore seeder (append-only, large by default)."""

from __future__ import annotations

import argparse
import math
import random
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception:
    firebase_admin = None
    credentials = None
    firestore = None

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE = {
    "hotels": 400,
    "restaurants": 300,
    "guides": 220,
    "tours": 500,
    "drivers": 250,
    "travelers": 180,
    "itineraries": 280,
    "rides": 1500,
    "menu_items": 4000,
    "guide_services": 1300,
}
FACTORS = {"large": 1.0, "very_large": 1.75, "massive": 2.5}
JBP = {"hotels": 35, "restaurants": 25, "guides": 18, "tours": 30, "drivers": 20}

CITIES = [
    ("Mumbai", "Maharashtra", 19.0760, 72.8777), ("Delhi", "Delhi", 28.6139, 77.2090),
    ("Bengaluru", "Karnataka", 12.9716, 77.5946), ("Hyderabad", "Telangana", 17.3850, 78.4867),
    ("Chennai", "Tamil Nadu", 13.0827, 80.2707), ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Jaipur", "Rajasthan", 26.9124, 75.7873), ("Udaipur", "Rajasthan", 24.5854, 73.7125),
    ("Panaji", "Goa", 15.4909, 73.8278), ("Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    ("Amritsar", "Punjab", 31.6340, 74.8723), ("Kochi", "Kerala", 9.9312, 76.2673),
    ("Pune", "Maharashtra", 18.5204, 73.8567), ("Ahmedabad", "Gujarat", 23.0225, 72.5714),
    ("Srinagar", "Jammu and Kashmir", 34.0837, 74.7973), ("Chandigarh", "Chandigarh", 30.7333, 76.7794),
    ("Mysuru", "Karnataka", 12.2958, 76.6394), ("Rishikesh", "Uttarakhand", 30.0869, 78.2676),
    ("Bhopal", "Madhya Pradesh", 23.2599, 77.4126), ("Jabalpur", "Madhya Pradesh", 23.1815, 79.9864),
]
W = {"Mumbai": 10, "Delhi": 10, "Bengaluru": 9, "Hyderabad": 8, "Chennai": 8, "Kolkata": 8, "Jaipur": 6, "Udaipur": 5, "Panaji": 5, "Varanasi": 5, "Amritsar": 4, "Kochi": 5, "Pune": 7, "Ahmedabad": 6, "Srinagar": 3, "Chandigarh": 4, "Mysuru": 4, "Rishikesh": 4, "Bhopal": 5, "Jabalpur": 16}

FN = ["Aarav", "Vivaan", "Arjun", "Aditya", "Ishaan", "Krishna", "Rohan", "Anaya", "Diya", "Aisha", "Neha", "Rahul", "Priya", "Amit", "Sneha", "Karan"]
LN = ["Sharma", "Verma", "Patel", "Rao", "Iyer", "Kapoor", "Yadav", "Mishra", "Gupta", "Nair", "Kulkarni", "Singh", "Khan", "Joshi"]
ROOMS = ["Deluxe", "Executive", "Premium", "Family", "Suite", "Studio", "Club", "Sky"]
AMEN = ["Wi-Fi", "AC", "TV", "Breakfast", "Desk", "Balcony", "Mini Bar", "Room Service", "City View", "Smart Lock"]
CUIS = ["North Indian", "South Indian", "Punjabi", "Mughlai", "Gujarati", "Rajasthani", "Bengali", "Kerala", "Street Food"]
DISH = ["Paneer Tikka", "Butter Chicken", "Dal Makhani", "Masala Dosa", "Veg Biryani", "Pav Bhaji", "Chole Bhature", "Kadai Paneer", "Fish Curry", "Gulab Jamun"]
GUIDE_CAT = ["Heritage", "Food Walk", "Nature", "Adventure", "Spiritual", "Photography", "Museum", "City Walk"]
TOUR_CAT = ["Adventure", "Culture", "Food", "Sightseeing", "Nature", "Heritage", "Spiritual"]


def sid(tag: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", tag).strip("_").lower() or "seed"


def did(prefix: str, tag: str, i: int) -> str:
    return f"{prefix}_{tag}_{i:05d}"


def iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def city_map():
    return {c[0]: {"name": c[0], "state": c[1], "lat": c[2], "lng": c[3]} for c in CITIES}


def city_display(n: str, cm):
    c = cm[n]
    return f"{c['name']}, {c['state']}, India"


def city_key(n: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", n.lower()).strip()


def addr(city: str, cm, rng: random.Random, unit: str = "Road") -> str:
    c = cm[city]
    return f"{rng.randint(1,220)}{rng.choice(['A','B','C','D'])}, Main {unit}, {c['name']}, {c['state']}, India"


def img(kind: str, city: str, token: str, i: int) -> str:
    return f"https://picsum.photos/seed/{kind}_{city.lower()}_{token}_{i:03d}/1280/720"


def seq(total: int, rng: random.Random, jabalpur_min: int = 0):
    if total <= 0:
        return []
    names = list(W.keys())
    weights = [W[n] for n in names]
    out = ["Jabalpur"] * min(total, jabalpur_min)
    for _ in range(total - len(out)):
        out.append(rng.choices(names, weights=weights, k=1)[0])
    rng.shuffle(out)
    return out


def split(total: int, n: int):
    base = total // n
    rem = total % n
    arr = [base] * n
    for i in range(rem):
        arr[i] += 1
    return arr


def jitter(city: str, cm, rng: random.Random):
    c = cm[city]
    return round(c["lat"] + rng.uniform(-0.08, 0.08), 6), round(c["lng"] + rng.uniform(-0.08, 0.08), 6)


def counts(profile: str):
    f = FACTORS[profile]
    c = {k: max(1, int(round(v * f))) for k, v in BASE.items()}
    c["room_types"] = c["hotels"] * 15
    c["time_slots"] = c["tours"] * 8
    c["driver_presence"] = c["drivers"]
    c["menu_items"] = max(c["menu_items"], c["restaurants"] * 10)
    c["guide_services"] = max(c["guide_services"], c["guides"] * 4)
    c["itineraries"] = max(c["itineraries"], c["travelers"])
    c["rides"] = max(c["rides"], c["drivers"] * 4)
    return c


def toggles(scope: str):
    full = scope in {"full", "requested"}
    return {
        "hotels": True,
        "restaurants": True,
        "guides": True,
        "tours": True,
        "cabs": full,
        "travelers": full,
        "itineraries": full,
        "rides": full,
    }


import time
from google.api_core.exceptions import ResourceExhausted, RetryError, DeadlineExceeded, ServiceUnavailable


def _log(tag, msg, end="\n"):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] [{tag}] {msg}", end=end, flush=True)


class Writer:
    def __init__(self, db, max_ops=20):
        self.db = db
        self.max_ops = max_ops
        self.batch = db.batch()
        self.pending = 0
        self.total = 0
        self._ops = []          # (ref, payload) for rebuild on retry
        self._seen_paths = set() # track doc paths to skip duplicates
        self.skipped = 0
        self.skipped_existing = 0

    # ---- Prefetch helpers ----
    def prefetch_collection(self, collection_ref):
        """Stream existing doc IDs from a top-level collection (minimal read via select([]))."""
        count = 0
        try:
            for doc in collection_ref.select([]).stream():
                self._seen_paths.add(doc.reference.path)
                count += 1
        except Exception as e:
            _log("PREFETCH", f"Warning fetching {collection_ref.id}: {e}")
        return count

    def prefetch_subcollections(self, parent_ids, parent_collection, subcol_name):
        """For parent docs that already exist, prefetch their subcollection doc paths."""
        count = 0
        for pid in parent_ids:
            try:
                for doc in self.db.collection(parent_collection).document(pid).collection(subcol_name).select([]).stream():
                    self._seen_paths.add(doc.reference.path)
                    count += 1
            except Exception:
                pass
        return count

    def existing_ids(self, collection_name):
        """Return set of document IDs already prefetched for a given collection prefix."""
        prefix = f"{collection_name}/"
        return {p.split("/")[1] for p in self._seen_paths if p.startswith(prefix) and p.count("/") == 1}

    def set(self, ref, payload):
        path = ref.path
        if path in self._seen_paths:
            self.skipped += 1
            return
        self._seen_paths.add(path)
        self.batch.set(ref, payload)
        self._ops.append((ref, payload))
        self.pending += 1
        if self.pending >= self.max_ops:
            self.commit()

    def commit(self):
        if not self.pending:
            return

        max_retries = 10
        base_delay = 5.0

        for attempt in range(max_retries):
            try:
                self.batch.commit()
                break
            except (ResourceExhausted, RetryError, DeadlineExceeded, ServiceUnavailable) as e:
                if attempt == max_retries - 1:
                    _log("FATAL", f"Failed to commit batch after {max_retries} attempts: {e}")
                    raise
                delay = base_delay * (2 ** attempt)
                _log("WARN", f"Firestore error: {type(e).__name__}. Retrying in {delay:.0f}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                # rebuild the batch since committed batch can't be reused
                self.batch = self.db.batch()
                for ref, payload in self._ops:
                    self.batch.set(ref, payload)

        self.total += self.pending
        self.batch = self.db.batch()
        self._ops.clear()
        self.pending = 0
        # pause between batches to stay under Firestore free-tier quota
        time.sleep(1.5)

    def finish(self):
        self.commit()
        if self.skipped:
            _log("DEDUP", f"Skipped {self.skipped} duplicate document(s)")
        return self.total


def init_db():
    if firebase_admin is None or credentials is None or firestore is None:
        raise RuntimeError("firebase_admin is not installed. Install backend requirements or use the backend venv.")
    if not firebase_admin._apps:
        key = BACKEND_DIR / "serviceAccount.json"
        cred = credentials.Certificate(str(key)) if key.exists() else credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    return firestore.client()

def main():
    p = argparse.ArgumentParser(description="Seed large India-only Firestore demo data.")
    p.add_argument("--profile", choices=["large", "very_large", "massive"], default="large")
    p.add_argument("--scope", choices=["full", "requested", "rag_core"], default="full")
    p.add_argument("--append-only", action="store_true", default=True)
    p.add_argument("--seed", type=int, default=20260226)
    p.add_argument("--run-tag", default="")
    p.add_argument("--reindex", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    rng = random.Random(a.seed)
    tag = a.run_tag.strip() or datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    stag = sid(tag)
    now = iso()
    cm = city_map()
    c = counts(a.profile)
    t = toggles(a.scope)
    f = FACTORS[a.profile]

    meta = {"generator": "seed_india_megadata", "profile": a.profile, "scope": a.scope, "run_tag": tag, "seeded_at": now}
    cc = {"hotels": Counter(), "restaurants": Counter(), "guides": Counter(), "tours": Counter(), "drivers": Counter(), "travelers": Counter()}

    hseq = seq(c["hotels"], rng, int(math.ceil(JBP["hotels"] * f))) if t["hotels"] else []
    rseq = seq(c["restaurants"], rng, int(math.ceil(JBP["restaurants"] * f))) if t["restaurants"] else []
    gseq = seq(c["guides"], rng, int(math.ceil(JBP["guides"] * f))) if t["guides"] else []
    tseq = seq(c["tours"], rng, int(math.ceil(JBP["tours"] * f))) if t["tours"] else []
    dseq = seq(c["drivers"], rng, int(math.ceil(JBP["drivers"] * f))) if t["cabs"] else []
    trseq = seq(c["travelers"], rng, 0) if t["travelers"] else []

    hotels, rooms_by_city = [], defaultdict(list)
    for i, city in enumerate(hseq, 1):
        cc["hotels"][city] += 1
        uid = did("hotel", stag, i)
        hname = f"{rng.choice(['Grand','Royal','Urban','Heritage'])} {city} {rng.choice(['Residency','Suites','Palace','Inn'])}"
        rooms = []
        total_rooms = 0
        for j in range(1, 16):
            rid = did(f"room{i}", stag, j)
            tr = rng.randint(2, 14)
            total_rooms += tr
            beds = rng.randint(1, 3)
            ims = [img("room", city, "stay", j * 2), img("room", city, "stay", j * 2 + 1)]
            r = {
                "id": rid, "name": f"{ROOMS[(j - 1) % len(ROOMS)]} {j}", "description": "Comfort room", "price_per_day": float(rng.randint(1800, 14500)),
                "total_rooms": tr, "beds": beds, "max_guests": max(2, beds * 2), "area_sqft": float(rng.randint(180, 540)),
                "room_count_available": rng.randint(max(1, tr // 2), tr), "amenities": rng.sample(AMEN, k=rng.randint(3, 6)),
                "images": ims, "cover_image": ims[0], "is_active": True, "created_at": now, "updated_at": now, "seed_meta": dict(meta),
            }
            rooms.append(r)
            rooms_by_city[city].append({"hotel_owner_uid": uid, **r})
        hotels.append({
            "uid": uid, "email": f"{uid}@seed.local", "display_name": hname, "city": city,
            "business_profile": {
                "business_type": "HOTEL", "business_name": hname, "phone": f"+91-9{rng.randint(100000000,999999999)}", "city": city,
                "address": addr(city, cm, rng), "description": f"Stay in {city}.",
                "details": {"total_rooms": total_rooms, "amenities": rng.sample(AMEN, k=6), "image_urls": [img('hotel', city, 'front', 1), img('hotel', city, 'front', 2), img('hotel', city, 'front', 3)]},
            },
            "rooms": rooms,
        })

    restaurants = []
    msplit = split(c["menu_items"], c["restaurants"]) if t["restaurants"] else []
    for i, city in enumerate(rseq, 1):
        cc["restaurants"][city] += 1
        uid = did("restaurant", stag, i)
        n = f"{rng.choice(['Spice','Tandoor','Saffron','Urban'])} {city} {rng.choice(['Kitchen','Bistro','House','Dhaba'])}"
        items = []
        for j in range(1, msplit[i - 1] + 1):
            iid = did(f"menu{i}", stag, j)
            d = rng.choice(DISH)
            ims = [img("menu", city, d.replace(' ', '_').lower(), 1), img("menu", city, d.replace(' ', '_').lower(), 2)]
            items.append({"id": iid, "name": d, "description": "Freshly prepared", "price": float(rng.randint(120, 950)), "is_veg": rng.choice([True, False]), "servings": "1 plate", "category": rng.choice(["Starter", "Main", "Dessert", "Beverage"]), "images": ims, "cover_image": ims[0], "is_available": rng.random() > 0.05, "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
        restaurants.append({
            "uid": uid, "email": f"{uid}@seed.local", "display_name": n, "city": city,
            "business_profile": {"business_type": "RESTAURANT", "business_name": n, "phone": f"+91-8{rng.randint(100000000,999999999)}", "city": city, "address": addr(city, cm, rng, "Street"), "description": f"Food in {city}.", "details": {"cuisine": rng.choice(CUIS), "opening_hours": "08:00 - 23:00", "seating_capacity": rng.randint(30, 180), "image_urls": [img('restaurant', city, 'front', 1), img('restaurant', city, 'front', 2)]}},
            "menu_items": items,
        })

    guides, guide_services_by_city = [], defaultdict(list)
    gsplit = split(c["guide_services"], c["guides"]) if t["guides"] else []
    for i, city in enumerate(gseq, 1):
        cc["guides"][city] += 1
        uid = did("guide", stag, i)
        name = f"{rng.choice(FN)} {rng.choice(LN)}"
        services = []
        for j in range(1, gsplit[i - 1] + 1):
            sidv = did(f"service{i}", stag, j)
            stype = rng.choice(["ACTIVITY", "GUIDED_TOUR"])
            cats = rng.sample(GUIDE_CAT, k=rng.randint(1, 3))
            ims = [img("guide", city, cats[0].replace(' ', '_').lower(), 1), img("guide", city, cats[0].replace(' ', '_').lower(), 2)]
            s = {
                "id": sidv, "owner_uid": uid, "owner_display_name": name, "business_name": f"{name} Tours", "business_city": city, "source": "GUIDE_SERVICE",
                "service_type": stype, "name": f"{city} {cats[0]} Experience", "description": f"Guided {cats[0]} in {city}", "location": city_display(city, cm),
                "duration_hours": float(rng.choice([1.5, 2.0, 3.0, 4.0, 6.0])), "price": float(rng.randint(600, 4500)), "price_unit": rng.choice(["PER_PERSON", "PER_GROUP"]),
                "max_group_size": rng.randint(4, 20), "category": cats, "highlights": ["Local stories", "Safe route"], "inclusions": ["Guide support"],
                "images": ims, "cover_image": ims[0], "difficulty_level": rng.choice(["EASY", "MODERATE", "HARD"]) if stype == "ACTIVITY" else None,
                "min_age": rng.randint(8, 18) if stype == "ACTIVITY" else None, "meeting_point": "" if stype == "ACTIVITY" else f"Main Square, {city}", "languages": ["Hindi", "English"] if stype == "GUIDED_TOUR" else [],
                "is_active": rng.random() > 0.03, "created_at": now, "updated_at": now, "seed_meta": dict(meta),
            }
            services.append(s)
            guide_services_by_city[city].append(s)
        guides.append({
            "uid": uid, "email": f"{uid}@seed.local", "display_name": name, "city": city,
            "business_profile": {"business_type": "TOURIST_GUIDE_SERVICE", "business_name": f"{name} Tours", "phone": f"+91-7{rng.randint(100000000,999999999)}", "city": city, "address": addr(city, cm, rng, "Lane"), "description": f"Guide in {city}.", "details": {"guide_name": name, "personal_bio": "Certified guide", "years_experience": rng.randint(2, 20), "languages": ["Hindi", "English"], "service_categories": rng.sample(GUIDE_CAT, k=3), "certifications": "State Tourism Board"}},
            "guide_services": services,
        })

    tours, tours_by_city = [], defaultdict(list)
    for i, city in enumerate(tseq, 1):
        cc["tours"][city] += 1
        tid = did("tour", stag, i)
        cats = rng.sample(TOUR_CAT, k=rng.randint(1, 3))
        op = rng.choice(guides) if guides else None
        op_uid = op["uid"] if op else did("operator", stag, i)
        op_name = op["display_name"] if op else f"Operator {i}"
        day = datetime.now(timezone.utc).date() + timedelta(days=rng.randint(1, 120))
        slots = []
        for j in range(1, 9):
            sidv = did(f"slot{i}", stag, j)
            st = datetime.combine(day + timedelta(days=(j - 1) // 2), datetime.min.time()) + timedelta(hours=8 + ((j - 1) % 4) * 3)
            cap = rng.randint(12, 36)
            slots.append({"id": sidv, "scheduled_time": st.isoformat(), "capacity": cap, "booked_count": rng.randint(0, cap // 2), "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
        td = {"id": tid, "name": f"{city} {cats[0]} Discovery", "description": f"{cats[0]} tour in {city}", "destination": city_display(city, cm), "location": city_display(city, cm), "duration_hours": float(rng.choice([2, 3, 4, 6, 8])), "price": float(rng.randint(500, 5500)), "category": cats, "category_tags": cats, "rating": round(rng.uniform(3.8, 4.9), 2), "image_url": img("tour", city, "cover", i), "operator_uid": op_uid, "operator_name": op_name, "source": "TOUR", "created_at": now, "updated_at": now, "seed_meta": dict(meta), "time_slots": slots}
        tours.append(td)
        tours_by_city[city].append(td)

    cabs = []
    for i, city in enumerate(dseq, 1):
        cc["drivers"][city] += 1
        uid = did("driver", stag, i)
        n = f"{rng.choice(FN)} {rng.choice(LN)}"
        cabs.append({"uid": uid, "email": f"{uid}@seed.local", "display_name": n, "city": city, "business_profile": {"business_type": "CAB_DRIVER", "business_name": f"{n} Cabs", "phone": f"+91-6{rng.randint(100000000,999999999)}", "city": city, "address": addr(city, cm, rng, "Bypass"), "description": f"Cab in {city}", "details": {"driver_name": n, "vehicle_type": rng.choice(["Sedan", "Hatchback", "SUV", "Auto", "EV"]), "vehicle_number": f"IN-{rng.randint(10,99)}-{rng.randint(1000,9999)}", "license_number": f"LIC-{rng.randint(100000,999999)}", "service_area": city, "cab_rating_count": rng.randint(5, 120), "cab_rating_avg": round(rng.uniform(3.9, 4.9), 2)}}})

    travelers = []
    for i, city in enumerate(trseq, 1):
        cc["travelers"][city] += 1
        uid = did("traveler", stag, i)
        travelers.append({"uid": uid, "email": f"{uid}@seed.local", "display_name": f"{rng.choice(FN)} {rng.choice(LN)}", "city": city, "address": addr(city, cm, rng, "Residency")})

    itineraries = []
    if t["itineraries"] and travelers:
        for i in range(1, c["itineraries"] + 1):
            iid = did("itinerary", stag, i)
            tr = rng.choice(travelers)
            city = tr["city"]
            sdate = datetime.now(timezone.utc).date() + timedelta(days=rng.randint(5, 150))
            nights = rng.randint(1, 6)
            edate = sdate + timedelta(days=nights)
            it = {"id": iid, "traveler_uid": tr["uid"], "traveler_name": tr["display_name"], "destination": city_display(city, cm), "start_date": sdate.isoformat(), "end_date": edate.isoformat(), "status": rng.choice(["DRAFT", "ON_TRACK", "CONFIRMED"]), "created_at": now, "updated_at": now, "seed_meta": dict(meta), "bookings": [], "activities": []}
            if hotels:
                pool = rooms_by_city.get(city) or [r for b in rooms_by_city.values() for r in b]
                if pool:
                    r = rng.choice(pool)
                    rb = rng.randint(1, 2)
                    ad, ch = rng.randint(1, 4), rng.randint(0, 2)
                    it["bookings"].append({"id": did(f"booking{i}", stag, 1), "traveler_uid": tr["uid"], "traveler_name": tr["display_name"], "itinerary_id": iid, "hotel_owner_uid": r["hotel_owner_uid"], "property_id": r["hotel_owner_uid"], "property_name": "Hotel", "room_type_id": r["id"], "room_type": r["name"], "rooms_booked": rb, "adults": ad, "children": ch, "guest_count": ad + ch, "check_in_date": sdate.isoformat(), "check_out_date": edate.isoformat(), "price_per_day": float(r["price_per_day"]), "nights": nights, "total_price": round(float(r["price_per_day"]) * nights * rb, 2), "status": rng.choice(["CONFIRMED", "CHECKED_IN", "LATE_ARRIVAL"]), "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            if tours or guides:
                p = rng.randint(1, 5)
                if tours and (not guides or rng.random() > 0.4):
                    td = rng.choice(tours_by_city.get(city) or tours)
                    sl = rng.choice(td["time_slots"])
                    it["activities"].append({"id": did(f"activity{i}", stag, 1), "traveler_uid": tr["uid"], "traveler_name": tr["display_name"], "itinerary_id": iid, "itinerary_destination": it["destination"], "participants": p, "status": "UPCOMING", "source": "TOUR", "tour_id": td["id"], "tour_name": td["name"], "time_slot_id": sl["id"], "scheduled_time": sl["scheduled_time"], "price_per_person": float(td["price"]), "total_price": round(float(td["price"]) * p, 2), "currency": "INR", "location": td["location"], "provider_uid": td["operator_uid"], "provider_name": td["operator_name"], "service_type": "TOUR", "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
                else:
                    gs = rng.choice(guide_services_by_city.get(city) or [s for b in guide_services_by_city.values() for s in b])
                    sch = (datetime.now(timezone.utc) + timedelta(days=rng.randint(2, 120), hours=rng.randint(7, 18))).isoformat()
                    pu = gs.get("price_unit") or "PER_PERSON"
                    pr = float(gs.get("price") or 0)
                    it["activities"].append({"id": did(f"activity{i}", stag, 1), "traveler_uid": tr["uid"], "traveler_name": tr["display_name"], "itinerary_id": iid, "itinerary_destination": it["destination"], "participants": p, "status": "UPCOMING", "source": "GUIDE_SERVICE", "tour_id": f"guide_service:{gs['owner_uid']}:{gs['id']}", "tour_name": gs.get("name"), "guide_service_id": gs["id"], "guide_owner_uid": gs["owner_uid"], "time_slot_id": None, "scheduled_time": sch, "price_per_person": pr if pu == "PER_PERSON" else None, "price_per_group": pr if pu == "PER_GROUP" else None, "total_price": round(pr if pu == "PER_GROUP" else pr * p, 2), "price_unit": pu, "currency": "INR", "location": gs.get("location"), "provider_uid": gs["owner_uid"], "provider_name": gs.get("owner_display_name"), "service_type": gs.get("service_type") or "GUIDED_TOUR", "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            itineraries.append(it)

    rides, ride_events = [], []
    if t["rides"] and travelers and cabs:
        by_city = defaultdict(list)
        for d in cabs:
            by_city[d["city"]].append(d)
        sv = ["REQUESTED", "ACCEPTED_PENDING_QUOTE", "QUOTE_SENT", "QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
        sw = [0.08, 0.07, 0.10, 0.12, 0.18, 0.18, 0.22, 0.05]
        for i in range(1, c["rides"] + 1):
            rid = did("ride", stag, i)
            tr = rng.choice(travelers)
            city = tr["city"]
            dr = rng.choice(by_city.get(city) or cabs)
            slat, slng = jitter(city, cm, rng)
            dlat, dlng = jitter(city, cm, rng)
            st = rng.choices(sv, weights=sw, k=1)[0]
            cdt = datetime.now(timezone.utc) - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
            adt = cdt + timedelta(minutes=rng.randint(1, 10))
            sdt = adt + timedelta(minutes=rng.randint(4, 20))
            edt = sdt + timedelta(minutes=rng.randint(10, 45))
            has_driver = st != "REQUESTED"
            qp = float(rng.randint(140, 1400)) if st in {"QUOTE_SENT", "QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS", "COMPLETED"} else None
            rides.append({"id": rid, "traveler_uid": tr["uid"], "traveler_name": tr["display_name"], "driver_uid": dr["uid"] if has_driver else None, "driver_name": dr["display_name"] if has_driver else None, "vehicle_type": (((dr["business_profile"] or {}).get("details") or {}).get("vehicle_type") if has_driver else None), "vehicle_number": (((dr["business_profile"] or {}).get("details") or {}).get("vehicle_number") if has_driver else None), "city": city, "city_key": city_key(city), "source": {"address": addr(city, cm, rng, "Pickup"), "lat": slat, "lng": slng}, "destination": {"address": addr(city, cm, rng, "Drop"), "lat": dlat, "lng": dlng}, "status": st, "quoted_price": qp, "currency": "INR", "quote_note": "Traffic dependent" if qp else None, "traveler_location": {"address": addr(city, cm, rng, "Pickup"), "lat": slat, "lng": slng}, "driver_location": {"address": addr(city, cm, rng, "Driver"), "lat": round((slat+dlat)/2,6), "lng": round((slng+dlng)/2,6)} if has_driver else None, "eta_minutes": rng.randint(3, 28) if st in {"QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS"} else None, "created_at": cdt.isoformat(), "updated_at": edt.isoformat() if st == "COMPLETED" else sdt.isoformat() if st in {"IN_PROGRESS", "DRIVER_EN_ROUTE"} else adt.isoformat() if has_driver else cdt.isoformat(), "accepted_at": adt.isoformat() if has_driver else None, "started_at": sdt.isoformat() if st in {"IN_PROGRESS", "COMPLETED"} else None, "completed_at": edt.isoformat() if st == "COMPLETED" else None, "start_otp": str(rng.randint(1000, 9999)) if st in {"QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS"} else None, "start_otp_created_at": adt.isoformat() if st in {"QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS"} else None, "start_otp_verified_at": sdt.isoformat() if st in {"IN_PROGRESS", "COMPLETED"} else None, "rating": {"stars": rng.randint(3, 5), "message": rng.choice(["Smooth ride", "Polite driver", "On-time pickup", "Good navigation"]), "updated_at": edt.isoformat()} if st == "COMPLETED" and rng.random() > 0.55 else {}, "seed_meta": dict(meta)})
            ev = [("RIDE_REQUESTED", tr["uid"], {"city": city}, cdt.isoformat())]
            if has_driver: ev.append(("RIDE_ACCEPTED", dr["uid"], {}, adt.isoformat()))
            if st in {"QUOTE_SENT", "QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS", "COMPLETED"}: ev.append(("QUOTE_SENT", dr["uid"], {"quoted_price": qp}, (adt + timedelta(minutes=2)).isoformat()))
            if st in {"QUOTE_ACCEPTED", "DRIVER_EN_ROUTE", "IN_PROGRESS", "COMPLETED"}: ev.append(("QUOTE_ACCEPTED", tr["uid"], {}, (adt + timedelta(minutes=3)).isoformat()))
            if st in {"DRIVER_EN_ROUTE", "IN_PROGRESS", "COMPLETED"}: ev.append(("DRIVER_EN_ROUTE", dr["uid"], {}, (adt + timedelta(minutes=6)).isoformat()))
            if st in {"IN_PROGRESS", "COMPLETED"}: ev.append(("RIDE_STARTED", dr["uid"], {}, sdt.isoformat()))
            if st == "COMPLETED": ev.append(("RIDE_COMPLETED", tr["uid"], {}, edt.isoformat()))
            if st == "CANCELLED": ev.append(("RIDE_CANCELLED", tr["uid"] if rng.random() > 0.4 else dr["uid"], {"reason": "Changed plan"}, (adt if has_driver else cdt + timedelta(minutes=3)).isoformat()))
            for j, (et, au, pl, ts) in enumerate(ev, 1):
                ride_events.append({"id": did(f"rideevent{i}", stag, j), "ride_id": rid, "event_type": et, "actor_uid": au, "payload": pl, "timestamp": ts, "seed_meta": dict(meta)})

    ec = Counter({
        "users_hotels": len(hotels), "users_restaurants": len(restaurants), "users_guide_providers": len(guides), "users_cab_drivers": len(cabs), "users_travelers": len(travelers),
        "room_types": sum(len(x["rooms"]) for x in hotels), "menu_items": sum(len(x["menu_items"]) for x in restaurants), "guide_services": sum(len(x["guide_services"]) for x in guides),
        "tours": len(tours), "tour_time_slots": sum(len(x["time_slots"]) for x in tours), "driver_presence": len(cabs) if t["cabs"] else 0,
        "itineraries": len(itineraries), "itinerary_bookings": sum(len(x["bookings"]) for x in itineraries), "itinerary_activities": sum(len(x["activities"]) for x in itineraries),
        "rides": len(rides), "ride_events": len(ride_events),
    })
    total = sum(ec.values())
    jb = {"hotels": cc["hotels"].get("Jabalpur", 0), "restaurants": cc["restaurants"].get("Jabalpur", 0), "guide_providers": cc["guides"].get("Jabalpur", 0), "tours": cc["tours"].get("Jabalpur", 0), "cab_drivers": cc["drivers"].get("Jabalpur", 0)}

    ts0 = time.time()
    if a.dry_run:
        print(f"Profile={a.profile} Scope={a.scope} Seed={a.seed} RunTag={tag} AppendOnly=True")
        print(f"\n[DRY-RUN] Completed in {round(time.time()-ts0,2)}s")
        print(f"Total Firestore writes planned: {total}")
        print("\nEntity counts:")
        for k in sorted(ec):
            print(f"  - {k}: {ec[k]}")
        print("\nCity distribution:")
        for k, key in [("hotels", "hotels"), ("restaurants", "restaurants"), ("guide_providers", "guides"), ("tours", "tours"), ("cab_drivers", "drivers"), ("travelers", "travelers")]:
            if not cc[key]:
                continue
            print(f"  - {k}: " + ", ".join([f"{n}:{v}" for n, v in cc[key].most_common(8)]))
        print("\nJabalpur checks:")
        for k, v in jb.items():
            print(f"  - {k}: {v}")
        return

    db = init_db()
    w = Writer(db, 20)

    _log("START", f"Profile={a.profile}  Scope={a.scope}  Seed={a.seed}  RunTag={tag}")
    _log("START", f"Planned writes: {total}  Batch size: {w.max_ops}")

    # ── Pre-flight: check existing records in Firestore ──
    _log("PREFETCH", "Scanning Firestore for existing records...")
    existing_users_count = w.prefetch_collection(db.collection("users"))
    existing_tours_count = w.prefetch_collection(db.collection("tours"))
    existing_dp_count = w.prefetch_collection(db.collection("driver_presence"))
    existing_itin_count = w.prefetch_collection(db.collection("itineraries"))
    existing_rides_count = w.prefetch_collection(db.collection("rides"))
    existing_events_count = w.prefetch_collection(db.collection("ride_events"))
    total_existing = existing_users_count + existing_tours_count + existing_dp_count + existing_itin_count + existing_rides_count + existing_events_count
    _log("PREFETCH", f"Found {total_existing} existing top-level docs  (users={existing_users_count}, tours={existing_tours_count}, driver_presence={existing_dp_count}, itineraries={existing_itin_count}, rides={existing_rides_count}, ride_events={existing_events_count})")

    # Prefetch subcollections for parents that already exist
    existing_user_ids = w.existing_ids("users")
    existing_tour_ids = w.existing_ids("tours")
    existing_itin_ids = w.existing_ids("itineraries")

    if existing_user_ids:
        _log("PREFETCH", f"Scanning subcollections for {len(existing_user_ids)} existing users...")
        sub_rt = w.prefetch_subcollections(existing_user_ids, "users", "room_types")
        sub_mi = w.prefetch_subcollections(existing_user_ids, "users", "menu_items")
        sub_gs = w.prefetch_subcollections(existing_user_ids, "users", "guide_services")
        _log("PREFETCH", f"  Subcollections: room_types={sub_rt}, menu_items={sub_mi}, guide_services={sub_gs}")
    if existing_tour_ids:
        _log("PREFETCH", f"Scanning time_slots for {len(existing_tour_ids)} existing tours...")
        sub_ts = w.prefetch_subcollections(existing_tour_ids, "tours", "time_slots")
        _log("PREFETCH", f"  time_slots={sub_ts}")
    if existing_itin_ids:
        _log("PREFETCH", f"Scanning bookings/activities for {len(existing_itin_ids)} existing itineraries...")
        sub_bk = w.prefetch_subcollections(existing_itin_ids, "itineraries", "bookings")
        sub_ac = w.prefetch_subcollections(existing_itin_ids, "itineraries", "activities")
        _log("PREFETCH", f"  bookings={sub_bk}, activities={sub_ac}")

    pre_skip = len(w._seen_paths)
    _log("PREFETCH", f"Total known existing paths: {pre_skip}  —  duplicates will be skipped automatically\n")

    # -- Hotels + Room Types --
    if hotels:
        _log("HOTEL", f"Seeding {len(hotels)} hotels with room types...")
        for idx, h in enumerate(hotels, 1):
            w.set(db.collection("users").document(h["uid"]), {"uid": h["uid"], "email": h["email"], "display_name": h["display_name"], "role": "BUSINESS", "business_profile": h["business_profile"], "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            for r in h["rooms"]:
                p = dict(r); p.pop("id", None)
                w.set(db.collection("users").document(h["uid"]).collection("room_types").document(r["id"]), p)
            if idx % 50 == 0 or idx == len(hotels):
                _log("HOTEL", f"  {idx}/{len(hotels)} hotels written ({w.total + w.pending} ops so far)")

    # -- Restaurants + Menu Items --
    if restaurants:
        _log("RESTAURANT", f"Seeding {len(restaurants)} restaurants with menu items...")
        for idx, r in enumerate(restaurants, 1):
            w.set(db.collection("users").document(r["uid"]), {"uid": r["uid"], "email": r["email"], "display_name": r["display_name"], "role": "BUSINESS", "business_profile": r["business_profile"], "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            for i in r["menu_items"]:
                p = dict(i); p.pop("id", None)
                w.set(db.collection("users").document(r["uid"]).collection("menu_items").document(i["id"]), p)
            if idx % 50 == 0 or idx == len(restaurants):
                _log("RESTAURANT", f"  {idx}/{len(restaurants)} restaurants written ({w.total + w.pending} ops so far)")

    # -- Guides + Guide Services --
    if guides:
        _log("GUIDE", f"Seeding {len(guides)} guides with services...")
        for idx, g in enumerate(guides, 1):
            w.set(db.collection("users").document(g["uid"]), {"uid": g["uid"], "email": g["email"], "display_name": g["display_name"], "role": "BUSINESS", "business_profile": g["business_profile"], "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            for s in g["guide_services"]:
                p = dict(s); p.pop("id", None)
                w.set(db.collection("users").document(g["uid"]).collection("guide_services").document(s["id"]), p)
            if idx % 50 == 0 or idx == len(guides):
                _log("GUIDE", f"  {idx}/{len(guides)} guides written ({w.total + w.pending} ops so far)")

    # -- Cab Drivers + Driver Presence --
    if cabs:
        _log("CAB", f"Seeding {len(cabs)} cab drivers...")
        for idx, d in enumerate(cabs, 1):
            w.set(db.collection("users").document(d["uid"]), {"uid": d["uid"], "email": d["email"], "display_name": d["display_name"], "role": "BUSINESS", "business_profile": d["business_profile"], "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            lat, lng = jitter(d["city"], cm, rng)
            w.set(db.collection("driver_presence").document(d["uid"]), {"driver_uid": d["uid"], "online": rng.random() > 0.3, "city": d["city"], "city_key": city_key(d["city"]), "location": {"address": addr(d["city"], cm, rng, "Stand"), "lat": lat, "lng": lng}, "socket_id": None, "last_seen_at": now, "seed_meta": dict(meta)})
            if idx % 50 == 0 or idx == len(cabs):
                _log("CAB", f"  {idx}/{len(cabs)} drivers written ({w.total + w.pending} ops so far)")

    # -- Travelers --
    if travelers:
        _log("TRAVELER", f"Seeding {len(travelers)} travelers...")
        for idx, tr in enumerate(travelers, 1):
            w.set(db.collection("users").document(tr["uid"]), {"uid": tr["uid"], "email": tr["email"], "display_name": tr["display_name"], "role": "TRAVELER", "city": tr["city"], "address": tr["address"], "created_at": now, "updated_at": now, "seed_meta": dict(meta)})
            if idx % 50 == 0 or idx == len(travelers):
                _log("TRAVELER", f"  {idx}/{len(travelers)} written ({w.total + w.pending} ops so far)")

    # -- Tours + Time Slots --
    if tours:
        _log("TOUR", f"Seeding {len(tours)} tours with time slots...")
        for idx, td in enumerate(tours, 1):
            p = dict(td); slots = p.pop("time_slots", []); tid = p.pop("id")
            w.set(db.collection("tours").document(tid), p)
            for sl in slots:
                q = dict(sl); sidv = q.pop("id")
                w.set(db.collection("tours").document(tid).collection("time_slots").document(sidv), q)
            if idx % 100 == 0 or idx == len(tours):
                _log("TOUR", f"  {idx}/{len(tours)} tours written ({w.total + w.pending} ops so far)")

    # -- Itineraries + Bookings + Activities --
    if itineraries:
        _log("ITINERARY", f"Seeding {len(itineraries)} itineraries...")
        for idx, it in enumerate(itineraries, 1):
            p = dict(it); bs = p.pop("bookings", []); ac = p.pop("activities", []); iid = p.pop("id")
            w.set(db.collection("itineraries").document(iid), p)
            for b in bs:
                q = dict(b); bid = q.pop("id")
                w.set(db.collection("itineraries").document(iid).collection("bookings").document(bid), q)
            for x in ac:
                q = dict(x); aid = q.pop("id")
                w.set(db.collection("itineraries").document(iid).collection("activities").document(aid), q)
            if idx % 50 == 0 or idx == len(itineraries):
                _log("ITINERARY", f"  {idx}/{len(itineraries)} written ({w.total + w.pending} ops so far)")

    # -- Rides --
    if rides:
        _log("RIDE", f"Seeding {len(rides)} rides...")
        for idx, r in enumerate(rides, 1):
            p = dict(r); rid = p.pop("id")
            w.set(db.collection("rides").document(rid), p)
            if idx % 200 == 0 or idx == len(rides):
                _log("RIDE", f"  {idx}/{len(rides)} rides written ({w.total + w.pending} ops so far)")

    # -- Ride Events --
    if ride_events:
        _log("RIDE_EVENT", f"Seeding {len(ride_events)} ride events...")
        for idx, e in enumerate(ride_events, 1):
            p = dict(e); eid = p.pop("id")
            w.set(db.collection("ride_events").document(eid), p)
            if idx % 500 == 0 or idx == len(ride_events):
                _log("RIDE_EVENT", f"  {idx}/{len(ride_events)} events written ({w.total + w.pending} ops so far)")

    committed = w.finish()
    elapsed = round(time.time() - ts0, 2)
    _log("DONE", f"Completed in {elapsed}s")
    _log("DONE", f"Total Firestore writes committed: {committed}")
    if w.skipped:
        _log("DONE", f"Documents skipped (already existed or duplicate): {w.skipped}")
    _log("DONE", f"Pre-existing records found in Firestore: {pre_skip}")
    print("\nEntity counts:")
    for k in sorted(ec):
        print(f"  - {k}: {ec[k]}")

    if a.reindex:
        try:
            from app.services.rag_indexer_service import full_reindex
            print("\nRunning full RAG reindex...")
            rs = full_reindex(dry_run=False)
            print(f"RAG reindex complete: indexed={rs.get('indexed', 0)} total={rs.get('total', 0)}")
            if rs.get("error"):
                print(f"RAG reindex warning: {rs['error']}")
        except Exception as ex:
            print(f"RAG reindex failed: {ex}")


if __name__ == "__main__":
    main()
