"""
HISAB — app.py
Flask application entrypoint. Wires up CORS, JWT auth, and the /api blueprint,
and loads configuration from environment variables (see ../.env.example).

Run locally:
    cd backend
    pip install -r requirements.txt
    cp ../.env.example ../.env   # then fill in real values
    python app.py
"""

import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

load_dotenv()

from database import ping  # noqa: E402  (import after load_dotenv on purpose)
from routes import api  # noqa: E402


def create_app():
    app = Flask(__name__)

    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        minutes=int(os.environ.get("JWT_EXPIRES_MINUTES", 60))
    )

    # Restrict CORS to configured origins in production via FRONTEND_ORIGIN;
    # defaults to "*" for local/hackathon-demo convenience.
    origins = os.environ.get("FRONTEND_ORIGIN", "*")
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    JWTManager(app)
    app.register_blueprint(api)

    @app.route("/")
    def index():
        return jsonify({"service": "HISAB API", "status": "running"})

    @app.route("/api/health/db")
    def db_health():
        return jsonify({"database_connected": ping()})

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"message": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"message": "Internal server error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=debug)
