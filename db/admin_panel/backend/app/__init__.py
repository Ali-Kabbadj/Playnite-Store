from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

    from .routes.stats import stats_bp
    from .routes.games import games_bp
    from .routes.repacks import repacks_bp
    from .routes.management import management_bp
    from .routes.junctions import junctions_bp
    
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(games_bp, url_prefix='/api/games')
    app.register_blueprint(repacks_bp, url_prefix='/api/repacks')
    app.register_blueprint(management_bp, url_prefix='/api')
    app.register_blueprint(junctions_bp, url_prefix='/api/junction')

    return app
