"""
Validation and normalization helpers for business profiles.
"""

from typing import Any, Dict, List


BUSINESS_ROLE = "BUSINESS"
BUSINESS_TYPES = ["HOTEL", "RESTAURANT", "CAB_DRIVER", "TOURIST_GUIDE_SERVICE"]


def _required_string(payload: Dict[str, Any], field: str) -> str:
    value = payload.get(field)
    if value is None or str(value).strip() == "":
        raise ValueError(f"{field} is required.")
    return str(value).strip()


def _optional_string(payload: Dict[str, Any], field: str) -> str:
    value = payload.get(field)
    if value is None:
        return ""
    return str(value).strip()


def _to_string_list(value: Any, field: str) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    raise ValueError(f"{field} must be a list of strings.")


def _required_non_negative_int(payload: Dict[str, Any], field: str) -> int:
    value = payload.get(field)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a valid integer.")

    if parsed < 0:
        raise ValueError(f"{field} must be >= 0.")
    return parsed


def _required_positive_int(payload: Dict[str, Any], field: str) -> int:
    value = payload.get(field)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a valid integer.")

    if parsed <= 0:
        raise ValueError(f"{field} must be > 0.")
    return parsed


def validate_and_normalize_business_profile(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a business profile and return a normalized shape for Firestore storage.
    """
    if not isinstance(profile_data, dict):
        raise ValueError("business_profile must be an object.")

    business_type = _required_string(profile_data, "business_type").upper()
    if business_type not in BUSINESS_TYPES:
        raise ValueError(f"business_type must be one of: {', '.join(BUSINESS_TYPES)}")

    normalized = {
        "business_type": business_type,
        "business_name": _required_string(profile_data, "business_name"),
        "phone": _required_string(profile_data, "phone"),
        "city": _required_string(profile_data, "city"),
        "address": _optional_string(profile_data, "address"),
        "description": _optional_string(profile_data, "description"),
        "details": {},
    }

    if business_type == "HOTEL":
        normalized["details"] = {
            "total_rooms": _required_positive_int(profile_data, "total_rooms"),
            "amenities": _to_string_list(profile_data.get("amenities"), "amenities"),
            "image_urls": _to_string_list(profile_data.get("image_urls"), "image_urls"),
        }
        if not normalized["address"]:
            raise ValueError("address is required for HOTEL.")

    elif business_type == "RESTAURANT":
        normalized["details"] = {
            "cuisine": _required_string(profile_data, "cuisine"),
            "opening_hours": _required_string(profile_data, "opening_hours"),
            "seating_capacity": _required_positive_int(profile_data, "seating_capacity"),
            "image_urls": _to_string_list(profile_data.get("image_urls"), "image_urls"),
        }
        if not normalized["address"]:
            raise ValueError("address is required for RESTAURANT.")

    elif business_type == "CAB_DRIVER":
        normalized["details"] = {
            "driver_name": _required_string(profile_data, "driver_name"),
            "vehicle_type": _required_string(profile_data, "vehicle_type"),
            "vehicle_number": _required_string(profile_data, "vehicle_number"),
            "license_number": _required_string(profile_data, "license_number"),
            "service_area": _required_string(profile_data, "service_area"),
        }

    elif business_type == "TOURIST_GUIDE_SERVICE":
        services = _to_string_list(profile_data.get("service_categories"), "service_categories")
        if not services:
            raise ValueError("service_categories is required for TOURIST_GUIDE_SERVICE.")
        normalized["details"] = {
            "guide_name": _required_string(profile_data, "guide_name"),
            "personal_bio": _required_string(profile_data, "personal_bio"),
            "years_experience": _required_non_negative_int(profile_data, "years_experience"),
            "languages": _to_string_list(profile_data.get("languages"), "languages"),
            "service_categories": services,
            "certifications": _optional_string(profile_data, "certifications"),
        }

    return normalized
