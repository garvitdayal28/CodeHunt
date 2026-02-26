"""
Cloudinary upload service.
Uses CLOUDINARY_URL from environment for signed server-side uploads.
"""

import hashlib
import os
import time
from urllib.parse import urlparse

import requests


def _parse_cloudinary_url():
    cloudinary_url = os.getenv("CLOUDINARY_URL", "").strip()
    if not cloudinary_url:
        return None

    parsed = urlparse(cloudinary_url)
    if parsed.scheme != "cloudinary":
        return None

    api_key = parsed.username
    api_secret = parsed.password
    cloud_name = parsed.hostname
    if not api_key or not api_secret or not cloud_name:
        return None

    return {
        "api_key": api_key,
        "api_secret": api_secret,
        "cloud_name": cloud_name,
    }


def upload_image(file_storage, folder=None, public_id=None):
    """
    Upload an image file to Cloudinary.
    Returns dict: { secure_url, public_id, width, height, format }.
    Raises ValueError on invalid setup/input and RuntimeError on upload failure.
    """
    creds = _parse_cloudinary_url()
    if not creds:
        raise ValueError("Cloudinary is not configured. Set CLOUDINARY_URL in backend .env.")

    if file_storage is None:
        raise ValueError("No image file provided.")

    timestamp = int(time.time())
    params_to_sign = {"timestamp": timestamp}
    if folder:
        params_to_sign["folder"] = str(folder).strip()
    if public_id:
        params_to_sign["public_id"] = str(public_id).strip()

    sign_payload = "&".join(f"{k}={params_to_sign[k]}" for k in sorted(params_to_sign))
    signature = hashlib.sha1((sign_payload + creds["api_secret"]).encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{creds['cloud_name']}/image/upload"
    data = {
        "api_key": creds["api_key"],
        "timestamp": timestamp,
        "signature": signature,
    }
    if folder:
        data["folder"] = folder
    if public_id:
        data["public_id"] = public_id

    files = {
        "file": (file_storage.filename, file_storage.stream, file_storage.mimetype or "application/octet-stream")
    }
    response = requests.post(upload_url, data=data, files=files, timeout=25)
    if response.status_code >= 300:
        raise RuntimeError(f"Cloudinary upload failed: {response.text}")

    payload = response.json()
    return {
        "secure_url": payload.get("secure_url"),
        "public_id": payload.get("public_id"),
        "width": payload.get("width"),
        "height": payload.get("height"),
        "format": payload.get("format"),
    }
