"""
Gemini AI Service — Trip planning powered by Google Gemini.
Provides destination suggestions and full itinerary generation.
"""

import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def is_gemini_configured():
    return bool(GEMINI_API_KEY)


def _call_gemini(prompt, temperature=0.7, max_tokens=4096):
    """Call Gemini API and return the text response."""
    if not is_gemini_configured():
        raise ValueError("Gemini API key not configured")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        },
    }

    resp = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    # Extract text from Gemini response
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return text


def suggest_destinations(query, count=6):
    """
    Given a vague travel query (e.g. "beach holiday", "europe trip"),
    suggest destinations with brief descriptions.
    """
    prompt = f"""You are a travel expert. The user is looking for travel destination suggestions.

User query: "{query}"

Return exactly {count} destination suggestions as a JSON array. Each item must have:
- "name": destination name (city/region + country)
- "tagline": a catchy one-liner (max 8 words)  
- "description": 2 sentences about why it's great
- "best_for": array of 2-3 tags like "Beaches", "Culture", "Adventure", "Food", "Nightlife", "Nature", "History", "Romance"
- "best_months": best months to visit (e.g. "Oct - Mar")
- "avg_budget_per_day_usd": approximate daily budget in USD (integer)
- "image_query": a specific search query to find a beautiful photo of this place (e.g. "Santorini sunset blue domes")

Return ONLY the JSON array, no markdown or extra text."""

    try:
        text = _call_gemini(prompt, temperature=0.8)
        destinations = json.loads(text)
        return destinations[:count]
    except Exception as e:
        logger.error(f"Gemini destination suggestion failed: {e}")
        return None


def generate_trip_plan(destination, days, interests=None, budget=None):
    """
    Generate a complete day-by-day trip plan for a destination.
    Returns structured JSON with places, hotels, restaurants, tips.
    """
    interests_str = ", ".join(interests) if interests else "general sightseeing"
    budget_str = f"Budget level: {budget}" if budget else "mid-range budget"

    prompt = f"""You are an expert travel planner. Create a detailed {days}-day trip itinerary for {destination}.

Traveler interests: {interests_str}
{budget_str}

Return a JSON object with this exact structure:
{{
  "destination": "{destination}",
  "duration_days": {days},
  "overview": "2-3 sentence overview of the trip",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "estimated_budget": {{
    "currency": "USD",
    "accommodation_per_night": 0,
    "food_per_day": 0,
    "activities_per_day": 0,
    "total_estimated": 0
  }},
  "recommended_hotels": [
    {{
      "name": "Hotel Name",
      "type": "Luxury/Mid-range/Budget",
      "area": "neighborhood",
      "price_range": "$100-200/night",
      "why": "one-liner why this hotel"
    }}
  ],
  "daily_plan": [
    {{
      "day": 1,
      "title": "Day title (e.g. Arrival & Old City)",
      "activities": [
        {{
          "time": "09:00 AM",
          "name": "Activity name",
          "type": "attraction/restaurant/transport/experience",
          "duration": "2 hours",
          "description": "Brief description",
          "tips": "Useful tip"
        }}
      ],
      "meals": [
        {{
          "type": "Breakfast/Lunch/Dinner",
          "restaurant": "Restaurant name",
          "cuisine": "Cuisine type",
          "price_range": "$$",
          "must_try": "Signature dish"
        }}
      ]
    }}
  ],
  "packing_tips": ["tip 1", "tip 2", "tip 3"],
  "local_tips": ["tip 1", "tip 2", "tip 3"]
}}

Include 3 hotel recommendations. Each day should have 3-5 activities and 3 meals.
Make it realistic, specific, and actionable. Use real place names.
Return ONLY the JSON object, no markdown."""

    try:
        text = _call_gemini(prompt, temperature=0.7, max_tokens=8192)
        plan = json.loads(text)
        return plan
    except Exception as e:
        logger.error(f"Gemini trip planning failed: {e}")
        return None
