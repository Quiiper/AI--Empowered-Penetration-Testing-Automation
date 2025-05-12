document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeToggle = document.getElementById('theme-toggle');
    const clearChatButton = document.getElementById('clear-chat');
    const latencyInfo = document.getElementById('latency-info');
    
    // Session ID for conversation tracking
    const sessionId = generateSessionId();
    
    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight < 120) ? `${userInput.scrollHeight}px` : '120px';
    });
    
    // Send message when Enter key is pressed (without Shift)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send message when Send button is clicked
    sendButton.addEventListener('click', sendMessage);
    
    // Toggle dark/light mode
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });
    
    // Clear chat history
    clearChatButton.addEventListener('click', () => {
        // Show confirmation dialog
        if (confirm('Are you sure you want to clear the chat history?')) {
            clearChat();
        }
    });
    
    // Function to send message to backend
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Clear input and reset height
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Add user message to chat
        addMessage('user', message);
        
        // Show typing indicator
        const typingIndicator = addTypingIndicator();
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: message,
                    session_id: sessionId 
                })
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add bot response to chat
            addMessage('bot', data.response);
            
            // Display latency information
            latencyInfo.textContent = `Response time: ${data.latency}s`;
            
            // Scroll to bottom
            scrollToBottom();
        } catch (error) {
            console.error('Error:', error);
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add error message
            addErrorMessage('Sorry, something went wrong. Please try again.');
            
            // Scroll to bottom
            scrollToBottom();
        }
    }
    
    // Function to add message to chat
    function addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Process content based on sender
        if (sender === 'bot') {
            // Process markdown and code highlighting for bot messages
            messageContent.innerHTML = marked.parse(content, {
                breaks: true,
                gfm: true
            });
            
            // Apply syntax highlighting to code blocks
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            // Simple text for user messages
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(messageContent);
        
        // Add timestamp
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = formatTime(new Date());
        messageDiv.appendChild(messageTime);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the new message
        scrollToBottom();
        
        return messageDiv;
    }
    
    // Function to add typing indicator
    function addTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            indicator.appendChild(dot);
        }
        
        chatMessages.appendChild(indicator);
        scrollToBottom();
        
        return indicator;
    }
    
    // Function to add error message
    function addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot-message error-message';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = message;
        
        errorDiv.appendChild(messageContent);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = formatTime(new Date());
        errorDiv.appendChild(messageTime);
        
        chatMessages.appendChild(errorDiv);
    }
    
    // Function to clear chat
    async function clearChat() {
        // Clear UI
        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        
        // Add welcome message back
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message bot-message welcome-message';
        
        const welcomeContent = document.createElement('div');
        welcomeContent.className = 'message-content';
        welcomeContent.innerHTML = '<p>Hello! I\'m your Pentest Assistant. How can I help with your penetration testing needs today?</p>';
        
        welcomeMessage.appendChild(welcomeContent);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = 'Just now';
        welcomeMessage.appendChild(messageTime);
        
        chatMessages.appendChild(welcomeMessage);
        
        // Clear latency info
        latencyInfo.textContent = '';
        
        // Clear server-side history
        try {
            await fetch('/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }
    
    // Helper function to format time
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Helper function to scroll to bottom of chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Generate a random session ID
    function generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    // Focus input on page load
    userInput.focus();
});

// Process code blocks with syntax highlighting
document.addEventListener('DOMContentLoaded', () => {
    // Configure marked.js
    marked.setOptions({
        highlight: function(code, language) {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            return hljs.highlight(validLanguage, code).value;
        },
        breaks: true,
        gfm: true
    });
    
    // Apply syntax highlighting to any existing code blocks
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
});