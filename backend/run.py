"""
Entry point for the Flask application.
Run with: python run.py
"""

import warnings
warnings.filterwarnings("ignore", category=Warning, module="requests")

from app import create_app
from app.services.socket_service import get_socketio

app = create_app()
socketio = get_socketio()

if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
