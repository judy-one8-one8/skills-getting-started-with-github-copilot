from flask import Flask, jsonify, request, send_from_directory
import os

app = Flask(__name__)

# Sample activities data
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": []
    }
    # Add more activities as needed
}

# Serve static files
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# API endpoints
@app.route('/activities')
def get_activities():
    return jsonify(activities)

@app.route('/activities/<activity>/signup', methods=['POST'])
def signup(activity):
    if activity not in activities:
        return jsonify({"detail": "Activity not found"}), 404
    
    email = request.args.get('email')
    if not email:
        return jsonify({"detail": "Email is required"}), 400
    
    if email in activities[activity]["participants"]:
        return jsonify({"detail": "Already signed up"}), 400
        
    if len(activities[activity]["participants"]) >= activities[activity]["max_participants"]:
        return jsonify({"detail": "Activity is full"}), 400
    
    activities[activity]["participants"].append(email)
    return jsonify({"message": "Successfully signed up for " + activity})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
