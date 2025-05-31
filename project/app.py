from flask import Flask, request, jsonify, render_template, send_from_directory
from llama_cpp import Llama
import sqlite3
import time
import os
import logging
import json
from flask_cors import CORS

app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database initialization
def init_db():
    db_file = 'chat.db'
    if not os.path.exists(db_file):
        logger.info("Creating new database...")
        db = sqlite3.connect(db_file)
        cursor = db.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create chats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                sender TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        db.commit()
        db.close()
        logger.info("Database initialized successfully")

# Initialize database on startup
init_db()

# Optimized model initialization
llm = Llama(
    model_path="mistral-7b-instruct-v0.1.Q5_K_M.gguf",
    n_ctx=2048,
    n_threads=4,
    n_gpu_layers=0,
    n_batch=512,
    use_mmap=True,
    use_mlock=False
)

def get_db():
    db = sqlite3.connect('chat.db')
    db.row_factory = sqlite3.Row
    return db

def format_prompt(message, history):
    prompt_parts = []
    for user_msg, bot_msg in history:
        prompt_parts.append(f"[INST] {user_msg} [/INST] {bot_msg} </s>")
    prompt_parts.append(f"[INST] {message} [/INST]")
    return "".join(prompt_parts)

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute(
            "SELECT id, email FROM users WHERE email = ? AND password = ?",
            (email, password)
        )
        user = cursor.fetchone()
        
        if user:
            return jsonify({
                "id": user["id"],
                "email": user["email"]
            })
        
        return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during login"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/auth/register", methods=["POST"])
def register():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already registered"}), 409
        
        # Generate a unique ID
        user_id = str(time.time_ns())
        
        try:
            # Create new user
            cursor.execute(
                "INSERT INTO users (id, email, password) VALUES (?, ?, ?)",
                (user_id, email, password)
            )
            db.commit()
            
            return jsonify({
                "id": user_id,
                "email": email
            })
        except sqlite3.Error as e:
            db.rollback()
            logger.error(f"Database error during registration: {str(e)}")
            return jsonify({"error": "Database error during registration"}), 500
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during registration"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data["message"]
        chat_id = data.get("chat_id")
        user_id = data.get("user_id")
        if not chat_id or not user_id:
            return jsonify({"error": "chat_id and user_id are required"}), 400
        db = get_db()
        cursor = db.cursor()
        # Get chat history
        cursor.execute(
            "SELECT content, sender FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
            (chat_id,)
        )
        messages = cursor.fetchall()
        history = []
        for msg in messages:
            if msg['sender'] == 'user':
                history.append((msg['content'], ''))
            else:
                if history:
                    history[-1] = (history[-1][0], msg['content'])
        # Generate response
        prompt = format_prompt(user_message, history)
        start_time = time.time()
        output = llm.create_completion(
            prompt,
            max_tokens=384,
            temperature=0.7,
            top_p=0.9,
            stop=["</s>", "[INST]"],
            repeat_penalty=1.1
        )
        response = output["choices"][0]["text"].strip()
        latency = round(time.time() - start_time, 2)
        # Save messages
        cursor.execute(
            "INSERT INTO messages (id, chat_id, user_id, content, sender) VALUES (?, ?, ?, ?, ?)",
            (str(time.time_ns()), chat_id, user_id, user_message, 'user')
        )
        cursor.execute(
            "INSERT INTO messages (id, chat_id, user_id, content, sender) VALUES (?, ?, ?, ?, ?)",
            (str(time.time_ns()), chat_id, user_id, response, 'bot')
        )
        db.commit()
        logger.info(f"Generated response in {latency}s")
        return jsonify({
            "response": response,
            "latency": latency
        })
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}", exc_info=True)
        return jsonify({
            "error": "An error occurred while processing your request",
            "details": str(e)
        }), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/chats", methods=["GET"])
def get_chats():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        db = get_db()
        cursor = db.cursor()
        
        cursor.execute(
            "SELECT id, user_id, title, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        chats = cursor.fetchall()
        
        return jsonify([dict(chat) for chat in chats])
    except Exception as e:
        logger.error(f"Error getting chats: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching chats"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/chats", methods=["POST"])
def create_chat():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        db = get_db()
        cursor = db.cursor()
        
        # Get the count of existing chats for this user
        cursor.execute(
            "SELECT COUNT(*) FROM chats WHERE user_id = ?",
            (user_id,)
        )
        chat_count = cursor.fetchone()[0] + 1
        
        chat_id = str(time.time_ns())
        title = f"Chat {chat_count}"
        
        cursor.execute(
            "INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)",
            (chat_id, user_id, title)
        )
        db.commit()
        
        return jsonify({
            "id": chat_id,
            "user_id": user_id,
            "title": title,
            "created_at": time.strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Error creating chat: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while creating chat"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Delete messages first
        cursor.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
        # Then delete the chat
        cursor.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        db.commit()
        
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error deleting chat: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while deleting chat"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/chats/<chat_id>/messages", methods=["GET"])
def get_chat_messages(chat_id):
    try:
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute(
            "SELECT content, sender, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
            (chat_id,)
        )
        messages = cursor.fetchall()
        
        return jsonify([dict(msg) for msg in messages])
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching messages"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route("/api/chats/<chat_id>", methods=["PATCH"])
def update_chat(chat_id):
    try:
        data = request.get_json()
        title = data.get("title")
        
        if not title:
            return jsonify({"error": "Title is required"}), 400

        db = get_db()
        cursor = db.cursor()
        
        cursor.execute(
            "UPDATE chats SET title = ? WHERE id = ?",
            (title, chat_id)
        )
        db.commit()
        
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error updating chat: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while updating chat"}), 500
    finally:
        if 'db' in locals():
            db.close()

# Catch-all route for frontend (React SPA)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    # Serve API and static files as normal
    if path.startswith('api/'):
        return send_from_directory('.', path)
    
    # Handle chat endpoint
    if path == 'chat':
        if request.method == 'POST':
            return chat()
        return send_from_directory('dist', 'index.html')
    
    # Serve static files from dist directory
    if path.startswith('static/') or path.startswith('assets/'):
        return send_from_directory('dist', path)
    
    # Otherwise, serve the React app
    try:
        return send_from_directory('dist', 'index.html')
    except Exception as e:
        logger.error(f"Error serving React app: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to serve frontend"}), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True
    )