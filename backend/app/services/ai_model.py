"""
AI service powered by AWS Bedrock GPT-OSS with regional failover.
Primary region is DEFAULT_LOCATION; FALLBACK_LOCATION is used on failure.
"""

import json
import logging
import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)


def _clean_env(value):
    """Normalize .env values that may include spaces or surrounding quotes."""
    if value is None:
        return ""
    return str(value).strip().strip("'").strip('"')


AWS_ACCESS_KEY_ID = _clean_env(os.environ.get("AWS_KEY"))
AWS_SECRET_ACCESS_KEY = _clean_env(os.environ.get("AWS_SECRET"))
PRIMARY_REGION = _clean_env(os.environ.get("DEFAULT_LOCATION")) or "us-east-1"
FALLBACK_REGION = _clean_env(os.environ.get("FALLBACK_LOCATION")) or "ap-south-1"
MODEL_ID = _clean_env(os.environ.get("GPT_OSS_MODEL_ID")) or "openai.gpt-oss-20b-1:0"


def is_ai_configured():
    return bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and PRIMARY_REGION and FALLBACK_REGION)


def _bedrock_client(region_name):
    return boto3.client(
        "bedrock-runtime",
        region_name=region_name,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


def _build_converse_body(prompt, temperature=0.7, max_tokens=4096):
    return {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {
            "temperature": float(temperature),
            "maxTokens": int(max_tokens),
        },
    }


def _invoke_bedrock(prompt, temperature=0.7, max_tokens=4096):
    """Invoke GPT-OSS in the primary region and fail over to fallback region if needed."""
    if not is_ai_configured():
        raise ValueError("AI model is not configured")

    body = _build_converse_body(prompt, temperature=temperature, max_tokens=max_tokens)

    last_error = None
    for region in [PRIMARY_REGION, FALLBACK_REGION]:
        try:
            client = _bedrock_client(region)
            response = client.converse(
                modelId=MODEL_ID,
                messages=body["messages"],
                inferenceConfig=body["inferenceConfig"],
            )
            text = _extract_text_from_converse_response(response)
            if not text:
                raise ValueError("No text content returned by model")
            return text
        except (ClientError, BotoCoreError, KeyError, IndexError, TypeError) as exc:
            logger.warning(f"Bedrock invoke failed in region={region}: {exc}")
            last_error = exc
        except ValueError as exc:
            # Parsing/empty-output issues should also trigger regional fallback.
            logger.warning(f"Bedrock response parse failed in region={region}: {exc}")
            last_error = exc

    raise RuntimeError(f"Bedrock failed in both regions: {last_error}")


def invoke_bedrock_stream(prompt, on_token, temperature=0.7, max_tokens=4096):
    """
    Stream GPT-OSS output token chunks with regional failover.
    on_token(chunk: str) is called for each streamed text delta.
    Returns final concatenated text.
    """
    if not is_ai_configured():
        raise ValueError("AI model is not configured")
    if on_token is None:
        raise ValueError("on_token callback is required")

    body = _build_converse_body(prompt, temperature=temperature, max_tokens=max_tokens)
    last_error = None

    for region in [PRIMARY_REGION, FALLBACK_REGION]:
        text_parts = []
        try:
            client = _bedrock_client(region)
            response = client.converse_stream(
                modelId=MODEL_ID,
                messages=body["messages"],
                inferenceConfig=body["inferenceConfig"],
            )
            stream = response.get("stream", [])
            for event in stream:
                if not isinstance(event, dict):
                    continue
                content_delta = event.get("contentBlockDelta") or {}
                delta = content_delta.get("delta") or {}
                text = delta.get("text")
                if isinstance(text, str) and text:
                    text_parts.append(text)
                    on_token(text)

            final_text = "".join(text_parts).strip()
            if not final_text:
                raise ValueError("No streamed text returned by model")
            return final_text
        except (ClientError, BotoCoreError, KeyError, IndexError, TypeError) as exc:
            logger.warning("Bedrock stream failed in region=%s: %s", region, exc)
            last_error = exc
        except ValueError as exc:
            logger.warning("Bedrock stream parse failed in region=%s: %s", region, exc)
            last_error = exc

    raise RuntimeError(f"Bedrock streaming failed in both regions: {last_error}")


def _extract_text_from_converse_response(response):
    """
    Extract assistant text from Bedrock Converse responses.
    Handles mixed content blocks (e.g., reasoning/tool blocks before text).
    """
    content_blocks = (
        response.get("output", {})
        .get("message", {})
        .get("content", [])
    )

    if not isinstance(content_blocks, list):
        raise ValueError("Unexpected Converse response shape: content is not a list")

    text_parts = []
    for block in content_blocks:
        if not isinstance(block, dict):
            continue

        # Common shape: {"text": "..."}
        text_value = block.get("text")
        if isinstance(text_value, str) and text_value.strip():
            text_parts.append(text_value)
            continue

        # Some models return nested structures with text fields.
        for nested_key in ("reasoningContent", "toolResult", "outputText"):
            nested = block.get(nested_key)
            if isinstance(nested, dict):
                nested_text = nested.get("text")
                if isinstance(nested_text, str) and nested_text.strip():
                    text_parts.append(nested_text)

    return "\n".join(text_parts).strip()


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
        text = _invoke_bedrock(prompt, temperature=0.8)
        destinations = json.loads(text)
        return destinations[:count]
    except Exception as exc:
        logger.error(f"AI destination suggestion failed: {exc}")
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
        text = _invoke_bedrock(prompt, temperature=0.7, max_tokens=8192)
        plan = json.loads(text)
        return plan
    except Exception as exc:
        logger.error(f"AI trip planning failed: {exc}")
        return None
