"""
Firestore Seed Script — Populates demo data for all collections.
Run: cd backend && python seed_firestore.py
Requires: serviceAccount.json in /backend/
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

# ── Init Firebase ──
key_path = os.path.join(os.path.dirname(__file__), "serviceAccount.json")
if not os.path.exists(key_path):
    print("ERROR: serviceAccount.json not found in /backend/")
    sys.exit(1)

cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

now = datetime.utcnow()


def seed():
    print("🌱 Seeding Firestore...")

    # ── Properties (Hotels) ──
    properties = [
        {
            "name": "The Grand Horizon",
            "location": "Goa, India",
            "description": "Luxury beachfront resort with ocean views and spa.",
            "star_rating": 5,
            "price_range": {"min": 8000, "max": 25000},
            "amenities": ["Pool", "Spa", "Wi-Fi", "Restaurant", "Beach Access"],
            "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
            "admin_uid": "demo_hotel_admin",
            "created_at": now.isoformat(),
        },
        {
            "name": "Mountain Retreat Lodge",
            "location": "Manali, India",
            "description": "Cozy mountain lodge surrounded by pine forests.",
            "star_rating": 4,
            "price_range": {"min": 3000, "max": 12000},
            "amenities": ["Fireplace", "Hiking", "Wi-Fi", "Restaurant"],
            "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop",
            "admin_uid": "demo_hotel_admin",
            "created_at": now.isoformat(),
        },
        {
            "name": "Seaside Villa Resort",
            "location": "Bali, Indonesia",
            "description": "Private villas with infinity pools overlooking the ocean.",
            "star_rating": 5,
            "price_range": {"min": 15000, "max": 50000},
            "amenities": ["Private Pool", "Spa", "Butler Service", "Beach"],
            "image_url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop",
            "admin_uid": "demo_hotel_admin",
            "created_at": now.isoformat(),
        },
    ]

    prop_ids = []
    for p in properties:
        _, ref = db.collection("properties").add(p)
        prop_ids.append(ref.id)
        # Add rooms
        for i in range(1, 6):
            db.collection("properties").document(ref.id).collection("rooms").add({
                "room_number": f"{100 + i}",
                "type": "Deluxe" if i <= 3 else "Suite",
                "status": "AVAILABLE",
                "price_per_night": p["price_range"]["min"] + (i * 1000),
            })
        print(f"  ✓ Property: {p['name']} ({ref.id})")

    # ── Tours ──
    tours = [
        {
            "name": "Sunset Beach Cruise",
            "description": "2-hour sunset cruise along the coast with dinner.",
            "location": "Goa, India",
            "duration_hours": 2,
            "price": 2500,
            "category": ["Adventure", "Water Sports"],
            "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
            "operator_uid": "demo_operator",
            "created_at": now.isoformat(),
        },
        {
            "name": "Temple Trail Walk",
            "description": "Guided walk through ancient temples and gardens.",
            "location": "Bali, Indonesia",
            "duration_hours": 3,
            "price": 1800,
            "category": ["Cultural", "Walking"],
            "image_url": "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop",
            "operator_uid": "demo_operator",
            "created_at": now.isoformat(),
        },
        {
            "name": "Mountain Trekking Adventure",
            "description": "Full-day guided trek through scenic mountain trails.",
            "location": "Manali, India",
            "duration_hours": 8,
            "price": 3500,
            "category": ["Adventure", "Trekking"],
            "image_url": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
            "operator_uid": "demo_operator",
            "created_at": now.isoformat(),
        },
    ]

    tour_ids = []
    for t in tours:
        _, ref = db.collection("tours").add(t)
        tour_ids.append(ref.id)
        # Add time slots for the next 7 days
        for day in range(1, 8):
            db.collection("tours").document(ref.id).collection("time_slots").add({
                "scheduled_time": (now + timedelta(days=day, hours=9)).isoformat(),
                "capacity": 20,
                "booked_count": 0,
            })
        print(f"  ✓ Tour: {t['name']} ({ref.id})")

    # ── Sample Itinerary ──
    itin_data = {
        "traveler_uid": "demo_traveler",
        "traveler_name": "Demo Traveler",
        "destination": "Goa, India",
        "start_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
        "end_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
        "status": "ON_TRACK",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    _, itin_ref = db.collection("itineraries").add(itin_data)
    print(f"  ✓ Itinerary: {itin_ref.id}")

    # Add booking to itinerary
    db.collection("itineraries").document(itin_ref.id).collection("bookings").add({
        "traveler_uid": "demo_traveler",
        "property_id": prop_ids[0],
        "property_name": "The Grand Horizon",
        "room_type": "Deluxe",
        "check_in_date": itin_data["start_date"],
        "check_out_date": itin_data["end_date"],
        "status": "CONFIRMED",
        "created_at": now.isoformat(),
    })

    # Add activity to itinerary
    db.collection("itineraries").document(itin_ref.id).collection("activities").add({
        "traveler_uid": "demo_traveler",
        "tour_id": tour_ids[0],
        "tour_name": "Sunset Beach Cruise",
        "scheduled_time": (now + timedelta(days=4, hours=17)).isoformat(),
        "status": "UPCOMING",
        "created_at": now.isoformat(),
    })

    print(f"\n✅ Seed complete! Created:")
    print(f"   {len(properties)} properties with rooms")
    print(f"   {len(tours)} tours with time slots")
    print(f"   1 sample itinerary with booking + activity")


if __name__ == "__main__":
    seed()
