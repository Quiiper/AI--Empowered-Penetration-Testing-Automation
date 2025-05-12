from flask import Flask, request, jsonify, render_template, send_from_directory
from llama_cpp import Llama
import time
import os

app = Flask(__name__, template_folder="templates", static_folder="static")

# Initialize the model
llm = Llama(
    model_path="mistral-7b-instruct-v0.1.Q5_K_M.gguf",
    n_ctx=2048,  # Context window size
    n_threads=8,  # CPU threads
    n_gpu_layers=40  # Enable GPU acceleration if available (set to 0 for CPU-only)
)

# Chat history for conversation context
conversations = {}

# Chat template for Mistral Instruct
def format_prompt(message, history):
    prompt = ""
    for user_msg, bot_msg in history:
        prompt += f"[INST] {user_msg} [/INST] {bot_msg} </s>"
    prompt += f"[INST] {message} [/INST]"
    return prompt

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        user_message = data["message"]
        session_id = data.get("session_id", "default")
        
        # Initialize or retrieve conversation history
        if session_id not in conversations:
            conversations[session_id] = []
        
        history = conversations[session_id]
        
        # Format prompt with history
        prompt = format_prompt(user_message, history)
        
        start_time = time.time()
        output = llm.create_completion(
            prompt,
            max_tokens=512,
            temperature=0.7,
            stop=["</s>", "[INST]"]
        )
        response = output["choices"][0]["text"].strip()
        latency = round(time.time() - start_time, 2)
        
        # Update conversation history
        history.append((user_message, response))
        
        # Keep history limited to last 10 exchanges to manage context window
        if len(history) > 10:
            history = history[-10:]
        
        conversations[session_id] = history
        
        print(f"Generated in {latency}s: {response}")
        return jsonify({
            "response": response,
            "latency": latency,
            "session_id": session_id
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "error": "An error occurred while processing your request",
            "details": str(e)
        }), 500

@app.route("/clear", methods=["POST"])
def clear_history():
    data = request.json
    session_id = data.get("session_id", "default")
    
    if session_id in conversations:
        conversations[session_id] = []
    
    return jsonify({"status": "success", "message": "Conversation history cleared"})

if __name__ == "__main__":
    # Create directories if they don't exist
    os.makedirs("templates", exist_ok=True)
    os.makedirs("static", exist_ok=True)
    os.makedirs("static/css", exist_ok=True)
    os.makedirs("static/js", exist_ok=True)
    
    app.run(host="0.0.0.0", port=5000, debug=True)
