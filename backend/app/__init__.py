"""
Flask Application Factory.
Creates and configures the Flask app, initializes extensions,
and registers all blueprints.
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import config_by_name


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # ──────────────────────────────────────────────
    # Configure logging
    # ──────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    # Enable DEBUG for planner / AI / RAG modules so all diagnostic logs surface
    for _debug_module in (
        "app.services.planner_orchestrator",
        "app.services.ai_model",
        "app.services.socket_service",
        "app.services.rag_indexer_service",
        "app.services.pinecone_service",
        "app.services.embedding_service",
    ):
        logging.getLogger(_debug_module).setLevel(logging.DEBUG)

    # ──────────────────────────────────────────────
    # CORS
    # ──────────────────────────────────────────────
    CORS(app, origins="*", supports_credentials=True)

    # ──────────────────────────────────────────────
    # Initialize Firebase
    # ──────────────────────────────────────────────
    from app.services.firebase_service import init_firebase
    init_firebase(app)

    # ──────────────────────────────────────────────
    # Initialize Redis
    # ──────────────────────────────────────────────
    from app.services.redis_service import init_redis
    init_redis(app)

    # Initialize Socket.IO (rides realtime)
    from app.services.socket_service import init_socketio
    init_socketio(app)

    # ──────────────────────────────────────────────
    # Register Blueprints
    # ──────────────────────────────────────────────
    from app.blueprints.auth import auth_bp
    from app.blueprints.bookings import bookings_bp
    from app.blueprints.disruptions import disruptions_bp
    from app.blueprints.admin import admin_bp
    from app.blueprints.operator import operator_bp
    from app.blueprints.platform import platform_bp
    from app.blueprints.events import events_bp
    from app.blueprints.search import search_bp
    from app.blueprints.ai import ai_bp
    from app.blueprints.business import business_bp
    from app.blueprints.rides import rides_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(disruptions_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(operator_bp)
    app.register_blueprint(platform_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(business_bp)
    app.register_blueprint(rides_bp)

    # ──────────────────────────────────────────────
    # Health Check
    # ──────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint — checks Firestore and Redis connectivity."""
        status = {"flask": "ok"}

        # Check Firestore
        try:
            from app.services.firebase_service import get_firestore_client
            db = get_firestore_client()
            db.collection("_health").document("ping").get()
            status["firestore"] = "ok"
        except Exception as e:
            status["firestore"] = f"error: {str(e)}"

        # Check Redis
        try:
            from app.services.redis_service import get_redis_client
            redis_client = get_redis_client()
            if redis_client and redis_client.ping():
                status["redis"] = "ok"
            else:
                status["redis"] = "unavailable"
        except Exception as e:
            status["redis"] = f"error: {str(e)}"

        all_ok = all(v == "ok" for v in status.values())
        return jsonify(status), 200 if all_ok else 503

    # ──────────────────────────────────────────────
    # Global error handlers
    # ──────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "NOT_FOUND", "message": "Resource not found."}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "INTERNAL_ERROR", "message": "An unexpected error occurred."}), 500

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "METHOD_NOT_ALLOWED", "message": "HTTP method not allowed."}), 405

    app.logger.info(f"Flask app created with config: {config_name}")
    return app
