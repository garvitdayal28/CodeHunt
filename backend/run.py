"""
Entry point for the Flask application.
Run with: python run.py
"""

import warnings
warnings.filterwarnings("ignore", category=Warning, module="requests")

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )
