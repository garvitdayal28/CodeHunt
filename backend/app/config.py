"""
Flask application configuration.
Loads all settings from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    AWS_KEY = os.getenv("AWS_KEY")
    AWS_SECRET = os.getenv("AWS_SECRET")
    DEFAULT_LOCATION = os.getenv("DEFAULT_LOCATION", "us-east-1")
    FALLBACK_LOCATION = os.getenv("FALLBACK_LOCATION", "ap-south-1")
    GPT_OSS_MODEL_ID = os.getenv("GPT_OSS_MODEL_ID", "openai.gpt-oss-20b-1:0")
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
    RAPIDAPI_FLIGHT_HOST = os.getenv("RAPIDAPI_FLIGHT_HOST", "sky-scrapper.p.rapidapi.com")
    RAPIDAPI_TRAIN_HOST = os.getenv("RAPIDAPI_TRAIN_HOST", "irctc1.p.rapidapi.com")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") or os.getenv("PINECONE_KEY")
    PINECONE_INDEX = os.getenv("PINECONE_INDEX", "tripallied-rag")
    PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "default")
    HF_EMBED_MODEL = os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", "8"))
    RAG_SCORE_THRESHOLD = float(os.getenv("RAG_SCORE_THRESHOLD", "0.45"))


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
