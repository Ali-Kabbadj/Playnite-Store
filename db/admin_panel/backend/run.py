import os
from dotenv import load_dotenv
from app import create_app
from waitress import serve

# Load variables from .env file
load_dotenv()

app = create_app()

if __name__ == '__main__':
    debug_env = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    if debug_env:
        print("Running in DEVELOPMENT mode...")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Running in Waitress PRODUCTION mode...")
        print("Listening on: http://localhost:5000")
        print("Press CTRL+C to quit")
        serve(app, host='0.0.0.0', port=5000)
