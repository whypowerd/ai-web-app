from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure OpenAI with project API key
openai_api_key = os.getenv('OPENAI_API_KEY')
openai_organization = os.getenv('OPENAI_ORGANIZATION')
client = OpenAI(
    api_key=openai_api_key,
    organization=openai_organization
)

# Configure CORS based on environment
if os.getenv('FLASK_ENV') == 'production':
    CORS(app, resources={
        r"/*": {
            "origins": ["https://whypowered.com", "https://www.whypowered.com"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })
else:
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })

# Database configuration
if os.getenv('DATABASE_URL'):
    # Use PostgreSQL in production
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
else:
    # Use SQLite in development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///whys.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Why message model
class Why(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    color = db.Column(db.String(20), nullable=False)
    position_x = db.Column(db.Float, nullable=False)
    position_y = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'color': self.color,
            'position': {
                'x': self.position_x,
                'y': self.position_y
            }
        }

# Create database tables
with app.app_context():
    db.create_all()

# Function to remove expired messages (older than 24 hours)
def cleanup_expired_messages():
    with app.app_context():
        try:
            expiration_time = datetime.utcnow() - timedelta(hours=24)
            Why.query.filter(Why.created_at < expiration_time).delete()
            db.session.commit()
            print("Cleanup successful")
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
            db.session.rollback()

# Set up scheduler to run cleanup every hour
if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=cleanup_expired_messages, trigger="interval", hours=1)
    scheduler.start()

# Root route for health check
@app.route('/')
def root():
    return jsonify({"status": "healthy"}), 200

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        
        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Generate response using OpenAI
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional life coach and career advisor. Format your responses with clear sections using markdown headers (e.g., # Section Title)."},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        # Extract the response
        response = completion.choices[0].message.content

        # Extract short-term steps and long-term goals
        import re
        
        # Extract immediate actions
        short_term_match = re.search(r'# Immediate Actions\n((?:[\d\.\s]+[^\n]+\n){3})', response, re.IGNORECASE)
        short_term_steps = []
        if short_term_match:
            steps = short_term_match.group(1).strip().split('\n')
            short_term_steps = [step.replace(r'^\d+\.\s*', '').strip() for step in steps if step.strip()]

        # Extract 1 year goals
        long_term_match = re.search(r'# 1 Year Achievement.*?Action Steps:\n((?:[\d\.\s]+[^\n]+\n){2})', response, re.IGNORECASE)
        long_term_goals = []
        if long_term_match:
            goals = long_term_match.group(1).strip().split('\n')
            long_term_goals = [goal.replace(r'^\d+\.\s*', '').strip() for goal in goals if goal.strip()]

        return jsonify({
            "response": response,
            "shortTermSteps": short_term_steps,
            "longTermGoals": long_term_goals
        })

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": "Failed to generate response"}), 500

@app.route('/api/why', methods=['POST'])
def create_why():
    try:
        data = request.json
        new_why = Why(
            message=data['message'],
            color=data['color'],
            position_x=data['position']['x'],
            position_y=data['position']['y']
        )
        db.session.add(new_why)
        db.session.commit()
        return jsonify(new_why.to_dict()), 201
    except Exception as e:
        print(f"Error creating why: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/whys', methods=['GET'])
def get_whys():
    try:
        # Only return messages from the last 24 hours
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        whys = Why.query.filter(Why.created_at >= cutoff_time).all()
        return jsonify([why.to_dict() for why in whys])
    except Exception as e:
        print(f"Error getting whys: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') != 'production')
