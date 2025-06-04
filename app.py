from flask import Flask, request, jsonify
from flask_cors import CORS  # For handling Cross-Origin Resource Sharing (for development)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (for development - configure properly for production)

# --- Basic Health Check ---
@app.route('/')
def hello_world():
    return jsonify({"message": "Welcome to the Crescendo Backend!"})

# --- Generate Playlist ---
@app.route('/generate_playlist', methods=['POST'])
def generate_playlist():
    data = request.get_json()
    mood = data.get('mood')
    activity = data.get('activity')
    artists = data.get('artists')
    genres = data.get('genres')  # Example of another potential input

    # --- AI-POWERED PLAYLIST GENERATION LOGIC GOES HERE ---
    # Replace this with your actual playlist generation code
    generated_playlist = {
        "title": f"Playlist for {mood} during {activity}",
        "tracks": [
            {"title": "Example Song 1", "artist": "Artist A"},
            {"title": "Another Track", "artist": "Band B"},
            {"title": "Cool Music", "artist": "Singer C"}
        ]
    }

    return jsonify(generated_playlist)

# --- Save Playlist (Conceptual - Requires Database and User Authentication) ---
@app.route('/save_playlist', methods=['POST'])
def save_playlist():
    data = request.get_json()
    # In a real application, you would get the user ID from the session/token
    user_id = data.get('user_id')  # Placeholder
    playlist_data = data.get('playlist')
    playlist_title = data.get('title')

    # --- Database interaction to save the playlist for the user ---
    # This is where you would interact with your database (e.g., using SQLAlchemy)
    print(f"Saving playlist '{playlist_title}' for user {user_id}: {playlist_data}") # Placeholder log

    return jsonify({"message": "Playlist saved successfully!"})

# --- Get User Playlists (Conceptual - Requires Database and User Authentication) ---
@app.route('/get_user_playlists/<int:user_id>', methods=['GET'])
def get_user_playlists(user_id):
    # --- Database interaction to retrieve playlists for the given user_id ---
    # This is where you would query your database
    user_playlists = [
        {"id": 1, "title": "My Chill Mix", "tracks": [...]},
        {"id": 2, "title": "Workout Beats", "tracks": [...]},
    ]  # Placeholder data

    return jsonify({"playlists": user_playlists})

# --- Feedback ---
@app.route('/feedback', methods=['POST'])
def receive_feedback():
    data = request.get_json()
    playlist_id = data.get('playlist_id')
    rating = data.get('rating')
    comment = data.get('comment')

    # --- Database interaction to store the feedback ---
    print(f"Feedback received for playlist {playlist_id}: Rating={rating}, Comment='{comment}'") # Placeholder log

    return jsonify({"message": "Feedback received!"})

# --- Authentication (Conceptual - Requires User Authentication Implementation) ---
@app.route('/authenticate', methods=['POST'])
def authenticate_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # --- Authentication logic (e.g., check against database) ---
    if username == "testuser" and password == "testpass":
        # In a real application, you would generate a secure token (e.g., JWT)
        token = "dummy_token_123"
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Invalid credentials"}), 401  # Unauthorized

# --- Registration (Conceptual - Requires User Authentication and Database) ---
@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # --- Registration logic (e.g., validate data, hash password, save to database) ---
    print(f"New user registration: Username={username}, Email={email}") # Placeholder log

    return jsonify({"message": "Registration successful!"}), 201  # Created

if __name__ == '__main__':
    app.run(debug=True)